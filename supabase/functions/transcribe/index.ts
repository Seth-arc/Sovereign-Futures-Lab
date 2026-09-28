import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const MAX_BYTES = 15 * 1024 * 1024;

async function authenticatedUser(request: Request): Promise<string | undefined> {
  const authorization = request.headers.get("Authorization");
  if (!authorization) return undefined;
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = authorization.replace(/^Bearer\s+/i, "");
  const result = await client.auth.getUser(token);
  return result.error ? undefined : result.data.user?.id;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const userId = await authenticatedUser(request);
    if (!userId) return json({ error: "AUTH_REQUIRED" }, 401);
    const inbound = await request.formData();
    const audio = inbound.get("audio");
    const participantId = String(inbound.get("participantId") ?? "");
    if (!(audio instanceof File) || audio.size === 0 || audio.size > MAX_BYTES || (!audio.type.startsWith("audio/") && audio.type !== "video/webm")) return json({ error: "AUDIO_INVALID" }, 400);
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const participant = await service.from("futureslab_participants").select("id").eq("id", participantId).eq("user_id", userId).maybeSingle();
    if (participant.error || !participant.data) return json({ error: "PARTICIPANT_NOT_FOUND" }, 404);
    const form = new FormData();
    form.append("file", audio, audio.name || "question.webm");
    form.append("response_format", "json");
    const groqKey = Deno.env.get("GROQ_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    let endpoint: string;
    let key: string;
    if (groqKey) {
      endpoint = "https://api.groq.com/openai/v1/audio/transcriptions";
      key = groqKey;
      form.append("model", Deno.env.get("GROQ_TRANSCRIPTION_MODEL") ?? "whisper-large-v3-turbo");
    } else if (openaiKey) {
      endpoint = "https://api.openai.com/v1/audio/transcriptions";
      key = openaiKey;
      form.append("model", Deno.env.get("OPENAI_TRANSCRIPTION_MODEL") ?? "gpt-4o-mini-transcribe");
    } else return json({ error: "AI_PROVIDER_NOT_CONFIGURED" }, 503);
    const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
    const payload = await response.json();
    if (!response.ok || !payload?.text?.trim()) return json({ error: "TRANSCRIPTION_UNAVAILABLE" }, 503);
    // The audio exists only in this request and provider call. It is never written to storage.
    return json({ transcript: payload.text.trim() });
  } catch (error) {
    console.error("transcribe", error);
    return json({ error: "TRANSCRIPTION_UNAVAILABLE" }, 503);
  }
});
