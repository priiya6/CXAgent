import { ORDERS, type Order } from "./orders";

const DIGITS: Record<string, string> = {
  zero: "0", oh: "0", o: "0", one: "1", two: "2", three: "3", four: "4",
  five: "5", six: "6", seven: "7", eight: "8", nine: "9",
};

export function normalizeOrderId(input: string | null | undefined): string {
  if (!input?.trim()) return "";
  const raw = input.trim().toLowerCase().replace(/\bo\s*r\s*d\b/g, " ");
  const digitWords = raw.replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter(Boolean);
  const expanded = digitWords.flatMap((part) => {
    if (/^\d+$/.test(part)) return [part];
    if (part === "order") return [];
    if (part === "ord") return [];
    if (DIGITS[part]) return [DIGITS[part]];
    const letters = part.match(/[a-z]+/g)?.flatMap((letter) => DIGITS[letter] ? [DIGITS[letter]] : []) ?? [];
    return letters.length === part.length ? [letters.join("")] : [];
  });
  const digits = expanded.join("").replace(/\D/g, "");
  return digits ? `ORD-${digits}` : "";
}

export type OrderToolResult =
  | { found: false; error: "MISSING_ORDER_ID" }
  | { found: false; error: "ORDER_NOT_FOUND"; order_id: string }
  | { found: true; order: Order; policy: { cancellable: boolean; cancellation_note: string; return_eligible: boolean | null; return_note: string } };

export function getOrderDetails(orderId: string | null | undefined): OrderToolResult {
  const normalized = normalizeOrderId(orderId);
  if (!normalized) return { found: false, error: "MISSING_ORDER_ID" };
  const order = ORDERS[normalized];
  if (!order) return { found: false, error: "ORDER_NOT_FOUND", order_id: normalized };
  const cancellable = order.status === "Processing";
  const returnEligible = order.status === "Delivered" ? (order.deliveredDaysAgo ?? Infinity) <= 7 : null;
  return {
    found: true,
    order,
    policy: {
      cancellable,
      cancellation_note: cancellable
        ? "This order can be cancelled while it is Processing, but Aria cannot perform the cancellation."
        : "This order cannot be cancelled because it is no longer Processing; if it is Out for Delivery, the customer may refuse delivery at the doorstep.",
      return_eligible: returnEligible,
      return_note: order.status === "Delivered"
        ? returnEligible ? "Within 7 days, subject to being unopened, unused, and in original packaging." : "Outside the 7-day return window."
        : "Return eligibility is only assessed after delivery; the order has not been delivered yet.",
    },
  };
}

export const get_order_details = getOrderDetails;
