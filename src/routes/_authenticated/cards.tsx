import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Download, Upload, Plus, Trash2, Copy, Users } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { downloadBlob } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/cards")({
  head: () => ({ meta: [{ title: "কার্ড ডিজাইনার — Fatima Digital" }] }),
  component: Cards,
});

const DPI = 300;
const mm = (v: number) => (v / 25.4) * DPI;

type Field = { id: string; text: string; x: number; y: number; size: number; bold: boolean; color: string; align: CanvasTextAlign };
type Design = {
  w: number; h: number; bleed: number; bg: string; bg2: string; band: boolean; border: string; radius: number;
  photo: { on: boolean; x: number; y: number; w: number; h: number };
  logo: { on: boolean; x: number; y: number; s: number };
  qr: { on: boolean; text: string; x: number; y: number; s: number };
  fields: Field[];
};

const uid = () => Math.random().toString(36).slice(2, 8);
const TEMPLATES: { n: string; d: Design }[] = [
  {
    n: "বিজনেস কার্ড (৩.৫×২ ইঞ্চি)",
    d: {
      w: 89, h: 51, bleed: 3, bg: "#ffffff", bg2: "#14325c", band: true, border: "", radius: 0,
      photo: { on: false, x: 0, y: 0, w: 0, h: 0 }, logo: { on: false, x: 6, y: 6, s: 12 },
      qr: { on: true, text: "tel:01341097821", x: 68, y: 26, s: 17 },
      fields: [
        { id: uid(), text: "ফাতিমা ডিজিটাল", x: 6, y: 14, size: 15, bold: true, color: "#14325c", align: "left" },
        { id: uid(), text: "ফটো স্টুডিও · ফটোকপি · কম্পিউটার", x: 6, y: 20, size: 7, bold: false, color: "#1f8f8f", align: "left" },
        { id: uid(), text: "মো. ফখরুল ইসলাম", x: 6, y: 31, size: 9, bold: true, color: "#111111", align: "left" },
        { id: uid(), text: "📞 01341097821", x: 6, y: 37, size: 7.5, bold: false, color: "#333333", align: "left" },
        { id: uid(), text: "ফায়দাবাদ, ঢাকা ১২৩০", x: 6, y: 42, size: 7.5, bold: false, color: "#333333", align: "left" },
      ],
    },
  },
  {
    n: "আইডি কার্ড (CR80 পোর্ট্রেট)",
    d: {
      w: 54, h: 86, bleed: 2, bg: "#ffffff", bg2: "#14325c", band: true, border: "#1f8f8f", radius: 3,
      photo: { on: true, x: 15.5, y: 18, w: 23, h: 28 }, logo: { on: false, x: 4, y: 3, s: 8 },
      qr: { on: true, text: "EMP-001", x: 20, y: 68, s: 14 },
      fields: [
        { id: uid(), text: "প্রতিষ্ঠানের নাম", x: 27, y: 10, size: 10, bold: true, color: "#ffffff", align: "center" },
        { id: uid(), text: "{name}", x: 27, y: 53, size: 10, bold: true, color: "#14325c", align: "center" },
        { id: uid(), text: "{designation}", x: 27, y: 58.5, size: 7.5, bold: false, color: "#1f8f8f", align: "center" },
        { id: uid(), text: "আইডি: {id}", x: 27, y: 64, size: 7, bold: false, color: "#333333", align: "center" },
      ],
    },
  },
  {
    n: "মেম্বারশিপ কার্ড (ল্যান্ডস্কেপ)",
    d: {
      w: 86, h: 54, bleed: 2, bg: "#f4f7fb", bg2: "#1f8f8f", band: true, border: "", radius: 3,
      photo: { on: true, x: 6, y: 16, w: 20, h: 25 }, logo: { on: false, x: 70, y: 3, s: 10 },
      qr: { on: true, text: "MEMBER-{id}", x: 66, y: 32, s: 16 },
      fields: [
        { id: uid(), text: "MEMBERSHIP CARD", x: 43, y: 9, size: 10, bold: true, color: "#ffffff", align: "center" },
        { id: uid(), text: "{name}", x: 30, y: 24, size: 10, bold: true, color: "#14325c", align: "left" },
        { id: uid(), text: "সদস্য নং: {id}", x: 30, y: 31, size: 7.5, bold: false, color: "#333333", align: "left" },
        { id: uid(), text: "মেয়াদ: ২০২৭", x: 30, y: 37, size: 7.5, bold: false, color: "#333333", align: "left" },
      ],
    },
  },
];

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

async function drawCard(d: Design, photo: string | null, logo: string | null, vars: Record<string, string>, showBleed: boolean) {
  const sub = (s: string) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
  const b = mm(d.bleed);
  const W = mm(d.w) + 2 * b, H = mm(d.h) + 2 * b;
  const c = document.createElement("canvas");
  c.width = Math.round(W); c.height = Math.round(H);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = d.bg; ctx.fillRect(0, 0, W, H);
  if (d.band) {
    ctx.fillStyle = d.bg2;
    if (d.w > d.h) {
      if (d.photo.on) ctx.fillRect(0, 0, W, b + mm(13)); else ctx.fillRect(W - b - mm(d.w * 0.06), 0, b + mm(d.w * 0.06), H);
    } else ctx.fillRect(0, 0, W, b + mm(15));
  }
  ctx.save(); ctx.translate(b, b);
  if (d.photo.on) {
    const p = d.photo;
    if (photo) {
      const img = await loadImg(photo);
      const pw = mm(p.w), ph = mm(p.h), r = Math.max(pw / img.width, ph / img.height);
      const sw = pw / r, sh = ph / r;
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, mm(p.x), mm(p.y), pw, ph);
    } else { ctx.fillStyle = "#dde3ea"; ctx.fillRect(mm(p.x), mm(p.y), mm(p.w), mm(p.h)); }
    ctx.strokeStyle = d.bg2; ctx.lineWidth = 4; ctx.strokeRect(mm(p.x), mm(p.y), mm(p.w), mm(p.h));
  }
  if (d.logo.on && logo) {
    const img = await loadImg(logo);
    const s = mm(d.logo.s), r = Math.min(s / img.width, s / img.height);
    ctx.drawImage(img, mm(d.logo.x), mm(d.logo.y), img.width * r, img.height * r);
  }
  if (d.qr.on && d.qr.text) {
    const url = await QRCode.toDataURL(sub(d.qr.text), { margin: 0, width: Math.round(mm(d.qr.s)) });
    ctx.drawImage(await loadImg(url), mm(d.qr.x), mm(d.qr.y), mm(d.qr.s), mm(d.qr.s));
  }
  await document.fonts.ready;
  for (const f of d.fields) {
    ctx.fillStyle = f.color; ctx.textAlign = f.align; ctx.textBaseline = "alphabetic";
    ctx.font = `${f.bold ? 700 : 400} ${(f.size / 72) * DPI}px 'Hind Siliguri', 'Noto Sans Bengali', sans-serif`;
    ctx.fillText(sub(f.text), mm(f.x), mm(f.y));
  }
  ctx.restore();
  if (d.border) { ctx.strokeStyle = d.border; ctx.lineWidth = 6; ctx.strokeRect(b + 3, b + 3, mm(d.w) - 6, mm(d.h) - 6); }
  if (showBleed && d.bleed > 0) { ctx.setLineDash([12, 8]); ctx.strokeStyle = "#e11d48"; ctx.lineWidth = 2; ctx.strokeRect(b, b, mm(d.w), mm(d.h)); }
  return c;
}

function Cards() {
  const [d, setD] = useState<Design>(TEMPLATES[0].d);
  const [photo, setPhoto] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [bulk, setBulk] = useState("name,designation,id\nরহিম উদ্দিন,হিসাবরক্ষক,EMP-001\nকরিম মিয়া,অফিস সহকারী,EMP-002");
  const [copies, setCopies] = useState(10);
  const photoRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const firstVars = parseCSV(bulk)[0] ?? {};
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const c = await drawCard(d, photo, logo, firstVars, true);
      if (alive) setPreview(c.toDataURL("image/png"));
    }, 120);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, photo, logo, bulk]);

  const up = (k: keyof Design, v: unknown) => setD({ ...d, [k]: v } as Design);
  const upField = (id: string, patch: Partial<Field>) => setD({ ...d, fields: d.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  const readFile = (f: File, set: (s: string) => void) => {
    if (!f.type.startsWith("image/")) return toast.error("ছবি ফাইল দিন");
    const r = new FileReader(); r.onload = () => set(r.result as string); r.readAsDataURL(f);
  };

  async function exportPNG() {
    const c = await drawCard(d, photo, logo, firstVars, false);
    c.toBlob((b) => b && downloadBlob(b, "card-300dpi.png"), "image/png");
  }

  async function printSheet(rows: Record<string, string>[]) {
    const imgs: string[] = [];
    for (const r of rows) imgs.push((await drawCard(d, photo, logo, r, false)).toDataURL("image/png"));
    const cw = d.w + 2 * d.bleed, ch = d.h + 2 * d.bleed;
    const w = window.open("", "_blank");
    if (!w) return toast.error("পপ-আপ চালু করুন");
    w.document.write(`<html><head><style>@page{size:A4;margin:8mm}body{margin:0;display:flex;flex-wrap:wrap;gap:2mm;align-content:flex-start}img{width:${cw}mm;height:${ch}mm;outline:0.2mm dashed #aaa}</style></head><body>${imgs.map((s) => `<img src="${s}">`).join("")}<script>window.onload=()=>setTimeout(()=>print(),300)</script></body></html>`);
    w.document.close();
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="বিজনেস ও আইডি কার্ড ডিজাইনার" sub="৩০০ DPI প্রিন্ট-রেডি · লাল ড্যাশ লাইন = কাটার সীমা (ব্লিড বাইরে)">
        <Button variant="outline" onClick={exportPNG}><Download className="mr-1 h-4 w-4" /> PNG</Button>
        <Button variant="outline" onClick={() => printSheet(Array.from({ length: copies }, () => firstVars))}><Copy className="mr-1 h-4 w-4" /> {copies} কপি প্রিন্ট</Button>
        <Button onClick={() => printSheet(parseCSV(bulk))}><Users className="mr-1 h-4 w-4" /> ডেটা থেকে সব কার্ড</Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t) => <Button key={t.n} size="sm" variant="outline" onClick={() => setD(structuredClone(t.d))}>{t.n}</Button>)}
          </div>
          <div className="grid min-h-[320px] place-items-center rounded-xl border bg-muted p-6">
            {preview && <img src={preview} alt="card preview" className="max-h-[440px] max-w-full shadow-card" />}
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <Label>বাল্ক ডেটা (CSV — প্রথম লাইন কলামের নাম; লেখায় {"{name}"} এভাবে ব্যবহার করুন)</Label>
            <Textarea rows={5} className="mt-1 font-mono text-xs" value={bulk} onChange={(e) => setBulk(e.target.value)} />
            <div className="mt-2 flex items-center gap-2 text-sm">একই কার্ডের কপি: <Input type="number" min={1} max={50} className="h-8 w-20" value={copies} onChange={(e) => setCopies(Math.max(1, +e.target.value))} /></div>
          </div>
        </div>

        <aside className="max-h-[calc(100vh-6rem)] space-y-4 overflow-y-auto rounded-xl border bg-card p-4 shadow-card lg:sticky lg:top-6">
          <div className="grid grid-cols-3 gap-2">
            <div><Label>প্রস্থ mm</Label><Input type="number" value={d.w} onChange={(e) => up("w", +e.target.value || 20)} /></div>
            <div><Label>উচ্চতা mm</Label><Input type="number" value={d.h} onChange={(e) => up("h", +e.target.value || 20)} /></div>
            <div><Label>ব্লিড mm</Label><Input type="number" min={0} max={5} value={d.bleed} onChange={(e) => up("bleed", Math.max(0, +e.target.value))} /></div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-1">পটভূমি <input type="color" value={d.bg} onChange={(e) => up("bg", e.target.value)} /></label>
            <label className="flex items-center gap-1">ব্যান্ড <input type="color" value={d.bg2} onChange={(e) => up("bg2", e.target.value)} /></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={d.band} onChange={(e) => up("band", e.target.checked)} /> রঙিন ব্যান্ড</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={!!d.border} onChange={(e) => up("border", e.target.checked ? "#1f8f8f" : "")} /> বর্ডার</label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => photoRef.current?.click()}><Upload className="mr-1 h-3.5 w-3.5" /> ছবি</Button>
            <Button size="sm" variant="outline" onClick={() => logoRef.current?.click()}><Upload className="mr-1 h-3.5 w-3.5" /> লোগো</Button>
            <input ref={photoRef} hidden type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0], (s) => { setPhoto(s); up("photo", { ...d.photo, on: true, w: d.photo.w || 20, h: d.photo.h || 25 }); })} />
            <input ref={logoRef} hidden type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0], (s) => { setLogo(s); up("logo", { ...d.logo, on: true }); })} />
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={d.photo.on} onChange={(e) => up("photo", { ...d.photo, on: e.target.checked })} /> ছবি দেখাও</label>
          </div>
          {d.photo.on && <XY label="ছবি" v={d.photo} keys={["x", "y", "w", "h"]} onChange={(v) => up("photo", v)} />}
          {d.logo.on && <XY label="লোগো" v={d.logo} keys={["x", "y", "s"]} onChange={(v) => up("logo", v)} />}
          <div>
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={d.qr.on} onChange={(e) => up("qr", { ...d.qr, on: e.target.checked })} /> QR কোড</label>
            {d.qr.on && <><Input className="mt-1" value={d.qr.text} onChange={(e) => up("qr", { ...d.qr, text: e.target.value })} /><XY label="QR" v={d.qr} keys={["x", "y", "s"]} onChange={(v) => up("qr", v)} /></>}
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold">লেখা</span>
              <Button size="sm" variant="ghost" onClick={() => up("fields", [...d.fields, { id: uid(), text: "নতুন লেখা", x: 5, y: 10, size: 8, bold: false, color: "#111111", align: "left" }])}><Plus className="h-4 w-4" /></Button></div>
            <div className="space-y-3">
              {d.fields.map((f) => (
                <div key={f.id} className="rounded-lg border p-2">
                  <div className="flex gap-1"><Input className="h-8" value={f.text} onChange={(e) => upField(f.id, { text: e.target.value })} />
                    <button aria-label="remove" onClick={() => up("fields", d.fields.filter((x) => x.id !== f.id))}><Trash2 className="h-4 w-4 text-destructive" /></button></div>
                  <div className="mt-1 grid grid-cols-5 gap-1 text-xs">
                    <NumIn l="X" v={f.x} on={(x) => upField(f.id, { x })} /><NumIn l="Y" v={f.y} on={(y) => upField(f.id, { y })} /><NumIn l="pt" v={f.size} on={(size) => upField(f.id, { size })} />
                    <input type="color" className="h-7 w-full" value={f.color} onChange={(e) => upField(f.id, { color: e.target.value })} />
                    <select className="h-7 rounded border bg-card" value={f.align} onChange={(e) => upField(f.id, { align: e.target.value as CanvasTextAlign })}><option value="left">⟸</option><option value="center">≡</option><option value="right">⟹</option></select>
                  </div>
                  <label className="mt-1 flex items-center gap-1 text-xs"><input type="checkbox" checked={f.bold} onChange={(e) => upField(f.id, { bold: e.target.checked })} /> বোল্ড</label>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function NumIn({ l, v, on }: { l: string; v: number; on: (n: number) => void }) {
  return <label className="flex items-center gap-0.5"><span className="text-muted-foreground">{l}</span><input type="number" step="0.5" className="h-7 w-full rounded border bg-card px-1" value={v} onChange={(e) => on(+e.target.value)} /></label>;
}
function XY<T extends Record<string, unknown>>({ label, v, keys, onChange }: { label: string; v: T; keys: string[]; onChange: (v: T) => void }) {
  return (
    <div className="mt-1 grid grid-cols-4 gap-1 text-xs">
      <span className="self-center text-muted-foreground">{label}</span>
      {keys.map((k) => <NumIn key={k} l={k} v={v[k] as number} on={(n) => onChange({ ...v, [k]: n })} />)}
    </div>
  );
}

function parseCSV(s: string): Record<string, string>[] {
  const lines = s.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const head = lines[0].split(",").map((x) => x.trim());
  return lines.slice(1).map((l) => { const c = l.split(","); return Object.fromEntries(head.map((h, i) => [h, (c[i] ?? "").trim()])); });
}
