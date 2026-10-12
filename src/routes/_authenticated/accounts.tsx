import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Download, Printer, Trash2, Pencil, Upload, DatabaseBackup } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { txQuery, audit } from "@/lib/queries";
import { taka, sumMoney, todayISO, toCSV, downloadBlob } from "@/lib/format";
import { useMe } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({ meta: [{ title: "আয়-ব্যয় — Fatima Digital" }] }),
  component: Accounts,
});

const INCOME_CATS = ["ফটোগ্রাফি", "প্রিন্টিং", "ফটোকপি", "টাইপিং", "কার্ড প্রিন্টিং", "অনলাইন আবেদন", "অন্যান্য"];
const EXPENSE_CATS = ["সাপ্লাই/কাগজ", "কালি/টোনার", "ভাড়া", "বিদ্যুৎ/ইউটিলিটি", "ইন্টারনেট", "বেতন", "মেরামত", "বিবিধ"];
const METHODS = [
  { v: "cash", l: "নগদ" }, { v: "bkash", l: "বিকাশ" }, { v: "nagad", l: "নগদ (মোবাইল)" }, { v: "rocket", l: "রকেট" }, { v: "bank", l: "ব্যাংক" },
];

type Tx = {
  id?: string; kind: "income" | "expense"; amount: number | string; paid_amount: number | string; category: string;
  description: string | null; customer_name: string | null; payment_method: string; txn_date: string;
};

function Accounts() {
  const { t } = useI18n();
  const me = useMe();
  const qc = useQueryClient();
  const [range, setRange] = useState<"today" | "month" | "year" | "all">("month");
  const today = todayISO();
  const from = range === "today" ? today : range === "month" ? today.slice(0, 7) + "-01" : range === "year" ? today.slice(0, 4) + "-01-01" : "2000-01-01";
  const { data = [], isLoading } = useQuery(txQuery(from));
  const [q, setQ] = useState("");
  const [kindF, setKindF] = useState<"all" | "income" | "expense">("all");
  const [edit, setEdit] = useState<Tx | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(
    () => data.filter((r) => (kindF === "all" || r.kind === kindF) && (!q || `${r.category} ${r.description ?? ""} ${r.customer_name ?? ""}`.toLowerCase().includes(q.toLowerCase()))),
    [data, q, kindF],
  );
  const income = sumMoney(rows.filter((r) => r.kind === "income").map((r) => r.amount));
  const expense = sumMoney(rows.filter((r) => r.kind === "expense").map((r) => r.amount));
  const due = sumMoney(rows.filter((r) => r.kind === "income").map((r) => Math.max(0, Number(r.amount) - Number(r.paid_amount))));

  async function save(tx: Tx) {
    const amount = Number(tx.amount);
    const paid = tx.kind === "expense" ? amount : Number(tx.paid_amount);
    if (!(amount >= 0) || !(paid >= 0) || paid > amount) return toast.error("পরিমাণ সঠিক নয় (পরিশোধ মোটের বেশি হতে পারে না)");
    const { data: u } = await supabase.auth.getUser();
    const { id: _i, ...rest } = tx; void _i;
    const payload = { ...rest, amount, paid_amount: paid };
    const res = tx.id
      ? await supabase.from("transactions").update(payload).eq("id", tx.id)
      : await supabase.from("transactions").insert({ ...payload, created_by: u.user!.id });
    if (res.error) return toast.error(res.error.message);
    toast.success("সংরক্ষিত হয়েছে");
    setEdit(null);
    qc.invalidateQueries({ queryKey: ["tx"] });
  }

  async function del(id: string) {
    if (!confirm("এই লেনদেন মুছে ফেলবেন?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await audit("transaction.delete", { id });
    qc.invalidateQueries({ queryKey: ["tx"] });
  }

  function exportCSV() {
    const csv = toCSV(rows.map((r) => ({ date: r.txn_date, type: r.kind, category: r.category, customer: r.customer_name, description: r.description, method: r.payment_method, amount: r.amount, paid: r.paid_amount })));
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `fatima-digital-${range}-${today}.csv`);
  }

  async function backup() {
    const { data: all, error } = await supabase.from("transactions").select("*").limit(100000);
    if (error) return toast.error(error.message);
    downloadBlob(new Blob([JSON.stringify({ version: 1, exported_at: new Date().toISOString(), transactions: all }, null, 2)], { type: "application/json" }), `fatima-backup-${today}.json`);
  }

  async function restore(f: File) {
    try {
      const j = JSON.parse(await f.text());
      const list = (j.transactions ?? []) as Tx[];
      const { data: u } = await supabase.auth.getUser();
      const clean = list.map(({ kind, amount, paid_amount, category, description, customer_name, payment_method, txn_date, id }) => ({ id, kind, amount, paid_amount, category, description, customer_name, payment_method, txn_date, created_by: u.user!.id, amount: Number(amount), paid_amount: Number(paid_amount) }));
      const { error } = await supabase.from("transactions").upsert(clean, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
      await audit("transaction.restore", { count: clean.length });
      toast.success(`${clean.length} টি রেকর্ড পুনরুদ্ধার করা হয়েছে`);
      qc.invalidateQueries({ queryKey: ["tx"] });
    } catch (e) {
      toast.error("ব্যাকআপ ফাইল পড়া যায়নি: " + (e as Error).message);
    }
  }

  const blank = (kind: "income" | "expense"): Tx => ({ kind, amount: "", paid_amount: "", category: kind === "income" ? INCOME_CATS[0] : EXPENSE_CATS[0], description: "", customer_name: "", payment_method: "cash", txn_date: today });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("accounts")} sub="সব হিসাব টাকায় (৳)">
        <Button onClick={() => setEdit(blank("income"))}><Plus className="mr-1 h-4 w-4" /> আয়</Button>
        <Button variant="outline" onClick={() => setEdit(blank("expense"))}><Plus className="mr-1 h-4 w-4" /> খরচ</Button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat l="মোট আয়" v={taka(income)} c="text-teal" />
        <Stat l="মোট খরচ" v={taka(expense)} c="text-destructive" />
        <Stat l="নিট লাভ" v={taka(sumMoney([income, -expense]))} c={income >= expense ? "text-success" : "text-destructive"} />
        <Stat l="বকেয়া" v={taka(due)} c="text-warning-foreground" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden">
        {(["today", "month", "year", "all"] as const).map((r) => (
          <Button key={r} size="sm" variant={range === r ? "default" : "outline"} onClick={() => setRange(r)}>
            {{ today: "আজ", month: "এই মাস", year: "এই বছর", all: "সব" }[r]}
          </Button>
        ))}
        <select className="h-9 rounded-md border bg-card px-2 text-sm" value={kindF} onChange={(e) => setKindF(e.target.value as never)}>
          <option value="all">সব ধরন</option><option value="income">আয়</option><option value="expense">খরচ</option>
        </select>
        <Input className="h-9 max-w-xs" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}><Download className="mr-1 h-4 w-4" /> CSV</Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" /> রিপোর্ট</Button>
          <Button size="sm" variant="outline" onClick={backup}><DatabaseBackup className="mr-1 h-4 w-4" /> ব্যাকআপ</Button>
          {me.data?.isAdmin && (
            <>
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-1 h-4 w-4" /> রিস্টোর</Button>
              <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr><th className="p-3">তারিখ</th><th className="p-3">বিভাগ</th><th className="p-3">বিবরণ</th><th className="p-3">মাধ্যম</th><th className="p-3 text-right">পরিমাণ</th><th className="p-3 text-right">বকেয়া</th><th className="p-3 print:hidden" /></tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">লোড হচ্ছে…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">কোনো রেকর্ড নেই</td></tr>}
            {rows.map((r) => {
              const d = r.kind === "income" ? Math.max(0, Number(r.amount) - Number(r.paid_amount)) : 0;
              return (
                <tr key={r.id}>
                  <td className="p-3 whitespace-nowrap">{r.txn_date}</td>
                  <td className="p-3">{r.category}</td>
                  <td className="p-3">{r.customer_name && <b>{r.customer_name} · </b>}{r.description}</td>
                  <td className="p-3">{METHODS.find((m) => m.v === r.payment_method)?.l}</td>
                  <td className={`p-3 text-right font-semibold ${r.kind === "income" ? "text-teal" : "text-destructive"}`}>{r.kind === "income" ? "+" : "−"}{taka(r.amount)}</td>
                  <td className="p-3 text-right">{d > 0 ? taka(d) : "—"}</td>
                  <td className="p-3 whitespace-nowrap text-right print:hidden">
                    <button aria-label="edit" className="mr-2 text-muted-foreground hover:text-foreground" onClick={() => setEdit({ ...r, kind: r.kind as Tx["kind"] })}><Pencil className="h-4 w-4" /></button>
                    {me.data?.isAdmin && <button aria-label="delete" className="text-muted-foreground hover:text-destructive" onClick={() => del(r.id)}><Trash2 className="h-4 w-4" /></button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.kind === "income" ? "আয় যোগ/সম্পাদনা" : "খরচ যোগ/সম্পাদনা"}</DialogTitle></DialogHeader>
          {edit && <TxForm tx={edit} onSave={save} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ l, v, c }: { l: string; v: string; c: string }) {
  return <div className="rounded-xl border bg-card p-4 shadow-card"><div className="text-sm text-muted-foreground">{l}</div><div className={`mt-1 font-display text-xl font-bold ${c}`}>{v}</div></div>;
}

function TxForm({ tx, onSave }: { tx: Tx; onSave: (t: Tx) => void }) {
  const [f, setF] = useState<Tx>(tx);
  const set = (k: keyof Tx, v: string) => setF({ ...f, [k]: v });
  const cats = f.kind === "income" ? INCOME_CATS : EXPENSE_CATS;
  return (
    <form className="grid grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
      <div><Label>তারিখ</Label><Input type="date" value={f.txn_date} onChange={(e) => set("txn_date", e.target.value)} required /></div>
      <div><Label>বিভাগ</Label>
        <select className="h-10 w-full rounded-md border bg-card px-2" value={f.category} onChange={(e) => set("category", e.target.value)}>
          {[...new Set([...cats, f.category])].map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div><Label>মোট পরিমাণ (৳)</Label><Input type="number" min="0" step="0.01" value={f.amount} onChange={(e) => set("amount", e.target.value)} required /></div>
      {f.kind === "income" ? (
        <div><Label>পরিশোধিত (৳)</Label><Input type="number" min="0" step="0.01" placeholder="সম্পূর্ণ হলে মোটের সমান" value={f.paid_amount} onChange={(e) => set("paid_amount", e.target.value)} required /></div>
      ) : <div />}
      {f.kind === "income" && <div className="col-span-2"><Label>কাস্টমারের নাম</Label><Input value={f.customer_name ?? ""} onChange={(e) => set("customer_name", e.target.value)} /></div>}
      <div className="col-span-2"><Label>বিবরণ</Label><Input value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
      <div className="col-span-2"><Label>পেমেন্ট মাধ্যম</Label>
        <select className="h-10 w-full rounded-md border bg-card px-2" value={f.payment_method} onChange={(e) => set("payment_method", e.target.value)}>
          {METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
      </div>
      <Button className="col-span-2">সংরক্ষণ</Button>
    </form>
  );
}
