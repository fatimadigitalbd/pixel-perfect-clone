import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";
import { Upload, Download, RotateCw, Eraser, Scan, Undo2, LoaderCircle, ArrowRight, ImagePlus, Check, Crop, FileScan } from "lucide-react";
import { PhotoCropDialog } from '@/components/PhotoCropDialog';
import { neutralRetouch, retouchCanvas } from '@/lib/photo-retouch';
import { PhotoSheetComposer } from "@/components/PhotoSheetComposer";
import { type SheetPhoto } from "@/lib/photo-layout";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { downloadBlob } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/photo")({
  head: () => ({ meta: [
    { title: "পাসপোর্ট ছবি ও AI স্টুডিও — Fatima Digital" },
    { name: "description", content: "পাসপোর্ট ছবির ব্যাকগ্রাউন্ড রিমুভ, AI আপস্কেল, ক্রপ ও ৩০০ DPI প্রিন্ট শিট।" },
    { property: "og:title", content: "পাসপোর্ট ছবি ও AI স্টুডিও — Fatima Digital" },
    { property: "og:description", content: "ব্যাকগ্রাউন্ড রিমুভ, ২×/৪× আপস্কেল ও প্রিন্ট-রেডি পাসপোর্ট ছবি।" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
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
  const [step, setStep] = useState<1 | 2>(1);
  const [cropOpen, setCropOpen] = useState(false);
  const [retouch, setRetouch] = useState(neutralRetouch);
  const [upscaleMode, setUpscaleMode] = useState<'fast' | 'ai'>('fast');
  const [photos, setPhotos] = useState<SheetPhoto[]>([]);
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const [busy, setBusy] = useState<"remove" | "upscale" | null>(null);
  const [progress, setProgress] = useState(0);
  const [scale, setScale] = useState<2 | 4>(2);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const renderVersion = useRef(0);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [bright, setBright] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [sat, setSat] = useState(100);
  const [preset, setPreset] = useState(0);
  const [cw, setCw] = useState(40);
  const [ch, setCh] = useState(50);
  const [bg, setBg] = useState("#ffffff");
  const [area, setArea] = useState<Area | null>(null);
  const [single, setSingle] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const w = PRESETS[preset].w || cw;
  const h = PRESETS[preset].h || ch;

  async function onFiles(files: File[]) {
    if (busy || importing) return;
    setImporting(true);
    const imported: { photo: SheetPhoto; source: string }[] = [];
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/") || file.size > 25 * 1024 * 1024) {
          toast.error(`${file.name}: JPG/PNG/WEBP ছবি দিন, সর্বোচ্চ ২৫MB`);
          continue;
        }
        try {
          const source = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("ছবি পড়া যায়নি"));
            reader.readAsDataURL(file);
          });
          const image = await loadImage(source);
          const canvas = document.createElement("canvas");
          canvas.width = mm2px(w); canvas.height = mm2px(h);
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("ছবি তৈরি করা যায়নি");
          const ratio = Math.max(canvas.width / image.width, canvas.height / image.height);
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(image, (canvas.width - image.width * ratio) / 2, (canvas.height - image.height * ratio) / 2, image.width * ratio, image.height * ratio);
          imported.push({ source, photo: { id: crypto.randomUUID(), image: canvas.toDataURL("image/jpeg", 0.95), width: w, height: h, passport: 5, stamp: 0, rotated: false } });
        } catch {
          toast.error(`${file.name}: ছবি পড়া যায়নি`);
        }
      }
      const first = imported[0];
      if (!first) return;
      // Keep the current edited portrait before opening a newly imported one.
      if (single) commitPhoto();
      setPhotos(current => [...current, ...imported.map(item => item.photo)]);
      setStep(1); setEditingId(first.photo.id);
      setBright(100); setContrast(100); setSat(100);
      setRetouch(neutralRetouch);
      setOriginal(first.source); setRemoved(false); setError(null);
      replaceSource(first.source);
      toast.success(`${imported.length}টি ছবি ট্রেতে যোগ হয়েছে`);
    } finally {
      setImporting(false);
    }
  }

  function replaceSource(data: string) {
    renderVersion.current += 1;
    setArea(null); setSingle(null);
    setSrc(data); setCrop({ x: 0, y: 0 }); setZoom(1); setRotation(0);
    loadImage(data).then((image) => setDimensions({ w: image.width, h: image.height }));
  }

  async function editPhoto(action: "remove" | "upscale") {
    if (!src || busy) return;
    setBusy(action); setProgress(0); setError(null);
    try {
      const tools = await import("@/lib/photo-ai");
      const blob = action === "remove"
        ? await tools.removePhotoBackground(src, setProgress)
        : await tools.upscalePhoto(src, scale, setProgress, upscaleMode);
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      replaceSource(data);
      if (action === "remove") setRemoved(true);
      toast.success(action === "remove" ? "ব্যাকগ্রাউন্ড রিমুভ হয়েছে" : `${scale}× আপস্কেল হয়েছে`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "ছবি সম্পাদনা করা যায়নি। আবার চেষ্টা করুন।";
      setError(message); toast.error(message);
    } finally { setBusy(null); }
  }

  const render = useCallback(async () => {
    if (!src || !area) return;
    const version = ++renderVersion.current;
    const img = await loadImage(src);
    if (version !== renderVersion.current) return;
    // rotate full image onto a canvas first (crop coordinates are relative to rotated bounding box)
    const rad = (rotation * Math.PI) / 180;
    const bw = Math.abs(Math.cos(rad) * img.width) + Math.abs(Math.sin(rad) * img.height);
    const bh = Math.abs(Math.sin(rad) * img.width) + Math.abs(Math.cos(rad) * img.height);
    const rc = document.createElement("canvas");
    rc.width = bw; rc.height = bh;
    const rctx = rc.getContext("2d");
    if (!rctx) return;
    rctx.translate(bw / 2, bh / 2);
    rctx.rotate(rad);
    rctx.drawImage(img, -img.width / 2, -img.height / 2);

    const outW = mm2px(w), outH = mm2px(h);
    const c = document.createElement("canvas");
    c.width = outW; c.height = outH;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, outW, outH);
    ctx.imageSmoothingQuality = "high";
    ctx.filter = `brightness(${bright}%) contrast(${contrast}%) saturate(${sat}%)`;
    ctx.drawImage(rc, area.x, area.y, area.width, area.height, 0, 0, outW, outH);
    retouchCanvas(c, retouch);
    const one = c.toDataURL("image/jpeg", 0.95);
    setSingle(one);

  }, [src, area, rotation, w, h, bg, bright, contrast, sat, retouch]);

  useEffect(() => {
    setSingle(null);
    const id = setTimeout(() => { render().catch(() => toast.error("প্রিন্ট শিট তৈরি করা যায়নি")); }, 250);
    return () => clearTimeout(id);
  }, [render]);

  function dl(data: string, name: string) {
    fetch(data).then((r) => r.blob()).then((b) => downloadBlob(b, name));
  }
  function commitPhoto() {
    if (!single || busy) return false;
    const id = editingId ?? crypto.randomUUID();
    const previous = photos.find(photo => photo.id === id);
    const photo: SheetPhoto = { id, image: single, width: w, height: h, passport: previous?.passport ?? 5, stamp: previous?.stamp ?? 0, rotated: previous?.rotated ?? false };
    setPhotos(current => previous ? current.map(item => item.id === id ? photo : item) : [...current, photo]);
    setEditingId(id);
    return true;
  }
  function selectPhoto(photo: SheetPhoto) {
    setStep(1); setEditingId(photo.id); setOriginal(photo.image); setRemoved(false); setError(null);
    setBright(100); setContrast(100); setSat(100);
    setRetouch(neutralRetouch);
    setPreset(5); setCw(photo.width); setCh(photo.height);
    replaceSource(photo.image);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="পাসপোর্ট ও এনআইডি ছবি" sub={step === 1 ? "ছবি সম্পাদনা" : "প্রিন্ট শিট"}>
        <Button asChild variant="outline"><Link to="/scan"><FileScan /> ডকুমেন্ট / আইডি স্ক্যান</Link></Button>
        <Button disabled={!!busy || importing} onClick={() => fileRef.current?.click()}>{importing ? <LoaderCircle className="animate-spin" /> : <Upload className="mr-1 h-4 w-4" />} {importing ? "ছবি যোগ হচ্ছে" : "ছবি আপলোড"}</Button>
        <input ref={fileRef} hidden type="file" accept="image/*" multiple onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ""; void onFiles(files); }} />
      </PageHeader>
      <nav aria-label="ছবি তৈরির ধাপ" className="mb-5 flex gap-2 border-b pb-4">
        <Button variant={step === 1 ? "default" : "outline"} disabled={!!busy || importing} onClick={() => setStep(1)} aria-current={step === 1 ? "step" : undefined}>১ · ছবি সম্পাদনা</Button>
        <Button variant={step === 2 ? "default" : "outline"} disabled={!!busy || importing || (!single && photos.length === 0)} onClick={() => { if (step === 1 && single) commitPhoto(); setStep(2); }} aria-current={step === 2 ? "step" : undefined}>২ · প্রিন্ট শিট <ArrowRight /></Button>
      </nav>
      {step === 2 ? <PhotoSheetComposer photos={photos} onChange={setPhotos} onBack={() => setStep(1)} onEdit={selectPhoto} /> : <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="relative h-[420px] overflow-hidden rounded-xl border bg-muted">
            {src ? (
              <Cropper image={src} crop={crop} zoom={zoom} rotation={rotation} aspect={w / h} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, a) => setArea(a)} showGrid
                style={{ mediaStyle: { filter: `brightness(${bright}%) contrast(${contrast}%) saturate(${sat}%)` } }} />
            ) : (
              <Button variant="ghost" disabled={importing} onClick={() => fileRef.current?.click()} className="grid h-full w-full place-items-center whitespace-normal text-muted-foreground">
                <div className="text-center"><Upload className="mx-auto h-10 w-10" /><div className="mt-2">কম্পিউটার বা ফোন থেকে ছবি নির্বাচন করুন</div></div>
              </Button>
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
              {([{ key: 'smooth', label: 'ত্বক মসৃণ', min: 0 }, { key: 'soft', label: 'সফট', min: 0 }, { key: 'warmth', label: 'রঙের উষ্ণতা', min: -50 }, { key: 'face', label: 'মুখের আলো', min: -50 }, { key: 'hair', label: 'চুলের গাঢ়ত্ব', min: -50 }] as const).map(control => <Ctl key={control.key} l={`${control.label} ${retouch[control.key]}`}><Slider aria-label={control.label} min={control.min} max={control.min === 0 ? 100 : 50} value={[retouch[control.key]]} onValueChange={v => setRetouch(current => ({ ...current, [control.key]: v[0] }))} /></Ctl>)}
              <Button variant="outline" onClick={() => setRetouch(neutralRetouch)}><Undo2 /> সমন্বয় রিসেট</Button>
              <Ctl l="ফাঁকা অংশের রঙ"><div className="flex gap-2">{["#ffffff", "#dbe9f7", "#2563eb", "#e5e7eb"].map((c) => <button key={c} aria-label={c} onClick={() => setBg(c)} className={`h-8 w-8 rounded border-2 ${bg === c ? "border-teal" : "border-border"}`} style={{ background: c }} />)}<input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-8 w-10" /></div></Ctl>
            </div>
          )}
          {src && <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            {single && <img src={single} alt="সম্পাদিত ছবি" className="h-24 w-20 object-contain" />}
            <Button variant="outline" disabled={!single || !!busy} onClick={() => single && dl(single, `photo-${w}x${h}mm.jpg`)}><Download /> একক ছবি</Button>
            <Button variant="outline" disabled={!!busy} onClick={() => setCropOpen(true)}><Crop /> নিজের মতো ক্রপ</Button>
            <Button variant="outline" disabled={!single || !!busy} onClick={() => { if (commitPhoto()) toast.success("ছবি ট্রেতে রাখা হয়েছে"); }}><ImagePlus /> {editingId ? "ট্রের ছবি আপডেট" : "ট্রেতে যোগ করুন"}</Button>
            <Button disabled={!single || !!busy} onClick={() => { if (commitPhoto()) setStep(2); }}>প্রিন্ট শিট তৈরি <ArrowRight /></Button>
          </div>}
        </div>

        <aside className="space-y-4 rounded-xl border bg-card p-4 shadow-card lg:sticky lg:top-6 lg:self-start">
          <section className="space-y-2 border-b pb-4"><h2 className="font-semibold">ছবির ট্রে <span className="text-sm text-muted-foreground">({photos.length})</span></h2><div className="flex flex-wrap gap-2">
            <Button size="icon" variant="outline" disabled={!!busy || importing} aria-label="আরও ছবি আপলোড" onClick={() => fileRef.current?.click()} className="h-20 w-14"><Upload /></Button>
            {photos.map((photo, index) => <Button key={photo.id} variant={editingId === photo.id ? "secondary" : "ghost"} className="relative h-20 w-14 p-1" disabled={!!busy || importing} aria-label={`ট্রের ছবি ${index + 1} সম্পাদনা`} onClick={() => { if (single) commitPhoto(); selectPhoto(photo); }}><img src={photo.image} alt={`ট্রের ছবি ${index + 1}`} className="h-full w-full object-contain" />{editingId === photo.id && <Check className="absolute bottom-0 right-0 rounded bg-teal text-teal-foreground" />}</Button>)}
          </div></section>
          <div className="space-y-3 border-b pb-4">
            <h2 className="font-semibold">AI ছবি সম্পাদনা</h2>
            <Button className="w-full" disabled={!src || !!busy || removed} onClick={() => editPhoto("remove")}>
              {busy === "remove" ? <LoaderCircle className="animate-spin" /> : <Eraser />}
              {removed ? "ব্যাকগ্রাউন্ড রিমুভ হয়েছে" : "ব্যাকগ্রাউন্ড রিমুভ"}
            </Button>
            <div className="flex gap-2">
              <select aria-label="আপস্কেল পদ্ধতি" className="min-w-0 rounded-md border bg-card px-1" value={upscaleMode} onChange={e => setUpscaleMode(e.target.value as 'fast' | 'ai')} disabled={!!busy}><option value="fast">দ্রুত রিসাইজ</option><option value="ai">AI বিস্তারিত</option></select>
              <select aria-label="আপস্কেল মাত্রা" className="h-9 rounded-md border bg-card px-2" value={scale} disabled={!!busy} onChange={(e) => setScale(Number(e.target.value) as 2 | 4)}>
                <option value={2}>২×</option><option value={4}>৪×</option>
              </select>
              <Button variant="outline" className="flex-1" disabled={!src || !!busy} onClick={() => editPhoto("upscale")}>
                {busy === "upscale" ? <LoaderCircle className="animate-spin" /> : <Scan />} আপস্কেল
              </Button>
            </div>
            {busy && <div role="status" className="space-y-1 text-sm text-muted-foreground">
              <div>{progress < 90 && busy === "remove" ? "AI মডেল লোড হচ্ছে" : "ছবি সম্পাদনা হচ্ছে"} · {progress}%</div>
              <progress aria-label="ছবি সম্পাদনার অগ্রগতি" max={100} value={progress} className="h-2 w-full accent-teal" />
            </div>}
            {error && <p role="alert" className="break-words text-xs text-destructive">{error}</p>}
            {src && <>
              <p className="text-xs text-muted-foreground" data-testid="photo-dimensions">{dimensions.w} × {dimensions.h} px{removed ? " · স্বচ্ছ ব্যাকগ্রাউন্ড" : ""}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => dl(src, "edited-photo.png")}><Download /> সম্পূর্ণ ছবি PNG</Button>
                <Button size="icon" title="মূল ছবি ফিরিয়ে আনুন" aria-label="মূল ছবি ফিরিয়ে আনুন" variant="ghost" disabled={!!busy || src === original} onClick={() => { if (original) { replaceSource(original); setRemoved(false); setError(null); } }}><Undo2 /></Button>
              </div>
            </>}
          </div>
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
          <div className="rounded-lg bg-accent p-3 text-xs text-accent-foreground">
            AI আপনার ডিভাইসেই চলে; ছবি বাইরে পাঠানো হয় না। প্রথমবার মডেল ডাউনলোডে সময় লাগতে পারে। পাসপোর্টে ব্যবহারের আগে মুখ ও চুলের কিনারা যাচাই করুন।
          </div>
        </aside>
      </div>}
      {src && <PhotoCropDialog src={src} open={cropOpen} onClose={() => setCropOpen(false)} onApply={replaceSource} />}
    </div>
  );
}

function Ctl({ l, children }: { l: string; children: React.ReactNode }) {
  return <div><div className="mb-2 text-sm text-muted-foreground">{l}</div>{children}</div>;
}
