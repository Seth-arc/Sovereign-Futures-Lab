import { useEffect, useMemo, useRef, useState } from "react";
import {
  activateEmergencyMode,
  askAdvisor,
  isLocalBundle,
  joinWorkshop,
  joinLocalWorkshop,
  loadParticipantBundle,
  requestEvidence,
  saveDecisions,
  sendInstitutionalRequest,
  submitRecommendation,
  subscribeToWorkshop,
  transcribeAudio,
  type ParticipantBundle,
} from "./data";
import { evidenceIsAvailable } from "./engine";
import { EVIDENCE_CATALOG, ROLE_TITLE, STAGES, WORKSHOP_TITLE } from "./scenario";
import { ThemeButton } from "./ThemeButton";
import type { AdvisorId, DecisionState, InstitutionRole } from "./types";

const PARTICIPANT_KEY = "futureslab-participant-id";
const ENTRY_HANDOFF_KEY = "futureslab-entry-handoff-v1";

type JoinInput = {
  code: string;
  name: string;
  organization: string;
  email: string;
};

function consumeEntryHandoff(): JoinInput | null {
  try {
    const serialized = sessionStorage.getItem(ENTRY_HANDOFF_KEY);
    sessionStorage.removeItem(ENTRY_HANDOFF_KEY);
    if (!serialized) return null;
    const value = JSON.parse(serialized) as Record<string, unknown>;
    if (
      value.version !== 1
      || typeof value.code !== "string"
      || typeof value.name !== "string"
      || typeof value.organization !== "string"
      || typeof value.email !== "string"
      || typeof value.consentedAt !== "string"
      || value.consentVersion !== "2026-09-28"
    ) return null;
    const input = {
      code: value.code.trim().toUpperCase(),
      name: value.name.trim(),
      organization: value.organization.trim(),
      email: value.email.trim().toLowerCase(),
    };
    if (!input.code || !input.name || !input.organization || !/^\S+@\S+\.\S+$/.test(input.email)) return null;
    return input;
  } catch {
    return null;
  }
}

function downloadEmergencyHandoff(bundle: ParticipantBundle, decisions: DecisionState) {
  const payload = JSON.stringify({
    format: "sovereign-room-futureslab-emergency-handoff-v1",
    exportedAt: new Date().toISOString(),
    session: bundle.session,
    participant: bundle.participant,
    decisions,
    evidenceRequests: bundle.evidenceRequests,
    institutionalMessages: bundle.messages,
    submissions: bundle.submissions,
    advisorTurns: bundle.advisorTurns,
    timeline: bundle.timeline,
  }, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `futureslab-emergency-handoff-${bundle.participant.id.slice(0, 8)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function remainingFor(bundle: ParticipantBundle, now: number): number {
  if (bundle.session.status !== "RUNNING" || !bundle.session.clockStartedAt) return bundle.session.remainingSeconds;
  return Math.max(0, bundle.session.remainingSeconds - Math.floor((now - new Date(bundle.session.clockStartedAt).getTime()) / 1000));
}

export function ParticipantApp() {
  const [entryHandoff] = useState<JoinInput | null>(() => consumeEntryHandoff());
  const [bundle, setBundle] = useState<ParticipantBundle | null>(null);
  const [stage, setStage] = useState(0);
  const [decisions, setDecisions] = useState<DecisionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now());
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const handoffAttempted = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    if (entryHandoff) {
      setInitializing(false);
      return () => window.clearInterval(timer);
    }
    const participantId = localStorage.getItem(PARTICIPANT_KEY);
    if (participantId) {
      void loadParticipantBundle(participantId)
        .then((loaded) => {
          setBundle(loaded);
          setDecisions(loaded.decisions);
          setStage(Math.min(loaded.participant.currentStage, loaded.session.currentStage));
        })
        .catch(() => localStorage.removeItem(PARTICIPANT_KEY))
        .finally(() => setInitializing(false));
    } else {
      setInitializing(false);
    }
    return () => window.clearInterval(timer);
  }, [entryHandoff]);

  useEffect(() => {
    if (!entryHandoff || handoffAttempted.current) return;
    handoffAttempted.current = true;
    void handleJoin(entryHandoff);
  }, [entryHandoff]);

  useEffect(() => {
    if (!bundle) return;
    return subscribeToWorkshop(bundle.session.id, bundle.participant.id, () => {
      void loadParticipantBundle(bundle.participant.id).then((fresh) => {
        const previousInject = bundle.injects.at(-1)?.id;
        const latest = fresh.injects.at(-1);
        if (latest && latest.id !== previousInject) setNotice(`${latest.title}: ${latest.body}`);
        setBundle(fresh);
        setDecisions(fresh.decisions);
      });
    });
  }, [bundle?.participant.id, bundle?.session.id]);

  async function handleJoin(input: JoinInput) {
    setBusy(true); setError("");
    try {
      const joined = await joinWorkshop(input);
      localStorage.setItem(PARTICIPANT_KEY, joined.participant.id);
      setBundle(joined); setDecisions(joined.decisions); setStage(0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to join the workshop.");
    } finally { setBusy(false); }
  }

  function handleLocalJoin(input: { name: string; organization: string; email: string }) {
    const joined = joinLocalWorkshop(input);
    localStorage.setItem(PARTICIPANT_KEY, joined.participant.id);
    setBundle(joined); setDecisions(joined.decisions); setStage(0); setError("");
  }

  async function persist(nextStage = stage) {
    if (!bundle || !decisions) return;
    setBusy(true); setError("");
    try {
      const saved = await saveDecisions(bundle, decisions, nextStage);
      setBundle(saved);
      setNotice("Your work has been saved.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Save failed."); }
    finally { setBusy(false); }
  }

  if (!bundle || !decisions) return <WorkshopEntryState initializing={initializing} busy={busy} error={error} entryHandoff={entryHandoff} onRetry={() => entryHandoff && void handleJoin(entryHandoff)} onJoinLocal={() => entryHandoff && handleLocalJoin(entryHandoff)} />;

  const availableStage = Math.max(bundle.session.currentStage, bundle.participant.currentStage);
  const latestInject = bundle.injects.at(-1);
  const clock = remainingFor(bundle, now);

  return (
    <div className="app-shell participant-reference">
      <a className="skip-link" href="#main-content">Skip to exercise</a>
      <header className="topbar">
        <div className="brand"><img className="aiddata-brandmark" src="/assets/AidData Brandmark.png" alt="AidData" /><div className="brand-copy"><strong>Sovereign</strong><span>Role · Debt Management Office</span></div></div>
        <div className="topmeta"><span className={`pill ${bundle.session.status === "RUNNING" ? "ok" : "warn"}`}><span className={`status-dot ${bundle.session.status.toLowerCase()}`} />{bundle.session.status.toLowerCase()} · {bundle.session.kind.toLowerCase()}</span><span className="pill warn clock" aria-label={`${clock} seconds remaining`}><small>Exercise clock</small><strong>{formatClock(clock)}</strong></span><ThemeButton /></div>
      </header>

      {(notice || latestInject) && (
        <div className="inject-banner" role="status">
          <div><strong>Facilitator update</strong><span>{notice || `${latestInject?.title}: ${latestInject?.body}`}</span></div>
          <button type="button" className="icon-button" aria-label="Dismiss update" onClick={() => setNotice("")}>×</button>
        </div>
      )}

      <div className="workspace-layout">
        <aside className="process-rail" aria-label="Exercise stages">
          <div className="role-card"><small>Your role</small><strong>{ROLE_TITLE}</strong><span>{bundle.participant.name}<br />{bundle.participant.organization}</span></div>
          <ol>
            {STAGES.map((item, index) => {
              const unlocked = index <= availableStage;
              return <li key={item.short}><button type="button" className={stage === index ? "active" : ""} disabled={!unlocked} onClick={() => setStage(index)}><span>{index + 1}</span><div><strong>{item.short}</strong><small>{unlocked ? item.title : "Await facilitator"}</small></div></button></li>;
            })}
          </ol>
          <div className="mode-note"><strong>{isLocalBundle(bundle) ? "Local emergency mode" : "Live workshop mode"}</strong><span>{isLocalBundle(bundle) ? "This browser retains your work. Download the handoff file when finished." : "Your activity is synchronized with the facilitator."}</span></div>
        </aside>

        <main className="decision-workspace" id="main-content">
          <div className="stage-heading"><div><span className="eyebrow">Step {stage + 1} of {STAGES.length}</span><h1>{STAGES[stage].title}</h1><p>{STAGES[stage].objective}</p></div><span className="autosave-state">{busy ? "Saving…" : "Saved on action"}</span></div>
          {error && <div className="error-panel" role="alert"><span>{error}</span>{!isLocalBundle(bundle) && <button type="button" className="secondary-button" onClick={() => { const local = activateEmergencyMode(bundle); localStorage.setItem(PARTICIPANT_KEY, local.participant.id); setBundle(local); setDecisions(local.decisions); setError(""); setNotice("Local emergency mode started. Download the handoff file when you finish."); }}>Continue in local emergency mode</button>}</div>}
          <StageContent stage={stage} decisions={decisions} setDecisions={setDecisions} bundle={bundle} setBundle={setBundle} setError={setError} now={now} />
          <div className="stage-actions">
            <button type="button" className="secondary-button" disabled={stage === 0 || busy} onClick={() => { void persist(stage); setStage((value) => value - 1); }}>Previous</button>
            <button type="button" className="primary-button" disabled={busy} onClick={() => void persist(stage)}>Save work</button>
            {stage < availableStage && <button type="button" className="primary-button" disabled={busy} onClick={() => { void persist(stage + 1); setStage((value) => value + 1); }}>Continue</button>}
          </div>
        </main>

        <aside className="case-rail">
          <div className="country-lockup"><img src="/assets/national flag.jpg" alt="Flag of Kuvera" /><div><span className="eyebrow">Decision frame</span><strong>Republic of Kuvera</strong></div></div>
          <h2>Two clocks are running</h2>
          <div className="deadline"><strong>6 weeks</strong><span>USD 750m maturity</span></div>
          <div className="deadline"><strong>11 weeks</strong><span>IMF Board horizon</span></div>
          <hr />
          <dl className="case-facts"><div><dt>Reported liquidity</dt><dd>USD 780m</dd></div><div><dt>Restricted</dt><dd>USD 240m</dd></div><div><dt>Protected</dt><dd>USD 60m</dd></div><div><dt>Verified usable</dt><dd>USD 480m</dd></div></dl>
          <button type="button" className="advisor-launch" onClick={() => setAdvisorOpen(true)}><span className="advisor-launch-portraits"><img src="/img/Amara Okoye.jpg" alt="" /><img src="/img/Daniel Mensah.jpg" alt="" /></span><span>Ask Amara or Daniel</span><small>Grounded advisor · voice available</small></button>
        </aside>
      </div>
      {advisorOpen && <AdvisorPanel bundle={bundle} setBundle={setBundle} onClose={() => setAdvisorOpen(false)} />}
    </div>
  );
}

function WorkshopEntryState({ initializing, busy, error, entryHandoff, onRetry, onJoinLocal }: { initializing: boolean; busy: boolean; error: string; entryHandoff: JoinInput | null; onRetry: () => void; onJoinLocal: () => void }) {
  const inProgress = initializing || busy;
  return <main className="entry-page participant-reference"><div className="entry-brand"><img className="aiddata-brandmark" src="/assets/AidData Brandmark.png" alt="AidData" /><span><strong>Sovereign</strong><small>Futureslab workshop</small></span></div><section className="entry-copy"><span className="eyebrow">Kuvera · Financing assurances</span><h1>{WORKSHOP_TITLE}</h1><p>Enter the Kuvera financing-assurances case as a member of the Debt Management Office. Your evidence requests, decisions, and rationale will form a facilitator-led after-action review.</p><div className="method-line"><span>Evidence</span><i /> <span>Decision</span><i /> <span>Consequence</span><i /> <span>Reflection</span></div></section><section className="join-card" aria-labelledby="entry-state-title" aria-live="polite"><h2 id="entry-state-title">{inProgress ? "Joining the workshop" : "Enter through the main page"}</h2>{inProgress ? <p>Your participant details are being verified. Keep this page open.</p> : <p>The participant sign-in is on the Sovereign landing page so your details are entered only once.</p>}{error && <div className="error-panel" role="alert">{error}</div>}{!inProgress && entryHandoff && <><button className="primary-button full" type="button" onClick={onRetry}>Try again</button><button className="secondary-button full" type="button" onClick={onJoinLocal}>Continue in local emergency mode</button></>}{!inProgress && <p><a href="/">Return to participant sign-in</a></p>}</section></main>;
}

function StageContent({ stage, decisions, setDecisions, bundle, setBundle, setError, now }: { stage: number; decisions: DecisionState; setDecisions: (value: DecisionState) => void; bundle: ParticipantBundle; setBundle: (value: ParticipantBundle) => void; setError: (value: string) => void; now: number }) {
  const update = <K extends keyof DecisionState>(key: K, value: DecisionState[K]) => setDecisions({ ...decisions, [key]: value });
  if (stage === 0) return <section className="work-card"><h2>Debt Management Office mandate</h2><div className="mandate-grid"><div><small>You may</small><ul><li>Maintain and reconcile the claims record.</li><li>Request role-relevant evidence.</li><li>Assess dependencies and prepare recommendations.</li><li>Preserve uncertainty and document non-readiness.</li></ul></div><div><small>You may not</small><ul><li>Issue a sovereign commitment.</li><li>Declare a creditor assurance adequate.</li><li>Reveal evidence not released to your role.</li><li>Convert an indicative position into an agreement.</li></ul></div></div><label className="consent"><input type="checkbox" checked={decisions.mandateConfirmed} onChange={(event) => update("mandateConfirmed", event.target.checked)} /><span>I understand that the DMO prepares the record and recommendation; it does not create sovereign or creditor commitment.</span></label><TextArea label="In your own words, what is your authority boundary?" value={decisions.mandateRationale} onChange={(value) => update("mandateRationale", value)} /></section>;
  if (stage === 1) return <section className="work-card"><h2>Can the package rely on USD 780m?</h2><p>The cash ledger reports USD 780m. A partial memo indicates that copper revenues pass through an account with restrictions that have not yet been reconciled.</p><ChoiceGroup value={decisions.liquidityAction} onChange={(value) => update("liquidityAction", value as DecisionState["liquidityAction"])} options={[{ value: "VERIFY_NOW", title: "Verify before reliance", detail: "Use scarce time to establish the restriction and protected-balance effect." },{ value: "PROCEED_WITH_CAVEAT", title: "Proceed with an explicit caveat", detail: "Begin coordination now without treating the reported figure as verified." }]} /><TextArea label="Why is this the appropriate first move?" value={decisions.liquidityRationale} onChange={(value) => update("liquidityRationale", value)} /></section>;
  if (stage === 2) return <section className="work-card"><h2>Institutional evidence requests</h2><p>Requests return after an authored delay. The facilitator may release a response early. Requesting everything is not automatically better; each request consumes attention within the exercise.</p><div className="evidence-list">{EVIDENCE_CATALOG.map((definition) => { const request = bundle.evidenceRequests.find((item) => item.evidenceId === definition.id); const ready = request ? evidenceIsAvailable(request, new Date(now)) : false; const seconds = request ? Math.max(0, Math.ceil((new Date(request.availableAt).getTime() - now) / 1000)) : 0; return <article key={definition.id} className={ready ? "evidence ready" : "evidence"}><div><small>{definition.requestedFrom}</small><h3>{definition.title}</h3><p>{definition.summary}</p></div>{ready ? <details><summary>Review returned evidence</summary><p>{definition.details}</p><cite>{definition.sourceLabel}</cite></details> : request ? <span className="pending-tag">Response in {seconds}s</span> : <button type="button" className="secondary-button" onClick={() => { void requestEvidence(bundle, definition.id).then(setBundle).catch((caught) => setError(caught instanceof Error ? caught.message : "Request failed")); }}>Request</button>}</article>; })}</div><InstitutionalRequestDesk bundle={bundle} setBundle={setBundle} setError={setError} /></section>;
  if (stage === 3) return <section className="work-card"><h2>Record the supported liquidity basis</h2><p>Record what your current evidence supports. Access to a figure is not the same as verification.</p><ChoiceGroup value={decisions.liquidityBasis} onChange={(value) => update("liquidityBasis", value as DecisionState["liquidityBasis"])} options={[{ value: "VERIFIED_480", title: "USD 480m verified usable", detail: "USD 780m less USD 240m restricted and USD 60m protected." },{ value: "REPORTED_780", title: "USD 780m reported, not verified", detail: "Carry the gross figure only as a provisional report." },{ value: "UNRESOLVED", title: "Keep the basis unresolved", detail: "The record does not yet support either value as usable cash." }]} /><TextArea label="State the evidence and caveat behind this record entry." value={decisions.liquidityBasisRationale} onChange={(value) => update("liquidityBasisRationale", value)} /></section>;
  if (stage === 4) return <section className="work-card"><h2>Map account control and facility dependency</h2><h3>Account classification</h3><ChoiceGroup value={decisions.accountClassification} onChange={(value) => update("accountClassification", value as DecisionState["accountClassification"])} options={[{ value: "EFFECTIVE_CONTROL", title: "Quasi-collateral / effective control", detail: "Cash-flow controls constrain Kuvera's practical access without assuming traditional security." },{ value: "ORDINARY_ACCOUNT", title: "Ordinary operating account", detail: "No material creditor control established." },{ value: "UNRESOLVED", title: "Unresolved", detail: "Available evidence does not support a classification." }]} /><h3>Facility A/B linkage</h3><ChoiceGroup value={decisions.facilityLinkage} onChange={(value) => update("facilityLinkage", value as DecisionState["facilityLinkage"])} options={[{ value: "SHARED_POOL", title: "Shared revenue pool", detail: "Both facilities depend on RA-01 and must be carried in the dependency analysis." },{ value: "INDEPENDENT", title: "Independent facilities", detail: "Treat Facility B outside the shared account dependency." },{ value: "UNRESOLVED", title: "Linkage unresolved", detail: "Preserve the gap rather than assume independence." }]} /><TextArea label="Explain the evidence supporting both entries." value={decisions.linkageRationale} onChange={(value) => update("linkageRationale", value)} /></section>;
  if (stage === 5) return <section className="work-card"><h2>Recommend disclosure and treatment perimeter</h2><h3>Disclosure level</h3><ChoiceGroup value={decisions.disclosure} onChange={(value) => update("disclosure", value as DecisionState["disclosure"])} options={[{ value: "FULL", title: "Full contract disclosure", detail: "Strongest information transfer; scenario consent has not been established." },{ value: "REDACTED", title: "Redacted functional summary", detail: "Share control, balances, and dependency without restricted contract text." },{ value: "WITHHOLD", title: "Withhold pending consent", detail: "Preserve confidentiality while retaining an OCC information gap." }]} /><h3>Treatment perimeter</h3><ChoiceGroup value={decisions.treatmentPerimeter} onChange={(value) => update("treatmentPerimeter", value as DecisionState["treatmentPerimeter"])} options={[{ value: "BOTH_FACILITIES", title: "Carry Facilities A and B", detail: "Include the shared-pool dependency in later treatment analysis." },{ value: "FACILITY_A_ONLY", title: "Carry Facility A only", detail: "Treat Facility B as outside the current dependency perimeter." },{ value: "DEFER", title: "Defer perimeter recommendation", detail: "State that evidence is insufficient for a bounded recommendation." }]} /><TextArea label="Explain the trade-off and the boundary of your recommendation." value={decisions.disclosureRationale} onChange={(value) => update("disclosureRationale", value)} /></section>;
  if (stage === 6) return <SubmissionStage decisions={decisions} update={update} bundle={bundle} setBundle={setBundle} setError={setError} />;
  return <section className="work-card"><h2>Reflection before debrief</h2><p>The facilitator holds the detailed after-action report. Record the most important change in your reasoning so it can be compared with the decision-time record.</p><TextArea label="What evidence, dependency, or authority boundary most changed your recommendation?" value={decisions.reflection} onChange={(value) => update("reflection", value)} rows={7} /><div className="completion-note"><strong>Your detailed AAR is not shown here.</strong><span>The facilitator will reconstruct the decision sequence, realistic consequences, and deterministic counterfactuals during the debrief.</span></div>{isLocalBundle(bundle) && <button type="button" className="secondary-button" onClick={() => downloadEmergencyHandoff(bundle, decisions)}>Download emergency handoff file</button>}</section>;
}

function InstitutionalRequestDesk({ bundle, setBundle, setError }: { bundle: ParticipantBundle; setBundle: (value: ParticipantBundle) => void; setError: (value: string) => void }) {
  const [institution, setInstitution] = useState<InstitutionRole>("TREASURY");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const roles: Array<{ value: InstitutionRole; label: string }> = [
    { value: "TREASURY", label: "Treasury" },
    { value: "LEGAL", label: "Legal" },
    { value: "OCC", label: "Official Creditor Committee" },
    { value: "IMF", label: "IMF staff" },
    { value: "CREDITOR", label: "Creditor representative" },
  ];
  async function send() {
    setBusy(true); setError("");
    try { setBundle(await sendInstitutionalRequest(bundle, institution, question)); setQuestion(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Request failed"); }
    finally { setBusy(false); }
  }
  return <section className="exception-desk" aria-labelledby="exception-desk-title"><h3 id="exception-desk-title">Request something not listed</h3><p>Use this only for a material question outside the routine evidence menu. The facilitator will answer in the named institutional role.</p><div className="request-compose"><label>Institution<select value={institution} onChange={(event) => setInstitution(event.target.value as InstitutionRole)}>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label><label>Request<textarea rows={3} maxLength={2000} value={question} onChange={(event) => setQuestion(event.target.value)} /></label><button type="button" className="secondary-button" disabled={busy || question.trim().length < 2} onClick={() => void send()}>{busy ? "Sending…" : "Send request"}</button></div><div className="request-history" aria-live="polite">{bundle.messages.map((message) => <article key={message.id}><small>{message.institution.replaceAll("_", " ")} · {message.status.toLowerCase()}</small><p><strong>You:</strong> {message.question}</p>{message.reply ? <p><strong>{message.institution.replaceAll("_", " ")}:</strong> {message.reply}</p> : <p className="muted-copy">{isLocalBundle(bundle) ? "Saved for the emergency handoff; no live facilitator is connected." : "Awaiting facilitator response."}</p>}</article>)}</div></section>;
}

function SubmissionStage({ decisions, update, bundle, setBundle, setError }: { decisions: DecisionState; update: <K extends keyof DecisionState>(key: K, value: DecisionState[K]) => void; bundle: ParticipantBundle; setBundle: (value: ParticipantBundle) => void; setError: (value: string) => void }) {
  const canSubmit = Boolean(decisions.readiness && decisions.finalRationale.trim());
  return <section className="work-card"><h2>DMO recommendation</h2><p>This submission is a recommendation, not a sovereign commitment or creditor assurance. You may submit a conditional or not-ready package with unresolved evidence.</p><ChoiceGroup value={decisions.readiness} onChange={(value) => update("readiness", value as DecisionState["readiness"])} options={[{ value: "READY", title: "Ready", detail: "The evidence state supports advancing the DMO package without a blocking dependency." },{ value: "READY_WITH_CONDITIONS", title: "Ready with conditions", detail: "Advance only with the conditions and unresolved dependencies stated." },{ value: "NOT_READY", title: "Not ready", detail: "The DMO record does not support advancing the package." }]} /><TextArea label="Unresolved risks" value={decisions.unresolvedRisks} onChange={(value) => update("unresolvedRisks", value)} /><TextArea label="Final recommendation rationale" value={decisions.finalRationale} onChange={(value) => update("finalRationale", value)} rows={6} /><div className="submission-bar"><div><strong>{bundle.submissions.length} version{bundle.submissions.length === 1 ? "" : "s"} submitted</strong><span>Every submission is retained in the AAR.</span></div><button type="button" className="record-button" disabled={!canSubmit || bundle.session.submissionsClosed} onClick={() => { void saveDecisions(bundle, decisions, 6).then((saved) => submitRecommendation(saved)).then(setBundle).catch((caught) => setError(caught instanceof Error ? caught.message : "Submission failed")); }}>{bundle.session.submissionsClosed ? "Submissions closed" : "Submit recommendation"}</button></div></section>;
}

function ChoiceGroup({ value, onChange, options }: { value?: string; onChange: (value: string) => void; options: Array<{ value: string; title: string; detail: string }> }) {
  return <div className="choice-grid">{options.map((option) => <button type="button" key={option.value} className={value === option.value ? "choice selected" : "choice"} aria-pressed={value === option.value} onClick={() => onChange(option.value)}><span className="choice-indicator" /><strong>{option.title}</strong><small>{option.detail}</small></button>)}</div>;
}

function TextArea({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return <label className="textarea-field"><span>{label}</span><textarea rows={rows} maxLength={1600} value={value} onChange={(event) => onChange(event.target.value)} /><small>{value.length} / 1600</small></label>;
}

function AdvisorPanel({ bundle, setBundle, onClose }: { bundle: ParticipantBundle; setBundle: (value: ParticipantBundle) => void; onClose: () => void }) {
  const [advisorId, setAdvisorId] = useState<AdvisorId>("amara");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceReply, setVoiceReply] = useState(true);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const turns = useMemo(() => bundle.advisorTurns.filter((turn) => turn.advisorId === advisorId), [bundle.advisorTurns, advisorId]);

  async function send() {
    const prompt = question.trim(); if (!prompt) return;
    setBusy(true); setError("");
    try {
      const turn = await askAdvisor(bundle, advisorId, prompt);
      setBundle({ ...bundle, advisorTurns: [...bundle.advisorTurns, turn] });
      setQuestion("");
      if (voiceReply && "speechSynthesis" in window) { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(turn.answer); utterance.rate = 0.95; window.speechSynthesis.speak(utterance); }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Advisor unavailable"); }
    finally { setBusy(false); }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setError("Voice capture is not supported in this browser. Type your question instead."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      recorder.current = new MediaRecorder(stream);
      recorder.current.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      recorder.current.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setBusy(true);
        try { setQuestion(await transcribeAudio(new Blob(chunks.current, { type: recorder.current?.mimeType || "audio/webm" }), bundle.participant.id)); }
        catch { setError("Voice transcription is unavailable. Type your question instead."); }
        finally { setBusy(false); }
      };
      recorder.current.start(); setRecording(true);
    } catch { setError("Microphone permission was not granted. Type your question instead."); }
  }

  function stopRecording() { if (recorder.current?.state === "recording") recorder.current.stop(); setRecording(false); }

  return <div className="drawer-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="advisor-drawer" role="dialog" aria-modal="true" aria-labelledby="advisor-title"><header><div className="advisor-person"><img src={advisorId === "amara" ? "/img/Amara Okoye.jpg" : "/img/Daniel Mensah.jpg"} alt={advisorId === "amara" ? "Amara Okoye" : "Daniel Mensah"} /><div><span className="eyebrow">Participant-visible context only</span><h2 id="advisor-title">{advisorId === "amara" ? "Amara Okoye" : "Daniel Mensah"}</h2></div></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close advisors">×</button></header><div className="advisor-tabs"><button type="button" className={advisorId === "amara" ? "active" : ""} onClick={() => setAdvisorId("amara")}><img src="/img/Amara Okoye.jpg" alt="" /><span><strong>Amara Okoye</strong><small>Country and process</small></span></button><button type="button" className={advisorId === "daniel" ? "active" : ""} onClick={() => setAdvisorId("daniel")}><img src="/img/Daniel Mensah.jpg" alt="" /><span><strong>Daniel Mensah</strong><small>Contracts and treatment</small></span></button></div><div className="conversation" aria-live="polite">{turns.length === 0 && <div className="advisor-intro">Ask for an explanation of visible evidence, decision criteria, or process. Advisors cannot select your recommendation or reveal hidden state.</div>}{turns.map((turn) => <article key={turn.id}><div className="question"><strong>You</strong><p>{turn.question}</p></div><div className="answer"><strong>{advisorId === "amara" ? "Amara" : "Daniel"}</strong><p>{turn.answer}</p><div className="citations">{turn.sources.map((source) => <span key={source}>{source}</span>)}<span>{turn.mode === "AI" ? "AI response" : "Scripted fallback"}</span></div></div></article>)}</div>{error && <div className="error-panel" role="alert">{error}</div>}<div className="advisor-compose"><label><span>Review or edit the transcript before sending</span><textarea rows={3} maxLength={2000} value={question} onChange={(event) => setQuestion(event.target.value)} /></label><div><button type="button" className={recording ? "voice-button recording" : "voice-button"} aria-pressed={recording} disabled={busy} onPointerDown={() => void startRecording()} onPointerUp={stopRecording} onPointerLeave={stopRecording} onKeyDown={(event) => { if (!event.repeat && (event.key === " " || event.key === "Enter")) { event.preventDefault(); void startRecording(); } }} onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); stopRecording(); } }}>{recording ? "Release to transcribe" : "Hold to speak"}</button><label className="voice-toggle"><input type="checkbox" checked={voiceReply} onChange={(event) => setVoiceReply(event.target.checked)} />Speak replies</label><button type="button" className="primary-button" disabled={busy || !question.trim()} onClick={() => void send()}>{busy ? "Working…" : "Ask advisor"}</button></div></div></section></div>;
}
