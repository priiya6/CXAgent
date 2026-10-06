import { NextResponse } from "next/server";
import { runAgent, type ChatMessage } from "@/lib/agent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { messages?: ChatMessage[] };
    if (!Array.isArray(body.messages) || body.messages.length === 0) return NextResponse.json({ error: "messages must be a non-empty array" }, { status: 400 });
    const result = await runAgent(body.messages.slice(-20));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown agent error";
    const status = message.includes("not configured") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
