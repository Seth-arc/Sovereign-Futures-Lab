import { describe, expect, it, vi } from "vitest";
import {
  beginFacilitatorRefresh,
  completeFacilitatorRefresh,
  failFacilitatorRefresh,
  isCurrentFacilitatorRequest,
  runFacilitatorAction,
} from "./facilitatorOperations";

describe("facilitator refresh state", () => {
  it("preserves the last successful data and marks it stale after a failed refresh", () => {
    const goodData = { participants: ["kept"] };
    const live = completeFacilitatorRefresh(
      { status: "INITIAL_LOADING", snapshot: { participants: [] as string[] }, error: "" },
      goodData,
      "2026-10-13T12:00:00.000Z",
    );
    const stale = failFacilitatorRefresh(beginFacilitatorRefresh(live, true), "Network unavailable");

    expect(stale.snapshot).toBe(goodData);
    expect(stale.status).toBe("STALE");
    expect(stale.lastSuccessfulRefreshAt).toBe("2026-10-13T12:00:00.000Z");
    expect(stale.error).toBe("Network unavailable");
  });

  it("does not treat stale data as live", () => {
    const stale = failFacilitatorRefresh(
      { status: "LIVE", snapshot: { participants: ["kept"] }, lastSuccessfulRefreshAt: "earlier", error: "" },
      "Refresh failed",
    );
    expect(stale.status).not.toBe("LIVE");
  });

  it("rejects an older response after the selected session changes", () => {
    expect(isCurrentFacilitatorRequest(1, 2, "session-a", "session-b")).toBe(false);
    expect(isCurrentFacilitatorRequest(2, 2, "session-b", "session-b")).toBe(true);
  });
});

describe("facilitator action runner", () => {
  it("submits a matching action only once while it is pending", async () => {
    let resolveMutation!: () => void;
    const mutate = vi.fn(() => new Promise<void>((resolve) => { resolveMutation = resolve; }));
    const pending = new Set<string>();
    const options = {
      key: "reply:1",
      pending,
      setPending: vi.fn(),
      clearFeedback: vi.fn(),
      mutate,
      successMessage: "Reply sent.",
      onSuccess: vi.fn(),
      onFailure: vi.fn(),
      failureMessage: "Reply failed.",
    };

    const first = runFacilitatorAction(options);
    const duplicate = await runFacilitatorAction(options);
    expect(duplicate).toBe(false);
    expect(mutate).toHaveBeenCalledTimes(1);
    resolveMutation();
    await first;
  });

  it("does not report success or clear a reply draft when persistence including its audit event fails", async () => {
    const draft = { value: "Keep this reply" };
    const onSuccess = vi.fn(() => { draft.value = ""; });
    const onFailure = vi.fn();
    const completed = await runFacilitatorAction({
      key: "reply:2",
      pending: new Set<string>(),
      setPending: vi.fn(),
      clearFeedback: vi.fn(),
      mutate: async () => { throw new Error("AUDIT_EVENT_FAILED"); },
      successMessage: "Reply sent.",
      onSuccess,
      onFailure,
      failureMessage: "Reply failed.",
    });

    expect(completed).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onFailure).toHaveBeenCalledWith("AUDIT_EVENT_FAILED");
    expect(draft.value).toBe("Keep this reply");
  });

  it("reports success only after persistence and then refreshes", async () => {
    const order: string[] = [];
    await runFacilitatorAction({
      key: "inject:1",
      pending: new Set<string>(),
      setPending: vi.fn(),
      clearFeedback: vi.fn(),
      mutate: async () => { order.push("persisted-with-audit"); },
      refresh: async () => { order.push("refreshed"); return true; },
      successMessage: "Inject sent.",
      onSuccess: () => { order.push("success"); },
      onFailure: vi.fn(),
      failureMessage: "Inject failed.",
    });

    expect(order).toEqual(["persisted-with-audit", "success", "refreshed"]);
  });
});
