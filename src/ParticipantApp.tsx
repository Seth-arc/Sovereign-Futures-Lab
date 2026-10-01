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
import { buildNegotiationPreparationBrief, evidenceIsAvailable, negotiationBriefIsSubmittable, reviewRecommendation } from "./engine";
import { EVIDENCE_CATALOG, STAGES, WORKSHOP_TITLE } from "./scenario";
import { ReferenceExperience, type ReferenceSurface } from "./ReferenceExperience";
import { ThemeButton } from "./ThemeButton";
import { ADVISOR_RESPONSE_REVEAL_INTERVAL_MS, revealAdvisorResponse, sourceClassLabel, splitAdvisorResponse } from "./advisorPresentation";
import { ADVISOR_VOICE_PROFILES, selectAdvisorVoice } from "./advisorVoice";
import type { AdvisorCitation, AdvisorId, DecisionState, InstitutionRole } from "./types";

const PARTICIPANT_KEY = "futureslab-participant-id";
const ENTRY_HANDOFF_KEY = "futureslab-entry-handoff-v1";
const PREPARATION_KEY_PREFIX = "futureslab-preparation-v1:";
const GLOSSARY_TERMS = [
  { term: "Debt Management Office (DMO)", definition: "The Finance Ministry function that maintains the debt record, reconciles claims, maps dependencies, and prepares recommendations without creating sovereign or creditor commitments." },
  { term: "Usable liquidity", definition: "Cash that is actually available after restrictions, protected balances, and control arrangements are accounted for." },
  { term: "Restricted account", definition: "An account whose balances or payment flows are constrained by contractual controls and therefore may not be fully available to the sovereign." },
  { term: "Effective control", definition: "A practical constraint on the sovereign's access to cash flows, even where the arrangement is not formal collateral in the traditional legal sense." },
  { term: "Financing assurance", definition: "A recorded creditor indication that provides the IMF with sufficient confidence that the financing envelope can be supported. It is not the same as final legal implementation." },
  { term: "Official Creditor Committee (OCC)", definition: "The committee through which participating official bilateral creditors coordinate treatment discussions and assurances under the Common Framework." },
  { term: "Treatment perimeter", definition: "The set of claims or facilities carried into the restructuring and comparability analysis." },
  { term: "Comparability of Treatment (CoT)", definition: "The assessment of whether other creditors provide treatment comparable to official creditors across debt-service, net-present-value, and duration dimensions." },
  { term: "IMF Board horizon", definition: "The eleven-week scenario deadline by which the information, treatment framework, and adequate financing assurances must support IMF Board consideration." },
] as const;
const ADVISOR_PROFILES: Record<AdvisorId, { name: string; shortName: string; role: string; bio: string; image: string; brief: string; greeting: string; welcome: string; suggestions: readonly string[] }> = {
  amara: {
    name: "Amara Okoye",
    shortName: "Amara",
    role: "Country, macroeconomic context & Common Framework advisor",
    bio: "Sovereign debt economist · fifteen years on Paris Club and Common Framework cases",
    image: "/img/Amara Okoye.jpg",
    greeting: "Hello, I'm Amara. Where would you like to begin: Kuvera's fiscal position, its creditor landscape, or the Common Framework sequence?",
    brief: "The Kuvera country profile, debt-sustainability context, creditor composition and the IMF Board horizon—plus the Common Framework sequence from debtor request through financing assurances, the Official Creditor Committee (OCC), and the MoU to cash-effective relief.",
    welcome: "Welcome. I’m Amara, your Kuvera country and Common Framework advisor. I can help you interpret the country profile, debt sustainability context, creditor composition, and the difference between source-backed case facts and exercise-only assumptions. I can also walk you through where Kuvera sits in the Common Framework process, what financing assurances are meant to establish, how the Official Creditor Committee and IMF program parameters fit together, and what happens from an MoU through bilateral implementation. I’ll explain the process and evidence available to you, but I won’t make the decision for you.",
    suggestions: ["Why is Kuvera in debt distress?", "Where is Kuvera in the Common Framework process?", "What are financing assurances?", "What happens after an MoU?", "Which numbers are exercise-only assumptions?"],
  },
  daniel: {
    name: "Daniel Mensah",
    shortName: "Daniel",
    role: "Contracts, escrow & Comparability of Treatment advisor",
    bio: "Sovereign finance lawyer · collateralised lending and restructuring documentation",
    image: "/img/Daniel Mensah.jpg",
    greeting: "Hello, I'm Daniel. What should we examine first: the facilities, account control, disclosure, or comparability of treatment?",
    brief: "Facility A and B, the copper-revenue account, confidentiality and cross-collateralization, formal security versus effective control, disclosure choices and commitment levels—plus the three Comparability of Treatment dimensions.",
    welcome: "Welcome. I’m Daniel Mensah, your contracts, escrow, financing assurances, and comparability advisor. I can help you work through Facility A, Facility B, the copper-revenue account, confidentiality constraints, cross-collateralization, and the distinction between formal security and effective control. I can also explain commitment levels, what counts as a financing assurance, the three Comparability of Treatment dimensions used in this simulation, and how treatment terms connect to the financing-assurances package. I’ll help you interpret the evidence and trade-offs, but I won’t classify an unresolved account or tell you which option to choose.",
    suggestions: ["What do we know about the escrow account?", "What is cross-collateralization here?", "What counts as an assurance?", "Why is CoT not one haircut number?", "What are the three CoT dimensions?"],
  },
};

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
  const exportedAt = new Date().toISOString();
  const payload = JSON.stringify({
    format: "sovereign-room-futureslab-emergency-handoff-v1",
    exportedAt,
    session: bundle.session,
    participant: bundle.participant,
    decisions,
    negotiationPreparationBrief: buildNegotiationPreparationBrief({ decisions, evidenceRequests: bundle.evidenceRequests, institutionalMessages: bundle.messages, preparedAt: exportedAt }),
    evidenceRequests: bundle.evidenceRequests,
    institutionalMessages: bundle.messages,
    submissions: bundle.submissions,
    submissionBriefs: bundle.submissions.map((submission) => ({
      submissionId: submission.id,
      version: submission.version,
      brief: buildNegotiationPreparationBrief({ decisions: submission.decisions, evidenceRequests: bundle.evidenceRequests, institutionalMessages: bundle.messages, preparedAt: submission.submittedAt }),
    })),
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

function preparationKey(participantId: string): string {
  return `${PREPARATION_KEY_PREFIX}${participantId}`;
}

function hasCaseworkData(bundle: ParticipantBundle): boolean {
  const decisions = bundle.decisions;
  return bundle.participant.currentStage > 0
    || decisions.mandateConfirmed
    || decisions.mandateRationale.trim().length > 0
    || decisions.liquidityRationale.trim().length > 0
    || decisions.liquidityBasisRationale.trim().length > 0
    || decisions.linkageRationale.trim().length > 0
    || decisions.disclosureRationale.trim().length > 0
    || decisions.unresolvedRisks.trim().length > 0
    || decisions.nextHandoff.trim().length > 0
    || decisions.finalRationale.trim().length > 0
    || decisions.reflection.trim().length > 0
    || bundle.evidenceRequests.length > 0
    || bundle.messages.length > 0
    || bundle.submissions.length > 0;
}

function preparationIsComplete(bundle: ParticipantBundle): boolean {
  return localStorage.getItem(preparationKey(bundle.participant.id)) === "complete" || hasCaseworkData(bundle);
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
  const [communicationsOpen, setCommunicationsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [referenceSurface, setReferenceSurface] = useState<ReferenceSurface | null>(null);
  const [preparationComplete, setPreparationComplete] = useState(false);
  const [roleBriefOpen, setRoleBriefOpen] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const handoffAttempted = useRef(false);
  const communicationsTrigger = useRef<HTMLButtonElement>(null);
  const advisorTrigger = useRef<HTMLButtonElement>(null);
  const mainContent = useRef<HTMLElement>(null);
  const menuContainer = useRef<HTMLDivElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);

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
          const complete = preparationIsComplete(loaded);
          if (complete) localStorage.setItem(preparationKey(loaded.participant.id), "complete");
          setBundle(loaded);
          setDecisions(loaded.decisions);
          setStage(Math.min(loaded.participant.currentStage, loaded.session.currentStage));
          setPreparationComplete(complete);
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

  useEffect(() => {
    if (!menuOpen) return;
    const closeFromOutside = (event: MouseEvent) => {
      if (event.target instanceof Node && !menuContainer.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuTrigger.current?.focus();
    };
    document.addEventListener("mousedown", closeFromOutside);
    document.addEventListener("keydown", closeFromKeyboard);
    return () => {
      document.removeEventListener("mousedown", closeFromOutside);
      document.removeEventListener("keydown", closeFromKeyboard);
    };
  }, [menuOpen]);

  async function handleJoin(input: JoinInput) {
    setBusy(true); setError("");
    try {
      const joined = await joinWorkshop(input);
      localStorage.setItem(PARTICIPANT_KEY, joined.participant.id);
      const complete = preparationIsComplete(joined);
      setBundle(joined);
      setDecisions(joined.decisions);
      setStage(0);
      setPreparationComplete(complete);
      setReferenceSurface(complete ? null : "orientation");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to join the workshop.");
    } finally { setBusy(false); }
  }

  function handleLocalJoin(input: { name: string; organization: string; email: string }) {
    const joined = joinLocalWorkshop(input);
    localStorage.setItem(PARTICIPANT_KEY, joined.participant.id);
    const complete = preparationIsComplete(joined);
    setBundle(joined);
    setDecisions(joined.decisions);
    setStage(0);
    setPreparationComplete(complete);
    setReferenceSurface(complete ? null : "orientation");
    setError("");
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
  const caseworkRunning = preparationComplete && bundle.session.status === "RUNNING";
  const displayedClock = preparationComplete ? clock : bundle.session.durationSeconds;
  const caseworkClockLabel = `Casework · ${formatClock(displayedClock)}${caseworkRunning ? "" : " · waiting"}`;
  const pendingRequests = bundle.evidenceRequests.filter((request) => !evidenceIsAvailable(request, new Date(now)));
  const pendingCommunications = pendingRequests.length + bundle.messages.filter((message) => message.status === "PENDING").length;

  function closeCommunications() {
    setCommunicationsOpen(false);
    window.requestAnimationFrame(() => communicationsTrigger.current?.focus());
  }

  function closeGlossary() {
    setGlossaryOpen(false);
    window.requestAnimationFrame(() => menuTrigger.current?.focus());
  }

  function closeAdvisor() {
    setAdvisorOpen(false);
    window.requestAnimationFrame(() => advisorTrigger.current?.focus());
  }

  function completePreparationSurface() {
    if (referenceSurface === "orientation") {
      setReferenceSurface("bridge");
      return;
    }
    if (referenceSurface !== "bridge" || !bundle) return;
    localStorage.setItem(preparationKey(bundle.participant.id), "complete");
    if (isLocalBundle(bundle)) {
      setBundle({ ...bundle, session: { ...bundle.session, status: "RUNNING", remainingSeconds: bundle.session.durationSeconds, clockStartedAt: new Date().toISOString() } });
    }
    setPreparationComplete(true);
    setStage(0);
    setRoleBriefOpen(true);
    setReferenceSurface(null);
    window.requestAnimationFrame(() => mainContent.current?.focus());
  }

  function closePreparationSurface() {
    setReferenceSurface(null);
    window.requestAnimationFrame(() => mainContent.current?.focus());
  }

  async function exitWorkshop() {
    if (!bundle || !decisions) return;
    setMenuOpen(false); setBusy(true); setError("");
    try {
      const saved = await saveDecisions(bundle, decisions, stage);
      setBundle(saved);
      localStorage.removeItem(PARTICIPANT_KEY);
      sessionStorage.removeItem(ENTRY_HANDOFF_KEY);
      window.location.assign("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your work could not be saved. The workshop remains open.");
      setBusy(false);
    }
  }

  return (
    <div className="app participant-reference">
      <a className="skip-link" href="#main-content">Skip to exercise</a>
      <header className="topbar">
        <div className="brand"><img className="aiddata-brandmark" src="/assets/AidData Brandmark.png" alt="AidData" /><div className="brand-copy"><strong>Sovereign</strong></div></div>
        <div className="topmeta">
          <span className={`pill clock ${caseworkRunning ? "warn" : "ok"}`} id="masterClock" aria-label={caseworkClockLabel} title="The 20-minute casework clock starts only when the facilitator begins the exercise"><span className={`status-dot ${caseworkRunning ? "running" : "paused"}`} /><span>{caseworkClockLabel}</span></span>
          <button ref={communicationsTrigger} type="button" className="reference-icon-button comm-launch" id="openCommunications" aria-label="Open communications" title="Communications" aria-haspopup="dialog" aria-expanded={communicationsOpen} onClick={() => { setError(""); setCommunicationsOpen(true); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            {pendingCommunications > 0 && <span className="comm-unread" aria-label={`${pendingCommunications} communications awaiting resolution`}>{pendingCommunications}</span>}
          </button>
          <button type="button" className="secondary-button reference-top-button" id="openReference" onClick={() => setReferenceSurface("case-file")}>Case file</button>
          <div className="participant-menu" ref={menuContainer}>
            <button ref={menuTrigger} type="button" className="reference-icon-button menu-trigger" id="participantMenuButton" aria-label="Open participant menu" aria-expanded={menuOpen} aria-controls="participantMenu" onClick={() => setMenuOpen((open) => !open)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg></button>
            <div className="user-menu-dropdown" id="participantMenu" hidden={!menuOpen}><button className="menu-item" type="button" onClick={() => { setMenuOpen(false); setGlossaryOpen(true); }}>Glossary</button><ThemeButton variant="menu" onToggle={() => setMenuOpen(false)} /><div className="menu-divider" /><button className="menu-item text-bad" type="button" disabled={busy} onClick={() => void exitWorkshop()}>Exit</button></div>
          </div>
        </div>
      </header>

      {(notice || latestInject) && (
        <div className="inject-banner" role="status">
          <div><strong>Facilitator update</strong><span>{notice || `${latestInject?.title}: ${latestInject?.body}`}</span></div>
          <button type="button" className="icon-button" aria-label="Dismiss update" onClick={() => setNotice("")}>×</button>
        </div>
      )}

      <div className="orientation-tools" aria-label="Orientation and learning resources">
        <span className={`preparation-status ${preparationComplete ? "complete" : "incomplete"}`} role="status" aria-live="polite">{preparationComplete ? (caseworkRunning ? "Casework in progress" : "Preparation complete · waiting for facilitator") : "Preparation incomplete · casework waiting"}</span>
        <button type="button" className="secondary-button reference-tool-button" aria-haspopup="dialog" aria-expanded={referenceSurface === "orientation"} onClick={() => setReferenceSurface("orientation")}>Orientation</button>
        <button type="button" className="secondary-button reference-tool-button" id="replayBridge" aria-haspopup="dialog" aria-expanded={referenceSurface === "bridge"} onClick={() => setReferenceSurface("bridge")}>Learning bridge</button>
        <button ref={advisorTrigger} type="button" className="secondary-button reference-tool-button" id="openAdvisors" aria-haspopup="dialog" aria-expanded={advisorOpen} onClick={() => setAdvisorOpen(true)}>AI advisors</button>
      </div>

      <div className="shell">
        <aside className="process" aria-label="Simulation process" tabIndex={0}>
          <div className="rail-title"><div className="eyebrow">Process flow</div><h2>Complete the decision chain</h2><div className="rail-sub">The facilitator unlocks each new step. Earlier work remains open for revision.</div></div>
          <ol className="steps">
            {STAGES.map((item, index) => {
              const unlocked = index <= availableStage;
              const complete = index < bundle.participant.currentStage;
              const stepClass = ["step", stage === index ? "current" : "", complete ? "complete" : "", unlocked ? "available" : "locked"].filter(Boolean).join(" ");
              return <li key={item.short}><button type="button" className={stepClass} disabled={!unlocked} aria-current={stage === index ? "step" : undefined} onClick={() => { setRoleBriefOpen(index === 0); setStage(index); }}><span className="step-num">{index + 1}</span><span className="step-copy"><strong>{item.short}</strong><span>{unlocked ? item.title : "Await facilitator"}</span></span></button></li>;
            })}
          </ol>
          <div className="mode-note"><strong>{isLocalBundle(bundle) ? "Local emergency mode" : "Live workshop mode"}</strong><span>{isLocalBundle(bundle) ? "This browser retains your work. Download the handoff file when finished." : "Your activity is synchronized with the facilitator."}</span></div>
        </aside>

        <main ref={mainContent} className={`workspace ${stage === 0 && roleBriefOpen ? "role-brief-open" : ""}`} id="main-content" tabIndex={-1}>
          {!preparationComplete ? <PreparationState onOrientation={() => setReferenceSurface("orientation")} onBridge={() => setReferenceSurface("bridge")} /> : stage === 0 && roleBriefOpen ? <RoleBrief onContinue={() => setRoleBriefOpen(false)} /> : <>
            <div className="stage-head"><div><div className="eyebrow">Step {stage + 1} · {STAGES[stage].short}</div><h1>{STAGES[stage].title}</h1><p>{STAGES[stage].objective}</p></div><div className="stage-index">{stage + 1} / {STAGES.length}<span className="autosave-state">{busy ? "Saving…" : "Saved on action"}</span></div></div>
            {error && <div className="error-panel" role="alert"><span>{error}</span>{!isLocalBundle(bundle) && <button type="button" className="secondary-button" onClick={() => { const local = activateEmergencyMode(bundle); localStorage.setItem(PARTICIPANT_KEY, local.participant.id); setBundle(local); setDecisions(local.decisions); setError(""); setNotice("Local emergency mode started. Download the handoff file when you finish."); }}>Continue in local emergency mode</button>}</div>}
            <StageContent stage={stage} decisions={decisions} setDecisions={setDecisions} bundle={bundle} setBundle={setBundle} setError={setError} now={now} />
            <div className="stage-actions actions">
              <button type="button" className="secondary-button" disabled={stage === 0 || busy} onClick={() => { void persist(stage); setRoleBriefOpen(false); setStage((value) => value - 1); }}>Previous</button>
              <button type="button" className="primary-button" disabled={busy} onClick={() => void persist(stage)}>Save work</button>
              {stage < availableStage && <button type="button" className="primary-button" disabled={busy} onClick={() => { void persist(stage + 1); setRoleBriefOpen(false); setStage((value) => value + 1); }}>Continue</button>}
            </div>
          </>}
        </main>

      </div>
      {communicationsOpen && <CommunicationsPanel bundle={bundle} setBundle={setBundle} setError={setError} error={error} now={now} onClose={closeCommunications} />}
      {glossaryOpen && <GlossaryDialog onClose={closeGlossary} />}
      {advisorOpen && <AdvisorPanel bundle={bundle} setBundle={setBundle} onClose={closeAdvisor} />}
      {referenceSurface && <ReferenceExperience key={referenceSurface} surface={referenceSurface} onClose={closePreparationSurface} onComplete={completePreparationSurface} />}
    </div>
  );
}

function GlossaryDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  return <div className="modal-scrim glossary-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="glossary-dialog" role="dialog" aria-modal="true" aria-labelledby="glossary-title" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}><header><div><span className="eyebrow">Workshop reference</span><h2 id="glossary-title">Glossary</h2><p>Terms used in the Kuvera financing-assurances exercise.</p></div><button type="button" className="icon-button" aria-label="Close glossary" autoFocus onClick={onClose}>×</button></header><div className="glossary-body" role="region" aria-label="Glossary terms" tabIndex={0}><dl>{GLOSSARY_TERMS.map((item) => <div key={item.term}><dt>{item.term}</dt><dd>{item.definition}</dd></div>)}</dl></div></section></div>;
}

function WorkshopEntryState({ initializing, busy, error, entryHandoff, onRetry, onJoinLocal }: { initializing: boolean; busy: boolean; error: string; entryHandoff: JoinInput | null; onRetry: () => void; onJoinLocal: () => void }) {
  const inProgress = initializing || busy;
  return <main className="entry-page participant-reference"><div className="entry-brand"><img className="aiddata-brandmark" src="/assets/AidData Brandmark.png" alt="AidData" /><span><strong>Sovereign</strong><small>Futures Lab</small></span></div><section className="entry-copy"><span className="eyebrow">Case · Kuvera Financing Assurances</span><h1>{WORKSHOP_TITLE}</h1><p>Take the role of Kuvera’s Debt Management Office (DMO). Inspect the record, request evidence, and prepare an internal negotiation-preparation brief that states what is known, unknown, and conditional.</p><p>A financing assurance is a creditor signal that can support the package before final legal agreements exist; your recommendation informs that process but does not create an assurance or sovereign commitment.</p><div className="method-line"><span>Evidence</span><i /> <span>Decision</span><i /> <span>Consequence</span><i /> <span>Reflection</span></div></section><section className="join-card" aria-labelledby="entry-state-title" aria-live="polite"><h2 id="entry-state-title">{inProgress ? "Joining the workshop" : "Enter through the main page"}</h2>{inProgress ? <p>Your participant details are being verified. Keep this page open.</p> : <p>The participant sign-in is on the Sovereign landing page so your details are entered only once.</p>}{error && <div className="error-panel" role="alert">{error}</div>}{!inProgress && entryHandoff && <><button className="primary-button full" type="button" onClick={onRetry}>Try again</button><button className="secondary-button full" type="button" onClick={onJoinLocal}>Continue in local emergency mode</button></>}{!inProgress && <p><a href="/">Return to participant sign-in</a></p>}</section></main>;
}

function PreparationState({ onOrientation, onBridge }: { onOrientation: () => void; onBridge: () => void }) {
  return <section className="preparation-state" aria-labelledby="preparation-state-title"><span className="eyebrow">Preparation · incomplete</span><h1 id="preparation-state-title">Finish preparation before casework</h1><p>Orientation and the Learning Bridge are outside the timed case. The 20-minute casework clock starts only when the facilitator begins the exercise.</p><p>Skipping or closing preparation keeps you here. You can reopen either resource without changing any casework decisions, evidence requests, or messages.</p><div className="preparation-deadlines" aria-label="Institutional case deadlines"><div><strong>Six weeks</strong><span>USD 750m maturity</span></div><div><strong>Eleven weeks</strong><span>IMF Board horizon</span></div></div><p className="preparation-deadline-note">These are institutional case facts, not a conversion from workshop minutes.</p><div className="actions"><button className="primary-button" type="button" aria-haspopup="dialog" onClick={onOrientation}>Continue orientation</button><button className="secondary-button" type="button" aria-haspopup="dialog" onClick={onBridge}>Open Learning Bridge</button></div></section>;
}

function RoleBrief({ onContinue }: { onContinue: () => void }) {
  return <section className="role-lens" aria-labelledby="role-lens-title"><div className="role-lens-head"><div className="role-lens-id"><div className="role-lens-avatar" aria-hidden="true">DMO</div><div><h1 id="role-lens-title">Debt Management Office</h1><span>Kuvera Finance Ministry · your role in the ministry team</span></div></div><div className="role-lens-kicker">Your role</div></div><p className="role-lens-lead">You hold the loan agreements and the claims record. You do not hold the cash position, the legal reading, or the authority to release anything externally. Use your role to inspect, request, compare, record, and recommend without crossing those boundaries.</p><div className="role-lens-grid"><div className="role-lens-cell"><b>Mandate</b><p>Maintain and reconcile the claims record, map Facility A/B dependencies, and prepare debt-treatment inputs for the Finance Ministry team.</p></div><div className="role-lens-cell"><b>Evidence available to you</b><p>Facility agreements, the debt-service calendar, claim terms, the partial copper-revenue account memo, and internal creditor-position notes.</p></div><div className="role-lens-cell"><b>Authority boundary</b><p>May request verification, reconcile claims, map dependencies, propose treatment inputs, and revise DMO records. Cannot authorize disclosure or create a creditor financing assurance.</p></div><div className="role-lens-cell"><b>Critical handoff</b><p>Needs Treasury for cash availability and protected balances; Legal for interpretation; and the Lead for external submission and disclosure decisions.</p></div></div><div className="role-lens-foot"><p>The facilitator controls when new steps open. Select Mandate in the process rail whenever you need to reopen this brief.</p><button className="primary-button" type="button" onClick={onContinue}>Continue to my first decision</button></div></section>;
}

function StageContent({ stage, decisions, setDecisions, bundle, setBundle, setError, now }: { stage: number; decisions: DecisionState; setDecisions: (value: DecisionState) => void; bundle: ParticipantBundle; setBundle: (value: ParticipantBundle) => void; setError: (value: string) => void; now: number }) {
  const update = <K extends keyof DecisionState>(key: K, value: DecisionState[K]) => setDecisions({ ...decisions, [key]: value });
  const treasuryReconciliationAvailable = bundle.evidenceRequests.some((request) => (
    request.evidenceId === "treasury-reconciliation" && evidenceIsAvailable(request, new Date(now))
  ));
  if (stage === 0) return <section className="work-card task-card highlight"><h2>Debt Management Office mandate</h2><div className="mandate-grid"><div><small>You may</small><ul><li>Maintain and reconcile the claims record.</li><li>Request role-relevant evidence.</li><li>Assess dependencies and prepare recommendations.</li><li>Preserve uncertainty and document non-readiness.</li></ul></div><div><small>You may not</small><ul><li>Issue a sovereign commitment.</li><li>Declare a creditor assurance adequate.</li><li>Reveal evidence not released to your role.</li><li>Convert an indicative position into an agreement.</li></ul></div></div><label className="consent"><input type="checkbox" checked={decisions.mandateConfirmed} onChange={(event) => update("mandateConfirmed", event.target.checked)} /><span>I understand that the DMO prepares the record and recommendation; it does not create sovereign or creditor commitment.</span></label><TextArea label="In your own words, what is your authority boundary?" value={decisions.mandateRationale} onChange={(value) => update("mandateRationale", value)} /></section>;
  if (stage === 1) return <section className="work-card task-card highlight"><h2>Can the package rely on USD 780m?</h2><p>The cash ledger reports USD 780m. A partial memo indicates that copper revenues may pass through an account with restrictions; the control terms and amount affected have not been reconciled.</p><ChoiceGroup value={decisions.liquidityAction} onChange={(value) => update("liquidityAction", value as DecisionState["liquidityAction"])} options={[{ value: "VERIFY_NOW", title: "Verify before reliance", detail: "Request the evidence needed to establish any restriction or protected-balance effect." },{ value: "PROCEED_WITH_CAVEAT", title: "Proceed with an explicit caveat", detail: "Begin coordination now without treating the reported figure as verified." }]} /><TextArea label="Why is this the appropriate first move?" value={decisions.liquidityRationale} onChange={(value) => update("liquidityRationale", value)} /></section>;
  if (stage === 2) return <section className="work-card task-card highlight"><h2>Institutional evidence requests</h2><p>Each response takes time to obtain. The facilitator may release a response early. Requesting everything is not automatically better; compare each question with the deadlines and unresolved risks.</p><div className="evidence-list">{EVIDENCE_CATALOG.map((definition) => { const request = bundle.evidenceRequests.find((item) => item.evidenceId === definition.id); const ready = request ? evidenceIsAvailable(request, new Date(now)) : false; const seconds = request ? Math.max(0, Math.ceil((new Date(request.availableAt).getTime() - now) / 1000)) : 0; return <article key={definition.id} className={ready ? "evidence ready" : "evidence"}><div><small>{definition.requestedFrom}</small><h3>{definition.title}</h3><p>{definition.summary}</p></div>{ready ? <details><summary>Review returned evidence</summary><p>{definition.details}</p><cite>{definition.sourceLabel}</cite></details> : request ? <span className="pending-tag">Response in {seconds}s</span> : <button type="button" className="secondary-button" onClick={() => { void requestEvidence(bundle, definition.id).then(setBundle).catch((caught) => setError(caught instanceof Error ? caught.message : "Request failed")); }}>Request</button>}</article>; })}</div><InstitutionalRequestDesk bundle={bundle} setBundle={setBundle} setError={setError} /></section>;
  if (stage === 3) return <section className="work-card task-card highlight"><h2>Record the supported liquidity basis</h2><p>Record what your current evidence supports. Access to a figure is not the same as verification.</p><ChoiceGroup value={decisions.liquidityBasis} onChange={(value) => update("liquidityBasis", value as DecisionState["liquidityBasis"])} options={[{ value: "VERIFIED_480", title: treasuryReconciliationAvailable ? "USD 480m verified usable" : "Record a reconciled usable-liquidity basis", detail: treasuryReconciliationAvailable ? "Use the amount established by the returned Treasury reconciliation." : "Select only if returned Treasury evidence establishes a usable amount." },{ value: "REPORTED_780", title: "USD 780m reported, not verified", detail: "Record the reported figure as provisional rather than usable cash." },{ value: "UNRESOLVED", title: "Keep the basis unresolved", detail: "Record that the available evidence does not establish a usable amount." }]} /><TextArea label="State the evidence and caveat behind this record entry." value={decisions.liquidityBasisRationale} onChange={(value) => update("liquidityBasisRationale", value)} /></section>;
  if (stage === 4) return <section className="work-card task-card highlight"><h2>Map account control and facility dependency</h2><h3>Account classification</h3><ChoiceGroup value={decisions.accountClassification} onChange={(value) => update("accountClassification", value as DecisionState["accountClassification"])} options={[{ value: "EFFECTIVE_CONTROL", title: "Quasi-collateral / effective control", detail: "Record an effective-control classification." },{ value: "ORDINARY_ACCOUNT", title: "Ordinary operating account", detail: "Record an ordinary-account classification." },{ value: "UNRESOLVED", title: "Unresolved", detail: "Record that the available evidence does not support a classification." }]} /><h3>Facility A/B linkage</h3><ChoiceGroup value={decisions.facilityLinkage} onChange={(value) => update("facilityLinkage", value as DecisionState["facilityLinkage"])} options={[{ value: "SHARED_POOL", title: "Shared revenue pool", detail: "Record Facilities A and B as sharing a revenue pool." },{ value: "INDEPENDENT", title: "Independent facilities", detail: "Record the facilities as independent for dependency analysis." },{ value: "UNRESOLVED", title: "Linkage unresolved", detail: "Record that Facility B's relationship to RA-01 remains unconfirmed." }]} /><TextArea label="Explain the evidence supporting both entries." value={decisions.linkageRationale} onChange={(value) => update("linkageRationale", value)} /></section>;
  if (stage === 5) return <section className="work-card task-card highlight"><h2>Recommend disclosure and treatment perimeter</h2><h3>Disclosure level</h3><ChoiceGroup value={decisions.disclosure} onChange={(value) => update("disclosure", value as DecisionState["disclosure"])} options={[{ value: "FULL", title: "Full contract disclosure", detail: "Recommend release of the complete contract information." },{ value: "REDACTED", title: "Redacted functional summary", detail: "Recommend release of a summary with selected details removed." },{ value: "WITHHOLD", title: "Withhold pending consent", detail: "Recommend no external release until permission is established." }]} /><h3>Treatment perimeter</h3><ChoiceGroup value={decisions.treatmentPerimeter} onChange={(value) => update("treatmentPerimeter", value as DecisionState["treatmentPerimeter"])} options={[{ value: "BOTH_FACILITIES", title: "Carry Facilities A and B", detail: "Record both facilities inside the proposed treatment perimeter." },{ value: "FACILITY_A_ONLY", title: "Carry Facility A only", detail: "Record only Facility A inside the proposed treatment perimeter." },{ value: "DEFER", title: "Defer perimeter recommendation", detail: "Record that the evidence is insufficient to define the perimeter." }]} /><TextArea label="Explain the trade-off and the boundary of your recommendation." value={decisions.disclosureRationale} onChange={(value) => update("disclosureRationale", value)} /></section>;
  if (stage === 6) return <SubmissionStage decisions={decisions} update={update} bundle={bundle} setBundle={setBundle} setError={setError} now={now} />;
  return <section className="work-card task-card highlight"><h2>Reflection before debrief</h2><p>The facilitator holds the detailed after-action review. Record the most important change in your reasoning so it can be compared with the decision-time record.</p><TextArea label="What evidence, dependency, or authority boundary most changed your recommendation?" value={decisions.reflection} onChange={(value) => update("reflection", value)} rows={7} /><div className="completion-note"><strong>Your detailed debrief record is not shown here.</strong><span>The facilitator will reconstruct the decision sequence, realistic consequences, and what would have changed if you had acted differently.</span></div>{isLocalBundle(bundle) && <button type="button" className="secondary-button" onClick={() => downloadEmergencyHandoff(bundle, decisions)}>Download emergency handoff file</button>}</section>;
}

function InstitutionalRequestDesk({ bundle, setBundle, setError, idPrefix = "stage" }: { bundle: ParticipantBundle; setBundle: (value: ParticipantBundle) => void; setError: (value: string) => void; idPrefix?: string }) {
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
  const titleId = `${idPrefix}-exception-desk-title`;
  return <section className="exception-desk" aria-labelledby={titleId}><h3 id={titleId}>Request something not listed</h3><p>Use this only for a material question outside the routine evidence menu. The facilitator will answer in the named institutional role.</p><div className="request-compose"><label>Institution<select value={institution} onChange={(event) => setInstitution(event.target.value as InstitutionRole)}>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label><label>Request<textarea rows={3} maxLength={2000} value={question} onChange={(event) => setQuestion(event.target.value)} /></label><button type="button" className="secondary-button" disabled={busy || question.trim().length < 2} onClick={() => void send()}>{busy ? "Sending…" : "Send request"}</button></div><div className="request-history" aria-live="polite">{bundle.messages.length ? bundle.messages.map((message) => <article key={message.id}><small>{message.institution.replaceAll("_", " ")} · {message.status.toLowerCase()}</small><p><strong>You:</strong> {message.question}</p>{message.reply ? <p><strong>{message.institution.replaceAll("_", " ")}:</strong> {message.reply}</p> : <p className="muted-copy">{isLocalBundle(bundle) ? "Saved for the emergency handoff; no live facilitator is connected." : "Awaiting facilitator response."}</p>}</article>) : <p className="communications-empty">No exceptional institutional requests have been sent.</p>}</div></section>;
}

function CommunicationsPanel({ bundle, setBundle, setError, error, now, onClose }: { bundle: ParticipantBundle; setBundle: (value: ParticipantBundle) => void; setError: (value: string) => void; error: string; now: number; onClose: () => void }) {
  const [activeChannel, setActiveChannel] = useState<"facilitator" | "evidence" | "institutions">("facilitator");
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  return <div className="drawer-scrim communications-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="communications-dialog" role="dialog" aria-modal="true" aria-labelledby="communications-title" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}><header className="communications-head"><div><h2 id="communications-title">Communications</h2><p>Internal team and institutional counterparts</p></div><div className="communications-head-actions"><span className="pill"><span className="status-dot" />{bundle.messages.filter((message) => message.status === "PENDING").length} awaiting reply</span><button type="button" className="secondary-button" autoFocus onClick={onClose}>Close</button></div></header><div className="communications-layout">
    <aside className="communications-sidebar" aria-label="Communication channels"><div className="communications-sidebar-head"><strong>Channels</strong><span>Internal team + external counterparts</span></div>{[
      { id: "facilitator" as const, initials: "FR", title: "Facilitator room", subtitle: "Room-wide broadcasts", count: bundle.injects.length },
      { id: "evidence" as const, initials: "ED", title: "Evidence desk", subtitle: "Requests and returns", count: bundle.evidenceRequests.length },
      { id: "institutions" as const, initials: "IR", title: "Institutional requests", subtitle: "Counterpart correspondence", count: bundle.messages.length },
    ].map((channel) => <button key={channel.id} type="button" className={`communications-channel ${activeChannel === channel.id ? "active" : ""}`} aria-pressed={activeChannel === channel.id} onClick={() => setActiveChannel(channel.id)}><span className="communications-channel-avatar" aria-hidden="true">{channel.initials}</span><span className="communications-channel-copy"><strong>{channel.title}</strong><span>{channel.subtitle}</span></span><span className="communications-channel-count">{channel.count}</span></button>)}</aside>
    <section className="communications-thread-wrap" aria-live="polite"><div className="communications-thread-head"><div><strong>{activeChannel === "facilitator" ? "Facilitator room" : activeChannel === "evidence" ? "Evidence desk" : "Institutional requests"}</strong><span>{activeChannel === "facilitator" ? "Room-wide workshop direction" : activeChannel === "evidence" ? "Routine evidence correspondence" : "Finance Ministry, Legal, Treasury, creditors, and IMF"}</span></div><span className="communications-visibility">{activeChannel === "facilitator" ? "Internal" : "Recorded"}</span></div><div className="communications-thread" tabIndex={0}>
      {error && <div className="error-panel" role="alert">{error}</div>}
      {activeChannel === "facilitator" && (bundle.injects.length ? <div className="communications-list">{bundle.injects.map((inject) => <article key={inject.id}><small>{new Date(inject.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small><strong>{inject.title}</strong><p>{inject.body}</p></article>)}</div> : <p className="communications-empty">No facilitator broadcasts yet.</p>)}
      {activeChannel === "evidence" && (bundle.evidenceRequests.length ? <div className="communications-list">{bundle.evidenceRequests.map((request) => { const definition = EVIDENCE_CATALOG.find((item) => item.id === request.evidenceId); const ready = evidenceIsAvailable(request, new Date(now)); return <article key={request.id}><small>{definition?.requestedFrom ?? "Institution"} · {ready ? "returned" : "in flight"}</small><strong>{definition?.title ?? "Evidence request"}</strong><p>{ready ? definition?.details : `Requested ${new Date(request.requestedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. This response takes time to obtain unless the facilitator releases it early.`}</p>{ready && definition && <cite>{definition.sourceLabel}</cite>}</article>; })}</div> : <p className="communications-empty">No routine evidence has been requested. Requests are initiated in the Evidence stage.</p>)}
      {activeChannel === "institutions" && <InstitutionalRequestDesk bundle={bundle} setBundle={setBundle} setError={setError} idPrefix="communications" />}
    </div></section>
    <aside className="communications-context" aria-label="Channel context"><span className="eyebrow">Channel context</span><h3>{activeChannel === "facilitator" ? "Workshop direction" : activeChannel === "evidence" ? "Evidence record" : "Institutional role-play"}</h3><p>{activeChannel === "facilitator" ? "Broadcasts are issued by the facilitator to every participant in the shared scenario." : activeChannel === "evidence" ? "Routine evidence responses follow authored scenario rules. Returned material becomes part of your decision record." : "Unusual requests are routed to the facilitator, who replies in the selected institutional role."}</p><dl><div><dt>Broadcasts</dt><dd>{bundle.injects.length}</dd></div><div><dt>Evidence requests</dt><dd>{bundle.evidenceRequests.length}</dd></div><div><dt>Institutional messages</dt><dd>{bundle.messages.length}</dd></div></dl></aside>
  </div><footer className="communications-footnote"><span><strong>Process evidence:</strong> requests, responses, and facilitator interventions are preserved for replay.</span><span>Message volume and response speed are not competence measures.</span></footer></section></div>;
}

function SubmissionStage({ decisions, update, bundle, setBundle, setError, now }: { decisions: DecisionState; update: <K extends keyof DecisionState>(key: K, value: DecisionState[K]) => void; bundle: ParticipantBundle; setBundle: (value: ParticipantBundle) => void; setError: (value: string) => void; now: number }) {
  const canSubmit = negotiationBriefIsSubmittable(decisions);
  const preparedAt = new Date(now);
  const review = reviewRecommendation({ decisions, evidenceRequests: bundle.evidenceRequests, reviewedAt: preparedAt });
  const brief = buildNegotiationPreparationBrief({ decisions, evidenceRequests: bundle.evidenceRequests, institutionalMessages: bundle.messages, preparedAt });
  return <section className="work-card task-card highlight"><h2>Negotiation-preparation brief</h2><p>This is an internal DMO recommendation for Finance Ministry preparation. It is not a negotiated result, agreement, assurance, or sovereign commitment. A conditional or not-ready brief may preserve unresolved evidence.</p><h3>Position</h3><ChoiceGroup accessibleLabel="Position" value={decisions.readiness} onChange={(value) => update("readiness", value as DecisionState["readiness"])} options={[{ value: "READY", title: "Ready", detail: "The evidence state supports advancing the DMO package without a blocking dependency." },{ value: "READY_WITH_CONDITIONS", title: "Ready with conditions", detail: "Advance only with the conditions and unresolved dependencies stated." },{ value: "NOT_READY", title: "Not ready", detail: "The DMO record does not support advancing the package." }]} /><TextArea label="Conditions to advance" value={decisions.unresolvedRisks} onChange={(value) => update("unresolvedRisks", value)} /><TextArea label="Next institutional handoff" value={decisions.nextHandoff} onChange={(value) => update("nextHandoff", value)} rows={3} maxLength={400} /><TextArea label="Recommendation to the Finance Ministry Lead" value={decisions.finalRationale} onChange={(value) => update("finalRationale", value)} rows={6} /><section className="brief-review" aria-labelledby="brief-review-title"><div className="brief-review-heading"><div><span className="eyebrow">Internal DMO artifact</span><h3 id="brief-review-title">Negotiation-preparation brief</h3></div><span className="pill">Draft</span></div><dl><div><dt>Position</dt><dd>{brief.position}</dd></div><div><dt>Evidence basis</dt><dd>{brief.evidenceBasis.length ? <ul>{brief.evidenceBasis.map((item) => <li key={item.id}><strong>{item.title}</strong><span>{item.summary} <cite>{item.sourceLabel}</cite></span></li>)}</ul> : "No requested evidence is available yet."}</dd></div><div><dt>Known uncertainties</dt><dd>{brief.knownUncertainties.length ? <ul>{brief.knownUncertainties.map((item) => <li key={item}>{item}</li>)}</ul> : "No material uncertainty identified by the recommendation check."}</dd></div><div><dt>Disclosure boundary</dt><dd>{brief.disclosureBoundary}</dd></div><div><dt>Treatment perimeter</dt><dd>{brief.treatmentPerimeter}</dd></div><div><dt>Conditions to advance</dt><dd>{brief.conditionsToAdvance}</dd></div><div><dt>Next institutional handoff</dt><dd>{brief.nextInstitutionalHandoff}</dd></div><div><dt>Recommendation to the Finance Ministry Lead</dt><dd>{brief.financeMinistryRecommendation}</dd></div></dl></section><section aria-labelledby="recommendation-check-title"><h3 id="recommendation-check-title">Recommendation check</h3><p>This compares each selected claim with evidence available now. It does not score or choose a recommendation.</p><div className="evidence-list">{review.items.map((item) => <article key={item.claim} className={item.status === "SUPPORTED" ? "evidence ready" : "evidence"}><div><small>{item.label}</small><h3>{item.recordedClaim}</h3><p>{item.explanation}</p></div><span className="pill" aria-label={`${item.label}: ${item.status.toLowerCase()}`}>{item.status}</span></article>)}</div>{review.readyMismatch && <div className="error-panel" role="status"><span><strong>READY does not match the current evidence state.</strong> {review.mismatchExplanation}</span></div>}</section><div className="submission-bar"><div><strong>{bundle.submissions.length} version{bundle.submissions.length === 1 ? "" : "s"} submitted</strong><span role="status">{canSubmit ? "Each version retains its brief, evidence state, and next institutional handoff." : "Record a position, next institutional handoff, and Finance Ministry recommendation to submit."}</span></div><button type="button" className="record-button" disabled={!canSubmit || bundle.session.submissionsClosed} onClick={() => { void saveDecisions(bundle, decisions, 6).then((saved) => submitRecommendation(saved)).then(setBundle).catch((caught) => setError(caught instanceof Error ? caught.message : "Submission failed")); }}>{bundle.session.submissionsClosed ? "Submissions closed" : "Submit brief"}</button></div></section>;
}

function ChoiceGroup({ value, onChange, options, accessibleLabel }: { value?: string; onChange: (value: string) => void; options: Array<{ value: string; title: string; detail: string }>; accessibleLabel?: string }) {
  return <div className="choice-grid" role={accessibleLabel ? "group" : undefined} aria-label={accessibleLabel}>{options.map((option) => <button type="button" key={option.value} className={value === option.value ? "choice selected" : "choice"} aria-pressed={value === option.value} onClick={() => onChange(option.value)}><span className="choice-indicator" /><strong>{option.title}</strong><small>{option.detail}</small></button>)}</div>;
}

function TextArea({ label, value, onChange, rows = 4, maxLength = 1600 }: { label: string; value: string; onChange: (value: string) => void; rows?: number; maxLength?: number }) {
  return <label className="textarea-field"><span>{label}</span><textarea rows={rows} maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} /><small>{value.length} / {maxLength}</small></label>;
}

function advisorSourceText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function AdvisorSources({ sources }: { sources?: AdvisorCitation[] }) {
  if (!Array.isArray(sources) || !sources.length) return null;
  return <details className="advisor-sources"><summary>Sources ({sources.length})</summary><ul>{sources.map((source, index) => {
    const claimId = advisorSourceText(source?.claimId, "Claim ID unavailable");
    const sourceId = advisorSourceText(source?.sourceId, "Source ID unavailable");
    return <li key={`${claimId}-${index}`}><strong>{advisorSourceText(source?.sourceTitle, "Source title unavailable")}</strong><span>{sourceClassLabel(source?.sourceClass)}</span><span>{advisorSourceText(source?.pageReference, "Page reference unavailable")}</span><span><code>{claimId}</code> · <code>{sourceId}</code></span></li>;
  })}</ul></details>;
}

function AdvisorPanel({ bundle, setBundle, onClose }: { bundle: ParticipantBundle; setBundle: (value: ParticipantBundle) => void; onClose: () => void }) {
  const [advisorId, setAdvisorId] = useState<AdvisorId>("amara");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceReply, setVoiceReply] = useState(true);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [revealingReply, setRevealingReply] = useState<{ turnId: string; text: string; advisorName: string } | null>(null);
  const [revealedReply, setRevealedReply] = useState("");
  const [replyAnnouncement, setReplyAnnouncement] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const conversation = useRef<HTMLDivElement | null>(null);
  const turns = useMemo(() => bundle.advisorTurns.filter((turn) => turn.advisorId === advisorId), [bundle.advisorTurns, advisorId]);
  const profile = ADVISOR_PROFILES[advisorId];

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const synthesis = "speechSynthesis" in window ? window.speechSynthesis : null;
    const refreshVoices = () => setAvailableVoices(synthesis?.getVoices() ?? []);
    refreshVoices();
    synthesis?.addEventListener("voiceschanged", refreshVoices);
    return () => {
      document.body.style.overflow = previousOverflow;
      synthesis?.removeEventListener("voiceschanged", refreshVoices);
      synthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (!revealingReply) return;
    const responseChunks = splitAdvisorResponse(revealingReply.text);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let visibleChunkCount = 0;
    let timer = 0;

    const complete = () => {
      setRevealedReply(revealingReply.text);
      setReplyAnnouncement(`${revealingReply.advisorName} replied: ${revealingReply.text}`);
      setRevealingReply(null);
    };
    if (reducedMotion || responseChunks.length === 0) {
      complete();
      return;
    }

    setRevealedReply("");
    const revealNextWord = () => {
      visibleChunkCount += 1;
      setRevealedReply(revealAdvisorResponse(responseChunks, visibleChunkCount));
      if (visibleChunkCount >= responseChunks.length) complete();
      else timer = window.setTimeout(revealNextWord, ADVISOR_RESPONSE_REVEAL_INTERVAL_MS);
    };
    timer = window.setTimeout(revealNextWord, ADVISOR_RESPONSE_REVEAL_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [revealingReply]);

  useEffect(() => {
    if (conversation.current) conversation.current.scrollTop = conversation.current.scrollHeight;
  }, [busy, revealedReply, advisorId]);

  function speakAdvisorText(text: string) {
    if (!("speechSynthesis" in window)) {
      setError("Spoken replies are not supported in this browser. The complete transcript remains visible.");
      return;
    }
    const voiceProfile = ADVISOR_VOICE_PROFILES[advisorId];
    const selectedVoice = selectAdvisorVoice(availableVoices, advisorId);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = voiceProfile.rate;
    utterance.pitch = voiceProfile.pitch;
    utterance.lang = selectedVoice?.lang ?? "en-US";
    if (selectedVoice) utterance.voice = selectedVoice;
    window.speechSynthesis.speak(utterance);
  }

  async function send() {
    const prompt = question.trim(); if (!prompt) return;
    setBusy(true); setError("");
    try {
      const turn = await askAdvisor(bundle, advisorId, prompt);
      setBundle({ ...bundle, advisorTurns: [...bundle.advisorTurns, turn] });
      setQuestion("");
      setReplyAnnouncement("");
      setRevealingReply({ turnId: turn.id, text: turn.answer, advisorName: profile.shortName });
      if (voiceReply) speakAdvisorText(turn.answer);
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

  function playWelcome(welcome: string) {
    speakAdvisorText(welcome);
  }

  return <div className="advisor-workspace-scrim" role="presentation"><section className="advisor-workspace" role="dialog" aria-modal="true" aria-labelledby="advisor-title" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}><header className="advisor-workspace-head"><div><h2 id="advisor-title">AI advisors</h2><p>Two case-grounded advisors explain evidence and process boundaries. They will not make your decision.</p></div><button className="secondary-button" type="button" autoFocus onClick={onClose}>Close</button></header><div className="advisor-workspace-body">
    <aside className="advisor-briefs" aria-label="Advisor briefs"><div className="advisor-selector" aria-label="Choose an advisor">{(Object.entries(ADVISOR_PROFILES) as Array<[AdvisorId, typeof profile]>).map(([id, advisor]) => <button key={id} type="button" aria-pressed={advisorId === id} onClick={() => setAdvisorId(id)}><img src={advisor.image} alt="" /><span><strong>{advisor.name}</strong><small>{advisor.shortName === "Amara" ? "Country and process" : "Contracts and treatment"}</small></span></button>)}</div><article className="advisor-brief-card selected"><div className="advisor-brief-head"><img src={profile.image} alt={profile.name} /><div><strong>{profile.name}</strong><small>{profile.bio}</small><span>{profile.role}</span></div></div><p>{profile.brief}</p><details className="advisor-welcome-message"><summary>Read welcome transcript</summary><p>{profile.welcome}</p></details><div className="advisor-brief-actions"><button type="button" className="text-button" onClick={() => playWelcome(profile.welcome)}>Play welcome</button></div></article></aside>
    <section className="advisor-chat" aria-labelledby="active-advisor-name"><header className="advisor-chat-head"><div className="advisor-person"><img src={profile.image} alt="" /><div><span className="eyebrow">Active advisor</span><h3 id="active-advisor-name">{profile.name}</h3><p className="advisor-active-bio">{profile.bio}</p><small>{profile.role}</small></div></div></header><div ref={conversation} className="advisor-conversation" role="log" aria-live="off" aria-busy={busy || Boolean(revealingReply)} aria-label={`Conversation with ${profile.name}`} tabIndex={0}><article className="advisor-opening"><div className="answer"><strong>{profile.shortName}</strong><p>{profile.greeting}</p></div></article>{turns.map((turn) => { const isRevealing = revealingReply?.turnId === turn.id; return <article key={turn.id}><div className="question"><strong>You</strong><p>{turn.question}</p></div><div className="answer"><strong>{profile.shortName}</strong><p aria-hidden={isRevealing || undefined}>{isRevealing ? revealedReply : turn.answer}{isRevealing && <span className="advisor-stream-cursor" aria-hidden="true" />}</p>{!isRevealing && <AdvisorSources sources={turn.sources} />}</div></article>; })}{busy && <article className="advisor-thinking" role="status"><div className="answer"><strong>{profile.shortName}</strong><p>Considering the visible record<span aria-hidden="true">…</span></p></div></article>}</div><div className="sr-only" aria-live="polite" aria-atomic="true">{replyAnnouncement}</div><div className="advisor-suggestions" aria-label={`Suggested questions for ${profile.name}`}>{profile.suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => setQuestion(suggestion)}>{suggestion}</button>)}</div>{error && <div className="error-panel advisor-error" role="alert">{error}</div>}<div className="advisor-compose"><label><span>Review or edit the transcript before sending</span><textarea rows={3} maxLength={2000} value={question} onChange={(event) => setQuestion(event.target.value)} /></label><div><button type="button" className={recording ? "voice-button recording" : "voice-button"} aria-pressed={recording} disabled={busy} onPointerDown={() => void startRecording()} onPointerUp={stopRecording} onPointerLeave={stopRecording} onKeyDown={(event) => { if (!event.repeat && (event.key === " " || event.key === "Enter")) { event.preventDefault(); void startRecording(); } }} onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); stopRecording(); } }}>{recording ? "Release to transcribe" : "Hold to speak"}</button><label className="voice-toggle"><input type="checkbox" checked={voiceReply} onChange={(event) => setVoiceReply(event.target.checked)} />Speak replies</label><button type="button" className="primary-button" disabled={busy || !question.trim()} onClick={() => void send()}>{busy ? "Working…" : "Ask advisor"}</button></div></div><footer>AI advisor · evidence available in your case record only · no hidden-state disclosure · no decision recommendation</footer></section>
  </div></section></div>;
}
