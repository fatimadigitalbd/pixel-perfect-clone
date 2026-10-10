export function taka(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return "৳" + v.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Sum money safely using integer paisa to avoid float drift. */
export function sumMoney(values: Array<number | string>) {
  const paisa = values.reduce<number>((s, v) => s + Math.round(Number(v) * 100), 0);
  return paisa / 100;
}

export function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function toCSV(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export const ORDER_STATUSES = [
  { v: "received", bn: "গৃহীত", en: "Received" },
  { v: "in_progress", bn: "কাজ চলছে", en: "In Progress" },
  { v: "ready", bn: "প্রস্তুত", en: "Ready" },
  { v: "delivered", bn: "ডেলিভারি হয়েছে", en: "Delivered" },
  { v: "cancelled", bn: "বাতিল", en: "Cancelled" },
] as const;
