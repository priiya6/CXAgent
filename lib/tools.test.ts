import { describe, expect, it } from "vitest";
import { getOrderDetails, normalizeOrderId } from "./tools";

describe("normalizeOrderId", () => {
  it.each([["ORD-101", "ORD-101"], ["ord 101", "ORD-101"], ["o r d 1 0 1", "ORD-101"], ["order one oh one", "ORD-101"], ["101", "ORD-101"], ["one zero one", "ORD-101"]])("normalizes %s", (input, expected) => expect(normalizeOrderId(input)).toBe(expected));
  it("handles missing and invalid IDs", () => {
    expect(normalizeOrderId("")).toBe("");
    expect(normalizeOrderId("where is my order")).toBe("");
  });
});

describe("getOrderDetails", () => {
  it("returns missing and unknown results", () => {
    expect(getOrderDetails("")).toEqual({ found: false, error: "MISSING_ORDER_ID" });
    expect(getOrderDetails("ORD-999")).toEqual({ found: false, error: "ORDER_NOT_FOUND", order_id: "ORD-999" });
  });
  it("computes cancellation and return policy flags", () => {
    expect(getOrderDetails("ORD-101")).toMatchObject({ found: true, policy: { cancellable: false, return_eligible: null } });
    expect(getOrderDetails("ORD-102")).toMatchObject({ found: true, policy: { cancellable: false, return_eligible: false } });
    expect(getOrderDetails("ORD-103")).toMatchObject({ found: true, policy: { cancellable: true, return_eligible: null } });
  });
});
