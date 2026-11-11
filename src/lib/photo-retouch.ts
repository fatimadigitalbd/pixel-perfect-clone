export type RetouchSettings = { smooth: number; soft: number; warmth: number; face: number; hair: number; spots: number; sharpen: number };
export const neutralRetouch: RetouchSettings = { smooth: 0, soft: 0, warmth: 0, face: 0, hair: 0, spots: 0, sharpen: 0 };
export const autoEnhance: RetouchSettings = { smooth: 25, soft: 0, warmth: 5, face: 10, hair: 0, spots: 60, sharpen: 35 };

const lum = (d: Uint8ClampedArray, i: number) => d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11;
function blurredCopy(canvas: HTMLCanvasElement, radius: number) {
  const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
  const x = c.getContext('2d'); if (!x) return null; x.filter = `blur(${radius}px)`; x.drawImage(canvas, 0, 0);
  return x.getImageData(0, 0, c.width, c.height).data;
}

export function correctPixel(r: number, g: number, b: number, x: number, y: number, settings: RetouchSettings) {
  const skin = r > 60 && r > g && g > b && r - b > 15;
  const faceRegion = ((x - .5) / .32) ** 2 + ((y - .42) / .33) ** 2 < 1;
  const hairRegion = y < .42 && x > .15 && x < .85 && Math.max(r, g, b) < 110 && !skin;
  const light = skin && faceRegion ? settings.face * .45 : 0;
  const darken = hairRegion ? 1 - settings.hair / 150 : 1;
  return [r + settings.warmth * .35 + light, g + light, b - settings.warmth * .35 + light].map(value => Math.round(Math.max(0, Math.min(255, value * darken))));
}

export function retouchCanvas(canvas: HTMLCanvasElement, settings: RetouchSettings) {
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const original = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = original.data;
  if (settings.spots) {
    // Dust/spot cleanup: small dark or bright specks that differ from their neighbourhood are replaced.
    const near = blurredCopy(canvas, Math.max(2, canvas.width / 180));
    if (near) {
      const limit = 34 - settings.spots * .2;
      for (let i = 0; i < d.length; i += 4) {
        const diff = Math.abs(lum(d, i) - lum(near, i));
        if (diff > limit) { const t = Math.min(1, (diff - limit) / 20) * settings.spots / 100; for (let c = 0; c < 3; c++) d[i + c] += (near[i + c] - d[i + c]) * t; }
      }
      ctx.putImageData(original, 0, 0);
    }
  }
  if (settings.smooth || settings.soft) {
    const blurred = document.createElement('canvas'); blurred.width = canvas.width; blurred.height = canvas.height;
    const bc = blurred.getContext('2d'); if (!bc) return;
    bc.filter = `blur(${1 + settings.smooth / 35}px)`; bc.drawImage(canvas, 0, 0);
    const pixels = bc.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < original.data.length; i += 4) {
      const r = original.data[i], g = original.data[i + 1], b = original.data[i + 2];
      const skin = r > 60 && r > g && g > b && r - b > 15;
      const blend = Math.min(.7, settings.soft / 250 + (skin ? settings.smooth / 180 : 0));
      for (let c = 0; c < 3; c++) original.data[i + c] += (pixels.data[i + c] - original.data[i + c]) * blend;
    }
  }
  for (let i = 0; i < original.data.length; i += 4) {
    const position = i / 4;
    const corrected = correctPixel(original.data[i], original.data[i + 1], original.data[i + 2], (position % canvas.width) / canvas.width, Math.floor(position / canvas.width) / canvas.height, settings);
    for (let c = 0; c < 3; c++) original.data[i + c] = corrected[c];
  }
  if (settings.sharpen) {
    ctx.putImageData(original, 0, 0);
    const soft = blurredCopy(canvas, 1);
    if (soft) { const k = settings.sharpen / 60; for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = d[i + c] + (d[i + c] - soft[i + c]) * k; }
  }
  ctx.putImageData(original, 0, 0);
}