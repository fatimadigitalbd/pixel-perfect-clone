import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackOrder } from "@/lib/orders.functions";
import { ORDER_STATUSES } from "@/lib/format";

export const Route = createFileRoute("/track")({
  validateSearch: (s: Record<string, unknown>) => ({ no: typeof s.no === "string" ? s.no : undefined }),
  head: () => ({
    meta: [
      { title: "অর্ডার ট্র্যাক — ফাতিমা ডিজিটাল" },
      { name: "description", content: "অর্ডার নম্বর দিয়ে আপনার কাজের অবস্থা দেখুন।" },
      { property: "og:title", content: "অর্ডার ট্র্যাক — ফাতিমা ডিজিটাল" },
      { property: "og:description", content: "Check your Fatima Digital order status." },
    ],
  }),
  component: Track,
});

function Track() {
  const { no } = Route.useSearch();
  const [q, setQ] = useState(no ?? "");
  const [res, setRes] = useState<Awaited<ReturnType<typeof trackOrder>> | "none" | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(v = q) {
    if (!v.trim()) return;
    setBusy(true);
    const r = await trackOrder({ data: { order_no: v } });
    setRes(r ?? "none");
    setBusy(false);
  }
  useEffect(() => { if (no) go(no); }, [no]); // eslint-disable-line react-hooks/exhaustive-deps

  const idx = res && res !== "none" ? ORDER_STATUSES.findIndex((s) => s.v === res.status) : -1;
  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-md">
        <Link to="/"><Brand /></Link>
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-card">
          <h1 className="text-xl font-bold">অর্ডার ট্র্যাক করুন</h1>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); go(); }}>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="FD261010-1234" />
            <Button disabled={busy}>দেখুন</Button>
          </form>
          {res === "none" && <p className="mt-4 text-destructive">এই নম্বরে কোনো অর্ডার পাওয়া যায়নি।</p>}
          {res && res !== "none" && (
            <div className="mt-5">
              <div className="text-sm text-muted-foreground">{res.service} · {new Date(res.created_at).toLocaleDateString("bn-BD")}</div>
              <ol className="mt-3 space-y-2">
                {ORDER_STATUSES.filter((s) => s.v !== "cancelled" || res.status === "cancelled").map((s, i) => (
                  <li key={s.v} className={`flex items-center gap-2 ${res.status === "cancelled" ? (s.v === "cancelled" ? "font-bold text-destructive" : "text-muted-foreground") : i <= idx ? "font-semibold text-teal" : "text-muted-foreground"}`}>
                    <span className="h-3 w-3 rounded-full border-2 border-current" style={{ background: i <= idx ? "currentColor" : undefined }} />{s.bn}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
