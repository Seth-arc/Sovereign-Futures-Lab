export type SessionKind = "REHEARSAL" | "LIVE";
export type SessionStatus = "DRAFT" | "LOBBY" | "RUNNING" | "PAUSED" | "DEBRIEF" | "CLOSED";
export type Readiness = "READY" | "READY_WITH_CONDITIONS" | "NOT_READY";
export type LiquidityAction = "VERIFY_NOW" | "PROCEED_WITH_CAVEAT";
export type LiquidityBasis = "REPORTED_780" | "VERIFIED_480" | "UNRESOLVED";
export type AccountClassification = "EFFECTIVE_CONTROL" | "ORDINARY_ACCOUNT" | "UNRESOLVED";
export type FacilityLinkage = "SHARED_POOL" | "INDEPENDENT" | "UNRESOLVED";
export type DisclosureLevel = "FULL" | "REDACTED" | "WITHHOLD";
export type TreatmentPerimeter = "BOTH_FACILITIES" | "FACILITY_A_ONLY" | "DEFER";
export type AdvisorId = "amara" | "daniel";
export type InstitutionRole = "TREASURY" | "LEGAL" | "OCC" | "IMF" | "CREDITOR";

export interface WorkshopSession {
  id: string;
  title: string;
  kind: SessionKind;
  status: SessionStatus;
  joinCode?: string;
  currentStage: number;
  durationSeconds: number;
  remainingSeconds: number;
  clockStartedAt?: string;
  submissionsClosed: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface ParticipantProfile {
  id: string;
  sessionId: string;
  name: string;
  organization: string;
  email: string;
  currentStage: number;
  lastActiveAt: string;
  consentedAt: string;
}

export interface DecisionState {
  mandateConfirmed: boolean;
  mandateRationale: string;
  liquidityAction?: LiquidityAction;
  liquidityRationale: string;
  liquidityBasis?: LiquidityBasis;
  liquidityBasisRationale: string;
  accountClassification?: AccountClassification;
  facilityLinkage?: FacilityLinkage;
  linkageRationale: string;
  disclosure?: DisclosureLevel;
  treatmentPerimeter?: TreatmentPerimeter;
  disclosureRationale: string;
  readiness?: Readiness;
  unresolvedRisks: string;
  finalRationale: string;
  reflection: string;
}

export interface EvidenceDefinition {
  id: string;
  title: string;
  requestedFrom: string;
  delaySeconds: number;
  summary: string;
  sourceLabel: string;
  details: string;
}

export interface EvidenceRequest {
  id: string;
  sessionId: string;
  participantId: string;
  evidenceId: string;
  requestedAt: string;
  availableAt: string;
  releasedAt?: string;
}

export interface Submission {
  id: string;
  participantId: string;
  sessionId: string;
  version: number;
  decisions: DecisionState;
  submittedAt: string;
}

export interface GlobalInject {
  id: string;
  sessionId: string;
  title: string;
  body: string;
  sentAt: string;
}

export interface InstitutionalMessage {
  id: string;
  sessionId: string;
  participantId: string;
  institution: InstitutionRole;
  question: string;
  reply?: string;
  status: "PENDING" | "ANSWERED";
  createdAt: string;
  answeredAt?: string;
}

export interface AdvisorTurn {
  id: string;
  participantId: string;
  sessionId: string;
  advisorId: AdvisorId;
  question: string;
  answer: string;
  sources: string[];
  createdAt: string;
  mode: "AI" | "SCRIPTED_FALLBACK";
}

export interface ActivityEvent {
  id: string;
  sessionId: string;
  participantId?: string;
  type: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface Consequence {
  id: string;
  title: string;
  outcome: string;
  basis: string;
  severity: "POSITIVE" | "CAUTION" | "BLOCKING" | "NEUTRAL";
}

export interface Counterfactual {
  id: string;
  alternative: string;
  projectedDifference: string;
  fixedAssumptions: string;
}

export interface AfterActionReport {
  participant: Pick<ParticipantProfile, "id" | "name" | "organization" | "email">;
  session: Pick<WorkshopSession, "id" | "title" | "kind" | "createdAt">;
  generatedAt: string;
  executiveSummary: string;
  decisions: DecisionState;
  submissions: Submission[];
  evidenceRequested: EvidenceDefinition[];
  evidenceNotRequested: EvidenceDefinition[];
  evidenceIgnored: EvidenceDefinition[];
  evidenceRequestHistory: EvidenceRequest[];
  institutionalMessages: InstitutionalMessage[];
  consequences: Consequence[];
  counterfactuals: Counterfactual[];
  unresolvedRisks: string[];
  advisorUsage: AdvisorTurn[];
  facilitatorInjects: GlobalInject[];
  timeline: ActivityEvent[];
}

export const EMPTY_DECISIONS: DecisionState = {
  mandateConfirmed: false,
  mandateRationale: "",
  liquidityRationale: "",
  liquidityBasisRationale: "",
  linkageRationale: "",
  disclosureRationale: "",
  unresolvedRisks: "",
  finalRationale: "",
  reflection: "",
};
