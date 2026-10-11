import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Download, Trash2, QrCode, Eraser } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ordersQuery, audit } from "@/lib/queries";
import { ORDER_STATUSES } from "@/lib/format";
import { useMe } from "@/hooks/use-session";
import { purgeExpired } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "কাস্টমার অর্ডার — Fatima Digital" }] }),
  component: Orders,
});

function Orders() {
  const qc = useQueryClient();
  const me = useMe();
  const { data = [], isLoading } = useQuery(ordersQuery);
  const [q, setQ] = useState("");
  const [st, setSt] = useState("all");
  const [qr, setQr] = useState("");
  const link = typeof window !== "undefined" ? window.location.origin + "/upload" : "";
  useEffect(() => { if (link) QRCode.toDataURL(link, { width: 240, margin: 1 }).then(setQr); }, [link]);

  const rows = data.filter((o) => (st === "all" || o.status === st) && (!q || `${o.order_no} ${o.customer_name} ${o.phone ?? ""}`.toLowerCase().includes(q.toLowerCase())));

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["orders"] });
  }
  async function download(path: string, name: string) {
    const { data: s, error } = await supabase.storage.from("customer-files").createSignedUrl(path, 60, { download: name });
    if (error) return toast.error(error.message);
    await audit("file.download", { path });
    window.open(s.signedUrl, "_blank");
  }
  async function del(o: (typeof data)[number]) {
    if (!confirm(`অর্ডার ${o.order_no} ও এর ফাইল মুছবেন?`)) return;
    const paths = ((o.files as { path: string }[]) ?? []).map((f) => f.path);
    if (paths.length) await supabase.storage.from("customer-files").remove(paths);
    const { error } = await supabase.from("orders").delete().eq("id", o.id);
    if (error) return toast.error(error.message);
    await audit("order.delete", { order_no: o.order_no });
    qc.invalidateQueries({ queryKey: ["orders"] });
  }
  async function purge() {
    try {
      const r = await purgeExpired();
      toast.success(`${r.count} টি মেয়াদোত্তীর্ণ অর্ডারের ফাইল মুছে ফেলা হয়েছে`);
      qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="কাস্টমার অর্ডার" sub="কাস্টমার QR স্ক্যান করে ফাইল পাঠাবে · ফাইল ৩০ দিন পর মেয়াদোত্তীর্ণ">
        {me.data?.isAdmin && <Button variant="outline" onClick={purge}><Eraser className="mr-1 h-4 w-4" /> মেয়াদোত্তীর্ণ ফাইল মুছুন</Button>}
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 shadow-card">
        {qr && <img src={qr} alt="upload QR" className="h-28 w-28" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-semibold"><QrCode className="h-4 w-4 text-teal" /> কাস্টমার আপলোড লিংক</div>
          <code className="mt-1 block truncate text-sm text-muted-foreground">{link}</code>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success("কপি হয়েছে"); }}>লিংক কপি</Button>
            {qr && <Button size="sm" variant="outline" asChild><a href={qr} download="fatima-upload-qr.png">QR ডাউনলোড</a></Button>}
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Input className="h-9 max-w-xs" placeholder="অর্ডার নং / নাম / ফোন" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="h-9 rounded-md border bg-card px-2 text-sm" value={st} onChange={(e) => setSt(e.target.value)}>
          <option value="all">সব অবস্থা</option>{ORDER_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.bn}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-muted-foreground">লোড হচ্ছে…</p>}
        {!isLoading && rows.length === 0 && <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">কোনো অর্ডার নেই। উপরের QR কোডটি দোকানে লাগিয়ে রাখুন।</div>}
        {rows.map((o) => {
          const files = (o.files as { path: string; name: string; size: number }[]) ?? [];
          const expired = new Date(o.expires_at) < new Date();
          return (
            <div key={o.id} className="rounded-xl border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-display text-lg font-bold text-primary">{o.order_no}</div>
                  <div className="text-sm">{o.customer_name} {o.phone && <a className="text-teal" href={`tel:${o.phone}`}>· {o.phone}</a>} · <b>{o.service}</b></div>
                  {o.instructions && <div className="mt-1 text-sm text-muted-foreground">“{o.instructions}”</div>}
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("bn-BD")} {expired && "· মেয়াদোত্তীর্ণ"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select className="h-9 rounded-md border bg-card px-2 text-sm" value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
                    {ORDER_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.bn}</option>)}
                  </select>
                  {me.data?.isAdmin && <Button size="icon" variant="ghost" aria-label="delete" onClick={() => del(o)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {files.length === 0 && <span className="text-xs text-muted-foreground">ফাইল মুছে ফেলা হয়েছে</span>}
                {files.map((f) => (
                  <Button key={f.path} size="sm" variant="outline" onClick={() => download(f.path, f.name)}><Download className="mr-1 h-3.5 w-3.5" />{f.name.slice(0, 28)} ({Math.ceil(f.size / 1024)}KB)</Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
