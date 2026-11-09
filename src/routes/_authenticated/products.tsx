import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Printer, Trash2, ShoppingCart, PackagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { taka, todayISO } from "@/lib/format";
import { monthlyReport, stockOf } from "@/lib/product-report";
import { useMe } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "পণ্য ও স্টক — Fatima Digital" }, { name: "description", content: "পণ্যের কেনা দাম, বিক্রয় দাম, স্টক ও মাসিক লাভের রিপোর্ট।" }, { property: "og:title", content: "পণ্য ও স্টক — Fatima Digital" }, { property: "og:description", content: "পণ্যের কেনা-বেচা ও মাসিক রিপোর্ট।" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Products,
});

type Product = { id: string; name: string; category: string; unit: string; cost_price: number; sell_price: number };
type Move = { id: string; product_id: string; kind: string; qty: number; unit_cost: number; unit_price: number; moved_on: string; note: string | null };

function Products() {
  const qc = useQueryClient();
  const me = useMe();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [moving, setMoving] = useState<{ p: Product; kind: "purchase" | "sale" } | null>(null);
  const products = useQuery({ queryKey: ["products"], queryFn: async () => ((await supabase.from("products").select("*").order("name")).data ?? []) as Product[] });
  const moves = useQuery({ queryKey: ["product_moves"], queryFn: async () => ((await supabase.from("product_movements").select("*").order("moved_on", { ascending: false }).limit(10000)).data ?? []) as Move[] });
  const all = moves.data ?? [];
  const report = useMemo(() => monthlyReport(all, month), [all, month]);
  const perProduct = useMemo(() => (products.data ?? []).map((p) => ({ p, r: monthlyReport(all.filter((m) => m.product_id === p.id), month), stock: stockOf(all, p.id) })), [products.data, all, month]);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["product_moves"] }); };

  async function saveProduct(f: FormData) {
    const row = { name: String(f.get("name")).trim(), category: String(f.get("category")).trim() || "অন্যান্য", unit: String(f.get("unit")).trim() || "পিস", cost_price: Number(f.get("cost")), sell_price: Number(f.get("sell")) };
    if (!row.name || !(row.cost_price >= 0) || !(row.sell_price >= 0)) return toast.error("নাম ও দাম সঠিকভাবে দিন");
    const res = editing?.id ? await supabase.from("products").update(row).eq("id", editing.id) : await supabase.from("products").insert(row);
    if (res.error) return toast.error(res.error.message);
    toast.success("পণ্য সংরক্ষিত"); setEditing(null); refresh();
  }
  async function saveMove(f: FormData) {
    if (!moving) return;
    const qty = Number(f.get("qty")); const cost = Number(f.get("cost")); const price = Number(f.get("price") ?? 0);
    if (!(qty > 0) || !(cost >= 0) || !(price >= 0)) return toast.error("পরিমাণ ও দাম সঠিকভাবে দিন");
    if (moving.kind === "sale" && qty > stockOf(all, moving.p.id)) return toast.error("স্টকে এত পণ্য নেই");
    const { error } = await supabase.from("product_movements").insert({ product_id: moving.p.id, kind: moving.kind, qty, unit_cost: cost, unit_price: moving.kind === "sale" ? price : 0, moved_on: String(f.get("date")), note: String(f.get("note") || "") || null });
    if (error) return toast.error(error.message);
    toast.success(moving.kind === "sale" ? "বিক্রি যোগ হয়েছে" : "কেনা যোগ হয়েছে"); setMoving(null); refresh();
  }
  async function delProduct(id: string) {
    if (!confirm("পণ্য ও এর সব কেনা-বেচার হিসাব মুছবেন?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id); if (error) return toast.error(error.message); refresh();
  }
  const monthMoves = all.filter((m) => m.moved_on.startsWith(month));
  const name = (id: string) => products.data?.find((p) => p.id === id)?.name ?? "—";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="পণ্য ও স্টক" sub="কেনা দাম, বিক্রয় দাম, স্টক ও মাসিক লাভ">
        <Button onClick={() => setEditing({})}><Plus className="mr-1 h-4 w-4" /> নতুন পণ্য</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" /> মাসিক রিপোর্ট</Button>
      </PageHeader>
      <div className="mb-4 flex items-center gap-2"><Label>মাস</Label><Input type="month" className="w-44" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
      <h2 className="mb-2 hidden text-lg font-bold print:block">Fatima Digital — পণ্য রিপোর্ট {month}</h2>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat l="মোট কেনা" v={taka(report.bought)} />
        <Stat l="মোট বিক্রি" v={taka(report.revenue)} />
        <Stat l="বিক্রিত পণ্যের কেনা দাম" v={taka(report.cogs)} />
        <Stat l="লাভ" v={taka(report.profit)} c={report.profit >= 0 ? "text-success" : "text-destructive"} />
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground"><tr><th className="p-3">পণ্য</th><th className="p-3 text-right">কেনা দাম</th><th className="p-3 text-right">বিক্রয় দাম</th><th className="p-3 text-right">স্টক</th><th className="p-3 text-right">মাসে বিক্রি</th><th className="p-3 text-right">মাসে লাভ</th><th className="p-3 print:hidden" /></tr></thead>
          <tbody className="divide-y">
            {perProduct.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">কোনো পণ্য নেই — "নতুন পণ্য" চাপুন</td></tr>}
            {perProduct.map(({ p, r, stock }) => (
              <tr key={p.id}>
                <td className="p-3"><button className="font-semibold hover:underline print:no-underline" onClick={() => setEditing(p)}>{p.name}</button><div className="text-xs text-muted-foreground">{p.category} · {p.unit}</div></td>
                <td className="p-3 text-right">{taka(p.cost_price)}</td>
                <td className="p-3 text-right">{taka(p.sell_price)}</td>
                <td className={`p-3 text-right font-semibold ${stock <= 0 ? "text-destructive" : ""}`}>{stock}</td>
                <td className="p-3 text-right">{r.soldQty} · {taka(r.revenue)}</td>
                <td className="p-3 text-right font-semibold">{taka(r.profit)}</td>
                <td className="whitespace-nowrap p-3 text-right print:hidden">
                  <Button size="sm" variant="outline" className="mr-1" onClick={() => setMoving({ p, kind: "purchase" })}><PackagePlus className="h-4 w-4" /> কেনা</Button>
                  <Button size="sm" onClick={() => setMoving({ p, kind: "sale" })}><ShoppingCart className="h-4 w-4" /> বিক্রি</Button>
                  {me.data?.isAdmin && <button aria-label="মুছুন" className="ml-2 text-muted-foreground hover:text-destructive" onClick={() => delProduct(p.id)}><Trash2 className="h-4 w-4" /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mb-2 mt-6 font-semibold">এই মাসের কেনা-বেচা</h2>
      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground"><tr><th className="p-3">তারিখ</th><th className="p-3">পণ্য</th><th className="p-3">ধরন</th><th className="p-3 text-right">পরিমাণ</th><th className="p-3 text-right">কেনা দাম/একক</th><th className="p-3 text-right">বিক্রয় দাম/একক</th><th className="p-3 text-right">মোট</th></tr></thead>
          <tbody className="divide-y">
            {monthMoves.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">এই মাসে কোনো রেকর্ড নেই</td></tr>}
            {monthMoves.map((m) => <tr key={m.id}><td className="p-3">{m.moved_on}</td><td className="p-3">{name(m.product_id)}</td><td className="p-3">{m.kind === "sale" ? "বিক্রি" : "কেনা"}</td><td className="p-3 text-right">{m.qty}</td><td className="p-3 text-right">{taka(m.unit_cost)}</td><td className="p-3 text-right">{m.kind === "sale" ? taka(m.unit_price) : "—"}</td><td className="p-3 text-right font-semibold">{taka(Number(m.qty) * Number(m.kind === "sale" ? m.unit_price : m.unit_cost))}</td></tr>)}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "পণ্য সম্পাদনা" : "নতুন পণ্য"}</DialogTitle></DialogHeader>
          {editing && <form className="grid grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); void saveProduct(new FormData(e.currentTarget)); }}>
            <div className="col-span-2"><Label>পণ্যের নাম</Label><Input name="name" defaultValue={editing.name} required /></div>
            <div><Label>বিভাগ</Label><Input name="category" defaultValue={editing.category ?? "স্টেশনারি"} /></div>
            <div><Label>একক</Label><Input name="unit" defaultValue={editing.unit ?? "পিস"} /></div>
            <div><Label>কেনা দাম (৳)</Label><Input name="cost" type="number" min="0" step="0.01" defaultValue={editing.cost_price} required /></div>
            <div><Label>বিক্রয় দাম (৳)</Label><Input name="sell" type="number" min="0" step="0.01" defaultValue={editing.sell_price} required /></div>
            <Button className="col-span-2">সংরক্ষণ</Button>
          </form>}
        </DialogContent>
      </Dialog>
      <Dialog open={!!moving} onOpenChange={(o) => !o && setMoving(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{moving?.kind === "sale" ? "বিক্রি" : "কেনা (স্টক যোগ)"} — {moving?.p.name}</DialogTitle></DialogHeader>
          {moving && <form className="grid grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); void saveMove(new FormData(e.currentTarget)); }}>
            <div><Label>তারিখ</Label><Input name="date" type="date" defaultValue={todayISO()} required /></div>
            <div><Label>পরিমাণ ({moving.p.unit})</Label><Input name="qty" type="number" min="0.01" step="0.01" required /></div>
            <div><Label>কেনা দাম/একক (৳)</Label><Input name="cost" type="number" min="0" step="0.01" defaultValue={moving.p.cost_price} required /></div>
            {moving.kind === "sale" ? <div><Label>বিক্রয় দাম/একক (৳)</Label><Input name="price" type="number" min="0" step="0.01" defaultValue={moving.p.sell_price} required /></div> : <div />}
            <div className="col-span-2"><Label>নোট</Label><Input name="note" /></div>
            <Button className="col-span-2">সংরক্ষণ</Button>
          </form>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ l, v, c = "text-primary" }: { l: string; v: string; c?: string }) {
  return <div className="rounded-xl border bg-card p-4 shadow-card"><div className="text-sm text-muted-foreground">{l}</div><div className={`mt-1 font-display text-xl font-bold ${c}`}>{v}</div></div>;
}
