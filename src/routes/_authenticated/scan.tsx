import { createFileRoute } from '@tanstack/react-router';
import { useRef, useState, type PointerEvent } from 'react';
import { Upload, ScanLine, Crop, Download, Printer, LoaderCircle, Undo2, FileText, IdCard } from 'lucide-react';
import { PageHeader } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { downloadBlob } from '@/lib/format';
import { ID_SIZE, printPixels, type ScanCorners } from '@/lib/scan-geometry';

export const Route = createFileRoute('/_authenticated/scan')({
  head: () => ({ meta: [
    { title: 'ডকুমেন্ট ও আইডি স্ক্যান — Fatima Digital' },
    { name: 'description', content: 'ডকুমেন্ট ও আইডির দুই পাশ ক্রপ, সোজা, পরিষ্কার এবং সঠিক মাপে প্রিন্ট।' },
    { property: 'og:title', content: 'ডকুমেন্ট ও আইডি স্ক্যান — Fatima Digital' },
    { property: 'og:description', content: 'ব্যক্তিগত ডিভাইসে ডকুমেন্ট স্ক্যান এবং দুই পাশের আইডি প্রিন্ট প্রস্তুত করুন।' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), component: ScanStudio,
});
const defaultCorners = (): ScanCorners => [{ x: .03, y: .03 }, { x: .97, y: .03 }, { x: .97, y: .97 }, { x: .03, y: .97 }];
type ScanSide = { source: string; result: string | null; corners: ScanCorners };
function loadImage(src: string) { return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('ছবি পড়া যায়নি')); image.src = src; }); }
function ScanStudio() {
  const [mode, setMode] = useState<'doc' | 'id'>('doc');
  const [side, setSide] = useState(0);
  const [docs, setDocs] = useState<(ScanSide | null)[]>([null]);
  const [ids, setIds] = useState<(ScanSide | null)[]>([null, null]);
  const [filter, setFilter] = useState('color');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(110);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [cardWidth, setCardWidth] = useState(ID_SIZE.width);
  const [cardHeight, setCardHeight] = useState(ID_SIZE.height);
  const [sheet, setSheet] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const active = (mode === 'doc' ? docs : ids)[side];
  function update(value: ScanSide) {
    const set = mode === 'doc' ? setDocs : setIds;
    set(current => current.map((item, index) => index === side ? value : item)); setSheet(null);
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 25 * 1024 * 1024) { setError('JPG/PNG/WEBP ছবি দিন, সর্বোচ্চ ২৫MB'); return; }
    setBusy(true); setError(null); setNotice('');
    try {
      const source = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      await loadImage(source); update({ source, result: null, corners: defaultCorners() });
    } catch { setError('ছবি পড়া যায়নি'); } finally { setBusy(false); }
  }
  function drag(event: PointerEvent<SVGCircleElement>, index: number) {
    if (!active || busy || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect(); if (!bounds) return;
    const corners = [...active.corners] as ScanCorners;
    corners[index] = { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) };
    update({ ...active, result: null, corners });
  }
  async function auto() {
    const image = imageRef.current; if (!image || !active) return;
    setBusy(true); setError(null); setNotice('');
    try {
      const { autoCorners } = await import('@/lib/scan-engine'); const corners = await autoCorners(image);
      if (corners) { update({ ...active, result: null, corners }); setNotice('চার কোণা শনাক্ত হয়েছে'); }
      else setNotice('কোণা শনাক্ত হয়নি — হাতে সমন্বয় করুন।');
    } catch { setError('অটো ক্রপ চালু করা যায়নি। হাতে চার কোণা ঠিক করুন।'); } finally { setBusy(false); }
  }
  async function apply() {
    const image = imageRef.current; if (!image || !active) return;
    setBusy(true); setError(null);
    try { const { rectifyScan } = await import('@/lib/scan-engine'); const result = await rectifyScan(image, active.corners, filter, brightness, contrast, mode === 'id'); update({ ...active, result }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'স্ক্যান তৈরি করা যায়নি'); } finally { setBusy(false); }
  }
  async function compose() {
    const selected = mode === 'id' ? ids : docs;
    if (selected.some(item => !item?.result)) { setError(mode === 'id' ? 'সামনে ও পেছনের দুই পাশেই ক্রপ প্রয়োগ করুন।' : 'আগে ক্রপ প্রয়োগ করুন।'); return; }
    setBusy(true); setError(null);
    try {
      const canvas = document.createElement('canvas'); canvas.width = printPixels(210); canvas.height = printPixels(297);
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('প্রিন্ট শিট তৈরি করা যায়নি');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < selected.length; index++) {
        const result = selected[index]?.result; if (!result) continue; const image = await loadImage(result);
        if (mode === 'id') ctx.drawImage(image, printPixels(15), printPixels(15 + index * (cardHeight + 12)), printPixels(cardWidth), printPixels(cardHeight));
        else { const scale = Math.min(printPixels(190) / image.width, printPixels(277) / image.height); ctx.drawImage(image, (canvas.width - image.width * scale) / 2, (canvas.height - image.height * scale) / 2, image.width * scale, image.height * scale); }
      }
      setSheet(canvas.toDataURL('image/jpeg', .98));
    } catch { setError('প্রিন্ট শিট তৈরি করা যায়নি'); } finally { setBusy(false); }
  }
  function print() {
    if (!sheet) return; const win = window.open('', '_blank'); if (!win) { setError('প্রিন্টের জন্য পপ-আপ চালু করুন'); return; }
    win.document.write(`<html><head><title>Fatima Digital — Scan print</title><style>@page{size:A4;margin:0}body{margin:0}img{width:210mm;height:297mm;display:block}</style></head><body><img src="${sheet}" onload="setTimeout(()=>print(),200)"></body></html>`); win.document.close();
  }
  async function download(src: string, name: string) { downloadBlob(await (await fetch(src)).blob(), name); }
  return <div className="mx-auto max-w-6xl"><PageHeader title="ডকুমেন্ট ও আইডি স্ক্যান" sub="ক্রপ · সোজা · পরিষ্কার · প্রিন্ট"><Button disabled={busy} onClick={() => fileRef.current?.click()}><Upload /> {mode === 'id' ? side === 0 ? 'সামনের ছবি আপলোড' : 'পেছনের ছবি আপলোড' : 'ডকুমেন্ট আপলোড'}</Button><input ref={fileRef} type="file" hidden accept="image/*" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} /></PageHeader>
    <div className="mb-5 flex flex-wrap gap-2 border-b pb-4"><Button disabled={busy} variant={mode === 'doc' ? 'default' : 'outline'} onClick={() => { setMode('doc'); setSide(0); setSheet(null); setError(null); }}><FileText /> ডকুমেন্ট</Button><Button disabled={busy} variant={mode === 'id' ? 'default' : 'outline'} onClick={() => { setMode('id'); setSide(0); setSheet(null); setError(null); }}><IdCard /> আইডি কার্ড</Button>{mode === 'id' && [0, 1].map(index => <Button key={index} disabled={busy} variant={side === index ? 'secondary' : 'ghost'} onClick={() => { setSide(index); setError(null); }}>{index === 0 ? 'সামনে' : 'পেছনে'}{ids[index]?.result ? ' ✓' : ''}</Button>)}</div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-4">
        {active ? <div className="bg-muted p-3 text-center"><div className="relative mx-auto inline-block max-w-full align-top"><img ref={imageRef} src={active.source} alt="স্ক্যানের মূল ছবি" className="max-h-[65vh] max-w-full object-contain" /><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full touch-none" aria-label="ক্রপের চার কোণা"><polygon points={active.corners.map(p => `${p.x * 100},${p.y * 100}`).join(' ')} className="fill-teal/10 stroke-teal" strokeWidth=".5" />{active.corners.map((point, index) => <circle key={index} cx={point.x * 100} cy={point.y * 100} r="1.8" tabIndex={0} role="slider" aria-label={`ক্রপ কোণা ${index + 1}`} aria-valuetext={`${Math.round(point.x * 100)}, ${Math.round(point.y * 100)}`} className="cursor-move fill-card stroke-teal outline-none focus:fill-teal" strokeWidth=".6" onPointerDown={e => e.currentTarget.setPointerCapture(e.pointerId)} onPointerMove={e => drag(e, index)} onKeyDown={e => { if (!e.key.startsWith('Arrow') || busy) return; e.preventDefault(); const corners = [...active.corners] as ScanCorners; corners[index] = { x: Math.max(0, Math.min(1, point.x + (e.key === 'ArrowRight' ? .01 : e.key === 'ArrowLeft' ? -.01 : 0))), y: Math.max(0, Math.min(1, point.y + (e.key === 'ArrowDown' ? .01 : e.key === 'ArrowUp' ? -.01 : 0))) }; update({ ...active, result: null, corners }); }} />)}</svg></div></div> : <Button variant="ghost" className="h-72 w-full border border-dashed bg-muted" disabled={busy} onClick={() => fileRef.current?.click()}><Upload /> {mode === 'id' ? side === 0 ? 'আইডির সামনের ছবি' : 'আইডির পেছনের ছবি' : 'ডকুমেন্টের ছবি'}</Button>}
        {active?.result && <section className="space-y-2"><h2 className="font-semibold">স্ক্যান প্রিভিউ</h2><img src={active.result} alt="সোজা করা স্ক্যান" className="mx-auto max-h-[500px] max-w-full shadow-card" /><Button variant="outline" onClick={() => active.result && download(active.result, 'fatima-scan.jpg')}><Download /> স্ক্যান ডাউনলোড</Button></section>}
        {sheet && <section className="space-y-3 border-t pt-4"><h2 className="font-semibold">A4 প্রিন্ট শিট · 300 DPI</h2><div className="flex gap-2"><Button onClick={print}><Printer /> প্রিন্ট</Button><Button variant="outline" onClick={() => download(sheet, 'fatima-scan-A4.jpg')}><Download /> শিট ডাউনলোড</Button></div><img src={sheet} alt="স্ক্যান প্রিন্ট শিট" className="mx-auto w-full max-w-[600px] shadow-card" /></section>}
      </div>
      <aside className="space-y-4">
        <Button className="w-full" variant="outline" disabled={!active || busy} onClick={auto}>{busy ? <LoaderCircle className="animate-spin" /> : <ScanLine />} অটো ক্রপ</Button>
        <Button className="w-full" variant="outline" disabled={!active || busy} onClick={() => { if (active) update({ ...active, result: null, corners: defaultCorners() }); }}><Undo2 /> কোণা রিসেট</Button>
        <label className="block text-sm">স্ক্যান রঙ<select aria-label="স্ক্যান রঙ" value={filter} disabled={busy} onChange={e => { setFilter(e.target.value); setSheet(null); }} className="mt-1 h-9 w-full rounded-md border bg-card px-2"><option value="color">রঙিন</option><option value="gray">গ্রেস্কেল</option><option value="bw">সাদা-কালো</option></select></label>
        <label className="block space-y-2 text-sm"><span>উজ্জ্বলতা {brightness}%</span><Slider aria-label="স্ক্যান উজ্জ্বলতা" disabled={busy} min={70} max={160} value={[brightness]} onValueChange={v => setBrightness(v[0])} /></label>
        <label className="block space-y-2 text-sm"><span>কনট্রাস্ট {contrast}%</span><Slider aria-label="স্ক্যান কনট্রাস্ট" disabled={busy} min={70} max={200} value={[contrast]} onValueChange={v => setContrast(v[0])} /></label>
        <Button className="w-full" disabled={!active || busy} onClick={apply}><Crop /> ক্রপ ও সোজা করুন</Button>
        {mode === 'id' && <section className="space-y-3 border-t pt-4"><h2 className="font-semibold">কার্ডের প্রিন্ট মাপ</h2><p className="text-xs text-muted-foreground">Smart ID (ID-1) 85.6 × 53.98 mm — পুরোনো বা ভিন্ন কার্ডে আসল মাপ মিলিয়ে নিন।</p><label className="flex items-center justify-between gap-2 text-sm">প্রস্থ (mm)<Input aria-label="কার্ড প্রস্থ" type="number" min={40} max={180} value={cardWidth} onChange={e => { setCardWidth(Math.max(40, Math.min(180, Number(e.target.value)))); setSheet(null); }} className="w-24" /></label><label className="flex items-center justify-between gap-2 text-sm">উচ্চতা (mm)<Input aria-label="কার্ড উচ্চতা" type="number" min={25} max={100} value={cardHeight} onChange={e => { setCardHeight(Math.max(25, Math.min(100, Number(e.target.value)))); setSheet(null); }} className="w-24" /></label></section>}
        <Button className="w-full" disabled={busy || (mode === 'id' ? ids.some(item => !item?.result) : !active?.result)} onClick={compose}><Printer /> প্রিন্ট শিট তৈরি</Button>
        {busy && <p role="status" className="text-sm text-muted-foreground">স্ক্যান প্রস্তুত হচ্ছে…</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      </aside>
    </div>
  </div>;
}