import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../supabase/migrations/202610010001_freeze_submission_context.sql", import.meta.url), "utf8");
const initialMigration = readFileSync(new URL("../supabase/migrations/202609280001_futureslab.sql", import.meta.url), "utf8");
const dataSource = readFileSync(new URL("./data.ts", import.meta.url), "utf8");

describe("atomic submission snapshot migration contract", () => {
  it("uses a forward migration and leaves the production baseline unchanged", () => {
    expect(initialMigration).not.toContain("context_snapshot");
    expect(migration).toContain("add column context_snapshot jsonb");
    expect(migration).not.toMatch(/update\s+public\.futureslab_submissions\s+set\s+context_snapshot/i);
  });

  it("locks submission state and inserts the bounded context in the same function", () => {
    expect(migration).toContain("for update of p, s");
    expect(migration).toContain("'scenarioVersion'");
    expect(migration).toContain("'consequenceRuleVersion'");
    expect(migration).toContain("'availableEvidence'");
    expect(migration).toContain("'facilitatorInjectIds'");
    expect(migration).toContain("'answeredInstitutionalMessageIds'");
    expect(migration).toMatch(/insert into public\.futureslab_submissions\([\s\S]*context_snapshot[\s\S]*v_context_snapshot/i);
    expect(migration).toContain("pg_column_size(context_snapshot) <= 262144");
  });

  it("freezes availability rather than request existence and uses the versioned RPC", () => {
    expect(migration).toContain("er.available_at <= v_submitted_at or er.released_at <= v_submitted_at");
    expect(dataSource).toContain("p_scenario_version: SCENARIO_VERSION");
    expect(dataSource).toContain("p_consequence_rule_version: CONSEQUENCE_RULE_VERSION");
  });
});
