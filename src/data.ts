import { createClient, type RealtimeChannel, type SupabaseClient, type User } from "@supabase/supabase-js";
import { applyAdvisorFallbackCadence, isAdvisorGreeting, normalizeAdvisorCitations } from "./advisorPresentation";
import { buildSubmissionContextSnapshot, CONSEQUENCE_RULE_VERSION, parseSubmissionContextSnapshot, SCENARIO_VERSION } from "./engine";
import { EVIDENCE_CATALOG, EXERCISE_TITLE } from "./scenario";
import { EMPTY_DECISIONS } from "./types";
import type {
  ActivityEvent,
  AdvisorCitation,
  AdvisorId,
  AdvisorTurn,
  DecisionState,
  EvidenceRequest,
  GlobalInject,
  InstitutionalMessage,
  InstitutionRole,
  ParticipantProfile,
  Submission,
  WorkshopSession,
} from "./types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const forcedLocal = String(import.meta.env.VITE_FORCE_LOCAL_MODE).toLowerCase() === "true";
export const cloudEnabled = Boolean(url && anonKey && !forcedLocal);
export const supabase: SupabaseClient | undefined = cloudEnabled ? createClient(url!, anonKey!) : undefined;

export interface ParticipantBundle {
  session: WorkshopSession;
  participant: ParticipantProfile;
  decisions: DecisionState;
  evidenceRequests: EvidenceRequest[];
  submissions: Submission[];
  injects: GlobalInject[];
  messages: InstitutionalMessage[];
  advisorTurns: AdvisorTurn[];
  timeline: ActivityEvent[];
}

const LOCAL_KEY = "futureslab-local-bundle";

export function isLocalBundle(bundle: ParticipantBundle): boolean {
  return bundle.session.id.startsWith("local-");
}

export function decisionSnapshot(decisions: Partial<DecisionState>): DecisionState {
  return structuredClone({ ...EMPTY_DECISIONS, ...decisions });
}

function iso(value: unknown): string {
  return typeof value === "string" ? value : new Date().toISOString();
}

function mapSession(row: Record<string, unknown>): WorkshopSession {
  return {
    id: String(row.id),
    title: String(row.title),
    kind: row.kind as WorkshopSession["kind"],
    status: row.status as WorkshopSession["status"],
    ...(row.join_code ? { joinCode: String(row.join_code) } : {}),
    currentStage: Number(row.current_stage ?? 0),
    durationSeconds: Number(row.duration_seconds ?? 1200),
    remainingSeconds: Number(row.remaining_seconds ?? 1200),
    ...(row.clock_started_at ? { clockStartedAt: String(row.clock_started_at) } : {}),
    submissionsClosed: Boolean(row.submissions_closed),
    createdAt: iso(row.created_at),
    expiresAt: iso(row.expires_at),
  };
}

function mapParticipant(row: Record<string, unknown>): ParticipantProfile {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    name: String(row.name),
    organization: String(row.organization),
    email: String(row.email),
    currentStage: Number(row.current_stage ?? 0),
    lastActiveAt: iso(row.last_active_at),
    consentedAt: iso(row.consented_at),
  };
}

function mapEvidence(row: Record<string, unknown>): EvidenceRequest {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    participantId: String(row.participant_id),
    evidenceId: String(row.evidence_id),
    requestedAt: iso(row.requested_at),
    availableAt: iso(row.available_at),
    ...(row.released_at ? { releasedAt: String(row.released_at) } : {}),
  };
}

function mapSubmission(row: Record<string, unknown>): Submission {
  const contextSnapshot = parseSubmissionContextSnapshot(row.context_snapshot);
  return {
    id: String(row.id),
    participantId: String(row.participant_id),
    sessionId: String(row.session_id),
    version: Number(row.version),
    decisions: decisionSnapshot(row.decisions as Partial<DecisionState>),
    submittedAt: iso(row.submitted_at),
    ...(contextSnapshot ? { contextSnapshot: { ...contextSnapshot, decisions: decisionSnapshot(contextSnapshot.decisions) } } : {}),
  };
}

function normalizeStoredSubmission(submission: Submission): Submission {
  const contextSnapshot = parseSubmissionContextSnapshot(submission.contextSnapshot);
  const normalized = {
    ...submission,
    decisions: decisionSnapshot(submission.decisions),
  };
  if (!contextSnapshot) {
    delete normalized.contextSnapshot;
    return normalized;
  }
  return { ...normalized, contextSnapshot: { ...contextSnapshot, decisions: decisionSnapshot(contextSnapshot.decisions) } };
}

function mapInject(row: Record<string, unknown>): GlobalInject {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    title: String(row.title),
    body: String(row.body),
    sentAt: iso(row.sent_at),
  };
}

function mapMessage(row: Record<string, unknown>): InstitutionalMessage {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    participantId: String(row.participant_id),
    institution: row.institution as InstitutionRole,
    question: String(row.question),
    ...(row.reply ? { reply: String(row.reply) } : {}),
    status: row.status as InstitutionalMessage["status"],
    createdAt: iso(row.created_at),
    ...(row.answered_at ? { answeredAt: String(row.answered_at) } : {}),
  };
}

function mapAdvisorSources(value: unknown): AdvisorCitation[] {
  return normalizeAdvisorCitations(value);
}

function mapAdvisorTurn(row: Record<string, unknown>): AdvisorTurn {
  return {
    id: String(row.id),
    participantId: String(row.participant_id),
    sessionId: String(row.session_id),
    advisorId: row.advisor_id as AdvisorId,
    question: String(row.question),
    answer: String(row.answer),
    sources: mapAdvisorSources(row.sources),
    createdAt: iso(row.created_at),
    mode: row.mode as AdvisorTurn["mode"],
  };
}

function mapEvent(row: Record<string, unknown>): ActivityEvent {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    ...(row.participant_id ? { participantId: String(row.participant_id) } : {}),
    type: String(row.type),
    detail: (row.detail as Record<string, unknown>) ?? {},
    createdAt: iso(row.created_at),
  };
}

function saveLocal(bundle: ParticipantBundle): ParticipantBundle {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(bundle));
  return bundle;
}

function localBundle(profile?: { name: string; organization: string; email: string }): ParticipantBundle {
  const stored = localStorage.getItem(LOCAL_KEY);
  if (stored) {
    const parsed = JSON.parse(stored) as ParticipantBundle;
    return {
      ...parsed,
      decisions: decisionSnapshot(parsed.decisions),
      submissions: (parsed.submissions ?? []).map(normalizeStoredSubmission),
      messages: parsed.messages ?? [],
      advisorTurns: (parsed.advisorTurns ?? []).map((turn) => ({ ...turn, sources: mapAdvisorSources(turn.sources) })),
    };
  }
  if (!profile) throw new Error("LOCAL_PARTICIPANT_NOT_FOUND");
  const now = new Date();
  const participantId = crypto.randomUUID();
  return saveLocal({
    session: {
      id: "local-rehearsal",
      title: EXERCISE_TITLE,
      kind: "REHEARSAL",
      status: "RUNNING",
      joinCode: "FUTURESLAB",
      currentStage: 7,
      durationSeconds: 1200,
      remainingSeconds: 1200,
      clockStartedAt: now.toISOString(),
      submissionsClosed: false,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 30 * 86400000).toISOString(),
    },
    participant: {
      id: participantId,
      sessionId: "local-rehearsal",
      name: profile.name,
      organization: profile.organization,
      email: profile.email.toLowerCase(),
      currentStage: 0,
      lastActiveAt: now.toISOString(),
      consentedAt: now.toISOString(),
    },
    decisions: { ...EMPTY_DECISIONS },
    evidenceRequests: [],
    submissions: [],
    injects: [],
    messages: [],
    advisorTurns: [],
    timeline: [
      {
        id: crypto.randomUUID(),
        sessionId: "local-rehearsal",
        participantId,
        type: "PARTICIPANT_JOINED",
        detail: { mode: "LOCAL_EMERGENCY" },
        createdAt: now.toISOString(),
      },
    ],
  });
}

function storedLocalParticipant(participantId: string): ParticipantBundle | undefined {
  const stored = localStorage.getItem(LOCAL_KEY);
  if (!stored) return undefined;
  const parsed = JSON.parse(stored) as ParticipantBundle;
  return parsed.participant.id === participantId && isLocalBundle(parsed) ? {
    ...parsed,
    decisions: decisionSnapshot(parsed.decisions),
    submissions: (parsed.submissions ?? []).map(normalizeStoredSubmission),
    messages: parsed.messages ?? [],
  } : undefined;
}

export function activateEmergencyMode(bundle: ParticipantBundle): ParticipantBundle {
  const sessionId = bundle.session.id.startsWith("local-") ? bundle.session.id : `local-${bundle.session.id}`;
  return saveLocal({
    ...bundle,
    session: { ...bundle.session, id: sessionId, kind: "REHEARSAL", status: "RUNNING", currentStage: 7, submissionsClosed: false },
    participant: { ...bundle.participant, sessionId },
    evidenceRequests: bundle.evidenceRequests.map((item) => ({ ...item, sessionId })),
    submissions: bundle.submissions.map((item) => ({ ...item, sessionId })),
    advisorTurns: bundle.advisorTurns.map((item) => ({ ...item, sessionId })),
    injects: bundle.injects.map((item) => ({ ...item, sessionId })),
    messages: bundle.messages.map((item) => ({ ...item, sessionId })),
    timeline: [...bundle.timeline, {
      id: crypto.randomUUID(), sessionId, participantId: bundle.participant.id,
      type: "LOCAL_EMERGENCY_MODE_STARTED", detail: { previousSessionId: bundle.session.id }, createdAt: new Date().toISOString(),
    }],
  });
}

export async function joinWorkshop(input: {
  code: string;
  name: string;
  organization: string;
  email: string;
}): Promise<ParticipantBundle> {
  if (!supabase) return localBundle(input);
  const existing = await supabase.auth.getSession();
  if (!existing.data.session) {
    const auth = await supabase.auth.signInAnonymously();
    if (auth.error) throw auth.error;
  }
  const result = await supabase.rpc("join_futureslab_session", {
    p_join_code: input.code,
    p_name: input.name,
    p_organization: input.organization,
    p_email: input.email,
  });
  if (result.error) throw result.error;
  const payload = result.data as { session: Record<string, unknown>; participant: Record<string, unknown> };
  return loadParticipantBundle(mapParticipant(payload.participant).id, mapSession(payload.session), payload.participant);
}

export function joinLocalWorkshop(input: { name: string; organization: string; email: string }): ParticipantBundle {
  localStorage.removeItem(LOCAL_KEY);
  return localBundle(input);
}

export async function loadParticipantBundle(
  participantId: string,
  suppliedSession?: WorkshopSession,
  suppliedParticipant?: Record<string, unknown>,
): Promise<ParticipantBundle> {
  const local = storedLocalParticipant(participantId);
  if (local) return local;
  if (!supabase) return localBundle();
  const participantResult = suppliedParticipant
    ? { data: suppliedParticipant, error: null }
    : await supabase.from("futureslab_participants").select("*").eq("id", participantId).single();
  if (participantResult.error || !participantResult.data) throw participantResult.error ?? new Error("PARTICIPANT_NOT_FOUND");
  const participantRow = participantResult.data as Record<string, unknown>;
  let session = suppliedSession;
  if (!session) {
    const sessionResult = await supabase.from("futureslab_sessions").select("*").eq("id", participantRow.session_id).single();
    if (sessionResult.error || !sessionResult.data) throw sessionResult.error ?? new Error("SESSION_NOT_FOUND");
    session = mapSession(sessionResult.data as Record<string, unknown>);
  }
  const [evidence, submissions, injects, messages, turns, events] = await Promise.all([
    supabase.from("futureslab_evidence_requests").select("*").eq("participant_id", participantId).order("requested_at"),
    supabase.from("futureslab_submissions").select("*").eq("participant_id", participantId).order("version"),
    supabase.from("futureslab_injects").select("*").eq("session_id", session.id).order("sent_at"),
    supabase.from("futureslab_institutional_messages").select("*").eq("participant_id", participantId).order("created_at"),
    supabase.from("futureslab_advisor_turns").select("*").eq("participant_id", participantId).order("created_at"),
    supabase.from("futureslab_activity_events").select("*").eq("participant_id", participantId).order("created_at"),
  ]);
  for (const result of [evidence, submissions, injects, messages, turns, events]) if (result.error) throw result.error;
  return {
    session,
    participant: mapParticipant(participantRow),
    decisions: decisionSnapshot(participantRow.decisions as Partial<DecisionState>),
    evidenceRequests: (evidence.data ?? []).map((row) => mapEvidence(row as Record<string, unknown>)),
    submissions: (submissions.data ?? []).map((row) => mapSubmission(row as Record<string, unknown>)),
    injects: (injects.data ?? []).map((row) => mapInject(row as Record<string, unknown>)),
    messages: (messages.data ?? []).map((row) => mapMessage(row as Record<string, unknown>)),
    advisorTurns: (turns.data ?? []).map((row) => mapAdvisorTurn(row as Record<string, unknown>)),
    timeline: (events.data ?? []).map((row) => mapEvent(row as Record<string, unknown>)),
  };
}

export async function saveDecisions(bundle: ParticipantBundle, decisions: DecisionState, currentStage: number): Promise<ParticipantBundle> {
  const now = new Date().toISOString();
  const persistedDecisions = decisionSnapshot(decisions);
  if (!supabase || isLocalBundle(bundle)) {
    return saveLocal({
      ...bundle,
      decisions: persistedDecisions,
      participant: { ...bundle.participant, currentStage: Math.max(bundle.participant.currentStage, currentStage), lastActiveAt: now },
      timeline: [...bundle.timeline, {
        id: crypto.randomUUID(), sessionId: bundle.session.id, participantId: bundle.participant.id,
        type: "DECISION_STATE_SAVED", detail: { stage: currentStage, decisions: persistedDecisions }, createdAt: now,
      }],
    });
  }
  const result = await supabase.rpc("save_futureslab_decisions", {
    p_participant_id: bundle.participant.id,
    p_decisions: persistedDecisions,
    p_current_stage: currentStage,
  });
  if (result.error) throw result.error;
  await recordEvent(bundle, "DECISION_STATE_SAVED", { stage: currentStage, decisions: persistedDecisions });
  return { ...bundle, decisions: persistedDecisions, participant: mapParticipant(result.data as Record<string, unknown>) };
}

export async function saveTransferReflection(bundle: ParticipantBundle, reflection: string): Promise<ParticipantBundle> {
  const decisions = decisionSnapshot({ ...bundle.decisions, reflection });
  return saveDecisions(bundle, decisions, 7);
}

export async function requestEvidence(bundle: ParticipantBundle, evidenceId: string): Promise<ParticipantBundle> {
  if (bundle.evidenceRequests.some((item) => item.evidenceId === evidenceId)) return bundle;
  const definition = EVIDENCE_CATALOG.find((item) => item.id === evidenceId);
  if (!definition) throw new Error("EVIDENCE_UNKNOWN");
  const requestedAt = new Date();
  const request: EvidenceRequest = {
    id: crypto.randomUUID(),
    sessionId: bundle.session.id,
    participantId: bundle.participant.id,
    evidenceId,
    requestedAt: requestedAt.toISOString(),
    availableAt: new Date(requestedAt.getTime() + definition.delaySeconds * 1000).toISOString(),
  };
  if (!supabase || isLocalBundle(bundle)) {
    return saveLocal({
      ...bundle,
      evidenceRequests: [...bundle.evidenceRequests, request],
      timeline: [...bundle.timeline, {
        id: crypto.randomUUID(), sessionId: bundle.session.id, participantId: bundle.participant.id,
        type: "EVIDENCE_REQUESTED", detail: { evidenceId }, createdAt: request.requestedAt,
      }],
    });
  }
  const result = await supabase.rpc("request_futureslab_evidence", {
    p_participant_id: bundle.participant.id,
    p_evidence_id: evidenceId,
  });
  if (result.error) throw result.error;
  await recordEvent(bundle, "EVIDENCE_REQUESTED", { evidenceId });
  return { ...bundle, evidenceRequests: [...bundle.evidenceRequests, mapEvidence(result.data as Record<string, unknown>)] };
}

export async function sendInstitutionalRequest(
  bundle: ParticipantBundle,
  institution: InstitutionRole,
  question: string,
): Promise<ParticipantBundle> {
  const createdAt = new Date().toISOString();
  const message: InstitutionalMessage = {
    id: crypto.randomUUID(),
    sessionId: bundle.session.id,
    participantId: bundle.participant.id,
    institution,
    question: question.trim(),
    status: "PENDING",
    createdAt,
  };
  if (!message.question) throw new Error("REQUEST_REQUIRED");
  if (!supabase || isLocalBundle(bundle)) {
    return saveLocal({
      ...bundle,
      messages: [...bundle.messages, message],
      timeline: [...bundle.timeline, {
        id: crypto.randomUUID(), sessionId: bundle.session.id, participantId: bundle.participant.id,
        type: "INSTITUTIONAL_REQUEST_SENT", detail: { institution }, createdAt,
      }],
    });
  }
  const result = await supabase.from("futureslab_institutional_messages").insert({
    session_id: bundle.session.id,
    participant_id: bundle.participant.id,
    institution,
    question: message.question,
  }).select("*").single();
  if (result.error) throw result.error;
  await recordEvent(bundle, "INSTITUTIONAL_REQUEST_SENT", { institution });
  return { ...bundle, messages: [...bundle.messages, mapMessage(result.data as Record<string, unknown>)] };
}

export async function recordEvent(bundle: ParticipantBundle, type: string, detail: Record<string, unknown>): Promise<void> {
  if (!supabase || isLocalBundle(bundle)) return;
  const result = await supabase.from("futureslab_activity_events").insert({
    session_id: bundle.session.id,
    participant_id: bundle.participant.id,
    type,
    detail,
  });
  if (result.error) throw result.error;
}

export async function submitRecommendation(bundle: ParticipantBundle): Promise<ParticipantBundle> {
  if (!supabase || isLocalBundle(bundle)) {
    const version = bundle.submissions.length + 1;
    const submittedAt = new Date().toISOString();
    const submission: Submission = {
      id: crypto.randomUUID(),
      participantId: bundle.participant.id,
      sessionId: bundle.session.id,
      version,
      decisions: decisionSnapshot(bundle.decisions),
      submittedAt,
      contextSnapshot: buildSubmissionContextSnapshot({
        participantId: bundle.participant.id,
        sessionId: bundle.session.id,
        decisions: bundle.decisions,
        version,
        submittedAt,
        evidenceRequests: bundle.evidenceRequests,
        injects: bundle.injects,
        institutionalMessages: bundle.messages,
      }),
    };
    return saveLocal({ ...bundle, submissions: [...bundle.submissions, submission] });
  }
  const result = await supabase.rpc("submit_futureslab_recommendation", {
    p_participant_id: bundle.participant.id,
    p_scenario_version: SCENARIO_VERSION,
    p_consequence_rule_version: CONSEQUENCE_RULE_VERSION,
  });
  if (result.error) throw result.error;
  return { ...bundle, submissions: [...bundle.submissions, mapSubmission(result.data as Record<string, unknown>)] };
}

export async function askAdvisor(bundle: ParticipantBundle, advisorId: AdvisorId, question: string): Promise<AdvisorTurn> {
  if (supabase && !isLocalBundle(bundle)) {
    const result = await supabase.functions.invoke("advisor-chat", {
      body: { participantId: bundle.participant.id, advisorId, question },
    });
    if (!result.error && result.data?.turn) return mapAdvisorTurn(result.data.turn as Record<string, unknown>);
  }
  const fallback = scriptedAdvisorTurn(bundle, advisorId, question);
  if (!supabase || isLocalBundle(bundle)) saveLocal({ ...bundle, advisorTurns: [...bundle.advisorTurns, fallback] });
  if (supabase && !isLocalBundle(bundle)) {
    const inserted = await supabase.from("futureslab_advisor_turns").insert({
      id: fallback.id,
      session_id: fallback.sessionId,
      participant_id: fallback.participantId,
      advisor_id: fallback.advisorId,
      question: fallback.question,
      answer: fallback.answer,
      sources: fallback.sources,
      mode: fallback.mode,
      created_at: fallback.createdAt,
    });
    if (inserted.error) throw inserted.error;
  }
  return fallback;
}

export function hasVisibleEvidence(bundle: ParticipantBundle, evidenceId: string, now = Date.now()): boolean {
  const request = bundle.evidenceRequests.find((item) => item.evidenceId === evidenceId);
  return Boolean(request && (request.releasedAt || new Date(request.availableAt).getTime() <= now));
}

export function scriptedAdvisorTurn(bundle: ParticipantBundle, advisorId: AdvisorId, question: string): AdvisorTurn {
  const text = question.toLowerCase();
  const greeting = isAdvisorGreeting(question);
  const authorizedLegalReply = bundle.messages.some((message) => (
    message.institution === "LEGAL" && message.status === "ANSWERED" && Boolean(message.reply?.trim())
  ));
  let answer: string;
  const sources: AdvisorCitation[] = [];
  if (greeting) {
    answer = advisorId === "amara"
      ? "Hello—I'm Amara. I'm glad to work through this with you. We can begin with Kuvera's fiscal position, creditor landscape, or the Common Framework sequence."
      : "Hello—I'm Daniel. Let's examine the record carefully. We can start with the facilities, account control, disclosure, or comparability of treatment.";
  } else if (/780|480|liquid|cash|restrict/.test(text)) {
    answer = hasVisibleEvidence(bundle, "treasury-reconciliation")
      ? "The USD 780m figure is reported liquidity, not yet usable liquidity. The returned reconciliation subtracts USD 240m restricted and USD 60m protected, producing USD 480m usable. Your decision is whether that visible evidence supports the basis you record or still requires a caveat."
      : "The participant-visible record currently establishes reported liquidity of USD 780m, but not a reconciled usable-liquidity figure. Request or await the Treasury cash reconciliation before treating restrictions or a lower usable balance as established.";
  } else if (/facility b|cross|shared|link/.test(text)) {
    answer = hasVisibleEvidence(bundle, "cross-collateralization")
      ? "The returned dependency review establishes that Facilities A and B rely on the same RA-01 revenue pool. That supports a shared operational dependency without claiming the facilities have identical legal security."
      : hasVisibleEvidence(bundle, "facility-b")
        ? "The returned Facility B extract incorporates the common revenue-account schedule by reference, connecting Facility B to the RA-01 arrangement. The legal character of that dependency remains a separate classification question."
        : "The shared case context establishes that Facility A references RA-01. Facility B's relationship to the account remains unconfirmed, so do not infer either a shared pool or independence until relevant evidence returns.";
  } else if (/facility a|account|collateral|escrow|control/.test(text)) {
    answer = hasVisibleEvidence(bundle, "account-control")
      ? "The returned account-control summary establishes how receipts enter RA-01, when debt service is swept, and when withdrawals require consent. Use those visible features to assess control without assuming a formal security grant."
      : hasVisibleEvidence(bundle, "facility-a")
        ? "The returned Facility A extract establishes that specified export proceeds flow through RA-01 and that its waterfall applies to Facility A debt service. It does not by itself establish Facility B's relationship to that account."
        : "The shared case context establishes only that Facility A references RA-01 and that a partial memo indicates possible restrictions. Exact control terms remain unresolved until the relevant evidence returns.";
  } else if (/disclos|confidential/.test(text)) {
    answer = hasVisibleEvidence(bundle, "confidentiality-opinion")
      ? "The returned scenario legal opinion permits a redacted functional summary of account control, balances, and facility linkage. Full contract text requires consent. I can explain those boundaries, but the disclosure recommendation remains yours."
      : authorizedLegalReply
        ? "An answered Legal request is now part of your participant-visible record. Use the exact permission boundary in that returned reply; do not expand it into authorization for information the reply does not cover."
      : "The participant-visible record does not yet establish Kuvera's permitted disclosure boundary. Request or await the legal confidentiality opinion before treating redaction or full-text disclosure as authorized.";
  } else if (/creditor|commitment|headquarters|authorization|authorisation/.test(text)) {
    answer = hasVisibleEvidence(bundle, "creditor-status")
      ? "The returned creditor clarification records indicative willingness to engage, while headquarters authorization remains outstanding. It does not establish a financing assurance or agreement in principle."
      : "Kuvera's creditor commitment status is not established in the shared case context. Request or await an authorized creditor reply before assigning a commitment level.";
  } else if (/assurance|board|maturity|deadline|mou|implementation|relief/.test(text)) {
    answer = hasVisibleEvidence(bundle, "imf-clarification")
      ? "Keep the deadlines and commitment states separate. The USD 750m maturity arrives in six weeks, before the eleven-week IMF Board horizon. The returned IMF clarification establishes that an assurance remains distinct from implementation and cash-effective relief."
      : "The shared case context establishes a USD 750m maturity in six weeks and an eleven-week IMF Board horizon. General process research can explain commitment levels, but Kuvera's own assurance status remains unresolved until an authorized response is visible.";
  } else {
    answer = advisorId === "amara"
      ? "I can explain Kuvera's macro-fiscal setting, the two deadlines, creditor architecture, and the Common Framework sequence. Ask about a visible case fact or process dependency; I will not select your recommendation."
      : "I can explain the account-control evidence, Facility A/B dependency, confidentiality boundary, commitment states, and treatment-perimeter criteria. I will not classify unresolved evidence or choose your disclosure posture.";
  }
  if (!greeting) answer = applyAdvisorFallbackCadence(advisorId, answer);
  return {
    id: crypto.randomUUID(),
    participantId: bundle.participant.id,
    sessionId: bundle.session.id,
    advisorId,
    question,
    answer,
    sources,
    createdAt: new Date().toISOString(),
    mode: "SCRIPTED_FALLBACK",
  };
}

export async function transcribeAudio(file: Blob, participantId: string): Promise<string> {
  if (!supabase) throw new Error("VOICE_UNAVAILABLE_OFFLINE");
  const form = new FormData();
  form.append("audio", file, "question.webm");
  form.append("participantId", participantId);
  const result = await supabase.functions.invoke("transcribe", { body: form });
  if (result.error) throw result.error;
  return String(result.data?.transcript ?? "");
}

export function subscribeToWorkshop(sessionId: string, participantId: string, onChange: () => void): () => void {
  if (!supabase || sessionId.startsWith("local-")) return () => undefined;
  const channel: RealtimeChannel = supabase
    .channel(`futureslab:${sessionId}:${participantId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "futureslab_sessions", filter: `id=eq.${sessionId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "futureslab_evidence_requests", filter: `participant_id=eq.${participantId}` }, onChange)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "futureslab_injects", filter: `session_id=eq.${sessionId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "futureslab_institutional_messages", filter: `participant_id=eq.${participantId}` }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export async function sendFacilitatorMagicLink(email: string): Promise<void> {
  if (!supabase) throw new Error("CLOUD_CONFIGURATION_REQUIRED");
  const redirectTo = `${window.location.origin}/facilitator`;
  const result = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
  if (result.error) throw result.error;
}

export async function currentUser(): Promise<User | null> {
  if (!supabase) return null;
  return (await supabase.auth.getUser()).data.user;
}

export async function facilitatorSignOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}

export async function createWorkshopSession(kind: "REHEARSAL" | "LIVE"): Promise<WorkshopSession> {
  if (!supabase) throw new Error("CLOUD_CONFIGURATION_REQUIRED");
  const user = await currentUser();
  if (!user) throw new Error("FACILITATOR_REQUIRED");
  const joinCodeBytes = crypto.getRandomValues(new Uint8Array(5));
  const joinCode = `FL${Array.from(joinCodeBytes, (value) => value.toString(36).padStart(2, "0")).join("").slice(0, 6).toUpperCase()}`;
  const result = await supabase.from("futureslab_sessions").insert({
    title: EXERCISE_TITLE,
    kind,
    status: "LOBBY",
    join_code: joinCode,
    created_by: user.id,
  }).select("*").single();
  if (result.error) throw result.error;
  return mapSession(result.data as Record<string, unknown>);
}

export async function listWorkshopSessions(): Promise<WorkshopSession[]> {
  if (!supabase) return [];
  const result = await supabase.from("futureslab_sessions").select("*").order("created_at", { ascending: false });
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => mapSession(row as Record<string, unknown>));
}

export async function updateWorkshopSession(id: string, patch: Record<string, unknown>): Promise<void> {
  if (!supabase) return;
  const result = await supabase.from("futureslab_sessions").update(patch).eq("id", id);
  if (result.error) throw result.error;
  await supabase.from("futureslab_activity_events").insert({ session_id: id, type: "FACILITATOR_SESSION_UPDATE", detail: patch });
}

export async function loadFacilitatorSession(session: WorkshopSession) {
  if (!supabase) return { participants: [], evidence: [], submissions: [], injects: [], messages: [], turns: [], events: [] };
  const participantsResult = await supabase.from("futureslab_participants").select("*").eq("session_id", session.id).order("joined_at");
  if (participantsResult.error) throw participantsResult.error;
  const rows = (participantsResult.data ?? []) as Record<string, unknown>[];
  const participantIds = rows.map((row) => String(row.id));
  const empty = { data: [] as Record<string, unknown>[], error: null };
  const [evidence, submissions, injects, messages, turns, events] = await Promise.all([
    participantIds.length ? supabase.from("futureslab_evidence_requests").select("*").eq("session_id", session.id) : Promise.resolve(empty),
    participantIds.length ? supabase.from("futureslab_submissions").select("*").eq("session_id", session.id) : Promise.resolve(empty),
    supabase.from("futureslab_injects").select("*").eq("session_id", session.id).order("sent_at"),
    participantIds.length ? supabase.from("futureslab_institutional_messages").select("*").eq("session_id", session.id).order("created_at") : Promise.resolve(empty),
    participantIds.length ? supabase.from("futureslab_advisor_turns").select("*").eq("session_id", session.id) : Promise.resolve(empty),
    participantIds.length ? supabase.from("futureslab_activity_events").select("*").eq("session_id", session.id).order("created_at") : Promise.resolve(empty),
  ]);
  for (const result of [evidence, submissions, injects, messages, turns, events]) if (result.error) throw result.error;
  return {
    participants: rows.map((row) => ({ participant: mapParticipant(row), decisions: decisionSnapshot(row.decisions as Partial<DecisionState>) })),
    evidence: (evidence.data ?? []).map((row) => mapEvidence(row as Record<string, unknown>)),
    submissions: (submissions.data ?? []).map((row) => mapSubmission(row as Record<string, unknown>)),
    injects: (injects.data ?? []).map((row) => mapInject(row as Record<string, unknown>)),
    messages: (messages.data ?? []).map((row) => mapMessage(row as Record<string, unknown>)),
    turns: (turns.data ?? []).map((row) => mapAdvisorTurn(row as Record<string, unknown>)),
    events: (events.data ?? []).map((row) => mapEvent(row as Record<string, unknown>)),
  };
}

export async function sendGlobalInject(sessionId: string, title: string, body: string): Promise<void> {
  if (!supabase) return;
  const result = await supabase.from("futureslab_injects").insert({ session_id: sessionId, title, body });
  if (result.error) throw result.error;
  await supabase.from("futureslab_activity_events").insert({ session_id: sessionId, type: "FACILITATOR_INJECT_SENT", detail: { title } });
}

export async function releaseEvidence(requestId: string): Promise<void> {
  if (!supabase) return;
  const result = await supabase.from("futureslab_evidence_requests").update({ released_at: new Date().toISOString() }).eq("id", requestId).select("session_id,evidence_id").single();
  if (result.error) throw result.error;
  await supabase.from("futureslab_activity_events").insert({ session_id: result.data.session_id, type: "FACILITATOR_EVIDENCE_RELEASED", detail: { evidenceId: result.data.evidence_id, requestId } });
}

export async function answerInstitutionalRequest(messageId: string, reply: string): Promise<void> {
  if (!supabase) return;
  const answeredAt = new Date().toISOString();
  const result = await supabase.from("futureslab_institutional_messages").update({
    reply: reply.trim(),
    status: "ANSWERED",
    answered_at: answeredAt,
  }).eq("id", messageId).select("session_id,participant_id,institution").single();
  if (result.error) throw result.error;
  await supabase.from("futureslab_activity_events").insert({
    session_id: result.data.session_id,
    participant_id: result.data.participant_id,
    type: "FACILITATOR_INSTITUTIONAL_REPLY",
    detail: { institution: result.data.institution, messageId },
  });
}

export async function removeParticipant(participantId: string): Promise<void> {
  if (!supabase) return;
  const participant = await supabase.from("futureslab_participants").select("session_id").eq("id", participantId).single();
  if (participant.error) throw participant.error;
  const result = await supabase.from("futureslab_participants").delete().eq("id", participantId);
  if (result.error) throw result.error;
  await supabase.from("futureslab_activity_events").insert({
    session_id: participant.data.session_id,
    type: "FACILITATOR_PARTICIPANT_REMOVED",
    detail: { participantId, reason: "INVALID_OR_DUPLICATE_REGISTRATION" },
  });
}

export async function deleteSession(id: string): Promise<void> {
  if (!supabase) return;
  const result = await supabase.from("futureslab_sessions").delete().eq("id", id);
  if (result.error) throw result.error;
}
