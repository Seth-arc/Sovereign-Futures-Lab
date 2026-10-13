export type FacilitatorSyncStatus = "INITIAL_LOADING" | "LIVE" | "REFRESHING" | "STALE";

export interface FacilitatorSyncState<T> {
  status: FacilitatorSyncStatus;
  snapshot: T;
  lastSuccessfulRefreshAt?: string;
  error: string;
}

export function beginFacilitatorRefresh<T>(state: FacilitatorSyncState<T>, hasCurrentData: boolean): FacilitatorSyncState<T> {
  return { ...state, status: hasCurrentData ? "REFRESHING" : "INITIAL_LOADING", error: "" };
}

export function completeFacilitatorRefresh<T>(state: FacilitatorSyncState<T>, snapshot: T, refreshedAt: string): FacilitatorSyncState<T> {
  return { ...state, status: "LIVE", snapshot, lastSuccessfulRefreshAt: refreshedAt, error: "" };
}

export function failFacilitatorRefresh<T>(state: FacilitatorSyncState<T>, error: string): FacilitatorSyncState<T> {
  return { ...state, status: "STALE", error };
}

export function isCurrentFacilitatorRequest(
  requestSequence: number,
  currentSequence: number,
  selectionAtStart: string | null,
  currentSelection: string | null,
): boolean {
  return requestSequence === currentSequence && selectionAtStart === currentSelection;
}

export async function runFacilitatorAction(options: {
  key: string;
  pending: Set<string>;
  setPending: (key: string, pending: boolean) => void;
  clearFeedback: () => void;
  mutate: () => Promise<void>;
  refresh?: () => Promise<unknown>;
  successMessage: string;
  onSuccess: (message: string) => void;
  onFailure: (message: string) => void;
  failureMessage: string;
}): Promise<boolean> {
  if (options.pending.has(options.key)) return false;
  options.pending.add(options.key);
  options.setPending(options.key, true);
  options.clearFeedback();
  try {
    await options.mutate();
    options.onSuccess(options.successMessage);
    if (options.refresh) await options.refresh();
    return true;
  } catch (caught) {
    options.onFailure(caught instanceof Error ? caught.message : options.failureMessage);
    return false;
  } finally {
    options.pending.delete(options.key);
    options.setPending(options.key, false);
  }
}
