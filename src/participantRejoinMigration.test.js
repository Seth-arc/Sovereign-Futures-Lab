import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const initialMigration = readFileSync(new URL("../supabase/migrations/202609280001_futureslab.sql", import.meta.url), "utf8");
const secureRejoinMigration = readFileSync(new URL("../supabase/migrations/202610130001_secure_participant_rejoin.sql", import.meta.url), "utf8");
const databaseTest = readFileSync(new URL("../supabase/tests/database/participant_rejoin_ownership.test.sql", import.meta.url), "utf8");

describe("participant rejoin ownership migration contract", () => {
  it("uses a forward replacement and leaves the deployed baseline unchanged", () => {
    expect(initialMigration).toContain("user_id = auth.uid()");
    expect(secureRejoinMigration).toContain("create or replace function public.join_futureslab_session");
    expect(secureRejoinMigration).not.toContain("set\n    user_id =");
  });

  it("updates a conflict only for the current owner and otherwise raises one bounded error", () => {
    expect(secureRejoinMigration).toMatch(/on conflict \(session_id, email\) do update[\s\S]*where futureslab_participants\.user_id = v_user_id/i);
    expect(secureRejoinMigration).toContain("message = 'PARTICIPANT_EMAIL_IN_USE'");
    expect(secureRejoinMigration).not.toMatch(/PARTICIPANT_EMAIL_IN_USE.*(name|organization|decisions|v_participant)/i);
  });

  it("ships a disposable database gate for ownership, duplicates, bounded errors, and RLS", () => {
    expect(databaseTest).toContain("the same owner idempotently resumes");
    expect(databaseTest).toContain("the second owner cannot read");
    expect(databaseTest).toContain("the failed takeover leaves ownership unchanged");
    expect(databaseTest).toContain("the original owner retains read access");
  });
});
