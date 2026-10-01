import { useEffect, useState } from "react";
import {
  answerInstitutionalRequest,
  cloudEnabled,
  createWorkshopSession,
  currentUser,
  deleteSession,
  facilitatorSignOut,
  listWorkshopSessions,
  loadFacilitatorSession,
  removeParticipant,
  releaseEvidence,
  sendFacilitatorMagicLink,
  sendGlobalInject,
  updateWorkshopSession,
} from "./data";
import { buildAfterActionReport } from "./engine";
import {
  afterActionReportHtml,
  downloadReportHtml,
  downloadReportJson,
  downloadReportPdf,
  downloadWorkshopCsv,
  downloadWorkshopHtml,
  downloadWorkshopJson,
  downloadWorkshopPdf,
  workshopComparisonHtml,
} from "./report";
import { EVIDENCE_CATALOG, FACILITATOR_EMAIL, INJECT_PRESETS, STAGES } from "./scenario";
import { ThemeButton } from "./ThemeButton";
import type { AfterActionReport, DecisionState, ParticipantProfile, WorkshopSession } from "./types";

type FacilitatorData = Awaited<ReturnType<typeof loadFacilitatorSession>>;
type ConsoleView = "overview" | "participants" | "communications" | "injects" | "analytics" | "replay";

const emptyData: FacilitatorData = { participants: [], evidence: [], submissions: [], injects: [], messages: [], turns: [], events: [] };

function sessionClock(session: WorkshopSession): number {
  if (session.status !== "RUNNING" || !session.clockStartedAt) return session.remainingSeconds;
  return Math.max(0, session.remainingSeconds - Math.floor((Date.now() - new Date(session.clockStartedAt).getTime()) / 1000));
}

function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function FacilitatorApp() {
  const [authState, setAuthState] = useState<"CHECKING" | "SIGNED_OUT" | "AUTHORIZED" | "DENIED">("CHECKING");
  const [sessions, setSessions] = useState<WorkshopSession[]>([]);
  const [selected, setSelected] = useState<WorkshopSession | null>(null);
  const [data, setData] = useState<FacilitatorData>(emptyData);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<ConsoleView>("overview");
  const [, rerender] = useState(0);

  async function refreshSessions(selectId?: string) {
    const rows = await listWorkshopSessions();
    setSessions(rows);
    const next = rows.find((item) => item.id === (selectId ?? selected?.id)) ?? rows[0] ?? null;
    setSelected(next);
    if (next) setData(await loadFacilitatorSession(next));
  }

  useEffect(() => {
    if (!cloudEnabled) { setAuthState("SIGNED_OUT"); return; }
    void currentUser().then((user) => {
      if (!user) setAuthState("SIGNED_OUT");
      else if (user.email?.toLowerCase() === FACILITATOR_EMAIL) { setAuthState("AUTHORIZED"); void refreshSessions(); }
      else setAuthState("DENIED");
    });
  }, []);

  useEffect(() => {
    if (authState !== "AUTHORIZED" || !selected) return;
    const timer = window.setInterval(() => {
      rerender((value) => value + 1);
      void Promise.all([listWorkshopSessions(), loadFacilitatorSession(selected)]).then(([rows, fresh]) => {
        setSessions(rows);
        const updated = rows.find((item) => item.id === selected.id);
        if (updated) setSelected(updated);
        setData(fresh);
      }).catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [authState, selected?.id]);

  if (authState !== "AUTHORIZED") return <FacilitatorLogin state={authState} error={error} setError={setError} setState={setAuthState} />;

  const reports = selected ? data.participants.map(({ participant, decisions }) => reportFor(participant, decisions, selected, data)) : [];

  async function create(kind: "REHEARSAL" | "LIVE") {
    setBusy(true); setError("");
    try { const session = await createWorkshopSession(kind); await refreshSessions(session.id); setNotice(`${kind.toLowerCase()} session created.`); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to create session"); }
    finally { setBusy(false); }
  }

  async function patchSession(patch: Record<string, unknown>) {
    if (!selected) return;
    setBusy(true);
    try { await updateWorkshopSession(selected.id, patch); await refreshSessions(selected.id); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Session update failed"); }
    finally { setBusy(false); }
  }

  async function toggleClock() {
    if (!selected) return;
    if (selected.status === "RUNNING") await patchSession({ status: "PAUSED", remaining_seconds: sessionClock(selected), clock_started_at: null });
    else await patchSession({ status: "RUNNING", clock_started_at: new Date().toISOString() });
  }

  return <div className="facilitator-shell facilitator-reference">
    <a className="skip-link" href="#facilitator-main">Skip to facilitator controls</a>
    <header className="facilitator-topbar"><div className="brand"><div className="brand-mark">FC</div><div className="brand-copy"><strong>Sovereign · Facilitator</strong><span>Futures Lab · Kuvera Financing Assurances</span></div></div><div className="top-actions"><span className="persona-pill tone-ok"><span className="dot" />Authenticated · {FACILITATOR_EMAIL}</span><ThemeButton /><button type="button" className="text-button" onClick={() => void facilitatorSignOut().then(() => setAuthState("SIGNED_OUT"))}>Sign out</button></div></header>
    <div className="facilitator-layout">
      <aside className="facilitator-nav"><nav className="workspace-nav" aria-label="Facilitator workspace"><span className="eyebrow">Session control</span><button type="button" aria-current={view === "overview" ? "page" : undefined} onClick={() => setView("overview")}>Live overview</button><button type="button" aria-current={view === "participants" ? "page" : undefined} onClick={() => setView("participants")}>Participants <span>{data.participants.length}</span></button><button type="button" aria-current={view === "communications" ? "page" : undefined} onClick={() => setView("communications")}>Communications <span>{data.messages.filter((item) => item.status === "PENDING").length}</span></button><button type="button" aria-current={view === "injects" ? "page" : undefined} onClick={() => setView("injects")}>Injects &amp; updates</button><button type="button" aria-current={view === "analytics" ? "page" : undefined} onClick={() => setView("analytics")}>Platform analytics</button><button type="button" aria-current={view === "replay" ? "page" : undefined} onClick={() => setView("replay")}>Replay &amp; debrief</button></nav><div className="nav-head"><span className="eyebrow">Workshop sessions</span><div><button type="button" onClick={() => void create("REHEARSAL")} disabled={busy}>+ Rehearsal</button><button type="button" onClick={() => void create("LIVE")} disabled={busy}>+ Live</button></div></div>{sessions.length === 0 && <p className="empty-copy">Create a rehearsal session first.</p>}{sessions.map((session) => <button key={session.id} type="button" className={selected?.id === session.id ? "session-link active" : "session-link"} onClick={() => { setSelected(session); void loadFacilitatorSession(session).then(setData); }}><span><strong>{session.kind}</strong><small>{new Date(session.createdAt).toLocaleDateString()}</small></span><em>{session.status}</em></button>)}</aside>
      <main className="facilitator-main" id="facilitator-main">
        {!selected ? <section className="empty-state"><h1>No workshop session</h1><p>Create a rehearsal or live session to begin.</p></section> : <>
          <div className="facilitator-heading"><div><span className="eyebrow">{selected.kind} session</span><h1>{selected.title}</h1><p>Join code <strong className="join-code">{selected.joinCode}</strong> · {data.participants.length} participants</p></div><div className="facilitator-clock"><span>{selected.status}</span><strong>{formatClock(sessionClock(selected))}</strong><button type="button" onClick={() => void toggleClock()}>{selected.status === "RUNNING" ? "Pause" : "Start / resume"}</button></div></div>
          {error && <div className="error-panel" role="alert">{error}</div>}{notice && <div className="success-panel" role="status">{notice}</div>}
          {view === "overview" && <><section className="control-strip"><div><small>Current phase · concrete experience</small><strong>{selected.currentStage + 1}. {STAGES[selected.currentStage].title}</strong></div><button type="button" disabled={selected.currentStage === 0} onClick={() => void patchSession({ current_stage: selected.currentStage - 1 })}>Previous</button><button type="button" disabled={selected.currentStage === 7} onClick={() => void patchSession({ current_stage: selected.currentStage + 1 })}>Unlock next stage</button><button type="button" onClick={() => void patchSession({ status: "DEBRIEF", submissions_closed: true, clock_started_at: null, remaining_seconds: sessionClock(selected) })}>Begin debrief</button></section><div className="metric-grid"><Metric label="Connected participants" value={data.participants.length} /><Metric label="Active in last 2 min" value={data.participants.filter(({ participant }) => Date.now() - new Date(participant.lastActiveAt).getTime() < 120000).length} /><Metric label="Submitted" value={data.participants.filter(({ participant }) => data.submissions.some((item) => item.participantId === participant.id)).length} /><Metric label="Pending requests" value={data.messages.filter((item) => item.status === "PENDING").length} /></div></>}
          {view === "participants" && <ParticipantMonitor data={data} reports={reports} afterRemove={() => void refreshSessions(selected.id)} />}
          {view === "communications" && <RequestDesk data={data} afterReply={() => void refreshSessions(selected.id)} />}
          {view === "injects" && <div className="facilitator-grid"><InjectDesk session={selected} afterSend={() => void refreshSessions(selected.id)} /><EvidenceDesk data={data} afterRelease={() => void refreshSessions(selected.id)} /></div>}
          {view === "analytics" && <ReportDesk reports={reports} />}
          {view === "replay" && <><ReportDesk reports={reports} /><section className="danger-zone"><div><strong>Session lifecycle</strong><span>Closing preserves records until expiry. Deleting removes the session and all associated records immediately.</span></div><button type="button" onClick={() => void patchSession({ status: "CLOSED", submissions_closed: true, clock_started_at: null, remaining_seconds: sessionClock(selected) })}>Close session</button><button type="button" className="danger-button" onClick={() => { if (confirm("Delete this session and all participant records? This cannot be undone.")) void deleteSession(selected.id).then(() => refreshSessions()); }}>Delete now</button></section></>}
        </>}
      </main>
    </div>
  </div>;
}

function FacilitatorLogin({ state, error, setError, setState }: { state: string; error: string; setError: (value: string) => void; setState: (value: "CHECKING" | "SIGNED_OUT" | "AUTHORIZED" | "DENIED") => void }) {
  const [sent, setSent] = useState(false);
  if (state === "CHECKING") return <main className="center-page"><p>Checking facilitator access…</p></main>;
  return <main className="center-page facilitator-reference"><section className="login-card"><span className="brand-mark large">FC</span><span className="eyebrow">Facilitator access</span><h1>Sovereign · Facilitator</h1><p>Futures Lab · Kuvera Financing Assurances</p>{!cloudEnabled ? <div className="error-panel">Configure Supabase to use the facilitator console. Local emergency mode is participant-only.</div> : state === "DENIED" ? <><div className="error-panel">This account is not authorized as the workshop facilitator.</div><button type="button" className="secondary-button" onClick={() => void facilitatorSignOut().then(() => setState("SIGNED_OUT"))}>Use another account</button></> : <><p>A passwordless sign-in link will be sent to the authorized facilitator address.</p>{error && <div className="error-panel">{error}</div>}{sent ? <div className="success-panel">Check {FACILITATOR_EMAIL} for the sign-in link.</div> : <button type="button" className="primary-button full" onClick={() => { setError(""); void sendFacilitatorMagicLink(FACILITATOR_EMAIL).then(() => setSent(true)).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to send link")); }}>Email sign-in link</button>}</>}</section></main>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="metric"><strong>{value}</strong><span>{label}</span></div>; }

function ParticipantMonitor({ data, reports, afterRemove }: { data: FacilitatorData; reports: AfterActionReport[]; afterRemove: () => void }) {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<AfterActionReport | null>(null);
  const [error, setError] = useState("");
  const rows = data.participants.filter(({ participant }) => `${participant.name} ${participant.organization} ${participant.email}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="console-card wide"><header><div><span className="eyebrow">Live operating picture</span><h2>Participant progress</h2></div><label className="compact-label">Search participants<input placeholder="Name, organization, or email" value={query} onChange={(event) => setQuery(event.target.value)} /></label></header>{error && <div className="error-panel" role="alert">{error}</div>}<div className="table-wrap"><table><thead><tr><th scope="col">Participant</th><th scope="col">Stage</th><th scope="col">Evidence</th><th scope="col">Liquidity</th><th scope="col">Readiness</th><th scope="col">Open risks</th><th scope="col">Last active</th><th scope="col">Actions</th></tr></thead><tbody>{rows.map(({ participant, decisions }) => { const participantReport = reports.find((item) => item.participant.id === participant.id); const requests = data.evidence.filter((item) => item.participantId === participant.id); const pending = requests.filter((item) => !item.releasedAt && new Date(item.availableAt).getTime() > Date.now()).length; return <tr key={participant.id}><td><strong>{participant.name}</strong><small>{participant.organization}<br />{participant.email}</small></td><td>{participant.currentStage + 1}. {STAGES[participant.currentStage].short}</td><td>{requests.length} requested<small>{pending} pending</small></td><td>{decisions.liquidityBasis?.replaceAll("_", " ") ?? "—"}</td><td>{decisions.readiness?.replaceAll("_", " ") ?? "Not submitted"}</td><td>{participantReport?.unresolvedRisks.length ?? 0}</td><td>{new Date(participant.lastActiveAt).toLocaleTimeString()}</td><td><button type="button" className="text-button" onClick={() => setReport(participantReport ?? null)}>Open AAR</button><button type="button" className="text-button danger-text" onClick={() => { if (confirm(`Remove ${participant.name} and their workshop record as an invalid or duplicate registration?`)) void removeParticipant(participant.id).then(afterRemove).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to remove participant")); }}>Remove</button></td></tr>; })}</tbody></table></div>{rows.length === 0 && <p className="empty-copy">No participants match this view.</p>}{report && <ReportModal report={report} onClose={() => setReport(null)} />}</section>;
}

function InjectDesk({ session, afterSend }: { session: WorkshopSession; afterSend: () => void }) {
  const [title, setTitle] = useState(INJECT_PRESETS[0].title);
  const [body, setBody] = useState(INJECT_PRESETS[0].body);
  const [busy, setBusy] = useState(false);
  return <section className="console-card"><span className="eyebrow">All participants</span><h2>Send an inject</h2><label>Preset<select onChange={(event) => { const preset = INJECT_PRESETS[Number(event.target.value)]; setTitle(preset.title); setBody(preset.body); }}>{INJECT_PRESETS.map((preset, index) => <option key={preset.title} value={index}>{preset.title}</option>)}</select></label><label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Message<textarea rows={4} maxLength={2000} value={body} onChange={(event) => setBody(event.target.value)} /></label><button type="button" className="primary-button" disabled={busy || !title.trim() || !body.trim()} onClick={() => { setBusy(true); void sendGlobalInject(session.id, title, body).then(afterSend).finally(() => setBusy(false)); }}>{busy ? "Sending…" : "Broadcast inject"}</button></section>;
}

function EvidenceDesk({ data, afterRelease }: { data: FacilitatorData; afterRelease: () => void }) {
  const participantName = (id: string) => data.participants.find((item) => item.participant.id === id)?.participant.name ?? "Unknown participant";
  const pending = data.evidence.filter((item) => !item.releasedAt && new Date(item.availableAt).getTime() > Date.now());
  return <section className="console-card"><span className="eyebrow">Authored delays</span><h2>Pending evidence</h2>{pending.length === 0 ? <p className="empty-copy">No evidence is waiting for release.</p> : <div className="pending-list">{pending.map((request) => <div key={request.id}><span><strong>{EVIDENCE_CATALOG.find((item) => item.id === request.evidenceId)?.title}</strong><small>{participantName(request.participantId)} · due {new Date(request.availableAt).toLocaleTimeString()}</small></span><button type="button" onClick={() => void releaseEvidence(request.id).then(afterRelease)}>Release now</button></div>)}</div>}</section>;
}

function RequestDesk({ data, afterReply }: { data: FacilitatorData; afterReply: () => void }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const participantName = (id: string) => data.participants.find((item) => item.participant.id === id)?.participant.name ?? "Unknown participant";
  const messages = [...data.messages].sort((a, b) => Number(a.status === "ANSWERED") - Number(b.status === "ANSWERED") || a.createdAt.localeCompare(b.createdAt));
  async function answer(messageId: string) {
    const reply = drafts[messageId]?.trim(); if (!reply) return;
    setBusyId(messageId);
    try { await answerInstitutionalRequest(messageId, reply); setDrafts((current) => ({ ...current, [messageId]: "" })); afterReply(); }
    finally { setBusyId(""); }
  }
  return <section className="console-card wide"><span className="eyebrow">Role-play queue</span><h2>Institutional request desk</h2><p>Answer exceptional participant questions as the selected institution. Routine evidence requests remain automated.</p>{messages.length === 0 ? <p className="empty-copy">No exceptional requests have been sent.</p> : <div className="request-queue">{messages.map((message) => <article key={message.id}><header><span><strong>{participantName(message.participantId)}</strong><small>{message.institution.replaceAll("_", " ")} · {new Date(message.createdAt).toLocaleTimeString()}</small></span><em>{message.status}</em></header><p>{message.question}</p>{message.status === "ANSWERED" ? <div className="institution-reply"><strong>Reply</strong><p>{message.reply}</p></div> : <div className="reply-compose"><label>Reply as {message.institution.replaceAll("_", " ")}<textarea rows={3} maxLength={4000} value={drafts[message.id] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [message.id]: event.target.value }))} /></label><button type="button" className="primary-button" disabled={busyId === message.id || !(drafts[message.id]?.trim())} onClick={() => void answer(message.id)}>{busyId === message.id ? "Sending…" : "Send reply"}</button></div>}</article>)}</div>}</section>;
}

function ReportDesk({ reports }: { reports: AfterActionReport[] }) {
  const [anonymous, setAnonymous] = useState(true);
  function preview() { const url = URL.createObjectURL(new Blob([workshopComparisonHtml(reports, anonymous)], { type: "text/html;charset=utf-8" })); window.open(url, "_blank", "noopener,noreferrer"); window.setTimeout(() => URL.revokeObjectURL(url), 60000); }
  return <section className="console-card wide"><header><div><span className="eyebrow">Facilitator-only</span><h2>Workshop comparison and exports</h2></div><label className="inline-check"><input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} />Anonymize projected comparison</label></header><p>Compare decision pathways, evidence use, and unresolved risk without scoring or ranking participants.</p><div className="export-actions"><button type="button" onClick={preview} disabled={!reports.length}>Preview report</button><button type="button" onClick={() => void downloadWorkshopPdf(reports, anonymous)} disabled={!reports.length}>PDF</button><button type="button" onClick={() => downloadWorkshopHtml(reports, anonymous)} disabled={!reports.length}>HTML</button><button type="button" onClick={() => downloadWorkshopCsv(reports)} disabled={!reports.length}>CSV with roster</button><button type="button" onClick={() => downloadWorkshopJson(reports)} disabled={!reports.length}>JSON evidence</button></div></section>;
}

function ReportModal({ report, onClose }: { report: AfterActionReport; onClose: () => void }) {
  return <div className="modal-scrim" role="presentation"><section className="report-modal" role="dialog" aria-modal="true" aria-label={`After-action report for ${report.participant.name}`}><header><div><span className="eyebrow">Facilitator-only report</span><h2>{report.participant.name}</h2><p>{report.participant.organization} · {report.participant.email}</p></div><button type="button" className="icon-button" onClick={onClose}>×</button></header><iframe title="After-action report preview" srcDoc={afterActionReportHtml(report)} sandbox="allow-same-origin" /><footer><button type="button" onClick={() => void downloadReportPdf(report)}>Download PDF</button><button type="button" onClick={() => downloadReportHtml(report)}>Download HTML</button><button type="button" onClick={() => downloadReportJson(report)}>Download JSON</button><button type="button" className="primary-button" onClick={onClose}>Close</button></footer></section></div>;
}

function reportFor(participant: ParticipantProfile, decisions: DecisionState, session: WorkshopSession, data: FacilitatorData): AfterActionReport {
  return buildAfterActionReport({
    participant,
    decisions,
    session,
    evidenceRequests: data.evidence.filter((item) => item.participantId === participant.id),
    submissions: data.submissions.filter((item) => item.participantId === participant.id),
    advisorTurns: data.turns.filter((item) => item.participantId === participant.id),
    injects: data.injects,
    institutionalMessages: data.messages.filter((item) => item.participantId === participant.id),
    timeline: data.events.filter((item) => item.participantId === participant.id || item.participantId === undefined),
  });
}
