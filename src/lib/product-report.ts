export type Movement = { product_id: string; kind: string; qty: number | string; unit_cost: number | string; unit_price: number | string; moved_on: string };

/** Monthly summary: purchase spend, sales revenue, cost of goods sold and profit. */
export function monthlyReport(moves: Movement[], month: string) {
  let bought = 0, revenue = 0, cogs = 0, soldQty = 0;
  for (const m of moves) {
    if (!m.moved_on.startsWith(month)) continue;
    const q = Number(m.qty);
    if (m.kind === "purchase") bought += q * Number(m.unit_cost);
    else { revenue += q * Number(m.unit_price); cogs += q * Number(m.unit_cost); soldQty += q; }
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  return { bought: r(bought), revenue: r(revenue), cogs: r(cogs), profit: r(revenue - cogs), soldQty };
}

export function stockOf(moves: Movement[], productId: string) {
  return moves.filter((m) => m.product_id === productId).reduce((s, m) => s + (m.kind === "purchase" ? 1 : -1) * Number(m.qty), 0);
}
