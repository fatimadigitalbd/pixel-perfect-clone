import { useEffect, useState } from 'react';
import { ArrowLeft, Download, Printer, RotateCw, Trash2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { downloadBlob } from '@/lib/format';
import { layoutPhotos, type SheetPhoto } from '@/lib/photo-layout';

const PAPERS = [{ name: 'A4', w: 210, h: 297 }, { name: '4×6 inch', w: 101.6, h: 152.4 }, { name: '5×7 inch', w: 127, h: 177.8 }];
const px = (mm: number) => Math.round(mm / 25.4 * 300);
function imageFrom(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('ছবি পড়া যায়নি')); image.src = src; });
}

export function PhotoSheetComposer({ photos, onChange, onBack, onEdit }: { photos: SheetPhoto[]; onChange: (photos: SheetPhoto[]) => void; onBack: () => void; onEdit: (photo: SheetPhoto) => void }) {
  const [paper, setPaper] = useState(0);
  const [gap, setGap] = useState(2);
  const [top, setTop] = useState(4);
  const [left, setLeft] = useState(4);
  const [perRow, setPerRow] = useState(5);
  const [center, setCenter] = useState(false);
  const [cut, setCut] = useState(true);
  const [sheet, setSheet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const P = PAPERS[paper];
  const { placements, omitted } = layoutPhotos(photos, { width: P.w, height: P.h, gap, top, left, perRow, center });
  const signature = JSON.stringify({ photos, paper, gap, top, left, perRow, center, cut });
  useEffect(() => {
    let cancelled = false;
    setSheet(null); setError(null);
    async function render() {
      const canvas = document.createElement('canvas'); canvas.width = px(P.w); canvas.height = px(P.h);
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('শিট তৈরি করা যায়নি');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const images = await Promise.all(photos.map(async photo => ({ id: photo.id, image: await imageFrom(photo.image) })));
      for (const item of placements) {
        const image = images.find(image => image.id === item.id)?.image; if (!image) continue;
        const x = px(item.x), y = px(item.y), w = px(item.width), h = px(item.height);
        ctx.save();
        if (item.rotated) { ctx.translate(x + w, y); ctx.rotate(Math.PI / 2); ctx.drawImage(image, 0, 0, h, w); }
        else ctx.drawImage(image, x, y, w, h);
        ctx.restore();
        if (cut) { ctx.strokeStyle = '#b0b0b0'; ctx.lineWidth = 1; ctx.setLineDash([8, 6]); ctx.strokeRect(x, y, w, h); }
      }
      if (!cancelled) setSheet(canvas.toDataURL('image/jpeg', .98));
    }
    render().catch(() => { if (!cancelled) setError('শিট তৈরি করা যায়নি। আবার চেষ্টা করুন।'); });
    return () => { cancelled = true; };
  }, [signature]);
  function update(id: string, patch: Partial<SheetPhoto>) { onChange(photos.map(photo => photo.id === id ? { ...photo, ...patch } : photo)); }
  function print() {
    if (!sheet) return;
    const win = window.open('', '_blank'); if (!win) { setError('প্রিন্টের জন্য পপ-আপ চালু করুন'); return; }
    win.document.write(`<html><head><title>Fatima Digital — Print sheet</title><style>@page{size:${P.w}mm ${P.h}mm;margin:0}body{margin:0}img{width:${P.w}mm;height:${P.h}mm;display:block}</style></head><body><img src="${sheet}" onload="setTimeout(()=>print(),200)"></body></html>`); win.document.close();
  }
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="outline" onClick={onBack}><ArrowLeft /> ছবি সম্পাদনা</Button>
      <div className="flex gap-2"><Button variant="outline" disabled={!sheet || !placements.length} onClick={async () => { if (sheet) downloadBlob(await (await fetch(sheet)).blob(), 'fatima-print-sheet-300dpi.jpg'); }}><Download /> শিট ডাউনলোড</Button><Button disabled={!sheet || !placements.length} onClick={print}><Printer /> প্রিন্ট</Button></div>
    </div>
    <div className="grid gap-5 lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="space-y-5">
        <section className="space-y-3"><h2 className="font-semibold">ছবি ও কপি</h2>
          {photos.map((photo, index) => <div key={photo.id} className="rounded-lg border bg-card p-3">
            <div className="flex items-start gap-3"><Button variant="ghost" className="h-auto shrink-0 p-0" title="ছবি সম্পাদনা" onClick={() => onEdit(photo)}><img src={photo.image} alt={`ছবি ${index + 1}`} className="h-20 w-16 object-contain" /></Button>
              <div className="min-w-0 flex-1 space-y-2"><p className="text-xs text-muted-foreground">{photo.width}×{photo.height} mm</p>
                {(['passport', 'stamp'] as const).map(kind => <div key={kind} className="flex items-center justify-between gap-1"><span className="text-xs">{kind === 'passport' ? 'পাসপোর্ট' : 'স্ট্যাম্প'}</span><div className="flex items-center gap-1"><Button size="icon" className="h-6 w-6" variant="outline" aria-label={`${kind} কমান ${index + 1}`} disabled={photo[kind] === 0} onClick={() => update(photo.id, { [kind]: photo[kind] - 1 })}><Minus /></Button><Input aria-label={`${kind} কপি ${index + 1}`} type="number" min={0} max={60} className="h-7 w-12 px-1 text-center" value={photo[kind]} onChange={e => update(photo.id, { [kind]: Math.min(60, Math.max(0, Math.floor(Number(e.target.value)))) })} /><Button size="icon" className="h-6 w-6" variant="outline" aria-label={`${kind} বাড়ান ${index + 1}`} disabled={photo[kind] >= 60} onClick={() => update(photo.id, { [kind]: photo[kind] + 1 })}><Plus /></Button></div></div>)}
              </div>
            </div><div className="mt-2 flex justify-between"><Button size="icon" variant={photo.rotated ? 'secondary' : 'ghost'} title="শিটে ৯০° ঘোরান" aria-label={`শিটে ঘোরান ${index + 1}`} onClick={() => update(photo.id, { rotated: !photo.rotated })}><RotateCw /></Button><Button size="icon" variant="ghost" title="ছবি সরান" aria-label={`ছবি সরান ${index + 1}`} onClick={() => onChange(photos.filter(p => p.id !== photo.id))}><Trash2 /></Button></div>
          </div>)}
          {!photos.length && <p className="text-sm text-muted-foreground">কোনো ছবি নেই</p>}
        </section>
        <section className="space-y-3 border-t pt-4"><h2 className="font-semibold">কাগজ ও সাজানো</h2>
          <label className="block text-sm">কাগজ<select aria-label="কাগজ" value={paper} onChange={e => setPaper(Number(e.target.value))} className="mt-1 h-9 w-full rounded-md border bg-card px-2">{PAPERS.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}</select></label>
          {[{ label: 'প্রতি সারিতে সর্বোচ্চ', value: perRow, set: setPerRow, min: 1, max: 15 }, { label: 'ফাঁক (mm)', value: gap, set: setGap, min: 0, max: 20 }, { label: 'উপরের মার্জিন (mm)', value: top, set: setTop, min: 0, max: 40 }, { label: 'পাশের মার্জিন (mm)', value: left, set: setLeft, min: 0, max: 40 }].map(control => <label key={control.label} className="flex items-center justify-between gap-2 text-sm">{control.label}<Input aria-label={control.label} type="number" className="h-8 w-20" min={control.min} max={control.max} value={control.value} onChange={e => control.set(Math.max(control.min, Math.min(control.max, Number(e.target.value))))} /></label>)}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={center} onChange={e => setCenter(e.target.checked)} /> মাঝখানে সাজান</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cut} onChange={e => setCut(e.target.checked)} /> কাটার দাগ</label>
          <Button variant="outline" className="w-full" onClick={() => { setGap(2); setTop(4); setLeft(4); setPerRow(5); setCenter(false); setCut(true); }}>সেটিংস রিসেট</Button>
        </section>
      </aside>
      <section className="min-w-0 bg-muted p-3 sm:p-6">
        <div className="mb-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{P.name} · {P.w}×{P.h} mm · 300 DPI</span><span data-testid="sheet-count">{placements.length} কপি</span></div>
        {omitted > 0 && <p role="alert" className="mb-3 text-sm text-destructive">{omitted} কপি কাগজে ধরেনি। কপি কমান বা বড় কাগজ নিন।</p>}
        {error && <p role="alert" className="text-destructive">{error}</p>}
        {sheet ? <img src={sheet} alt="প্রিন্ট শিট" className="mx-auto h-auto w-full max-w-[640px] shadow-card" /> : !error && <p role="status">শিট তৈরি হচ্ছে…</p>}
      </section>
    </div>
  </div>;
}