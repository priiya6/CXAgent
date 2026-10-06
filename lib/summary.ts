import type { ToolCallLog } from "./agent";

export const INTENTS = ["ORDER_TRACKING", "CANCELLATION", "RETURN_REFUND", "SHIPPING_INFO", "PRODUCT_INFO", "POLICY_QUESTION", "OUT_OF_SCOPE", "OTHER"] as const;
export const STATUSES = ["RESOLVED", "UNRESOLVED", "OUT_OF_SCOPE", "NEEDS_FOLLOW_UP"] as const;
export type Summary = { customer_intent: typeof INTENTS[number]; order_ids: string[]; tools_called: ToolCallLog[]; resolution_status: typeof STATUSES[number]; policy_notes: string; call_summary: string; turns: number; duration_seconds: number };
export type TranscriptEntry = { role: "customer" | "agent"; text: string; timestamp: string };

export function deterministicSummary(transcript: TranscriptEntry[], toolsCalled: ToolCallLog[], durationSeconds = 0): Summary {
  const text = transcript.map((entry) => entry.text).join(" ").toLowerCase();
  const intent = text.includes("cancel") ? "CANCELLATION" : text.includes("return") || text.includes("refund") ? "RETURN_REFUND" : text.includes("where") || text.includes("track") || text.includes("order") ? "ORDER_TRACKING" : text.includes("shipping") || text.includes("delivery") ? "SHIPPING_INFO" : text.includes("flight") ? "OUT_OF_SCOPE" : "OTHER";
  const status = intent === "OUT_OF_SCOPE" ? "OUT_OF_SCOPE" : transcript.some((entry) => entry.role === "customer") ? "RESOLVED" : "UNRESOLVED";
  const ids = Array.from(new Set(toolsCalled.map((tool) => tool.order_id).filter(Boolean)));
  return { customer_intent: intent, order_ids: ids, tools_called: toolsCalled, resolution_status: status, policy_notes: "", call_summary: transcript.length ? transcript.filter((entry) => entry.role === "customer").map((entry) => entry.text).slice(0, 2).join(" ") : "No customer speech was recorded.", turns: transcript.length, duration_seconds: Math.max(0, Math.round(durationSeconds)) };
}

export function isValidSummary(value: unknown): value is Summary {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Summary>;
  return typeof item.customer_intent === "string" && INTENTS.includes(item.customer_intent as typeof INTENTS[number]) && Array.isArray(item.order_ids) && Array.isArray(item.tools_called) && typeof item.resolution_status === "string" && STATUSES.includes(item.resolution_status as typeof STATUSES[number]) && typeof item.policy_notes === "string" && typeof item.call_summary === "string" && typeof item.turns === "number" && typeof item.duration_seconds === "number";
}
