import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../supabase/migrations/202610140005_persist_preparation_completion.sql", import.meta.url), "utf8");

describe("preparation completion migration", () => {
  it("adds an explicit nullable completion fact and keeps its first timestamp", () => {
    expect(migration).toContain("preparation_completed_at timestamptz");
    expect(migration).toContain("coalesce(preparation_completed_at, now())");
  });

  it("allows only the authenticated participant owner to complete preparation", () => {
    expect(migration).toContain("user_id = auth.uid()");
    expect(migration).toContain("PARTICIPANT_NOT_FOUND");
    expect(migration).toContain("security definer");
    expect(migration).toContain("revoke all on function public.complete_futureslab_preparation(uuid) from public");
    expect(migration).toContain("grant execute on function public.complete_futureslab_preparation(uuid) to authenticated");
  });
});
