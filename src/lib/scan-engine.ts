import { scanDimensions, validCorners, type ScanCorners } from './scan-geometry';
type CV = typeof import('@techstark/opencv-js');
type Scanner = { findPaperContour: (mat: unknown) => { delete: () => void } | null; getCornerPoints: (contour: unknown) => Record<string, { x: number; y: number }> };
let runtime: Promise<{ cv: CV; scanner: Scanner }> | undefined;
async function loadRuntime() {
  if (!runtime) runtime = (async () => {
    const imported = await import('@techstark/opencv-js');
    const module = imported.default;
    const cv = await new Promise<CV>(resolve => {
      if (module instanceof Promise) module.then(resolve);
      else if (module.Mat) resolve(module);
      else module.onRuntimeInitialized = () => resolve(module);
    });
    Object.assign(globalThis, { cv });
    const { default: ScannerClass } = await import('jscanify/client');
    return { cv, scanner: new ScannerClass() as Scanner };
  })().catch(error => { runtime = undefined; throw error; });
  return runtime;
}
export async function autoCorners(image: HTMLImageElement): Promise<ScanCorners | null> {
  const { cv, scanner } = await loadRuntime();
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
  const mat = cv.imread(canvas); let contour: ReturnType<Scanner['findPaperContour']> = null;
  try {
    contour = scanner.findPaperContour(mat); if (!contour) return null;
    const points = scanner.getCornerPoints(contour);
    const corners = ['topLeftCorner', 'topRightCorner', 'bottomRightCorner', 'bottomLeftCorner'].map(key => ({ x: points[key].x / canvas.width, y: points[key].y / canvas.height })) as ScanCorners;
    return validCorners(corners) ? corners : null;
  } finally { contour?.delete(); mat.delete(); }
}
export async function rectifyScan(image: HTMLImageElement, corners: ScanCorners, filter: string, brightness: number, contrast: number, card: boolean) {
  if (!validCorners(corners)) throw new Error('চার কোণা ঠিকভাবে সাজান।');
  const { cv } = await loadRuntime();
  const natural = scanDimensions(corners, image.naturalWidth, image.naturalHeight);
  const scale = Math.min(1, 2500 / Math.max(natural.width, natural.height));
  const width = Math.round(natural.width * scale), height = card ? Math.round(width * 53.98 / 85.6) : Math.round(natural.height * scale);
  const src = cv.imread(image), dst = new cv.Mat();
  const from = cv.matFromArray(4, 1, cv.CV_32FC2, corners.flatMap(p => [p.x * image.naturalWidth, p.y * image.naturalHeight]));
  const to = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, width, 0, width, height, 0, height]);
  const transform = cv.getPerspectiveTransform(from, to);
  try {
    cv.warpPerspective(src, dst, transform, new cv.Size(width, height), cv.INTER_LINEAR, cv.BORDER_REPLICATE);
    const canvas = document.createElement('canvas'); cv.imshow(canvas, dst);
    const filtered = document.createElement('canvas'); filtered.width = width; filtered.height = height;
    const ctx = filtered.getContext('2d'); if (!ctx) throw new Error('স্ক্যান তৈরি করা যায়নি');
    ctx.filter = `${filter !== 'color' ? 'grayscale(1)' : ''} brightness(${brightness}%) contrast(${contrast}%)`; ctx.drawImage(canvas, 0, 0);
    if (filter === 'bw') {
      const pixels = ctx.getImageData(0, 0, width, height);
      for (let i = 0; i < pixels.data.length; i += 4) { const value = pixels.data[i] > 155 ? 255 : 0; pixels.data[i] = value; pixels.data[i + 1] = value; pixels.data[i + 2] = value; }
      ctx.putImageData(pixels, 0, 0);
    }
    return filtered.toDataURL('image/jpeg', .98);
  } finally { src.delete(); dst.delete(); from.delete(); to.delete(); transform.delete(); }
}