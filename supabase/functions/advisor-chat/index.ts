import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

type AdvisorId = "amara" | "daniel";

const SOURCES = [
  { id: "treasury", title: "Kuvera Treasury reconciliation · scenario record", keywords: ["liquid", "cash", "780", "480", "restricted", "protected"], text: "Reported liquidity is USD 780m. USD 240m is restricted and USD 60m is protected, producing USD 480m usable liquidity." },
  { id: "account", title: "Revenue Account RA-01 control summary · scenario record", keywords: ["account", "control", "escrow", "collateral", "withdraw"], text: "Copper-export receipts enter RA-01. Scheduled debt service is swept before residual funds become available, and withdrawals below the protected balance require consent." },
  { id: "facilities", title: "Facility dependency review · scenario determination", keywords: ["facility", "link", "pool", "cross"], text: "Facilities A and B share the same controlled RA-01 revenue pool. This creates an operational dependency without establishing that their legal security is identical." },
  { id: "legal", title: "Kuvera Legal disclosure opinion · scenario-authored", keywords: ["disclos", "confidential", "redact", "legal"], text: "Kuvera may provide a redacted functional summary of control, affected balances, and cross-facility dependency. Full contract text requires consent." },
  { id: "imf", title: "IMF technical clarification · participant-visible", keywords: ["imf", "board", "assurance", "commitment", "mou", "implementation"], text: "The Board horizon is eleven weeks. Financing assurance remains distinct from agreement in principle, an MoU, bilateral implementation, and cash-effective relief." },
  { id: "maturity", title: "Kuvera maturity schedule · scenario record", keywords: ["maturity", "deadline", "week", "750"], text: "A USD 750m maturity arrives in six weeks, five weeks before the eleven-week IMF Board horizon." },
];

function retrieve(question: string) {
  const text = question.toLowerCase();
  const matches = SOURCES.filter((source) => source.keywords.some((keyword) => text.includes(keyword)));
  return (matches.length ? matches : SOURCES.slice(0, 3)).slice(0, 4);
}

function instructions(advisorId: AdvisorId, decisions: unknown, sources: typeof SOURCES): string {
  const persona = advisorId === "amara"
    ? "Amara Okoye, the country, macro-fiscal, creditor-architecture, and Common Framework advisor"
    : "Daniel Mensah, the contracts, account-control, disclosure, financing-assurances, and treatment advisor";
  return `You are ${persona} inside the fictional Kuvera Financing Assurances workshop.
The participant is a Debt Management Office professional. Explain concepts and participant-visible evidence. Never choose their decision, create a commitment, change simulation state, infer hidden facts, or claim that a proposal or assurance is implemented relief.
Use only CURRENT DMO RECORD and AUTHORIZED SOURCES below. If they do not establish an answer, say it is not established in the participant-visible record. Keep the answer under 220 words. Cite source titles in plain language. Do not invent page numbers, clauses, or sources.

CURRENT DMO RECORD
${JSON.stringify(decisions)}

AUTHORIZED SOURCES
${sources.map((source) => `[${source.title}] ${source.text}`).join("\n")}`;
}

async function completion(system: string, question: string): Promise<string> {
  const groqKey = Deno.env.get("GROQ_API_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (groqKey) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: Deno.env.get("GROQ_ADVISOR_TEXT_MODEL") ?? "llama-3.3-70b-versatile", temperature: 0.1, messages: [{ role: "system", content: system }, { role: "user", content: question }] }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message ?? "GROQ_UNAVAILABLE");
    const answer = payload?.choices?.[0]?.message?.content;
    if (!answer) throw new Error("GROQ_EMPTY_RESPONSE");
    return answer;
  }
  if (openaiKey) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: Deno.env.get("OPENAI_ADVISOR_TEXT_MODEL") ?? "gpt-4.1-mini", instructions: system, input: question, temperature: 0.1, max_output_tokens: 500 }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message ?? "OPENAI_UNAVAILABLE");
    const answer = payload?.output_text ?? payload?.output
      ?.flatMap((item: { content?: Array<{ type?: string; text?: string }> }) => item.content ?? [])
      ?.find((item: { type?: string; text?: string }) => item.type === "output_text")?.text;
    if (!answer) throw new Error("OPENAI_EMPTY_RESPONSE");
    return answer;
  }
  throw new Error("AI_PROVIDER_NOT_CONFIGURED");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json({ error: "AUTH_REQUIRED" }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(supabaseUrl, serviceKey);
    const token = authorization.replace(/^Bearer\s+/i, "");
    const auth = await service.auth.getUser(token);
    if (auth.error || !auth.data.user) return json({ error: "AUTH_INVALID" }, 401);

    const body = await request.json();
    const participantId = String(body.participantId ?? "");
    const advisorId = body.advisorId as AdvisorId;
    const question = String(body.question ?? "").trim();
    if (!participantId || !["amara", "daniel"].includes(advisorId) || !question || question.length > 2000) return json({ error: "INPUT_INVALID" }, 400);
    const participantResult = await service.from("futureslab_participants").select("id,session_id,user_id,decisions").eq("id", participantId).eq("user_id", auth.data.user.id).single();
    if (participantResult.error || !participantResult.data) return json({ error: "PARTICIPANT_NOT_FOUND" }, 404);
    const sources = retrieve(question);
    const answer = await completion(instructions(advisorId, participantResult.data.decisions, sources), question);
    const inserted = await service.from("futureslab_advisor_turns").insert({
      session_id: participantResult.data.session_id,
      participant_id: participantId,
      advisor_id: advisorId,
      question,
      answer,
      sources: sources.map((source) => source.title),
      mode: "AI",
    }).select("*").single();
    if (inserted.error) throw inserted.error;
    return json({ turn: inserted.data });
  } catch (error) {
    console.error("advisor-chat", error);
    return json({ error: "ADVISOR_UNAVAILABLE" }, 503);
  }
});
