import { useState, useRef } from 'react';
import ReactCrop, { type PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crop } from 'lucide-react';

export function PhotoCropDialog({ src, open, onClose, onApply }: { src: string; open: boolean; onClose: () => void; onApply: (src: string) => void }) {
  const [crop, setCrop] = useState<PercentCrop>({ unit: '%', x: 5, y: 5, width: 90, height: 90 });
  const [ratio, setRatio] = useState('free');
  const image = useRef<HTMLImageElement>(null);
  function apply() {
    const img = image.current; if (!img || crop.width <= 0 || crop.height <= 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * crop.width / 100)); canvas.height = Math.max(1, Math.round(img.naturalHeight * crop.height / 100));
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.drawImage(img, img.naturalWidth * crop.x / 100, img.naturalHeight * crop.y / 100, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    onApply(canvas.toDataURL('image/png')); onClose();
  }
  return <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>নিজের মতো ক্রপ</DialogTitle></DialogHeader>
    <select aria-label="ক্রপ অনুপাত" className="h-9 rounded-md border bg-card px-2" value={ratio} onChange={e => { setRatio(e.target.value); setCrop({ unit: '%', x: 10, y: 10, width: 60, height: 60 }); }}><option value="free">ইচ্ছেমতো</option><option value="0.8">4:5</option><option value="1">1:1</option><option value="1.5">3:2</option></select>
    <div className="max-h-[65vh] overflow-auto text-center"><ReactCrop crop={crop} onChange={(_, percent) => setCrop(percent)} aspect={ratio === 'free' ? undefined : Number(ratio)}><img ref={image} src={src} alt="ক্রপের ছবি" className="max-h-[60vh] max-w-full object-contain" /></ReactCrop></div>
    <Button onClick={apply}><Crop /> ক্রপ প্রয়োগ</Button>
  </DialogContent></Dialog>;
}