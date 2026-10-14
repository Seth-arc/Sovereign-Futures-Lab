import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  answerInstitutionalRequest,
  cloudEnabled,
  createWorkshopSession,
  currentUser,
  deletionConfirmationMatches,
  deleteSession,
  facilitatorSignOut,
  listWorkshopSessions,
  loadFacilitatorReportData,
  loadFacilitatorSession,
  removeParticipant,
  releaseEvidence,
  sendFacilitatorMagicLink,
  sendGlobalInject,
  subscribeToFacilitatorWorkshop,
  updateWorkshopSession,
} from "./data";
import {
  beginDebriefSession,
  buildAfterActionReport,
  caseworkClockActionLabel,
  debriefConfirmationMessage,
  nextParticipantStageUnlock,
  remainingSessionSeconds,
  selectAfterActionReportSubmission,
  toggleCaseworkClock,
} from "./engine";
import {
  beginFacilitatorRefresh,
  completeFacilitatorRefresh,
  failFacilitatorRefresh,
  isCurrentFacilitatorRequest,
  runFacilitatorAction,
  type FacilitatorSyncState,
} from "./facilitatorOperations";
import {
  afterActionReportHtml,
  downloadReportHtml,
  downloadReportJson,
  downloadReportPdf,
  downloadWorkshopCsv,
  downloadWorkshopHtml,
  downloadWorkshopJson,
  downloadWorkshopPdf,
  identifiedExportDisclosure,
  runIdentifiedExport,
  workshopComparisonHtml,
} from "./report";
import { EVIDENCE_CATALOG, FACILITATOR_EMAIL, FACILITATOR_STAGE_GUIDES, INJECT_PRESETS, STAGES } from "./scenario";
import { ThemeButton } from "./ThemeButton";
import type { AfterActionReport, DecisionState, ParticipantProfile, WorkshopSession } from "./types";

type FacilitatorData = Awaited<ReturnType<typeof loadFacilitatorSession>>;
type ConsoleView = "overview" | "participants" | "communications" | "injects" | "analytics" | "replay";
type FacilitatorSnapshot = { sessions: WorkshopSession[]; sessionId: string | null; data: FacilitatorData };
type RunAction = (key: string, mutate: () => Promise<void>, successMessage: string, failureMessage: string) => Promise<boolean>;
type RefreshResult = "APPLIED" | "FAILED" | "SUPERSEDED";

function modalBackgroundSiblings(root: HTMLElement): HTMLElement[] {
  const siblings = new Set<HTMLElement>();
  let current: HTMLElement = root;
  while (current.parentElement && current.parentElement !== document.documentElement) {
    Array.from(current.parentElement.children).forEach((element) => {
      if (element !== current && element instanceof HTMLElement) siblings.add(element);
    });
    current = current.parentElement;
  }
  return [...siblings];
}

const emptyData: FacilitatorData = { participants: [], evidence: [], submissions: [], injects: [], messages: [], turns: [], events: [] };
const emptySnapshot: FacilitatorSnapshot = { sessions: [], sessionId: null, data: emptyData };

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function participantProgressLabel(
  participant: ParticipantProfile,
  decisions: DecisionState,
  session: WorkshopSession,
  submissions: FacilitatorData["submissions"],
): string {
  if (session.status === "DEBRIEF") return "In debrief";
  const submitted = submissions
    .filter((item) => item.participantId === participant.id)
    .sort((a, b) => b.version - a.version)[0];
  if (submitted) return `Submitted · version ${submitted.version}`;
  if (session.status === "DRAFT" || session.status === "LOBBY") return "Joined";
  if (participant.currentStage === 0 && !decisions.mandateConfirmed && !decisions.mandateRationale.trim()) return "Preparing";
  const stageIndex = Math.min(Math.max(participant.currentStage, 0), STAGES.length - 1);
  return `Working in stage ${stageIndex + 1} · ${STAGES[stageIndex].short}`;
}

export function FacilitatorApp() {
  const [authState, setAuthState] = useState<"CHECKING" | "SIGNED_OUT" | "AUTHORIZED" | "DENIED">("CHECKING");
  const [selected, setSelected] = useState<WorkshopSession | null>(null);
  const [sync, setSync] = useState<FacilitatorSyncState<FacilitatorSnapshot>>({ status: "INITIAL_LOADING", snapshot: emptySnapshot, error: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ConsoleView>("overview");
  const [cueStageIndex, setCueStageIndex] = useState(0);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [, rerender] = useState(0);
  const selectedIdRef = useRef<string | null>(null);
  const requestSequence = useRef(0);
  const pollInFlight = useRef(false);
  const pendingActionKeys = useRef(new Set<string>());

  const sessions = sync.snapshot.sessions;
  const data = selected && sync.snapshot.sessionId === selected.id ? sync.snapshot.data : emptyData;

  function setActionPending(key: string, pending: boolean) {
    setPendingActions((current) => {
      const next = new Set(current);
      if (pending) next.add(key); else next.delete(key);
      return next;
    });
  }

  function clearActionFeedback() {
    setError("");
    setNotice("");
    setSync((current) => ({ ...current, error: "" }));
  }

  async function refreshSessions(selectId = selectedIdRef.current): Promise<RefreshResult> {
    const sequence = ++requestSequence.current;
    const selectionAtStart = selectedIdRef.current;
    setSync((current) => beginFacilitatorRefresh(current, current.snapshot.sessionId === selectId && Boolean(current.lastSuccessfulRefreshAt)));
    try {
      const rows = await listWorkshopSessions();
      const next = selectId ? rows.find((item) => item.id === selectId) ?? null : rows[0] ?? null;
      const fresh = next ? await loadFacilitatorSession(next) : emptyData;
      if (!isCurrentFacilitatorRequest(sequence, requestSequence.current, selectionAtStart, selectedIdRef.current)) return "SUPERSEDED";
      selectedIdRef.current = next?.id ?? null;
      setSelected(next);
      setSync((current) => completeFacilitatorRefresh(current, { sessions: rows, sessionId: next?.id ?? null, data: fresh }, new Date().toISOString()));
      return "APPLIED";
    } catch (caught) {
      if (isCurrentFacilitatorRequest(sequence, requestSequence.current, selectionAtStart, selectedIdRef.current)) {
        setSync((current) => failFacilitatorRefresh(current, errorMessage(caught, "Unable to refresh facilitator data.")));
      }
      return isCurrentFacilitatorRequest(sequence, requestSequence.current, selectionAtStart, selectedIdRef.current) ? "FAILED" : "SUPERSEDED";
    }
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
    if (authState !== "AUTHORIZED") return;
    const timer = window.setInterval(() => {
      rerender((value) => value + 1);
      if (pollInFlight.current) return;
      pollInFlight.current = true;
      void refreshSessions().finally(() => { pollInFlight.current = false; });
    }, 30000);
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void refreshSessions(); };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [authState]);

  useEffect(() => {
    if (authState !== "AUTHORIZED" || !selected?.id) return;
    const sessionId = selected.id;
    let refreshTimer = 0;
    const unsubscribe = subscribeToFacilitatorWorkshop(sessionId, () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        if (selectedIdRef.current === sessionId && !pollInFlight.current) void refreshSessions(sessionId);
      }, 250);
    });
    return () => {
      window.clearTimeout(refreshTimer);
      unsubscribe();
    };
  }, [authState, selected?.id]);

  useEffect(() => {
    if (selected) setCueStageIndex(Math.min(Math.max(selected.currentStage, 0), STAGES.length - 1));
    setDeleteConfirmationOpen(false);
    setDeleteConfirmation("");
  }, [selected?.id]);

  if (authState !== "AUTHORIZED") return <FacilitatorLogin state={authState} error={error} setError={setError} setState={setAuthState} />;

  const unlockedStageIndex = selected ? Math.min(Math.max(selected.currentStage, 0), STAGES.length - 1) : 0;
  const currentGuide = FACILITATOR_STAGE_GUIDES[cueStageIndex];

  const runAction: RunAction = (key, mutate, successMessage, failureMessage) => runFacilitatorAction({
    key,
    pending: pendingActionKeys.current,
    setPending: setActionPending,
    clearFeedback: clearActionFeedback,
    mutate,
    refresh: () => refreshSessions(),
    successMessage,
    onSuccess: setNotice,
    onFailure: setError,
    failureMessage,
  });

  async function create(kind: "REHEARSAL" | "LIVE") {
    let created: WorkshopSession | null = null;
    await runFacilitatorAction({
      key: `create:${kind}`,
      pending: pendingActionKeys.current,
      setPending: setActionPending,
      clearFeedback: clearActionFeedback,
      mutate: async () => {
        created = await createWorkshopSession(kind);
        selectedIdRef.current = created.id;
        setSelected(created);
      },
      refresh: () => refreshSessions(created?.id ?? null),
      successMessage: `${kind.toLowerCase()} session created.`,
      onSuccess: setNotice,
      onFailure: setError,
      failureMessage: "Unable to create session.",
    });
  }

  async function patchSession(key: string, patch: Record<string, unknown>, successMessage: string) {
    if (!selected) return false;
    const sessionId = selected.id;
    return runAction(key, () => updateWorkshopSession(sessionId, patch), successMessage, "Session update failed.");
  }

  async function toggleClock() {
    if (!selected) return;
    const transition = toggleCaseworkClock(selected, new Date());
    if (transition === selected) return;
    const preparationNotReported = data.participants.filter(({ participant }) => !participant.preparationCompletedAt).length;
    if (selected.status === "LOBBY" && preparationNotReported > 0 && !window.confirm(`${preparationNotReported} of ${data.participants.length} registered participants have preparation Not reported. Start casework anyway?`)) return;
    await patchSession(`clock:${selected.id}`, {
      status: transition.status,
      remaining_seconds: transition.remainingSeconds,
      clock_started_at: transition.clockStartedAt ?? null,
    }, transition.status === "PAUSED" ? "Casework clock paused." : "Casework clock running.");
  }

  async function beginDebrief() {
    if (!selected || selected.status === "DEBRIEF" || selected.status === "CLOSED") return;
    const latestSubmissions = [...data.submissions]
      .sort((a, b) => b.version - a.version)
      .filter((submission, index, submissions) => submissions.findIndex((item) => item.participantId === submission.participantId) === index);
    const confirmed = window.confirm(debriefConfirmationMessage({
      participantCount: data.participants.length,
      submittedCount: latestSubmissions.length,
      notReadyCount: latestSubmissions.filter((submission) => submission.decisions.readiness === "NOT_READY").length,
      unresolvedCount: latestSubmissions.filter((submission) => submission.decisions.readiness === "READY_WITH_CONDITIONS"
        || submission.decisions.liquidityBasis === "UNRESOLVED"
        || submission.decisions.accountClassification === "UNRESOLVED"
        || submission.decisions.facilityLinkage === "UNRESOLVED"
        || submission.decisions.treatmentPerimeter === "DEFER"
        || Boolean(submission.decisions.unresolvedRisks.trim())).length,
      currentClock: formatClock(remainingSessionSeconds(selected)),
    }));
    if (!confirmed) return;
    const transition = beginDebriefSession(selected, new Date());
    const updated = await patchSession(`debrief:${selected.id}`, {
      status: transition.status,
      current_stage: transition.currentStage,
      submissions_closed: transition.submissionsClosed,
      remaining_seconds: transition.remainingSeconds,
      clock_started_at: null,
    }, "Debrief opened for participants. Submissions are closed and the casework clock is paused.");
    if (!updated) return;
  }

  async function unlockNextStage() {
    if (!selected) return;
    const nextStage = nextParticipantStageUnlock(selected);
    if (nextStage === undefined) return;
    await patchSession(`stage:${selected.id}`, { current_stage: nextStage }, `Stage ${nextStage + 1} - ${STAGES[nextStage].short} unlocked.`);
  }

  async function selectSession(session: WorkshopSession) {
    const previousId = selectedIdRef.current;
    selectedIdRef.current = session.id;
    await runFacilitatorAction({
      key: `select:${session.id}`,
      pending: pendingActionKeys.current,
      setPending: setActionPending,
      clearFeedback: clearActionFeedback,
      mutate: async () => {
        const result = await refreshSessions(session.id);
        if (result === "FAILED") {
          if (selectedIdRef.current === session.id) selectedIdRef.current = previousId;
          throw new Error("Unable to load this session. Retry when the connection is available.");
        }
      },
      successMessage: "Session data loaded.",
      onSuccess: (message) => { if (selectedIdRef.current === session.id) setNotice(message); },
      onFailure: setError,
      failureMessage: "Unable to load this session.",
    });
  }

  async function deleteSelectedSession() {
    if (!selected || !deletionConfirmationMatches(deleteConfirmation, selected.joinCode)) {
      setError("Type the exact join code to confirm deletion.");
      return;
    }
    const sessionId = selected.id;
    await runAction(`delete:${sessionId}`, async () => {
      await deleteSession(sessionId);
      if (selectedIdRef.current === sessionId) {
        selectedIdRef.current = null;
        setSelected(null);
      }
    }, "Session and all workshop records, including activity events, deleted. No in-platform session audit remains.", "Unable to delete session. The session remains selected; retry when the connection is available.");
  }

  async function closeSelectedSession() {
    if (!selected) return;
    const confirmed = window.confirm(`Close session ${selected.joinCode ?? ""}? Submissions will close, the clock will stop, and participants will become read-only. Records remain until retention expiry or deliberate deletion. This interface cannot reopen a closed session.`);
    if (!confirmed) return;
    await patchSession(`close:${selected.id}`, {
      status: "CLOSED",
      submissions_closed: true,
      clock_started_at: null,
      remaining_seconds: remainingSessionSeconds(selected),
    }, "Session closed. Participants are read-only; records remain until expiry or deletion.");
  }

  const syncLabel = sync.status === "LIVE"
    ? "Live"
    : sync.status === "REFRESHING"
      ? "Refreshing"
      : sync.status === "STALE"
        ? "Data may be stale"
        : "Loading facilitator data";
  const lastRefreshLabel = sync.lastSuccessfulRefreshAt
    ? `Last successful refresh ${new Date(sync.lastSuccessfulRefreshAt).toLocaleTimeString()}`
    : "No successful refresh yet";
  const clockRemaining = selected ? remainingSessionSeconds(selected) : 0;
  const timeExpired = Boolean(selected && clockRemaining === 0 && selected.status !== "DEBRIEF" && selected.status !== "CLOSED");
  const nextStage = selected ? nextParticipantStageUnlock(selected) : undefined;

  return <div className="facilitator-shell facilitator-reference">
    <a className="skip-link" href="#facilitator-main">Skip to facilitator controls</a>
    <header className="facilitator-topbar"><div className="brand"><div className="brand-mark">FC</div><div className="brand-copy"><strong>Sovereign · Facilitator</strong><span>Futures Lab · Kuvera Financing Assurances</span></div></div><div className="top-actions"><span className="persona-pill tone-ok"><span className="dot" />Authenticated · {FACILITATOR_EMAIL}</span><ThemeButton /><button type="button" className="text-button" onClick={() => void facilitatorSignOut().then(() => setAuthState("SIGNED_OUT"))}>Sign out</button></div></header>
    <div className="facilitator-layout">
      <aside className="facilitator-nav"><nav className="workspace-nav" aria-label="Facilitator workspace"><span className="eyebrow">Session control</span><button type="button" aria-current={view === "overview" ? "page" : undefined} onClick={() => setView("overview")}>Live overview</button><button type="button" aria-current={view === "participants" ? "page" : undefined} onClick={() => setView("participants")}>Participants <span>{data.participants.length}</span></button><button type="button" aria-current={view === "communications" ? "page" : undefined} onClick={() => setView("communications")}>Communications <span>{data.messages.filter((item) => item.status === "PENDING").length}</span></button><button type="button" aria-current={view === "injects" ? "page" : undefined} onClick={() => setView("injects")}>Injects &amp; updates</button><button type="button" aria-current={view === "analytics" ? "page" : undefined} onClick={() => setView("analytics")}>Platform analytics</button><button type="button" aria-current={view === "replay" ? "page" : undefined} onClick={() => setView("replay")}>Replay &amp; debrief</button></nav><div className="nav-head"><span className="eyebrow">Workshop sessions</span><div><button type="button" onClick={() => void create("REHEARSAL")} disabled={pendingActions.has("create:REHEARSAL")}>+ Rehearsal</button><button type="button" onClick={() => void create("LIVE")} disabled={pendingActions.has("create:LIVE")}>+ Live</button></div></div>{sessions.length === 0 && sync.status !== "INITIAL_LOADING" && <p className="empty-copy">Create a rehearsal session first.</p>}{sessions.map((session) => <button key={session.id} type="button" className={selected?.id === session.id ? "session-link active" : "session-link"} disabled={pendingActions.has(`select:${session.id}`)} onClick={() => void selectSession(session)}><span><strong>{session.kind}</strong><small>{new Date(session.createdAt).toLocaleDateString()}</small></span><em>{pendingActions.has(`select:${session.id}`) ? "LOADING" : session.status}</em></button>)}</aside>
      <main className="facilitator-main" id="facilitator-main">
        <div className={`facilitator-sync ${sync.status.toLowerCase()}`}><span><strong>{syncLabel}</strong><small>{lastRefreshLabel}</small></span>{sync.status === "STALE" && <button type="button" onClick={() => void refreshSessions()}>Retry</button>}</div>
        {sync.error && <div className="error-panel" role="alert">Refresh failed. {sync.error}</div>}
        {!selected ? sync.status === "INITIAL_LOADING" ? <section className="empty-state"><h1>Loading workshop sessions</h1><p>Checking the latest synchronized facilitator data.</p></section> : <section className="empty-state"><h1>No workshop session</h1><p>Create a rehearsal or live session to begin.</p></section> : <>
          <div className="facilitator-heading"><div><span className="eyebrow">{selected.kind} session</span><h1>{selected.title}</h1><p>Join code <strong className="join-code">{selected.joinCode}</strong> · {data.participants.length} participants</p></div><div className="facilitator-clock"><span>{timeExpired ? "Time expired" : selected.status}</span><strong>{formatClock(clockRemaining)}</strong><button type="button" disabled={pendingActions.has(`clock:${selected.id}`) || selected.status === "DEBRIEF" || selected.status === "CLOSED"} onClick={() => void toggleClock()}>{pendingActions.has(`clock:${selected.id}`) ? "Saving…" : caseworkClockActionLabel(selected)}</button></div></div>
          {error && <div className="error-panel" role="alert">{error}</div>}{notice && <div className="success-panel" role="status">{notice}</div>}
          {view === "overview" && <>
            {timeExpired && <section className="console-card time-expired" aria-labelledby="time-expired-title"><div><span className="eyebrow">Facilitator decision required</span><h2 id="time-expired-title">Time expired</h2><p>Submissions remain open. {selected.status === "RUNNING" ? "Pause casework or begin debrief" : "Begin debrief"} when you are ready; expiry does not change the session automatically.</p></div>{selected.status === "RUNNING" && <button type="button" className="secondary-button" disabled={pendingActions.has(`clock:${selected.id}`)} onClick={() => void toggleClock()}>{pendingActions.has(`clock:${selected.id}`) ? "Saving…" : "Pause casework"}</button>}<button type="button" className="secondary-button" disabled={pendingActions.has(`debrief:${selected.id}`)} onClick={() => void beginDebrief()}>{pendingActions.has(`debrief:${selected.id}`) ? "Opening…" : "Begin debrief"}</button></section>}
            <section className="control-strip">
              <div><small>Unlocked through · Stage {unlockedStageIndex + 1} · {STAGES[unlockedStageIndex].short}</small><strong>Participants can access this stage and every earlier stage.</strong></div>
              <button type="button" disabled={pendingActions.has(`stage:${selected.id}`) || nextStage === undefined} onClick={() => void unlockNextStage()}>{pendingActions.has(`stage:${selected.id}`) ? "Saving…" : nextStage === undefined ? "All casework stages unlocked" : `Unlock Stage ${nextStage + 1} - ${STAGES[nextStage].short}`}</button>
              <button type="button" disabled={pendingActions.has(`debrief:${selected.id}`) || selected.status === "DEBRIEF" || selected.status === "CLOSED"} onClick={() => void beginDebrief()}>{pendingActions.has(`debrief:${selected.id}`) ? "Opening…" : selected.status === "DEBRIEF" ? "Debrief begun" : "Begin debrief"}</button>
            </section>
            <section className="console-card facilitator-guide" aria-labelledby="facilitator-guide-title">
              <header>
                <div><span className="eyebrow">Facilitating now</span><h2 id="facilitator-guide-title">{STAGES[cueStageIndex].title}</h2><p>{currentGuide.learningPurpose}</p></div>
                <span className="pill">Stage {cueStageIndex + 1} of {STAGES.length}</span>
              </header>
              <nav className="cue-browser" aria-label="Facilitator cue cards">{STAGES.map((stageDefinition, index) => <button key={stageDefinition.short} type="button" className={index > unlockedStageIndex ? "future" : ""} aria-pressed={cueStageIndex === index} onClick={() => setCueStageIndex(index)}><strong>{index + 1} · {stageDefinition.short}</strong><span>{cueStageIndex === index ? "Facilitating now" : index <= unlockedStageIndex ? "Unlocked" : "Future cue · participants locked"}</span></button>)}</nav>
              <div className="facilitator-guide-grid">
                <div>
                  <h3>Opening question</h3>
                  <blockquote>{currentGuide.openingQuestion}</blockquote>
                </div>
                <div>
                  <h3>Listen for</h3>
                  <ul>{currentGuide.listenFor.map((cue) => <li key={cue}>{cue}</li>)}</ul>
                </div>
              </div>
              <details>
                <summary>Supporting facilitation cues</summary>
                <dl>
                  <div><dt>Likely misconception</dt><dd>{currentGuide.misconception}</dd></div>
                  <div><dt>Unlock cue</dt><dd>{currentGuide.unlockCondition}</dd></div>
                  <div><dt>Debrief connection</dt><dd>{currentGuide.debriefConnection}</dd></div>
                </dl>
              </details>
            </section>
            {selected.status === "DEBRIEF" && <section className="console-card debrief-sequence" aria-labelledby="debrief-sequence-title">
              <span className="eyebrow">Facilitator sequence</span>
              <h2 id="debrief-sequence-title">Debrief and transfer</h2>
              <ol>
                <li>Reconstruct the evidence state at the submitted version.</li>
                <li>Compare decision pathways without scoring or ranking.</li>
                <li>Discuss one material consequence as a fictional exercise outcome.</li>
                <li>Run one counterfactual and name the assumptions held fixed.</li>
                <li>Ask what participants will transfer to real decision preparation.</li>
              </ol>
            </section>}
            <div className="metric-grid"><Metric label="Registered participants" value={data.participants.length} /><Metric label="Preparation complete" value={data.participants.filter(({ participant }) => participant.preparationCompletedAt).length} /><Metric label="Preparation · Not reported" value={data.participants.filter(({ participant }) => !participant.preparationCompletedAt).length} /><Metric label="Submitted" value={data.participants.filter(({ participant }) => data.submissions.some((item) => item.participantId === participant.id)).length} /><Metric label="Active in last 2 min · recorded activity" value={data.participants.filter(({ participant }) => Date.now() - new Date(participant.lastActiveAt).getTime() < 120000).length} /><Metric label="Pending requests" value={data.messages.filter((item) => item.status === "PENDING").length} /></div>
          </>}
          {view === "participants" && <ParticipantMonitor data={data} session={selected} runAction={runAction} pendingActions={pendingActions} />}
          {view === "communications" && <RequestDesk data={data} runAction={runAction} pendingActions={pendingActions} />}
          {view === "injects" && <div className="facilitator-grid"><InjectDesk session={selected} runAction={runAction} pendingActions={pendingActions} /><EvidenceDesk data={data} runAction={runAction} pendingActions={pendingActions} /></div>}
          {view === "analytics" && <ReportDesk session={selected} />}
          {view === "replay" && <><ReportDesk session={selected} /><section className="danger-zone" aria-labelledby="session-lifecycle-title"><div><strong id="session-lifecycle-title">Session lifecycle</strong><span>Closing makes participants read-only and retains records until expiry or deletion. Deleting immediately cascades through every application record, including activity events; no in-platform session audit remains.</span></div><div className="lifecycle-actions"><button type="button" disabled={selected.status === "CLOSED" || pendingActions.has(`close:${selected.id}`)} onClick={() => void closeSelectedSession()}>{selected.status === "CLOSED" ? "Session closed" : pendingActions.has(`close:${selected.id}`) ? "Closing…" : "Close session…"}</button><button type="button" className="danger-button" aria-expanded={deleteConfirmationOpen} aria-controls="delete-session-confirmation" disabled={pendingActions.has(`delete:${selected.id}`)} onClick={() => setDeleteConfirmationOpen(true)}>Delete session…</button></div>{deleteConfirmationOpen && <form id="delete-session-confirmation" className="delete-confirmation" onSubmit={(event) => { event.preventDefault(); void deleteSelectedSession(); }}><p><strong>Delete all application records now?</strong> This permanently removes the session, participants, submissions, transcripts, and activity events. It does not create a surviving in-platform audit entry. Export is optional and is not required for privacy deletion.</p><label>Type join code <code>{selected.joinCode ?? "unavailable"}</code> exactly<input autoFocus autoComplete="off" spellCheck={false} value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} /></label><div><button type="button" onClick={() => { setDeleteConfirmationOpen(false); setDeleteConfirmation(""); }}>Cancel</button><button type="submit" className="danger-button" disabled={!deletionConfirmationMatches(deleteConfirmation, selected.joinCode) || pendingActions.has(`delete:${selected.id}`)}>{pendingActions.has(`delete:${selected.id}`) ? "Deleting…" : "Permanently delete"}</button></div></form>}</section></>}
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

function ParticipantMonitor({ data, session, runAction, pendingActions }: { data: FacilitatorData; session: WorkshopSession; runAction: RunAction; pendingActions: Set<string> }) {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<AfterActionReport | null>(null);
  const [reportLoadingId, setReportLoadingId] = useState("");
  const [reportError, setReportError] = useState("");
  const rows = data.participants.filter(({ participant }) => `${participant.name} ${participant.organization} ${participant.email}`.toLowerCase().includes(query.toLowerCase()));
  async function openReport(participantId: string) {
    setReportError("");
    setReportLoadingId(participantId);
    try {
      const detailed = await loadFacilitatorReportData(session, participantId);
      const row = detailed.participants[0];
      if (!row) throw new Error("Participant record is no longer available.");
      setReport(reportFor(row.participant, row.decisions, session, detailed));
    } catch (caught) {
      setReportError(errorMessage(caught, "Unable to load this after-action report."));
    } finally {
      setReportLoadingId("");
    }
  }
  return <section className="console-card wide"><header><div><span className="eyebrow">Live operating picture</span><h2>Participant progress</h2></div><label className="compact-label">Search participants<input placeholder="Name, organization, or email" value={query} onChange={(event) => setQuery(event.target.value)} /></label></header>{reportError && <p className="error-panel" role="alert">{reportError}</p>}<div className="table-wrap"><table><thead><tr><th scope="col">Participant</th><th scope="col">Progress</th><th scope="col">Evidence</th><th scope="col">Liquidity</th><th scope="col">Readiness</th><th scope="col">Open risks</th><th scope="col">Last active</th><th scope="col">Actions</th></tr></thead><tbody>{rows.map(({ participant, decisions }) => { const requests = data.evidence.filter((item) => item.participantId === participant.id); const pending = requests.filter((item) => !item.releasedAt && new Date(item.availableAt).getTime() > Date.now()).length; const removalKey = `remove:${participant.id}`; return <tr key={participant.id}><td><strong>{participant.name}</strong><small>{participant.organization}<br />{participant.email}</small></td><td>{participantProgressLabel(participant, decisions, session, data.submissions)}</td><td>{requests.length} requested<small>{pending} pending</small></td><td>{decisions.liquidityBasis?.replaceAll("_", " ") ?? "—"}</td><td>{decisions.readiness?.replaceAll("_", " ") ?? "Not submitted"}</td><td>{decisions.unresolvedRisks.trim() ? "Recorded" : "—"}</td><td>{new Date(participant.lastActiveAt).toLocaleTimeString()}</td><td><button type="button" className="text-button" disabled={Boolean(reportLoadingId)} onClick={() => void openReport(participant.id)}>{reportLoadingId === participant.id ? "Loading AAR…" : "Open AAR"}</button><button type="button" className="text-button danger-text" disabled={pendingActions.has(removalKey)} onClick={() => { if (confirm(`Remove ${participant.name} and their workshop record as an invalid or duplicate registration?`)) void runAction(removalKey, () => removeParticipant(participant.id), "Participant record removed.", "Unable to remove participant."); }}>{pendingActions.has(removalKey) ? "Removing…" : "Remove"}</button></td></tr>; })}</tbody></table></div>{rows.length === 0 && <p className="empty-copy">No participants match this view.</p>}{report && <ReportModal report={report} onClose={() => setReport(null)} />}</section>;
}

function InjectDesk({ session, runAction, pendingActions }: { session: WorkshopSession; runAction: RunAction; pendingActions: Set<string> }) {
  const [title, setTitle] = useState(INJECT_PRESETS[0].title);
  const [body, setBody] = useState(INJECT_PRESETS[0].body);
  const actionKey = `inject:${session.id}`;
  async function send() {
    const sent = await runAction(actionKey, () => sendGlobalInject(session.id, title, body), "Facilitator update sent.", "Unable to send facilitator update.");
    if (sent) { setTitle(""); setBody(""); }
  }
  return <section className="console-card"><span className="eyebrow">All participants</span><h2>Send an inject</h2><label>Preset<select onChange={(event) => { const preset = INJECT_PRESETS[Number(event.target.value)]; setTitle(preset.title); setBody(preset.body); }}>{INJECT_PRESETS.map((preset, index) => <option key={preset.title} value={index}>{preset.title}</option>)}</select></label><label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Message<textarea rows={4} maxLength={2000} value={body} onChange={(event) => setBody(event.target.value)} /></label><button type="button" className="primary-button" disabled={pendingActions.has(actionKey) || !title.trim() || !body.trim()} onClick={() => void send()}>{pendingActions.has(actionKey) ? "Sending…" : "Broadcast inject"}</button></section>;
}

function EvidenceDesk({ data, runAction, pendingActions }: { data: FacilitatorData; runAction: RunAction; pendingActions: Set<string> }) {
  const participantName = (id: string) => data.participants.find((item) => item.participant.id === id)?.participant.name ?? "Unknown participant";
  const pending = data.evidence.filter((item) => !item.releasedAt && new Date(item.availableAt).getTime() > Date.now());
  return <section className="console-card"><span className="eyebrow">Authored delays</span><h2>Pending evidence</h2>{pending.length === 0 ? <p className="empty-copy">No evidence is waiting for release.</p> : <div className="pending-list">{pending.map((request) => { const actionKey = `release:${request.id}`; return <div key={request.id}><span><strong>{EVIDENCE_CATALOG.find((item) => item.id === request.evidenceId)?.title}</strong><small>{participantName(request.participantId)} · due {new Date(request.availableAt).toLocaleTimeString()}</small></span><button type="button" disabled={pendingActions.has(actionKey)} onClick={() => void runAction(actionKey, () => releaseEvidence(request.id), "Evidence released.", "Unable to release evidence.")}>{pendingActions.has(actionKey) ? "Releasing…" : "Release now"}</button></div>; })}</div>}</section>;
}

function RequestDesk({ data, runAction, pendingActions }: { data: FacilitatorData; runAction: RunAction; pendingActions: Set<string> }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const participantName = (id: string) => data.participants.find((item) => item.participant.id === id)?.participant.name ?? "Unknown participant";
  const messages = [...data.messages].sort((a, b) => Number(a.status === "ANSWERED") - Number(b.status === "ANSWERED") || a.createdAt.localeCompare(b.createdAt));
  async function answer(messageId: string) {
    const reply = drafts[messageId]?.trim(); if (!reply) return;
    const sent = await runAction(`reply:${messageId}`, () => answerInstitutionalRequest(messageId, reply), "Institutional reply sent.", "Unable to send institutional reply.");
    if (sent) setDrafts((current) => ({ ...current, [messageId]: "" }));
  }
  return <section className="console-card wide"><span className="eyebrow">Role-play queue</span><h2>Institutional request desk</h2><p>Answer exceptional participant questions as the selected institution. Routine evidence requests remain automated.</p>{messages.length === 0 ? <p className="empty-copy">No exceptional requests have been sent.</p> : <div className="request-queue">{messages.map((message) => { const actionKey = `reply:${message.id}`; return <article key={message.id}><header><span><strong>{participantName(message.participantId)}</strong><small>{message.institution.replaceAll("_", " ")} · {new Date(message.createdAt).toLocaleTimeString()}</small></span><em>{message.status}</em></header><p>{message.question}</p>{message.status === "ANSWERED" ? <div className="institution-reply"><strong>Reply</strong><p>{message.reply}</p></div> : <div className="reply-compose"><label>Reply as {message.institution.replaceAll("_", " ")}<textarea rows={3} maxLength={4000} value={drafts[message.id] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [message.id]: event.target.value }))} /></label><button type="button" className="primary-button" disabled={pendingActions.has(actionKey) || !(drafts[message.id]?.trim())} onClick={() => void answer(message.id)}>{pendingActions.has(actionKey) ? "Sending…" : "Send reply"}</button></div>}</article>; })}</div>}</section>;
}

function ReportDesk({ session }: { session: WorkshopSession }) {
  const [exportError, setExportError] = useState("");
  const [exportNotice, setExportNotice] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  function resetFeedback() { setExportError(""); setExportNotice(""); }
  function fail(caught: unknown, format: string) { setExportError(errorMessage(caught, `Unable to create the ${format} export. Check browser download permissions and try again.`)); }
  async function loadReports(): Promise<AfterActionReport[]> {
    const detailed = await loadFacilitatorReportData(session);
    return detailed.participants.map(({ participant, decisions }) => reportFor(participant, decisions, session, detailed));
  }
  async function preview() {
    resetFeedback();
    let url = "";
    setExportLoading(true);
    try {
      const reports = await loadReports();
      if (!reports.length) throw new Error("No participant records are available to export.");
      url = URL.createObjectURL(new Blob([workshopComparisonHtml(reports)], { type: "text/html;charset=utf-8" }));
      const popup = window.open(url, "_blank", "noopener,noreferrer");
      if (!popup) throw new Error("The anonymous comparison popup was blocked. Allow popups for this site and try again.");
      setExportNotice("Anonymous comparison opened in a new tab.");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (caught) {
      if (url) URL.revokeObjectURL(url);
      fail(caught, "anonymous HTML preview");
    } finally { setExportLoading(false); }
  }
  async function anonymousExport(format: string, startDownload: (reports: AfterActionReport[]) => void | Promise<void>) {
    resetFeedback();
    setExportLoading(true);
    try { const reports = await loadReports(); if (!reports.length) throw new Error("No participant records are available to export."); await startDownload(reports); setExportNotice(`Anonymous ${format} download started.`); }
    catch (caught) { fail(caught, `anonymous ${format}`); }
    finally { setExportLoading(false); }
  }
  async function identifiedExport(format: string, contents: string, startDownload: (reports: AfterActionReport[]) => void | Promise<void>) {
    resetFeedback();
    try {
      const started = await runIdentifiedExport(() => window.confirm(identifiedExportDisclosure(contents)), async () => {
        setExportLoading(true);
        const reports = await loadReports();
        if (!reports.length) throw new Error("No participant records are available to export.");
        await startDownload(reports);
      });
      if (started) setExportNotice(`Identified ${format} download started.`);
    } catch (caught) { fail(caught, `identified ${format}`); }
    finally { setExportLoading(false); }
  }
  return <section className="console-card wide"><header><div><span className="eyebrow">Facilitator exports</span><h2>Workshop records</h2></div></header><p>Every format names its selected submission version and replay provenance. Detailed records load only when you request an export and are generated in this browser without external report storage.</p>{exportLoading && <p className="empty-copy" role="status">Loading detailed workshop records…</p>}<div className="export-groups"><section aria-labelledby="anonymous-export-title"><h3 id="anonymous-export-title">Anonymous group comparison</h3><p>HTML preview, HTML download, and PDF only. These formats use numbered participant labels and exclude participant name, organization, email, and participant ID.</p><div className="export-actions"><button type="button" onClick={() => void preview()} disabled={exportLoading}>Preview anonymous HTML</button><button type="button" onClick={() => void anonymousExport("PDF", downloadWorkshopPdf)} disabled={exportLoading}>Download anonymous PDF</button><button type="button" onClick={() => void anonymousExport("HTML", downloadWorkshopHtml)} disabled={exportLoading}>Download anonymous HTML</button></div></section><section aria-labelledby="identified-export-title"><h3 id="identified-export-title">Identified facilitator-only records</h3><p>Roster CSV and full JSON are always identified. Each download requires a disclosure confirmation; no anonymity setting applies to these formats.</p><div className="export-actions"><button type="button" onClick={() => void identifiedExport("roster CSV", "participant name, organization, email address, participant ID, decisions, selected submission version, and replay provenance", downloadWorkshopCsv)} disabled={exportLoading}>Download identified roster CSV</button><button type="button" onClick={() => void identifiedExport("workshop JSON", "participant name, organization, email address, participant ID, decisions, correspondence, advisor transcripts, activity history, selected submission version, and replay provenance", downloadWorkshopJson)} disabled={exportLoading}>Download identified workshop JSON</button></div></section></div>{exportError && <p className="error-panel" role="alert">{exportError}</p>}{exportNotice && <p className="success-panel" role="status">{exportNotice}</p>}</section>;
}

function ReportModal({ report, onClose }: { report: AfterActionReport; onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [selectedVersion, setSelectedVersion] = useState(report.selectedSubmissionVersion ?? report.submissions.at(-1)?.version);
  const [exportError, setExportError] = useState("");
  const [exportNotice, setExportNotice] = useState("");
  const selectedReport = selectedVersion === undefined ? report : selectAfterActionReportSubmission(report, selectedVersion);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const returnTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const siblings = modalBackgroundSiblings(root);
    document.body.style.overflow = "hidden";
    siblings.forEach((element) => { element.inert = true; element.setAttribute("aria-hidden", "true"); });
    window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      siblings.forEach((element) => { element.inert = false; element.removeAttribute("aria-hidden"); });
      window.requestAnimationFrame(() => returnTarget?.focus());
    };
  }, []);
  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  function connectFrameKeyboard(frame: HTMLIFrameElement) {
    frame.contentDocument?.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    });
  }
  async function identifiedExport(format: string, contents: string, startDownload: () => void | Promise<void>) {
    setExportError("");
    setExportNotice("");
    try {
      const started = await runIdentifiedExport(() => window.confirm(identifiedExportDisclosure(contents)), startDownload);
      if (started) setExportNotice(`Identified ${format} download started.`);
    } catch (caught) {
      setExportError(errorMessage(caught, `Unable to create the identified ${format} export. Check browser download permissions and try again.`));
    }
  }
  const documentContents = "participant name, organization, email address, decisions, correspondence, advisor transcript, selected submission version, and replay provenance";
  return <div ref={rootRef} className="modal-scrim" role="presentation"><section className="report-modal" role="dialog" aria-modal="true" aria-label={`After-action report for ${report.participant.name}`} tabIndex={-1} onKeyDown={handleKeyDown}><header><div><span className="eyebrow">Identified facilitator-only report</span><h2>{report.participant.name}</h2><p>{report.participant.organization} · {report.participant.email}</p>{report.submissions.length > 0 && <label className="compact-label">Replayed submission version<select value={selectedVersion} onChange={(event) => setSelectedVersion(Number(event.target.value))}>{report.submissions.map((submission) => <option key={submission.id} value={submission.version}>Version {submission.version} · {submission.contextSnapshot ? "frozen" : "legacy reconstruction"}</option>)}</select></label>}</div><button ref={closeRef} type="button" className="icon-button" aria-label="Close after-action report" onClick={onClose}>×</button></header><iframe title={`After-action report preview${selectedVersion ? ` for submission version ${selectedVersion}` : ""}`} srcDoc={afterActionReportHtml(selectedReport)} sandbox="allow-same-origin" onLoad={(event) => connectFrameKeyboard(event.currentTarget)} /><footer><div className="report-export-feedback">{exportError && <p className="error-panel" role="alert">{exportError}</p>}{exportNotice && <p className="success-panel" role="status">{exportNotice}</p>}</div><button type="button" onClick={() => void identifiedExport("PDF", documentContents, () => downloadReportPdf(selectedReport))}>Download identified PDF</button><button type="button" onClick={() => void identifiedExport("HTML", documentContents, () => downloadReportHtml(selectedReport))}>Download identified HTML</button><button type="button" onClick={() => void identifiedExport("JSON", `${documentContents}, participant ID, and activity history`, () => downloadReportJson(selectedReport))}>Download identified JSON</button><button type="button" className="primary-button" onClick={onClose}>Close</button></footer></section></div>;
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
