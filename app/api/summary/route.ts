import { NextResponse } from "next/server";
import { deterministicSummary, isValidSummary, type Summary, type TranscriptEntry } from "@/lib/summary";
import type { ToolCallLog } from "@/lib/agent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json() as { transcript?: TranscriptEntry[]; toolCalls?: ToolCallLog[]; duration_seconds?: number };
  const transcript = Array.isArray(body.transcript) ? body.transcript : [];
  const toolCalls = Array.isArray(body.toolCalls) ? body.toolCalls : [];
  const fallback = deterministicSummary(transcript, toolCalls, body.duration_seconds);
  const key = process.env.LLM_API_KEY;
  if (!key) return NextResponse.json(fallback);
  try {
    const baseUrl = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: process.env.LLM_MODEL || "gpt-4o-mini", messages: [{ role: "system", content: "Return only valid JSON matching the requested summary schema. Do not invent order IDs or facts." }, { role: "user", content: JSON.stringify({ transcript, toolCalls, fallback }) }], max_tokens: 300, temperature: 0.1 }), signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error("summary provider error");
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content?.replace(/^```json\s*|\s*```$/g, "").trim();
    const parsed = raw ? JSON.parse(raw) as Summary : null;
    return NextResponse.json(parsed && isValidSummary(parsed) ? parsed : fallback);
  } catch { return NextResponse.json(fallback); }
}
