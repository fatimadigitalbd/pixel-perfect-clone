export type RetouchSettings = { smooth: number; soft: number; warmth: number; face: number; hair: number };
export const neutralRetouch: RetouchSettings = { smooth: 0, soft: 0, warmth: 0, face: 0, hair: 0 };

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
  ctx.putImageData(original, 0, 0);
}