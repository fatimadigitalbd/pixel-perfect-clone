export type ScanPoint = { x: number; y: number };
export type ScanCorners = [ScanPoint, ScanPoint, ScanPoint, ScanPoint];
export const ID_SIZE = { width: 85.6, height: 53.98 };
export const printPixels = (mm: number) => Math.round(mm / 25.4 * 300);
export function validCorners(corners: ScanCorners) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = corners[i], b = corners[(i + 1) % 4], c = corners[(i + 2) % 4];
    if (![a.x, a.y].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) return false;
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < .001 || (sign && Math.sign(cross) !== sign)) return false;
    sign = Math.sign(cross);
  }
  return sign > 0;
}
export function scanDimensions(corners: ScanCorners, width: number, height: number) {
  const distance = (a: ScanPoint, b: ScanPoint) => Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
  return { width: Math.max(1, Math.round(Math.max(distance(corners[0], corners[1]), distance(corners[3], corners[2])))), height: Math.max(1, Math.round(Math.max(distance(corners[0], corners[3]), distance(corners[1], corners[2])))) };
}