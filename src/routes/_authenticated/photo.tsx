import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";
import { Upload, Download, Printer, RotateCw } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { downloadBlob } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/photo")({
  head: () => ({ meta: [{ title: "পাসপোর্ট ছবি — Fatima Digital" }] }),
  component: PhotoStudio,
});

const PRESETS = [
  { n: "পাসপোর্ট (বাংলাদেশ) 40×50 mm", w: 40, h: 50 },
  { n: "পাসপোর্ট / ভিসা 35×45 mm", w: 35, h: 45 },
  { n: "US ভিসা 2×2 inch", w: 51, h: 51 },
  { n: "স্ট্যাম্প সাইজ 20×25 mm", w: 20, h: 25 },
  { n: "আইডি ছবি 30×40 mm", w: 30, h: 40 },
  { n: "কাস্টম", w: 0, h: 0 },
];
const PAPERS = [
  { n: "4×6 inch (ফটো পেপার)", w: 101.6, h: 152.4 },
  { n: "5×7 inch", w: 127, h: 177.8 },
  { n: "A4", w: 210, h: 297 },
];
const DPI = 300;
const mm2px = (mm: number) => Math.round((mm / 25.4) * DPI);

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

function PhotoStudio() {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [bright, setBright] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [sat, setSat] = useState(100);
  const [preset, setPreset] = useState(0);
  const [cw, setCw] = useState(40);
  const [ch, setCh] = useState(50);
  const [paper, setPaper] = useState(0);
  const [copies, setCopies] = useState(8);
  const [gap, setGap] = useState(2);
  const [border, setBorder] = useState(true);
  const [bg, setBg] = useState("#ffffff");
  const [area, setArea] = useState<Area | null>(null);
  const [single, setSingle] = useState<string | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const w = PRESETS[preset].w || cw;
  const h = PRESETS[preset].h || ch;

  function onFile(f: File) {
    if (!f.type.startsWith("image/")) return toast.error("শুধু ছবি ফাইল (JPG/PNG/WEBP) দিন");
    if (f.size > 25 * 1024 * 1024) return toast.error("ছবি ২৫MB এর কম হতে হবে");
    const r = new FileReader();
    r.onload = () => { setSrc(r.result as string); setZoom(1); setRotation(0); };
    r.readAsDataURL(f);
  }

  const render = useCallback(async () => {
    if (!src || !area) return;
    const img = await loadImage(src);
    // rotate full image onto a canvas first (crop coordinates are relative to rotated bounding box)
    const rad = (rotation * Math.PI) / 180;
    const bw = Math.abs(Math.cos(rad) * img.width) + Math.abs(Math.sin(rad) * img.height);
    const bh = Math.abs(Math.sin(rad) * img.width) + Math.abs(Math.cos(rad) * img.height);
    const rc = document.createElement("canvas");
    rc.width = bw; rc.height = bh;
    const rctx = rc.getContext("2d")!;
    rctx.translate(bw / 2, bh / 2);
    rctx.rotate(rad);
    rctx.drawImage(img, -img.width / 2, -img.height / 2);

    const outW = mm2px(w), outH = mm2px(h);
    const c = document.createElement("canvas");
    c.width = outW; c.height = outH;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, outW, outH);
    ctx.imageSmoothingQuality = "high";
    ctx.filter = `brightness(${bright}%) contrast(${contrast}%) saturate(${sat}%)`;
    ctx.drawImage(rc, area.x, area.y, area.width, area.height, 0, 0, outW, outH);
    const one = c.toDataURL("image/jpeg", 0.95);
    setSingle(one);

    // sheet
    const P = PAPERS[paper];
    const sw = mm2px(P.w), sh = mm2px(P.h), g = mm2px(gap), m = mm2px(4);
    const cols = Math.max(1, Math.floor((sw - 2 * m + g) / (outW + g)));
    const rows = Math.max(1, Math.floor((sh - 2 * m + g) / (outH + g)));
    const n = Math.min(copies, cols * rows);
    const s = document.createElement("canvas");
    s.width = sw; s.height = sh;
    const sctx = s.getContext("2d")!;
    sctx.fillStyle = "#ffffff";
    sctx.fillRect(0, 0, sw, sh);
    const gridW = cols * outW + (cols - 1) * g;
    const ox = Math.round((sw - gridW) / 2);
    for (let i = 0; i < n; i++) {
      const x = ox + (i % cols) * (outW + g);
      const y = m + Math.floor(i / cols) * (outH + g);
      sctx.drawImage(c, x, y);
      if (border) { sctx.strokeStyle = "#bbbbbb"; sctx.lineWidth = 2; sctx.strokeRect(x, y, outW, outH); }
    }
    setSheet(s.toDataURL("image/jpeg", 0.95));
    if (copies > cols * rows) toast.info(`এই কাগজে সর্বোচ্চ ${cols * rows} কপি ধরে`);
  }, [src, area, rotation, w, h, bg, bright, contrast, sat, paper, gap, copies, border]);

  useEffect(() => {
    const id = setTimeout(render, 250);
    return () => clearTimeout(id);
  }, [render]);

  function dl(data: string, name: string) {
    fetch(data).then((r) => r.blob()).then((b) => downloadBlob(b, name));
  }
  function print(data: string) {
    const P = PAPERS[paper];
    const win = window.open("", "_blank");
    if (!win) return toast.error("পপ-আপ চালু করুন");
    win.document.write(`<html><head><style>@page{size:${P.w}mm ${P.h}mm;margin:0}body{margin:0}img{width:${P.w}mm;height:${P.h}mm;display:block}</style></head><body><img src="${data}" onload="setTimeout(()=>{print()},200)"></body></html>`);
    win.document.close();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="পাসপোর্ট ও এনআইডি ছবি" sub="ছবি আপলোড → ক্রপ → সমন্বয় → প্রিন্ট শিট (৩০০ DPI)">
        <Button onClick={() => fileRef.current?.click()}><Upload className="mr-1 h-4 w-4" /> ছবি আপলোড</Button>
        <input ref={fileRef} hidden type="file" accept="image/*" capture="environment" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="relative h-[420px] overflow-hidden rounded-xl border bg-muted">
            {src ? (
              <Cropper image={src} crop={crop} zoom={zoom} rotation={rotation} aspect={w / h} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, a) => setArea(a)} showGrid
                style={{ mediaStyle: { filter: `brightness(${bright}%) contrast(${contrast}%) saturate(${sat}%)` } }} />
            ) : (
              <button onClick={() => fileRef.current?.click()} className="grid h-full w-full place-items-center text-muted-foreground">
                <div className="text-center"><Upload className="mx-auto h-10 w-10" /><div className="mt-2">কম্পিউটার বা ফোন থেকে ছবি নির্বাচন করুন</div></div>
              </button>
            )}
          </div>
          {src && (
            <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-card sm:grid-cols-2">
              <Ctl l={`জুম ${zoom.toFixed(2)}×`}><Slider min={1} max={4} step={0.01} value={[zoom]} onValueChange={(v) => setZoom(v[0])} /></Ctl>
              <Ctl l={`ঘোরানো ${rotation}°`}>
                <div className="flex items-center gap-2"><Slider min={-180} max={180} step={1} value={[rotation]} onValueChange={(v) => setRotation(v[0])} />
                  <Button size="icon" variant="outline" onClick={() => setRotation((r) => (r + 90 > 180 ? r - 270 : r + 90))}><RotateCw className="h-4 w-4" /></Button></div>
              </Ctl>
              <Ctl l={`উজ্জ্বলতা ${bright}%`}><Slider min={50} max={150} value={[bright]} onValueChange={(v) => setBright(v[0])} /></Ctl>
              <Ctl l={`কনট্রাস্ট ${contrast}%`}><Slider min={50} max={150} value={[contrast]} onValueChange={(v) => setContrast(v[0])} /></Ctl>
              <Ctl l={`রঙ ${sat}%`}><Slider min={0} max={150} value={[sat]} onValueChange={(v) => setSat(v[0])} /></Ctl>
              <Ctl l="ফাঁকা অংশের রঙ"><div className="flex gap-2">{["#ffffff", "#dbe9f7", "#2563eb", "#e5e7eb"].map((c) => <button key={c} aria-label={c} onClick={() => setBg(c)} className={`h-8 w-8 rounded border-2 ${bg === c ? "border-teal" : "border-border"}`} style={{ background: c }} />)}<input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-8 w-10" /></div></Ctl>
            </div>
          )}
          {sheet && (
            <div className="rounded-xl border bg-card p-4 shadow-card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">প্রিভিউ</h3>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => single && dl(single, `photo-${w}x${h}mm.jpg`)}><Download className="mr-1 h-4 w-4" /> একক ছবি</Button>
                  <Button size="sm" variant="outline" onClick={() => dl(sheet, `print-sheet.jpg`)}><Download className="mr-1 h-4 w-4" /> শিট</Button>
                  <Button size="sm" onClick={() => print(sheet)}><Printer className="mr-1 h-4 w-4" /> প্রিন্ট</Button>
                </div>
              </div>
              <div className="flex items-start gap-4">
                {single && <img src={single} alt="single" className="w-28 border" />}
                <img src={sheet} alt="sheet" className="max-h-[420px] border" />
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4 rounded-xl border bg-card p-4 shadow-card lg:sticky lg:top-6 lg:self-start">
          <div><Label>ছবির মাপ</Label>
            <select className="mt-1 h-10 w-full rounded-md border bg-card px-2" value={preset} onChange={(e) => setPreset(+e.target.value)}>
              {PRESETS.map((p, i) => <option key={p.n} value={i}>{p.n}</option>)}
            </select>
          </div>
          {PRESETS[preset].w === 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div><Label>প্রস্থ (mm)</Label><Input type="number" min={10} max={150} value={cw} onChange={(e) => setCw(+e.target.value || 10)} /></div>
              <div><Label>উচ্চতা (mm)</Label><Input type="number" min={10} max={150} value={ch} onChange={(e) => setCh(+e.target.value || 10)} /></div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">দপ্তরভেদে মাপ ভিন্ন হতে পারে — আবেদনের আগে অফিসিয়াল নির্দেশনা দেখে নিন।</p>
          <div><Label>কাগজ</Label>
            <select className="mt-1 h-10 w-full rounded-md border bg-card px-2" value={paper} onChange={(e) => setPaper(+e.target.value)}>
              {PAPERS.map((p, i) => <option key={p.n} value={i}>{p.n}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>কপি</Label><Input type="number" min={1} max={60} value={copies} onChange={(e) => setCopies(Math.max(1, +e.target.value))} /></div>
            <div><Label>ফাঁক (mm)</Label><Input type="number" min={0} max={10} value={gap} onChange={(e) => setGap(Math.max(0, +e.target.value))} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={border} onChange={(e) => setBorder(e.target.checked)} /> কাটার দাগ (বর্ডার)</label>
          <div className="rounded-lg bg-accent p-3 text-xs text-accent-foreground">
            ব্যাকগ্রাউন্ড অটো রিমুভ (AI) এখনো চালু করা হয়নি — এটি পরবর্তী ধাপে যুক্ত হবে। এখন ক্রপ করে ফাঁকা অংশের রঙ বদলাতে পারবেন।
          </div>
        </aside>
      </div>
    </div>
  );
}

function Ctl({ l, children }: { l: string; children: React.ReactNode }) {
  return <div><div className="mb-2 text-sm text-muted-foreground">{l}</div>{children}</div>;
}
