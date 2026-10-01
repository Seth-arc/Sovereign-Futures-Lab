import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";
import {
  activateEmergencyMode,
  askAdvisor,
  isLocalBundle,
  joinWorkshop,
  joinLocalWorkshop,
  loadParticipantBundle,
  requestEvidence,
  saveDecisions,
  saveTransferReflection,
  sendInstitutionalRequest,
  submitRecommendation,
  subscribeToWorkshop,
  transcribeAudio,
  type ParticipantBundle,
} from "./data";
import { buildNegotiationPreparationBrief, buildParticipantDebrief, buildSubmissionReplay, evidenceIsAvailable, negotiationBriefIsSubmittable, participantAvailableStage, participantEntryStage, reviewRecommendation } from "./engine";
import { ADVISOR_PROFILES, CASE_FACTS, EVIDENCE_CATALOG, FINAL_STAGE_INDEX, GLOSSARY_TERMS, ROLE_BOUNDARY, ROLE_TITLE, STAGES, WORKSHOP_TITLE } from "./scenario";
import { ReferenceExperience, type ReferenceSurface } from "./ReferenceExperience";
import { ThemeButton } from "./ThemeButton";
import { ADVISOR_RESPONSE_REVEAL_INTERVAL_MS, advisorResponseUsesInstantReveal, revealAdvisorResponse, sourceClassLabel, splitAdvisorResponse } from "./advisorPresentation";
import { ADVISOR_VOICE_PROFILES, selectAdvisorVoice } from "./advisorVoice";
import type { AdvisorCitation, AdvisorId, DecisionState, InstitutionRole } from "./types";

const PARTICIPANT_KEY = "futureslab-participant-id";
const ENTRY_HANDOFF_KEY = "futureslab-entry-handoff-v1";
const PREPARATION_KEY_PREFIX = "futureslab-preparation-v1:";
const DIALOG_FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

type SaveState = "DIRTY" | "SAVING" | "SAVED" | "ERROR";

function backgroundSiblings(root: HTMLElement): HTMLElement[] {
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

function trapDialogFocus(event: ReactKeyboardEvent<HTMLElement>, onClose: () => void) {
  if (event.key === "Escape") {
    event.preventDefault();
    onClose();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE)).filter((element) => !element.hidden);
  if (!focusable.length) {
    event.preventDefault();
    event.currentTarget.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function useDialogLifecycle(rootRef: RefObject<HTMLElement | null>, initialFocusRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const previousOverflow = document.body.style.overflow;
    const siblings = backgroundSiblings(root);
    document.body.style.overflow = "hidden";
    siblings.forEach((element) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });
    window.requestAnimationFrame(() => (initialFocusRef.current ?? root).focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      siblings.forEach((element) => {
        element.inert = false;
        element.removeAttribute("aria-hidden");
      });
    };
  }, [initialFocusRef, rootRef]);
}
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
  const submissionReplays = bundle.submissions.map((submission) => buildSubmissionReplay({
    submission,
    evidenceRequests: bundle.evidenceRequests,
    institutionalMessages: bundle.messages,
    injects: bundle.injects,
  }));
  const payload = JSON.stringify({
    format: "sovereign-room-futureslab-emergency-handoff-v2",
    exportedAt,
    session: bundle.session,
    participant: bundle.participant,
    workingState: { label: "working state · unsent", decisions },
    decisions,
    negotiationPreparationBrief: buildNegotiationPreparationBrief({ decisions, evidenceRequests: bundle.evidenceRequests, institutionalMessages: bundle.messages, preparedAt: exportedAt }),
    evidenceRequests: bundle.evidenceRequests,
    institutionalMessages: bundle.messages,
    submissions: bundle.submissions,
    submissionReplays,
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

function dismissedInjectKey(participantId: string): string {
  return `futureslab-dismissed-inject-v1:${participantId}`;
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
  const [saveState, setSaveState] = useState<SaveState>("SAVED");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [dismissedInjectId, setDismissedInjectId] = useState<string | null>(null);
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
  const communicationsReturnTarget = useRef<HTMLElement | null>(null);
  const glossaryReturnTarget = useRef<HTMLElement | null>(null);
  const advisorReturnTarget = useRef<HTMLElement | null>(null);
  const referenceReturnTarget = useRef<HTMLElement | null>(null);
  const evidenceAvailability = useRef<{ participantId: string; ids: Set<string> } | null>(null);
  const seenInjectId = useRef<string | null>(null);
  const seenSessionStatus = useRef<string | null>(null);
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
          const complete = loaded.session.status === "DEBRIEF" || loaded.session.status === "CLOSED" || preparationIsComplete(loaded);
          if (complete) localStorage.setItem(preparationKey(loaded.participant.id), "complete");
          setBundle(loaded);
          seenInjectId.current = loaded.injects.at(-1)?.id ?? null;
          seenSessionStatus.current = loaded.session.status;
          setDismissedInjectId(localStorage.getItem(dismissedInjectKey(loaded.participant.id)));
          setDecisions(loaded.decisions);
          setStage(participantEntryStage(loaded.session, loaded.participant));
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
        const debriefJustOpened = (fresh.session.status === "DEBRIEF" || fresh.session.status === "CLOSED")
          && seenSessionStatus.current !== "DEBRIEF"
          && seenSessionStatus.current !== "CLOSED";
        seenSessionStatus.current = fresh.session.status;
        const latest = fresh.injects.at(-1);
        if (latest && latest.id !== seenInjectId.current) {
          seenInjectId.current = latest.id;
          setDismissedInjectId(null);
          setLiveAnnouncement(`Facilitator update: ${latest.title}. ${latest.body}`);
        }
        setBundle(fresh);
        setDecisions(fresh.decisions);
        if (fresh.session.status === "DEBRIEF" || fresh.session.status === "CLOSED") {
          setPreparationComplete(true);
          setStage(participantEntryStage(fresh.session, fresh.participant));
          setRoleBriefOpen(false);
          if (debriefJustOpened) {
            setNotice("Debrief and transfer is now open. Your submitted recommendation has been preserved.");
            setLiveAnnouncement("Debrief opened. Your submitted recommendation is preserved and your transfer reflection is available.");
            window.requestAnimationFrame(() => mainContent.current?.focus());
          }
        }
      });
    });
  }, [bundle?.participant.id, bundle?.session.id]);

  useEffect(() => {
    if (!bundle) return;
    const available = new Set(bundle.evidenceRequests.filter((request) => evidenceIsAvailable(request, new Date(now))).map((request) => request.evidenceId));
    const previous = evidenceAvailability.current;
    if (!previous || previous.participantId !== bundle.participant.id) {
      evidenceAvailability.current = { participantId: bundle.participant.id, ids: available };
      return;
    }
    const returned = [...available].filter((id) => !previous.ids.has(id));
    evidenceAvailability.current = { participantId: bundle.participant.id, ids: available };
    if (!returned.length) return;
    const titles = returned.map((id) => EVIDENCE_CATALOG.find((item) => item.id === id)?.title ?? "Requested evidence");
    setLiveAnnouncement(`Evidence returned: ${titles.join(", ")}. Open Communications or the Evidence stage to review it.`);
  }, [bundle, now]);

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
      const complete = joined.session.status === "DEBRIEF" || joined.session.status === "CLOSED" || preparationIsComplete(joined);
      setBundle(joined);
      seenInjectId.current = joined.injects.at(-1)?.id ?? null;
      seenSessionStatus.current = joined.session.status;
      setDismissedInjectId(localStorage.getItem(dismissedInjectKey(joined.participant.id)));
      setDecisions(joined.decisions);
      setStage(participantEntryStage(joined.session, joined.participant));
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
    seenInjectId.current = joined.injects.at(-1)?.id ?? null;
    seenSessionStatus.current = joined.session.status;
    setDismissedInjectId(localStorage.getItem(dismissedInjectKey(joined.participant.id)));
    setDecisions(joined.decisions);
    setStage(0);
    setPreparationComplete(complete);
    setReferenceSurface(complete ? null : "orientation");
    setError("");
  }

  async function persist(nextStage = stage) {
    if (!bundle || !decisions) return;
    setBusy(true); setSaveState("SAVING"); setError("");
    try {
      const saved = await saveDecisions(bundle, decisions, nextStage);
      setBundle(saved);
      setSaveState("SAVED");
      setLiveAnnouncement("Save succeeded. Your work is saved.");
    } catch (caught) {
      setSaveState("ERROR");
      setError(caught instanceof Error ? caught.message : "Save failed.");
      setLiveAnnouncement("Save failed. Your changes remain unsaved.");
    }
    finally { setBusy(false); }
  }

  if (!bundle || !decisions) return <WorkshopEntryState initializing={initializing} busy={busy} error={error} entryHandoff={entryHandoff} onRetry={() => entryHandoff && void handleJoin(entryHandoff)} onJoinLocal={() => entryHandoff && handleLocalJoin(entryHandoff)} />;

  const availableStage = participantAvailableStage(bundle.session, bundle.participant, bundle.submissions.length > 0);
  const latestInject = bundle.injects.at(-1);
  const clock = remainingFor(bundle, now);
  const caseworkRunning = preparationComplete && bundle.session.status === "RUNNING";
  const displayedClock = preparationComplete ? clock : bundle.session.durationSeconds;
  const caseworkClockState = bundle.session.status === "DEBRIEF" || bundle.session.status === "CLOSED" ? "paused for debrief" : caseworkRunning ? "" : "waiting";
  const caseworkClockLabel = `Casework · ${formatClock(displayedClock)}${caseworkClockState ? ` · ${caseworkClockState}` : ""}`;
  const availableEvidenceRequests = bundle.evidenceRequests.filter((request) => evidenceIsAvailable(request, new Date(now)));
  const pendingInstitutionalReplies = bundle.messages.filter((message) => message.status === "PENDING").length;
  const visibleInject = latestInject?.id === dismissedInjectId ? null : latestInject;
  const bannerMessage = notice || (visibleInject ? `${visibleInject.title}: ${visibleInject.body}` : "");

  function rememberReturnTarget(target: EventTarget | null, fallback: HTMLElement | null): HTMLElement | null {
    if (!(target instanceof HTMLElement)) return fallback;
    return target.closest("#participantMenu") ? menuTrigger.current : target;
  }

  function openCommunications(target: EventTarget | null) {
    communicationsReturnTarget.current = rememberReturnTarget(target, menuTrigger.current);
    setMenuOpen(false);
    setError("");
    setCommunicationsOpen(true);
  }

  function openGlossary(target: EventTarget | null) {
    glossaryReturnTarget.current = rememberReturnTarget(target, menuTrigger.current);
    setMenuOpen(false);
    setGlossaryOpen(true);
  }

  function openAdvisor(target: EventTarget | null) {
    advisorReturnTarget.current = rememberReturnTarget(target, menuTrigger.current);
    setMenuOpen(false);
    setAdvisorOpen(true);
  }

  function openReference(surface: ReferenceSurface, target: EventTarget | null) {
    referenceReturnTarget.current = rememberReturnTarget(target, menuTrigger.current);
    setMenuOpen(false);
    setReferenceSurface(surface);
  }

  function closeCommunications() {
    setCommunicationsOpen(false);
    window.requestAnimationFrame(() => communicationsReturnTarget.current?.focus());
  }

  function closeGlossary() {
    setGlossaryOpen(false);
    window.requestAnimationFrame(() => glossaryReturnTarget.current?.focus());
  }

  function closeAdvisor() {
    setAdvisorOpen(false);
    window.requestAnimationFrame(() => advisorReturnTarget.current?.focus());
  }

  function completePreparationSurface() {
    if (referenceSurface === "orientation") {
      if (preparationComplete) {
        closePreparationSurface();
        return;
      }
      setReferenceSurface("bridge");
      return;
    }
    if (referenceSurface !== "bridge" || !bundle) return;
    if (preparationComplete) {
      closePreparationSurface();
      return;
    }
    localStorage.setItem(preparationKey(bundle.participant.id), "complete");
    if (isLocalBundle(bundle)) {
      setBundle({ ...bundle, session: { ...bundle.session, status: "RUNNING", remainingSeconds: bundle.session.durationSeconds, clockStartedAt: new Date().toISOString() } });
    }
    setPreparationComplete(true);
    setStage(0);
    setRoleBriefOpen(true);
    setReferenceSurface(null);
    window.requestAnimationFrame(() => (referenceReturnTarget.current ?? mainContent.current)?.focus());
  }

  function closePreparationSurface() {
    setReferenceSurface(null);
    window.requestAnimationFrame(() => (referenceReturnTarget.current ?? mainContent.current)?.focus());
  }

  async function exitWorkshop() {
    if (!bundle || !decisions) return;
    setMenuOpen(false); setBusy(true); setSaveState("SAVING"); setError("");
    try {
      const saved = bundle.session.status === "CLOSED"
        ? bundle
        : bundle.session.status === "DEBRIEF"
          ? await saveTransferReflection(bundle, decisions.reflection)
          : await saveDecisions(bundle, decisions, stage);
      setBundle(saved);
      localStorage.removeItem(PARTICIPANT_KEY);
      sessionStorage.removeItem(ENTRY_HANDOFF_KEY);
      window.location.assign("/");
    } catch (caught) {
      setSaveState("ERROR");
      setError(caught instanceof Error ? caught.message : "Your work could not be saved. The workshop remains open.");
      setLiveAnnouncement("Save failed. Your changes remain unsaved and the workshop remains open.");
      setBusy(false);
    }
  }

  return (
    <div className="app participant-reference">
      <a className="skip-link" href="#main-content">Skip to exercise</a>
      <header className="topbar">
        <div className="brand"><img className="aiddata-brandmark" src="/assets/AidData Brandmark.png" alt="AidData" /><div className="brand-copy"><strong>Sovereign</strong></div></div>
        <div className="topmeta">
          <span className={`pill clock ${caseworkRunning ? "warn" : "ok"}`} id="masterClock" aria-label={caseworkClockLabel} title={`The ${CASE_FACTS.caseworkDurationSeconds / 60}-minute casework clock starts only when the facilitator begins the exercise`}><span className={`status-dot ${caseworkRunning ? "running" : "paused"}`} /><span className="clock-label">Casework</span><strong className="clock-value">{formatClock(displayedClock)}</strong>{caseworkClockState && <span className="clock-state">{caseworkClockState}</span>}</span>
          <button type="button" className="reference-icon-button comm-launch" id="openCommunications" aria-label={`Open communications${availableEvidenceRequests.length ? `; ${availableEvidenceRequests.length} evidence item${availableEvidenceRequests.length === 1 ? "" : "s"} returned` : ""}`} title="Communications" aria-haspopup="dialog" aria-expanded={communicationsOpen} onClick={(event) => openCommunications(event.currentTarget)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            {availableEvidenceRequests.length > 0 && <span className="comm-evidence-returned" aria-hidden="true">{availableEvidenceRequests.length}</span>}
          </button>
          <button type="button" className="secondary-button reference-top-button" id="openReference" aria-haspopup="dialog" onClick={(event) => openReference("case-file", event.currentTarget)}>Case file</button>
          <div className="participant-menu" ref={menuContainer}>
            <button ref={menuTrigger} type="button" className="reference-icon-button menu-trigger" id="participantMenuButton" aria-label="Open participant menu" aria-expanded={menuOpen} aria-controls="participantMenu" onClick={() => setMenuOpen((open) => !open)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg></button>
            <div className="user-menu-dropdown" id="participantMenu" hidden={!menuOpen}>
              <button className="menu-item mobile-menu-item" type="button" onClick={(event) => openCommunications(event.currentTarget)}>Communications{pendingInstitutionalReplies > 0 ? ` · ${pendingInstitutionalReplies} awaiting reply` : ""}</button>
              <button className="menu-item mobile-menu-item" type="button" onClick={(event) => openReference("case-file", event.currentTarget)}>Case file</button>
              <button className="menu-item mobile-menu-item" type="button" onClick={(event) => openReference("orientation", event.currentTarget)}>Orientation</button>
              <button className="menu-item mobile-menu-item" type="button" onClick={(event) => openReference("bridge", event.currentTarget)}>Learning Bridge</button>
              <button className="menu-item mobile-menu-item" type="button" onClick={(event) => openAdvisor(event.currentTarget)}>AI Advisors</button>
              <button className="menu-item" type="button" onClick={(event) => openGlossary(event.currentTarget)}>Glossary</button>
              <ThemeButton variant="menu" onToggle={() => setMenuOpen(false)} />
              <div className="menu-divider" />
              <button className="menu-item text-bad" type="button" disabled={busy} onClick={() => void exitWorkshop()}>Exit</button>
            </div>
          </div>
        </div>
      </header>

      {bannerMessage && (
        <div className="inject-banner" role="status">
          <div><strong>{notice ? "Workshop status" : "Facilitator update"}</strong><span>{bannerMessage}</span></div>
          <button type="button" className="icon-button" aria-label="Dismiss update" onClick={() => { setNotice(""); if (!notice && visibleInject) { setDismissedInjectId(visibleInject.id); localStorage.setItem(dismissedInjectKey(bundle.participant.id), visibleInject.id); } }}>×</button>
        </div>
      )}

      <div className="orientation-tools" aria-label="Orientation and learning resources">
        <span className={`preparation-status ${preparationComplete ? "complete" : "incomplete"}`} role="status" aria-live="polite">{preparationComplete ? (caseworkRunning ? "Casework in progress" : "Preparation complete · waiting for facilitator") : "Preparation incomplete · casework waiting"}</span>
        <button type="button" className="secondary-button reference-tool-button" aria-haspopup="dialog" aria-expanded={referenceSurface === "orientation"} onClick={(event) => openReference("orientation", event.currentTarget)}>Orientation</button>
        <button type="button" className="secondary-button reference-tool-button" id="replayBridge" aria-haspopup="dialog" aria-expanded={referenceSurface === "bridge"} onClick={(event) => openReference("bridge", event.currentTarget)}>Learning bridge</button>
        <button type="button" className="secondary-button reference-tool-button" id="openAdvisors" aria-haspopup="dialog" aria-expanded={advisorOpen} onClick={(event) => openAdvisor(event.currentTarget)}>AI advisors</button>
      </div>

      <div className="shell">
        <aside className="process" aria-label="Simulation process" tabIndex={0}>
          <div className="rail-title"><div className="eyebrow">Process flow</div><h2>Complete the decision chain</h2><div className="rail-sub">{bundle.session.submissionsClosed ? "The submitted recommendation is preserved. Debrief and transfer remains available." : "The facilitator unlocks each new step. Earlier work remains open for revision."}</div></div>
          <ol className="steps">
            {STAGES.map((item, index) => {
              const unlocked = index <= availableStage && (!bundle.session.submissionsClosed || index === FINAL_STAGE_INDEX);
              const stepState = stage === index ? "Current" : unlocked ? "Available" : "Locked";
              const stepClass = ["step", stage === index ? "current" : "", unlocked ? "available" : "locked"].filter(Boolean).join(" ");
              return <li key={item.short}><button type="button" className={stepClass} disabled={!unlocked} aria-current={stage === index ? "step" : undefined} onClick={() => { setRoleBriefOpen(index === 0); setStage(index); }}><span className="step-num">{index + 1}</span><span className="step-copy"><strong>{item.short}</strong><span>{item.title}</span><em className="step-state">{stepState}</em></span></button></li>;
            })}
          </ol>
          <div className="mode-note"><strong>{isLocalBundle(bundle) ? "Local emergency mode" : "Live workshop mode"}</strong><span>{isLocalBundle(bundle) ? "This browser retains your work. Download the handoff file when finished." : "Your activity is synchronized with the facilitator."}</span></div>
        </aside>

        <main ref={mainContent} className={`workspace ${stage === 0 && roleBriefOpen ? "role-brief-open" : ""}`} id="main-content" tabIndex={-1}>
          {!preparationComplete ? <PreparationState onOrientation={(target) => openReference("orientation", target)} onBridge={(target) => openReference("bridge", target)} /> : stage === 0 && roleBriefOpen ? <RoleBrief onContinue={() => setRoleBriefOpen(false)} /> : <>
            <div className="stage-head"><div><div className="eyebrow">Current stage · Step {stage + 1} · {STAGES[stage].short}{stage < FINAL_STAGE_INDEX ? " · Working state" : ""}</div><h1>{STAGES[stage].title}</h1><p>{STAGES[stage].objective}</p></div><div className="stage-index">{stage + 1} / {STAGES.length}<span className={`autosave-state save-${saveState.toLowerCase()}`} role="status" aria-live="polite">{saveState === "DIRTY" ? "Unsaved changes" : saveState === "SAVING" ? "Saving…" : saveState === "ERROR" ? "Save failed · changes unsaved" : "Saved"}</span></div></div>
            {error && <div className="error-panel" role="alert"><span>{error}</span>{!isLocalBundle(bundle) && <button type="button" className="secondary-button" onClick={() => { const local = activateEmergencyMode(bundle); localStorage.setItem(PARTICIPANT_KEY, local.participant.id); setBundle(local); setDecisions(local.decisions); setError(""); setNotice("Local emergency mode started. Download the handoff file when you finish."); }}>Continue in local emergency mode</button>}</div>}
            <StageContent stage={stage} decisions={decisions} setDecisions={(value) => { setDecisions(value); setSaveState("DIRTY"); }} bundle={bundle} setBundle={setBundle} setError={setError} setSaveState={setSaveState} now={now} />
            {stage < FINAL_STAGE_INDEX && <div className="stage-actions actions">
              <button type="button" className="secondary-button" disabled={stage === 0 || busy} onClick={() => { void persist(stage); setRoleBriefOpen(false); setStage((value) => value - 1); }}>Previous</button>
              <button type="button" className="primary-button" disabled={busy} onClick={() => void persist(stage)}>Save work</button>
              {stage < availableStage && <button type="button" className="primary-button" disabled={busy} onClick={() => { void persist(stage + 1); setRoleBriefOpen(false); setStage((value) => value + 1); }}>Continue</button>}
            </div>}
          </>}
        </main>

      </div>
      {communicationsOpen && <CommunicationsPanel bundle={bundle} setBundle={setBundle} setError={setError} error={error} now={now} onClose={closeCommunications} />}
      {glossaryOpen && <GlossaryDialog onClose={closeGlossary} />}
      {advisorOpen && <AdvisorPanel bundle={bundle} setBundle={setBundle} onClose={closeAdvisor} />}
      {referenceSurface && <ReferenceExperience key={referenceSurface} surface={referenceSurface} onClose={closePreparationSurface} onComplete={completePreparationSurface} preparationComplete={preparationComplete} />}
      <div className="sr-only" aria-live="polite" aria-atomic="true">{liveAnnouncement}</div>
    </div>
  );
}

function GlossaryDialog({ onClose }: { onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useDialogLifecycle(rootRef, closeRef);
  return <div ref={rootRef} className="modal-scrim glossary-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="glossary-dialog" role="dialog" aria-modal="true" aria-labelledby="glossary-title" tabIndex={-1} onKeyDown={(event) => trapDialogFocus(event, onClose)}><header><div><span className="eyebrow">Workshop reference</span><h2 id="glossary-title">Glossary</h2><p>Terms used in the Kuvera financing-assurances exercise.</p></div><button ref={closeRef} type="button" className="icon-button" aria-label="Close glossary" onClick={onClose}>×</button></header><div className="glossary-body" role="region" aria-label="Glossary terms" tabIndex={0}><dl>{GLOSSARY_TERMS.map((item) => <div key={item.term}><dt>{item.term}</dt><dd>{item.definition}</dd></div>)}</dl></div></section></div>;
}

function WorkshopEntryState({ initializing, busy, error, entryHandoff, onRetry, onJoinLocal }: { initializing: boolean; busy: boolean; error: string; entryHandoff: JoinInput | null; onRetry: () => void; onJoinLocal: () => void }) {
  const inProgress = initializing || busy;
  return <main className="entry-page participant-reference"><div className="entry-brand"><img className="aiddata-brandmark" src="/assets/AidData Brandmark.png" alt="AidData" /><span><strong>Sovereign</strong><small>Futures Lab</small></span></div><section className="entry-copy"><span className="eyebrow">Case · Kuvera Financing Assurances</span><h1>{WORKSHOP_TITLE}</h1><p>Take the role of Kuvera’s Debt Management Office (DMO). Inspect the record, request evidence, and prepare an internal negotiation-preparation brief that states what is known, unknown, and conditional.</p><p>A financing assurance is a creditor signal that can support the package before final legal agreements exist; your recommendation informs that process but does not create an assurance or sovereign commitment.</p><div className="method-line"><span>Evidence</span><i /> <span>Decision</span><i /> <span>Consequence</span><i /> <span>Transfer</span></div></section><section className="join-card" aria-labelledby="entry-state-title" aria-live="polite"><h2 id="entry-state-title">{inProgress ? "Joining the workshop" : "Enter through the main page"}</h2>{inProgress ? <p>Your participant details are being verified. Keep this page open.</p> : <p>The participant sign-in is on the Sovereign landing page so your details are entered only once.</p>}{error && <div className="error-panel" role="alert">{error}</div>}{!inProgress && entryHandoff && <><button className="primary-button full" type="button" onClick={onRetry}>Try again</button><button className="secondary-button full" type="button" onClick={onJoinLocal}>Continue in local emergency mode</button></>}{!inProgress && <p><a href="/">Return to participant sign-in</a></p>}</section></main>;
}

function PreparationState({ onOrientation, onBridge }: { onOrientation: (target: EventTarget | null) => void; onBridge: (target: EventTarget | null) => void }) {
  return <section className="preparation-state" aria-labelledby="preparation-state-title"><span className="eyebrow">Preparation · incomplete</span><h1 id="preparation-state-title">Finish preparation before casework</h1><p>Orientation and the Learning Bridge are outside the timed case. The {CASE_FACTS.caseworkDurationSeconds / 60}-minute casework clock starts only when the facilitator begins the exercise.</p><p>Skipping or closing preparation keeps you here. You can reopen either resource without changing any casework decisions, evidence requests, or messages.</p><div className="preparation-deadlines" aria-label="Institutional case deadlines"><div><strong>{CASE_FACTS.maturityWeeks} weeks</strong><span>USD {CASE_FACTS.maturityUsdMillions}m maturity</span></div><div><strong>{CASE_FACTS.imfBoardHorizonWeeks} weeks</strong><span>IMF Board horizon</span></div></div><p className="preparation-deadline-note">These are institutional case facts, not a conversion from workshop minutes.</p><div className="actions"><button className="primary-button" type="button" aria-haspopup="dialog" onClick={(event) => onOrientation(event.currentTarget)}>Continue orientation</button><button className="secondary-button" type="button" aria-haspopup="dialog" onClick={(event) => onBridge(event.currentTarget)}>Open Learning Bridge</button></div></section>;
}

function RoleBrief({ onContinue }: { onContinue: () => void }) {
  return <section className="role-lens" aria-labelledby="role-lens-title"><div className="role-lens-head"><div className="role-lens-id"><div className="role-lens-avatar" aria-hidden="true">DMO</div><div><h1 id="role-lens-title">{ROLE_TITLE}</h1><span>Kuvera Finance Ministry · your role in the ministry team</span></div></div><div className="role-lens-kicker">Your role</div></div><p className="role-lens-lead">{ROLE_BOUNDARY.lead}</p><div className="role-lens-grid"><div className="role-lens-cell"><b>Mandate</b><p>{ROLE_BOUNDARY.mandate}</p></div><div className="role-lens-cell"><b>Evidence available to you</b><p>{ROLE_BOUNDARY.evidenceAvailable}</p></div><div className="role-lens-cell"><b>Authority boundary</b><p>{ROLE_BOUNDARY.authorityBoundary}</p></div><div className="role-lens-cell"><b>Critical handoff</b><p>{ROLE_BOUNDARY.criticalHandoff}</p></div></div><div className="role-lens-foot"><p>The facilitator controls when new steps open. Select Mandate in the process rail whenever you need to reopen this brief.</p><button className="primary-button" type="button" onClick={onContinue}>Continue to my first decision</button></div></section>;
}

function StageContent({ stage, decisions, setDecisions, bundle, setBundle, setError, setSaveState, now }: { stage: number; decisions: DecisionState; setDecisions: (value: DecisionState) => void; bundle: ParticipantBundle; setBundle: (value: ParticipantBundle) => void; setError: (value: string) => void; setSaveState: (value: SaveState) => void; now: number }) {
  const update = <K extends keyof DecisionState>(key: K, value: DecisionState[K]) => setDecisions({ ...decisions, [key]: value });
  const treasuryReconciliationAvailable = bundle.evidenceRequests.some((request) => (
    request.evidenceId === "treasury-reconciliation" && evidenceIsAvailable(request, new Date(now))
  ));
  if (stage === 0) return <section className="work-card task-card highlight"><h2>{ROLE_TITLE} mandate</h2><div className="mandate-grid"><div><small>You may</small><ul>{ROLE_BOUNDARY.may.map((item) => <li key={item}>{item}</li>)}</ul></div><div><small>You may not</small><ul>{ROLE_BOUNDARY.mayNot.map((item) => <li key={item}>{item}</li>)}</ul></div></div><label className="consent"><input type="checkbox" checked={decisions.mandateConfirmed} onChange={(event) => update("mandateConfirmed", event.target.checked)} /><span>I understand that the DMO prepares the record and recommendation; it does not create sovereign or creditor commitment.</span></label><TextArea label="In your own words, what is your authority boundary?" value={decisions.mandateRationale} onChange={(value) => update("mandateRationale", value)} /></section>;
  if (stage === 1) return <section className="work-card task-card highlight"><h2>Can the package rely on USD {CASE_FACTS.reportedLiquidityUsdMillions}m?</h2><p>The cash ledger reports USD {CASE_FACTS.reportedLiquidityUsdMillions}m. A partial memo indicates that copper revenues may pass through an account with restrictions; the control terms and amount affected have not been reconciled.</p><ChoiceGroup value={decisions.liquidityAction} onChange={(value) => update("liquidityAction", value as DecisionState["liquidityAction"])} options={[{ value: "VERIFY_NOW", title: "Verify before reliance", detail: "Request the evidence needed to establish any restriction or protected-balance effect." },{ value: "PROCEED_WITH_CAVEAT", title: "Proceed with an explicit caveat", detail: "Begin coordination now without treating the reported figure as verified." }]} /><TextArea label="Why is this the appropriate first move?" value={decisions.liquidityRationale} onChange={(value) => update("liquidityRationale", value)} /></section>;
  if (stage === 2) return <section className="work-card task-card highlight"><h2>Institutional evidence requests</h2><p>Each response takes time to obtain. The facilitator may release a response early. Requesting everything is not automatically better; compare each question with the deadlines and unresolved risks.</p><div className="evidence-list">{EVIDENCE_CATALOG.map((definition) => { const request = bundle.evidenceRequests.find((item) => item.evidenceId === definition.id); const ready = request ? evidenceIsAvailable(request, new Date(now)) : false; const seconds = request ? Math.max(0, Math.ceil((new Date(request.availableAt).getTime() - now) / 1000)) : 0; return <article key={definition.id} className={ready ? "evidence ready" : "evidence"}><div><small>{definition.requestedFrom}</small><h3>{definition.title}</h3><p>{definition.summary}</p></div>{ready ? <details><summary>Review returned evidence</summary><p>{definition.details}</p><cite>{definition.sourceLabel}</cite></details> : request ? <span className="pending-tag">Response in {seconds}s</span> : <button type="button" className="secondary-button" onClick={() => { void requestEvidence(bundle, definition.id).then(setBundle).catch((caught) => setError(caught instanceof Error ? caught.message : "Request failed")); }}>Request</button>}</article>; })}</div><InstitutionalRequestDesk bundle={bundle} setBundle={setBundle} setError={setError} /></section>;
  if (stage === 3) return <section className="work-card task-card highlight"><h2>Record the supported liquidity basis</h2><p>Record what your current evidence supports. Access to a figure is not the same as verification.</p><ChoiceGroup value={decisions.liquidityBasis} onChange={(value) => update("liquidityBasis", value as DecisionState["liquidityBasis"])} options={[{ value: "VERIFIED_480", title: treasuryReconciliationAvailable ? `USD ${CASE_FACTS.usableLiquidityUsdMillions}m verified usable` : "Record a reconciled usable-liquidity basis", detail: treasuryReconciliationAvailable ? "Use the amount established by the returned Treasury reconciliation." : "Select only if returned Treasury evidence establishes a usable amount." },{ value: "REPORTED_780", title: `USD ${CASE_FACTS.reportedLiquidityUsdMillions}m reported, not verified`, detail: "Record the reported figure as provisional rather than usable cash." },{ value: "UNRESOLVED", title: "Keep the basis unresolved", detail: "Record that the available evidence does not establish a usable amount." }]} /><TextArea label="State the evidence and caveat behind this record entry." value={decisions.liquidityBasisRationale} onChange={(value) => update("liquidityBasisRationale", value)} /></section>;
  if (stage === 4) return <section className="work-card task-card highlight"><h2>Map account control and facility dependency</h2><h3>Account classification</h3><ChoiceGroup value={decisions.accountClassification} onChange={(value) => update("accountClassification", value as DecisionState["accountClassification"])} options={[{ value: "EFFECTIVE_CONTROL", title: "Quasi-collateral / effective control", detail: "Record an effective-control classification." },{ value: "ORDINARY_ACCOUNT", title: "Ordinary operating account", detail: "Record an ordinary-account classification." },{ value: "UNRESOLVED", title: "Unresolved", detail: "Record that the available evidence does not support a classification." }]} /><h3>Facility A/B linkage</h3><ChoiceGroup value={decisions.facilityLinkage} onChange={(value) => update("facilityLinkage", value as DecisionState["facilityLinkage"])} options={[{ value: CASE_FACTS.facilityLinkageFinding, title: "Shared revenue pool", detail: "Record Facilities A and B as sharing a revenue pool." },{ value: "INDEPENDENT", title: "Independent facilities", detail: "Record the facilities as independent for dependency analysis." },{ value: "UNRESOLVED", title: "Linkage unresolved", detail: `Record that Facility B's relationship to ${CASE_FACTS.facilityAAccount} remains ${CASE_FACTS.facilityBEntryStatus}.` }]} /><TextArea label="Explain the evidence supporting both entries." value={decisions.linkageRationale} onChange={(value) => update("linkageRationale", value)} /></section>;
  if (stage === 5) return <section className="work-card task-card highlight"><h2>Recommend disclosure and treatment perimeter</h2><h3>Disclosure level</h3><ChoiceGroup value={decisions.disclosure} onChange={(value) => update("disclosure", value as DecisionState["disclosure"])} options={[{ value: "FULL", title: "Full contract disclosure", detail: "Recommend release of the complete contract information." },{ value: "REDACTED", title: "Redacted functional summary", detail: "Recommend release of a summary with selected details removed." },{ value: "WITHHOLD", title: "Withhold pending consent", detail: "Recommend no external release until permission is established." }]} /><h3>Treatment perimeter</h3><ChoiceGroup value={decisions.treatmentPerimeter} onChange={(value) => update("treatmentPerimeter", value as DecisionState["treatmentPerimeter"])} options={[{ value: "BOTH_FACILITIES", title: "Carry Facilities A and B", detail: "Record both facilities inside the proposed treatment perimeter." },{ value: "FACILITY_A_ONLY", title: "Carry Facility A only", detail: "Record only Facility A inside the proposed treatment perimeter." },{ value: "DEFER", title: "Defer perimeter recommendation", detail: "Record that the evidence is insufficient to define the perimeter." }]} /><TextArea label="Explain the trade-off and the boundary of your recommendation." value={decisions.disclosureRationale} onChange={(value) => update("disclosureRationale", value)} /></section>;
  if (stage === 6) return <SubmissionStage decisions={decisions} update={update} bundle={bundle} setBundle={setBundle} setError={setError} setSaveState={setSaveState} now={now} />;
  return <DebriefStage decisions={decisions} setDecisions={setDecisions} bundle={bundle} setBundle={setBundle} setError={setError} setSaveState={setSaveState} />;
}

function DebriefStage({ decisions, setDecisions, bundle, setBundle, setError, setSaveState }: { decisions: DecisionState; setDecisions: (value: DecisionState) => void; bundle: ParticipantBundle; setBundle: (value: ParticipantBundle) => void; setError: (value: string) => void; setSaveState: (value: SaveState) => void }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const participantSubmissions = [...bundle.submissions]
    .filter((submission) => submission.participantId === bundle.participant.id)
    .sort((a, b) => a.version - b.version);
  const latestSubmission = participantSubmissions.at(-1);
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(latestSubmission?.version);
  useEffect(() => {
    if (!selectedVersion || !participantSubmissions.some((submission) => submission.version === selectedVersion)) setSelectedVersion(latestSubmission?.version);
  }, [latestSubmission?.version, selectedVersion]);
  const debriefOpen = bundle.session.status === "DEBRIEF" || bundle.session.status === "CLOSED";
  const debrief = debriefOpen ? buildParticipantDebrief({
    participantId: bundle.participant.id,
    submissions: bundle.submissions,
    evidenceRequests: bundle.evidenceRequests,
    institutionalMessages: bundle.messages,
    injects: bundle.injects,
    submissionVersion: selectedVersion,
  }) : undefined;

  async function saveReflection() {
    setSaving(true);
    setSaveState("SAVING");
    setSaved(false);
    setError("");
    try {
      const next = await saveTransferReflection(bundle, decisions.reflection);
      setBundle(next);
      setDecisions(next.decisions);
      setSaved(true);
      setSaveState("SAVED");
    } catch (caught) {
      setSaveState("ERROR");
      setError(caught instanceof Error ? caught.message : "Transfer reflection could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (!debriefOpen) {
    return <section className="work-card task-card highlight" aria-labelledby="debrief-waiting-title"><span className="eyebrow">Submitted record</span><h2 id="debrief-waiting-title">Waiting for the facilitator to begin the review</h2>{latestSubmission ? <><p>Your submitted recommendation is preserved while submissions remain open. You may return to earlier steps and submit another version until the facilitator begins debrief.</p><div className="brief-review"><dl><div><dt>Submitted position</dt><dd>{latestSubmission.decisions.readiness?.replaceAll("_", " ").toLowerCase() ?? "Not recorded"}</dd></div><div><dt>Submitted version</dt><dd>Version {latestSubmission.version} · {new Date(latestSubmission.submittedAt).toLocaleString()}</dd></div></dl></div></> : <p>No recommendation version has been submitted. The facilitator will begin the review and close submissions for the room.</p>}<div className="completion-note" role="status"><strong>The facilitator will begin the debrief.</strong><span>Your own submitted record will appear here without exposing another participant’s decisions or detailed after-action report.</span></div>{isLocalBundle(bundle) && <button type="button" className="secondary-button" onClick={() => downloadEmergencyHandoff(bundle, decisions)}>Download emergency handoff file</button>}</section>;
  }

  return <section className="work-card task-card highlight" aria-labelledby="participant-debrief-title"><span className="eyebrow">Your submitted record</span><h2 id="participant-debrief-title">Debrief and transfer</h2><p>This view reconstructs only your selected submitted recommendation. The facilitator’s detailed after-action report remains separate.</p>{participantSubmissions.length > 1 && <label className="compact-label">Replayed submission version<select value={selectedVersion} onChange={(event) => setSelectedVersion(Number(event.target.value))}>{participantSubmissions.map((submission) => <option key={submission.id} value={submission.version}>Version {submission.version} · {submission.contextSnapshot ? "frozen" : "legacy reconstruction"}</option>)}</select></label>}{debrief ? <><div className="brief-review"><dl><div><dt>Submitted position</dt><dd>{debrief.position}</dd></div><div><dt>Submitted version</dt><dd>Version {debrief.version} · {new Date(debrief.submittedAt).toLocaleString()}</dd></div><div><dt>Replay provenance</dt><dd>{debrief.replayProvenance.label}</dd></div><div><dt>Evidence available at submission</dt><dd>{debrief.evidenceAvailable.length ? <ul>{debrief.evidenceAvailable.map((item) => <li key={item.id}><strong>{item.title}</strong><span>{item.summary} <cite>{item.sourceLabel}</cite></span></li>)}</ul> : "No requested evidence was available at submission."}</dd></div><div><dt>Material consequences</dt><dd><ul>{debrief.consequences.map((item) => <li key={item.id}><strong>{item.title}</strong><span>{item.outcome} Basis: {item.basis}</span></li>)}</ul></dd></div><div><dt>Unresolved risks</dt><dd>{debrief.unresolvedRisks.length ? <ul>{debrief.unresolvedRisks.map((risk) => <li key={risk}>{risk}</li>)}</ul> : "No blocking uncertainty was recorded in this bounded exercise."}</dd></div><div><dt>One counterfactual</dt><dd><strong>{debrief.counterfactual.alternative}</strong><p>{debrief.counterfactual.projectedDifference}</p><span>Fixed assumptions: {debrief.counterfactual.fixedAssumptions}</span></dd></div><div><dt>Facilitator updates in the record</dt><dd>{debrief.facilitatorInjects.length ? <ul>{debrief.facilitatorInjects.map((inject) => <li key={inject.id}><strong>{inject.title}</strong><span>{inject.body}</span></li>)}</ul> : "No facilitator inject was delivered before this submission."}</dd></div></dl></div><div className="completion-note"><strong>Exercise boundary</strong><span>{debrief.fictionalBoundary}</span></div></> : <div className="completion-note"><strong>No submitted recommendation was recorded before submissions closed.</strong><span>You can still record a transfer reflection without creating or changing a submission.</span></div>}<TextArea label="What will you do differently when preparing a real decision under uncertainty?" value={decisions.reflection} onChange={(value) => { setSaved(false); setDecisions({ ...decisions, reflection: value }); }} rows={7} /><div className="submission-bar"><div><strong>Transfer reflection</strong><span role="status" aria-live="polite">{saved ? "Saved. Your submitted recommendation version is unchanged." : "This response is saved separately from the submitted recommendation snapshot."}</span></div><button type="button" className="primary-button" disabled={saving || bundle.session.status === "CLOSED"} onClick={() => void saveReflection()}>{bundle.session.status === "CLOSED" ? "Session closed" : saving ? "Saving…" : "Save transfer reflection"}</button></div>{isLocalBundle(bundle) && <button type="button" className="secondary-button" onClick={() => downloadEmergencyHandoff(bundle, decisions)}>Download emergency handoff file</button>}</section>;
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
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useDialogLifecycle(rootRef, closeRef);

  return <div ref={rootRef} className="drawer-scrim communications-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="communications-dialog" role="dialog" aria-modal="true" aria-labelledby="communications-title" tabIndex={-1} onKeyDown={(event) => trapDialogFocus(event, onClose)}><header className="communications-head"><div><h2 id="communications-title">Communications</h2><p>Internal team and institutional counterparts</p></div><div className="communications-head-actions"><span className="pill"><span className="status-dot" />{bundle.messages.filter((message) => message.status === "PENDING").length} awaiting reply</span><button ref={closeRef} type="button" className="secondary-button" onClick={onClose}>Close</button></div></header><div className="communications-layout">
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

function SubmissionStage({ decisions, update, bundle, setBundle, setError, setSaveState, now }: { decisions: DecisionState; update: <K extends keyof DecisionState>(key: K, value: DecisionState[K]) => void; bundle: ParticipantBundle; setBundle: (value: ParticipantBundle) => void; setError: (value: string) => void; setSaveState: (value: SaveState) => void; now: number }) {
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = negotiationBriefIsSubmittable(decisions);
  const missingSubmissionFields = [
    !decisions.readiness && "a position",
    !decisions.nextHandoff.trim() && "the next institutional handoff",
    !decisions.finalRationale.trim() && "the recommendation to the Finance Ministry Lead",
  ].filter(Boolean) as string[];
  const preparedAt = new Date(now);
  const review = reviewRecommendation({ decisions, evidenceRequests: bundle.evidenceRequests, reviewedAt: preparedAt });
  const brief = buildNegotiationPreparationBrief({ decisions, evidenceRequests: bundle.evidenceRequests, institutionalMessages: bundle.messages, preparedAt });
  async function submitBrief() {
    setSubmitting(true);
    setSaveState("SAVING");
    setError("");
    try {
      const saved = await saveDecisions(bundle, decisions, 6);
      const submitted = await submitRecommendation(saved);
      setBundle(submitted);
      setSaveState("SAVED");
    } catch (caught) {
      setSaveState("ERROR");
      setError(caught instanceof Error ? caught.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }
  return <section className="work-card task-card highlight"><h2>Negotiation-preparation brief</h2><p><strong>Working state · unsent until you submit.</strong> This is an internal DMO recommendation for Finance Ministry preparation. It is not a negotiated result, agreement, assurance, or sovereign commitment. A conditional or not-ready brief may preserve unresolved evidence.</p><h3>Position</h3><ChoiceGroup accessibleLabel="Position" value={decisions.readiness} onChange={(value) => update("readiness", value as DecisionState["readiness"])} options={[{ value: "READY", title: "Ready", detail: "The evidence state supports advancing the DMO package without a blocking dependency." },{ value: "READY_WITH_CONDITIONS", title: "Ready with conditions", detail: "Advance only with the conditions and unresolved dependencies stated." },{ value: "NOT_READY", title: "Not ready", detail: "The DMO record does not support advancing the package." }]} /><TextArea label="Conditions to advance" value={decisions.unresolvedRisks} onChange={(value) => update("unresolvedRisks", value)} /><TextArea label="Next institutional handoff" value={decisions.nextHandoff} onChange={(value) => update("nextHandoff", value)} rows={3} maxLength={400} /><TextArea label="Recommendation to the Finance Ministry Lead" value={decisions.finalRationale} onChange={(value) => update("finalRationale", value)} rows={6} /><section className="brief-review" aria-labelledby="brief-review-title"><div className="brief-review-heading"><div><span className="eyebrow">Internal DMO artifact</span><h3 id="brief-review-title">Negotiation-preparation brief</h3></div><span className="pill">Working state · unsent</span></div><dl><div><dt>Position</dt><dd>{brief.position}</dd></div><div><dt>Evidence basis</dt><dd>{brief.evidenceBasis.length ? <ul>{brief.evidenceBasis.map((item) => <li key={item.id}><strong>{item.title}</strong><span>{item.summary} <cite>{item.sourceLabel}</cite></span></li>)}</ul> : "No requested evidence is available yet."}</dd></div><div><dt>Known uncertainties</dt><dd>{brief.knownUncertainties.length ? <ul>{brief.knownUncertainties.map((item) => <li key={item}>{item}</li>)}</ul> : "No material uncertainty identified by the recommendation check."}</dd></div><div><dt>Disclosure boundary</dt><dd>{brief.disclosureBoundary}</dd></div><div><dt>Treatment perimeter</dt><dd>{brief.treatmentPerimeter}</dd></div><div><dt>Conditions to advance</dt><dd>{brief.conditionsToAdvance}</dd></div><div><dt>Next institutional handoff</dt><dd>{brief.nextInstitutionalHandoff}</dd></div><div><dt>Recommendation to the Finance Ministry Lead</dt><dd>{brief.financeMinistryRecommendation}</dd></div></dl></section><section aria-labelledby="recommendation-check-title"><h3 id="recommendation-check-title">Recommendation check</h3><p>This compares each selected claim with evidence available now. It does not score or choose a recommendation.</p><div className="evidence-list">{review.items.map((item) => <article key={item.claim} className={item.status === "SUPPORTED" ? "evidence ready" : "evidence"}><div><small>{item.label}</small><h3>{item.recordedClaim}</h3><p>{item.explanation}</p></div><span className="pill" aria-label={`${item.label}: ${item.status.toLowerCase()}`}>{item.status}</span></article>)}</div>{review.readyMismatch && <div className="error-panel" role="status"><span><strong>READY does not match the current evidence state.</strong> {review.mismatchExplanation}</span></div>}</section><div className="submission-bar"><div><strong>{bundle.submissions.length} version{bundle.submissions.length === 1 ? "" : "s"} submitted</strong><span id="submission-requirements" role="status">{bundle.session.submissionsClosed ? "Submissions are closed; the latest submitted version is preserved." : missingSubmissionFields.length ? `To submit, add ${missingSubmissionFields.join(", ")}.` : "Ready to submit. Each version retains its brief, evidence state, and next institutional handoff."}</span></div><button type="button" className="record-button" aria-describedby="submission-requirements" disabled={!canSubmit || submitting || bundle.session.submissionsClosed} onClick={() => void submitBrief()}>{bundle.session.submissionsClosed ? "Submissions closed" : submitting ? "Submitting…" : "Submit brief"}</button></div></section>;
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
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const turns = useMemo(() => bundle.advisorTurns.filter((turn) => turn.advisorId === advisorId), [bundle.advisorTurns, advisorId]);
  const profile = ADVISOR_PROFILES[advisorId];
  useDialogLifecycle(rootRef, closeRef);

  useEffect(() => {
    const synthesis = "speechSynthesis" in window ? window.speechSynthesis : null;
    const refreshVoices = () => setAvailableVoices(synthesis?.getVoices() ?? []);
    refreshVoices();
    synthesis?.addEventListener("voiceschanged", refreshVoices);
    return () => {
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
    if (advisorResponseUsesInstantReveal(reducedMotion, responseChunks.length)) {
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

  return <div ref={rootRef} className="advisor-workspace-scrim" role="presentation"><section className="advisor-workspace" role="dialog" aria-modal="true" aria-labelledby="advisor-title" tabIndex={-1} onKeyDown={(event) => trapDialogFocus(event, onClose)}><header className="advisor-workspace-head"><div><h2 id="advisor-title">AI advisors</h2><p>Two case-grounded advisors explain evidence and process boundaries. They will not make your decision.</p></div><button ref={closeRef} className="secondary-button" type="button" onClick={onClose}>Close</button></header><div className="advisor-workspace-body">
    <aside className="advisor-briefs" aria-label="Advisor briefs"><div className="advisor-selector" aria-label="Choose an advisor">{(Object.entries(ADVISOR_PROFILES) as Array<[AdvisorId, typeof profile]>).map(([id, advisor]) => <button key={id} type="button" aria-pressed={advisorId === id} onClick={() => setAdvisorId(id)}><img src={advisor.image} alt="" /><span><strong>{advisor.name}</strong><small>{advisor.shortName === "Amara" ? "Country and process" : "Contracts and treatment"}</small></span></button>)}</div><article className="advisor-brief-card selected"><div className="advisor-brief-head"><img src={profile.image} alt={profile.name} /><div><strong>{profile.name}</strong><small>{profile.bio}</small><span>{profile.role}</span></div></div><p>{profile.brief}</p><details className="advisor-welcome-message"><summary>Read welcome transcript</summary><p>{profile.welcome}</p></details><div className="advisor-brief-actions"><button type="button" className="text-button" onClick={() => playWelcome(profile.welcome)}>Play welcome</button></div></article></aside>
    <section className="advisor-chat" aria-labelledby="active-advisor-name"><header className="advisor-chat-head"><div className="advisor-person"><img src={profile.image} alt="" /><div><span className="eyebrow">Active advisor</span><h3 id="active-advisor-name">{profile.name}</h3><p className="advisor-active-bio">{profile.bio}</p><small>{profile.role}</small></div></div></header><div ref={conversation} className="advisor-conversation" role="log" aria-live="off" aria-busy={busy || Boolean(revealingReply)} aria-label={`Conversation with ${profile.name}`} tabIndex={0}><article className="advisor-opening"><div className="answer"><strong>{profile.shortName}</strong><p>{profile.greeting}</p></div></article>{turns.map((turn) => { const isRevealing = revealingReply?.turnId === turn.id; return <article key={turn.id}><div className="question"><strong>You</strong><p>{turn.question}</p></div><div className="answer"><strong>{profile.shortName}</strong><p aria-hidden={isRevealing || undefined}>{isRevealing ? revealedReply : turn.answer}{isRevealing && <span className="advisor-stream-cursor" aria-hidden="true" />}</p>{!isRevealing && <AdvisorSources sources={turn.sources} />}</div></article>; })}{busy && <article className="advisor-thinking" role="status"><div className="answer"><strong>{profile.shortName}</strong><p>Considering the visible record<span aria-hidden="true">…</span></p></div></article>}</div><div className="sr-only" aria-live="polite" aria-atomic="true">{replyAnnouncement}</div><div className="advisor-suggestions" aria-label={`Suggested questions for ${profile.name}`}>{profile.suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => setQuestion(suggestion)}>{suggestion}</button>)}</div>{error && <div className="error-panel advisor-error" role="alert">{error}</div>}<div className="advisor-compose"><label><span>Review or edit the transcript before sending</span><textarea rows={3} maxLength={2000} value={question} onChange={(event) => setQuestion(event.target.value)} /></label><div><button type="button" className={recording ? "voice-button recording" : "voice-button"} aria-pressed={recording} disabled={busy} onPointerDown={() => void startRecording()} onPointerUp={stopRecording} onPointerLeave={stopRecording} onKeyDown={(event) => { if (!event.repeat && (event.key === " " || event.key === "Enter")) { event.preventDefault(); void startRecording(); } }} onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); stopRecording(); } }}>{recording ? "Release to transcribe" : "Hold to speak"}</button><label className="voice-toggle"><input type="checkbox" checked={voiceReply} onChange={(event) => setVoiceReply(event.target.checked)} />Speak replies</label><button type="button" className="primary-button" disabled={busy || !question.trim()} onClick={() => void send()}>{busy ? "Working…" : "Ask advisor"}</button></div></div><footer>AI advisor · evidence available in your case record only · no hidden-state disclosure · no decision recommendation</footer></section>
  </div></section></div>;
}
