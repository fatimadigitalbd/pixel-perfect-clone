import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, ExternalLink, ShieldCheck, ShieldAlert, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { jobsQuery } from "@/lib/queries";
import { todayISO } from "@/lib/format";
import { useMe } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{"title": "চাকরির খবর — Fatima Digital"}, {"name": "description", "content": "অফিসিয়াল সূত্রের চাকরির বিজ্ঞপ্তি ও আবেদনের সময়সীমা।"}, {"property": "og:title", "content": "চাকরির খবর — Fatima Digital"}, {"property": "og:description", "content": "অফিসিয়াল সূত্রের চাকরির বিজ্ঞপ্তি ও আবেদনের সময়সীমা।"}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}] }),
  component: Jobs,
});

const SOURCES = [
  { n: "Teletalk সরকারি নিয়োগ", u: "https://alljobs.teletalk.com.bd/" },
  { n: "BPSC", u: "https://bpsc.gov.bd/" },
  { n: "বাংলাদেশ জাতীয় তথ্য বাতায়ন", u: "https://bangladesh.gov.bd/" },
];
type Job = { id?: string; title: string; organization: string; category: string; location: string | null; published_on: string | null; deadline: string | null; eligibility: string | null; source_url: string; apply_url: string | null; verified: boolean };

function Jobs() {
  const me = useMe();
  const qc = useQueryClient();
  const { data = [] } = useQuery(jobsQuery);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [showExpired, setShowExpired] = useState(false);
  const [edit, setEdit] = useState<Job | null>(null);
  const today = todayISO();
  const soon = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);

  const rows = data.filter((j) => (cat === "all" || j.category === cat) && (showExpired || !j.deadline || j.deadline >= today) && (!q || `${j.title} ${j.organization} ${j.location ?? ""}`.toLowerCase().includes(q.toLowerCase())));

  async function save(j: Job) {
    try { const u = new URL(j.source_url); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { return toast.error("সঠিক অফিসিয়াল লিংক দিন"); }
    const { data: u } = await supabase.auth.getUser();
    const p = { ...j, location: j.location || null, published_on: j.published_on || null, deadline: j.deadline || null, eligibility: j.eligibility || null, apply_url: j.apply_url || null };
    const r = j.id ? await supabase.from("job_circulars").update(p).eq("id", j.id) : await supabase.from("job_circulars").insert({ ...p, created_by: u.user!.id });
    if (r.error) return toast.error(r.error.message);
    setEdit(null);
    qc.invalidateQueries({ queryKey: ["jobs"] });
  }
  async function del(id: string) {
    if (!confirm("মুছবেন?")) return;
    await supabase.from("job_circulars").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["jobs"] });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="চাকরির খবর" sub="শুধু অফিসিয়াল উৎস থেকে নিজে যাচাই করে যুক্ত করুন — অযাচাইকৃত তথ্য চিহ্নিত থাকে">
        {me.data?.isAdmin && <Button onClick={() => setEdit({ title: "", organization: "", category: "government", location: "", published_on: today, deadline: "", eligibility: "", source_url: "", apply_url: "", verified: false })}><Plus className="mr-1 h-4 w-4" /> বিজ্ঞপ্তি যোগ</Button>}
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <span className="self-center text-muted-foreground">অফিসিয়াল উৎস:</span>
        {SOURCES.map((s) => <a key={s.u} href={s.u} target="_blank" rel="noreferrer" className="rounded-full border bg-card px-3 py-1 hover:border-teal">{s.n} ↗</a>)}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input className="h-9 max-w-xs" placeholder="পদ / প্রতিষ্ঠান / স্থান" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="h-9 rounded-md border bg-card px-2 text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">সব</option><option value="government">সরকারি</option><option value="private">বেসরকারি</option><option value="ngo">এনজিও</option>
        </select>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={showExpired} onChange={(e) => setShowExpired(e.target.checked)} /> মেয়াদোত্তীর্ণ দেখাও</label>
      </div>

      {rows.length === 0 && <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">কোনো বিজ্ঞপ্তি নেই। {me.data?.isAdmin ? "অফিসিয়াল সাইট দেখে যোগ করুন।" : ""}</div>}
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((j) => {
          const expired = j.deadline && j.deadline < today;
          const urgent = !expired && j.deadline && j.deadline <= soon;
          return (
            <div key={j.id} className={`rounded-xl border bg-card p-4 shadow-card ${urgent ? "border-warning" : ""} ${expired ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{j.title}</div>
                  <div className="text-sm text-muted-foreground">{j.organization}{j.location && ` · ${j.location}`}</div>
                </div>
                {j.verified ? <span className="flex items-center gap-1 text-xs text-success"><ShieldCheck className="h-4 w-4" />যাচাইকৃত</span> : <span className="flex items-center gap-1 text-xs text-warning-foreground"><ShieldAlert className="h-4 w-4" />অযাচাইকৃত</span>}
              </div>
              <div className="mt-2 text-sm">প্রকাশ: {j.published_on ?? "—"} · <b className={expired ? "text-destructive" : urgent ? "text-warning-foreground" : ""}>শেষ: {j.deadline ?? "—"} {expired && "(মেয়াদোত্তীর্ণ)"}{urgent && "(শীঘ্রই)"}</b></div>
              {j.eligibility && <p className="mt-1 text-sm text-muted-foreground">{j.eligibility}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild><a href={j.source_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-3.5 w-3.5" />মূল বিজ্ঞপ্তি</a></Button>
                {j.apply_url && <Button size="sm" asChild><a href={j.apply_url} target="_blank" rel="noreferrer">আবেদন</a></Button>}
                {me.data?.isAdmin && <><Button size="icon" variant="ghost" aria-label="edit" onClick={() => setEdit(j)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="delete" onClick={() => del(j.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></>}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>চাকরির বিজ্ঞপ্তি</DialogTitle></DialogHeader>
          {edit && <JobForm j={edit} onSave={save} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JobForm({ j, onSave }: { j: Job; onSave: (j: Job) => void }) {
  const [f, setF] = useState(j);
  const s = (k: keyof Job, v: string | boolean) => setF({ ...f, [k]: v });
  return (
    <form className="grid grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
      <div className="col-span-2"><Label>পদের নাম *</Label><Input required value={f.title} onChange={(e) => s("title", e.target.value)} /></div>
      <div className="col-span-2"><Label>প্রতিষ্ঠান *</Label><Input required value={f.organization} onChange={(e) => s("organization", e.target.value)} /></div>
      <div><Label>ধরন</Label><select className="h-10 w-full rounded-md border bg-card px-2" value={f.category} onChange={(e) => s("category", e.target.value)}><option value="government">সরকারি</option><option value="private">বেসরকারি</option><option value="ngo">এনজিও</option></select></div>
      <div><Label>স্থান</Label><Input value={f.location ?? ""} onChange={(e) => s("location", e.target.value)} /></div>
      <div><Label>প্রকাশের তারিখ</Label><Input type="date" value={f.published_on ?? ""} onChange={(e) => s("published_on", e.target.value)} /></div>
      <div><Label>শেষ তারিখ</Label><Input type="date" value={f.deadline ?? ""} onChange={(e) => s("deadline", e.target.value)} /></div>
      <div className="col-span-2"><Label>যোগ্যতা / নির্দেশনা</Label><Textarea value={f.eligibility ?? ""} onChange={(e) => s("eligibility", e.target.value)} /></div>
      <div className="col-span-2"><Label>অফিসিয়াল বিজ্ঞপ্তির লিংক *</Label><Input required type="url" value={f.source_url} onChange={(e) => s("source_url", e.target.value)} /></div>
      <div className="col-span-2"><Label>আবেদনের লিংক</Label><Input type="url" value={f.apply_url ?? ""} onChange={(e) => s("apply_url", e.target.value)} /></div>
      <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.verified} onChange={(e) => s("verified", e.target.checked)} /> আমি অফিসিয়াল উৎসে তথ্যটি যাচাই করেছি</label>
      <Button className="col-span-2">সংরক্ষণ</Button>
    </form>
  );
}
