import { SYSTEM_PROMPT } from "./brand";
import { getOrderDetails, type OrderToolResult } from "./tools";

type AssistantToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
export type ChatMessage = { role: "user" | "assistant" | "system" | "tool"; content: string; tool_call_id?: string; name?: string; tool_calls?: AssistantToolCall[] };
export type ToolCallLog = { name: "get_order_details"; order_id: string; found: boolean };

const toolDefinition = {
  type: "function",
  function: {
    name: "get_order_details",
    description: "Look up a specific Aura Skincare order and its policy eligibility.",
    parameters: { type: "object", properties: { order_id: { type: "string" } }, required: ["order_id"], additionalProperties: false },
  },
};

function getConfig() {
  return {
    key: process.env.LLM_API_KEY,
    baseUrl: (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
    model: process.env.LLM_MODEL || "gpt-4o-mini",
  };
}

export async function runAgent(input: ChatMessage[]): Promise<{ reply: string; toolCalls: ToolCallLog[] }> {
  const config = getConfig();
  if (!config.key) throw new Error("LLM_API_KEY is not configured");
  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }, ...input.filter((message) => message.role !== "system").slice(-20)];
  const toolCalls: ToolCallLog[] = [];

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.key}` },
      body: JSON.stringify({ model: config.model, messages, tools: [toolDefinition], tool_choice: "auto", max_tokens: 200, temperature: 0.3 }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`LLM provider returned ${response.status}`);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string | null; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }> };
    const message = data.choices?.[0]?.message;
    if (!message) throw new Error("LLM provider returned no message");
    if (!message.tool_calls?.length) return { reply: (message.content || "Sorry, I don't have that information.").trim(), toolCalls };

    messages.push({ role: "assistant", content: message.content || "", tool_calls: message.tool_calls.map((call) => ({ id: call.id, type: "function", function: call.function })) });
    for (const call of message.tool_calls) {
      if (call.function.name !== "get_order_details") continue;
      let args: { order_id?: string } = {};
      try { args = JSON.parse(call.function.arguments) as { order_id?: string }; } catch { /* return missing ID */ }
      const result: OrderToolResult = getOrderDetails(args.order_id);
      toolCalls.push({ name: "get_order_details", order_id: args.order_id || "", found: result.found });
      messages.push({ role: "tool", name: "get_order_details", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  throw new Error("The agent reached its tool-call limit");
}
