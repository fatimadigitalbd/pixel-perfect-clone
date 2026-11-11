// Pure-browser fallbacks used when OpenCV cannot load (slow network, old device).
import type { ScanCorners } from './scan-geometry';

/** Finds the document by comparing pixels with the border background colour. */
export function fallbackCorners(image: HTMLImageElement): ScanCorners | null {
  const c = document.createElement('canvas'); const s = Math.min(1, 400 / Math.max(image.naturalWidth, image.naturalHeight));
  c.width = Math.max(1, Math.round(image.naturalWidth * s)); c.height = Math.max(1, Math.round(image.naturalHeight * s));
  const ctx = c.getContext('2d', { willReadFrequently: true }); if (!ctx) return null;
  ctx.drawImage(image, 0, 0, c.width, c.height);
  const { data, width: w, height: h } = ctx.getImageData(0, 0, c.width, c.height);
  let br = 0, bg = 0, bb = 0, n = 0;
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) { const i = (y * w + x) * 4; br += data[i]; bg += data[i + 1]; bb += data[i + 2]; n++; }
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) { const i = (y * w + x) * 4; br += data[i]; bg += data[i + 1]; bb += data[i + 2]; n++; }
  br /= n; bg /= n; bb /= n;
  const fg = (x: number, y: number) => { const i = (y * w + x) * 4; return Math.abs(data[i] - br) + Math.abs(data[i + 1] - bg) + Math.abs(data[i + 2] - bb) > 70; };
  // Extreme points of the foreground along both diagonals give the four corners.
  let tl = { v: Infinity, x: 0, y: 0 }, tr = { v: -Infinity, x: 0, y: 0 }, brc = { v: -Infinity, x: 0, y: 0 }, bl = { v: Infinity, x: 0, y: 0 }, count = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!fg(x, y)) continue; count++;
    if (x + y < tl.v) tl = { v: x + y, x, y }; if (x + y > brc.v) brc = { v: x + y, x, y };
    if (x - y > tr.v) tr = { v: x - y, x, y }; if (x - y < bl.v) bl = { v: x - y, x, y };
  }
  if (count < w * h * .1) return null;
  return [tl, tr, brc, bl].map(p => ({ x: p.x / w, y: p.y / h })) as ScanCorners;
}

function solve(A: number[][], b: number[]) {
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
    [M[i], M[p]] = [M[p], M[i]];
    for (let r = 0; r < n; r++) if (r !== i) { const f = M[r][i] / M[i][i]; for (let k = i; k <= n; k++) M[r][k] -= f * M[i][k]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
/** Homography mapping output rectangle pixels back to source pixels. */
export function homography(dst: [number, number][], src: [number, number][]) {
  const A: number[][] = [], b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = dst[i], [u, v] = src[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  return [...solve(A, b), 1];
}

export function warpCanvas(image: HTMLImageElement, corners: ScanCorners, width: number, height: number) {
  const sc = document.createElement('canvas'); sc.width = image.naturalWidth; sc.height = image.naturalHeight;
  const sctx = sc.getContext('2d'); if (!sctx) throw new Error('স্ক্যান তৈরি করা যায়নি'); sctx.drawImage(image, 0, 0);
  const src = sctx.getImageData(0, 0, sc.width, sc.height).data;
  const H = homography([[0, 0], [width, 0], [width, height], [0, height]], corners.map(p => [p.x * sc.width, p.y * sc.height]) as [number, number][]);
  const out = document.createElement('canvas'); out.width = width; out.height = height;
  const octx = out.getContext('2d')!; const img = octx.createImageData(width, height); const d = img.data;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const z = H[6] * x + H[7] * y + H[8];
    const u = Math.min(sc.width - 1, Math.max(0, Math.round((H[0] * x + H[1] * y + H[2]) / z)));
    const v = Math.min(sc.height - 1, Math.max(0, Math.round((H[3] * x + H[4] * y + H[5]) / z)));
    const si = (v * sc.width + u) * 4, oi = (y * width + x) * 4;
    d[oi] = src[si]; d[oi + 1] = src[si + 1]; d[oi + 2] = src[si + 2]; d[oi + 3] = 255;
  }
  octx.putImageData(img, 0, 0); return out;
}
