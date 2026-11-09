import { describe, it, expect } from "vitest";
import { monthlyReport, stockOf } from "./product-report";

const moves = [
  { product_id: "a", kind: "purchase", qty: 10, unit_cost: 50, unit_price: 0, moved_on: "2026-11-02" },
  { product_id: "a", kind: "sale", qty: 4, unit_cost: 50, unit_price: 80, moved_on: "2026-11-05" },
  { product_id: "a", kind: "sale", qty: 1, unit_cost: 50, unit_price: 80, moved_on: "2026-10-30" },
];

describe("product report", () => {
  it("profit = sales revenue minus purchase cost of sold items for the month", () => {
    expect(monthlyReport(moves, "2026-11")).toEqual({ bought: 500, revenue: 320, cogs: 200, profit: 120, soldQty: 4 });
  });
  it("stock = purchased minus sold", () => {
    expect(stockOf(moves, "a")).toBe(5);
  });
});
