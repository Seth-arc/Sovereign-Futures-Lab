import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../supabase/migrations/202610130002_atomic_facilitator_actions.sql", import.meta.url), "utf8");
const privilegeMigration = readFileSync(new URL("../supabase/migrations/202610130003_authenticated_table_privileges.sql", import.meta.url), "utf8");
const dataSource = readFileSync(new URL("./data.ts", import.meta.url), "utf8");
const databaseTest = readFileSync(new URL("../supabase/tests/database/facilitator_actions_atomicity.test.sql", import.meta.url), "utf8");

describe("atomic facilitator action migration contract", () => {
  it("keeps each audited mutation and its required activity event in one forward RPC", () => {
    expect(migration).toContain("perform_futureslab_facilitator_action");
    for (const action of ["UPDATE_SESSION", "SEND_INJECT", "RELEASE_EVIDENCE", "ANSWER_INSTITUTIONAL_REQUEST", "REMOVE_PARTICIPANT"]) {
      expect(migration).toContain(`when '${action}'`);
    }
    expect(migration.match(/insert into public\.futureslab_activity_events/g)).toHaveLength(5);
    expect(migration).toContain("if not public.is_futureslab_facilitator()");
  });

  it("routes every audited facilitator data mutation through the atomic RPC", () => {
    expect(dataSource).toContain('supabase.rpc("perform_futureslab_facilitator_action"');
    expect(dataSource.match(/performFacilitatorAction\(/g)?.length).toBeGreaterThanOrEqual(6);
    expect(dataSource.slice(dataSource.indexOf("export async function updateWorkshopSession"))).not.toMatch(/from\("futureslab_activity_events"\)\.insert/);
  });

  it("ships a disposable database gate that proves event failure rolls back the mutation", () => {
    expect(databaseTest).toContain("TEST_AUDIT_FAILURE");
    expect(databaseTest).toContain("an activity-event failure rolls back the mutation");
    expect(databaseTest).toContain("a participant cannot invoke a facilitator action");
  });

  it("grants the security-invoker RPC its narrow table privileges without weakening RLS", () => {
    expect(privilegeMigration).toContain("grant select, insert, update, delete on table public.futureslab_sessions to authenticated");
    expect(privilegeMigration).toContain("grant select, delete on table public.futureslab_participants to authenticated");
    expect(privilegeMigration).toContain("grant select, insert on table public.futureslab_activity_events to authenticated");
    expect(privilegeMigration).not.toMatch(/grant all|disable row level security/i);
  });
});
