import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Undo2, Redo2, Printer, Save, Plus, Trash2, Wand2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DOC_TEMPLATES, PAGE_SIZES } from "@/lib/doc-templates";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "বাংলা ডকুমেন্ট — Fatima Digital" }] }),
  component: Docs,
});

const FONTS = [
  { v: "'Noto Serif Bengali', serif", l: "Noto Serif Bengali" },
  { v: "'Noto Sans Bengali', sans-serif", l: "Noto Sans Bengali" },
  { v: "'Hind Siliguri', sans-serif", l: "Hind Siliguri" },
  { v: "'Anek Bangla', sans-serif", l: "Anek Bangla" },
];

function Docs() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["docs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("id,title,updated_at").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const ed = useRef<HTMLDivElement>(null);
  const [id, setId] = useState<string | null>(null);
  const [title, setTitle] = useState("নতুন ডকুমেন্ট");
  const [size, setSize] = useState("A4");
  const [margin, setMargin] = useState(20);
  const [font, setFont] = useState(FONTS[0].v);
  const [fs, setFs] = useState(14);
  const [pick, setPick] = useState(false);
  const [fill, setFill] = useState<string[] | null>(null);

  useEffect(() => { if (ed.current && !ed.current.innerHTML) ed.current.innerHTML = DOC_TEMPLATES[1].html; }, []);

  const cmd = (c: string, v?: string) => { document.execCommand(c, false, v); ed.current?.focus(); };

  async function open(docId: string) {
    const { data, error } = await supabase.from("documents").select("*").eq("id", docId).single();
    if (error) return toast.error(error.message);
    setId(data.id); setTitle(data.title); setSize(data.page_size); setMargin(data.margin_mm);
    if (ed.current) ed.current.innerHTML = data.content;
  }

  async function save() {
    const content = ed.current?.innerHTML ?? "";
    const { data: u } = await supabase.auth.getUser();
    const payload = { title, content, page_size: size, margin_mm: margin, updated_at: new Date().toISOString() };
    const res = id
      ? await supabase.from("documents").update(payload).eq("id", id).select("id").single()
      : await supabase.from("documents").insert({ ...payload, created_by: u.user!.id }).select("id").single();
    if (res.error) return toast.error(res.error.message);
    setId(res.data.id);
    toast.success("ড্রাফট সংরক্ষিত");
    qc.invalidateQueries({ queryKey: ["docs"] });
  }

  async function remove(docId: string) {
    if (!confirm("ডকুমেন্টটি মুছবেন?")) return;
    await supabase.from("documents").delete().eq("id", docId);
    if (docId === id) setId(null);
    qc.invalidateQueries({ queryKey: ["docs"] });
  }

  function useTemplate(html: string, name: string) {
    if (ed.current) ed.current.innerHTML = html;
    setId(null); setTitle(name); setPick(false);
  }

  function openFill() {
    const txt = ed.current?.innerText ?? "";
    const keys = [...new Set([...txt.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]))];
    if (!keys.length) return toast.info("কোনো [প্লেসহোল্ডার] পাওয়া যায়নি");
    setFill(keys);
  }
  function applyFill(vals: Record<string, string>) {
    if (!ed.current) return;
    let html = ed.current.innerHTML;
    for (const [k, v] of Object.entries(vals)) {
      if (!v) continue;
      const esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const safe = v.replace(/&/g, "&amp;").replace(/</g, "&lt;");
      html = html.replace(new RegExp(`<span class="ph">\\[${esc}\\]</span>`, "g"), safe).replace(new RegExp(`\\[${esc}\\]`, "g"), safe);
    }
    ed.current.innerHTML = html;
    setFill(null);
  }

  function print() {
    const p = PAGE_SIZES[size];
    const w = window.open("", "_blank");
    if (!w) return toast.error("পপ-আপ চালু করুন");
    const html = (ed.current?.innerHTML ?? "").replace(/<span class="ph">(.*?)<\/span>/g, "$1");
    w.document.write(`<!doctype html><html lang="bn"><head><meta charset="utf-8"><title>${title.replace(/</g, "")}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@500;700&family=Hind+Siliguri:wght@400;700&family=Noto+Serif+Bengali:wght@400;700&family=Noto+Sans+Bengali:wght@400;700&display=swap">
<style>@page{size:${p.w}mm ${p.h}mm;margin:${margin}mm}body{margin:0;font-family:${font};font-size:${fs}pt;line-height:1.7;color:#111}
h1{font-size:1.6em;text-align:center;margin:.4em 0}h2{font-size:1.25em;margin:.6em 0 .3em}p{margin:.35em 0}table{border-collapse:collapse;width:100%}td,th{border:1px solid #888;padding:4px 8px}</style></head>
<body>${html}<script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))</script></body></html>`);
    w.document.close();
  }

  const p = PAGE_SIZES[size];
  const Tb = ({ i: I, c, v, l }: { i: typeof Bold; c: string; v?: string; l: string }) => (
    <button type="button" title={l} aria-label={l} onMouseDown={(e) => { e.preventDefault(); cmd(c, v); }} className="grid h-8 w-8 place-items-center rounded hover:bg-muted"><I className="h-4 w-4" /></button>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="বাংলা ডকুমেন্ট মেকার" sub="টেমপ্লেট বেছে নিন, [হলুদ] ঘরগুলো পূরণ করুন, প্রিন্ট বা PDF হিসেবে সেভ করুন">
        <Button variant="outline" onClick={() => setPick(true)}><Plus className="mr-1 h-4 w-4" /> টেমপ্লেট</Button>
        <Button variant="outline" onClick={openFill}><Wand2 className="mr-1 h-4 w-4" /> তথ্য পূরণ</Button>
        <Button variant="outline" onClick={save}><Save className="mr-1 h-4 w-4" /> সংরক্ষণ</Button>
        <Button onClick={print}><Printer className="mr-1 h-4 w-4" /> প্রিন্ট / PDF</Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border bg-card p-3 shadow-card lg:self-start">
          <div className="mb-2 text-sm font-semibold">সংরক্ষিত ড্রাফট</div>
          {list.data?.length === 0 && <p className="text-xs text-muted-foreground">এখনো কিছু নেই</p>}
          <ul className="space-y-1">
            {list.data?.map((d) => (
              <li key={d.id} className={`group flex items-center justify-between rounded px-2 py-1.5 text-sm ${d.id === id ? "bg-accent" : "hover:bg-muted"}`}>
                <button className="flex-1 truncate text-left" onClick={() => open(d.id)}>{d.title}</button>
                <button aria-label="delete" className="opacity-0 group-hover:opacity-100" onClick={() => remove(d.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="min-w-0">
          <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-1 rounded-xl border bg-card p-2 shadow-card">
            <Input className="h-8 w-48" value={title} onChange={(e) => setTitle(e.target.value)} />
            <select className="h-8 rounded border bg-card px-1 text-sm" value={font} onChange={(e) => setFont(e.target.value)}>{FONTS.map((f) => <option key={f.l} value={f.v}>{f.l}</option>)}</select>
            <select className="h-8 rounded border bg-card px-1 text-sm" value={fs} onChange={(e) => setFs(+e.target.value)}>{[10, 11, 12, 13, 14, 16, 18, 20, 24].map((n) => <option key={n} value={n}>{n}pt</option>)}</select>
            <select className="h-8 rounded border bg-card px-1 text-sm" value={size} onChange={(e) => setSize(e.target.value)}>{Object.keys(PAGE_SIZES).map((s) => <option key={s}>{s}</option>)}</select>
            <select className="h-8 rounded border bg-card px-1 text-sm" value={margin} onChange={(e) => setMargin(+e.target.value)}>{[10, 15, 20, 25, 30].map((n) => <option key={n} value={n}>মার্জিন {n}mm</option>)}</select>
            <span className="mx-1 h-6 w-px bg-border" />
            <Tb i={Bold} c="bold" l="Bold" /><Tb i={Italic} c="italic" l="Italic" /><Tb i={Underline} c="underline" l="Underline" />
            <Tb i={AlignLeft} c="justifyLeft" l="Left" /><Tb i={AlignCenter} c="justifyCenter" l="Center" /><Tb i={AlignRight} c="justifyRight" l="Right" /><Tb i={AlignJustify} c="justifyFull" l="Justify" />
            <Tb i={List} c="insertUnorderedList" l="Bullets" /><Tb i={ListOrdered} c="insertOrderedList" l="Numbers" />
            <Tb i={Undo2} c="undo" l="Undo" /><Tb i={Redo2} c="redo" l="Redo" />
          </div>
          <div className="overflow-x-auto rounded-xl bg-muted p-4 md:p-8">
            <div
              ref={ed}
              contentEditable
              suppressContentEditableWarning
              lang="bn"
              className="doc-paper mx-auto"
              style={{ width: `${p.w}mm`, minHeight: `${p.h}mm`, padding: `${margin}mm`, fontFamily: font, fontSize: `${fs}pt` }}
            />
          </div>
        </div>
      </div>

      <Dialog open={pick} onOpenChange={setPick}>
        <DialogContent>
          <DialogHeader><DialogTitle>টেমপ্লেট বেছে নিন</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {DOC_TEMPLATES.map((t) => <Button key={t.id} variant="outline" className="h-auto justify-start py-3" onClick={() => useTemplate(t.html, t.name)}>{t.name}</Button>)}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!fill} onOpenChange={(o) => !o && setFill(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>তথ্য পূরণ করুন</DialogTitle></DialogHeader>
          {fill && <FillForm keys={fill} onApply={applyFill} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FillForm({ keys, onApply }: { keys: string[]; onApply: (v: Record<string, string>) => void }) {
  const [v, setV] = useState<Record<string, string>>({});
  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); onApply(v); }}>
      {keys.map((k) => (
        <div key={k}><label className="text-sm text-muted-foreground">{k}</label><Input value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></div>
      ))}
      <Button className="w-full">প্রয়োগ করুন</Button>
    </form>
  );
}
