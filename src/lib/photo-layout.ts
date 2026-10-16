export type SheetPhoto = { id: string; image: string; width: number; height: number; passport: number; stamp: number; rotated: boolean };
export type SheetSettings = { width: number; height: number; gap: number; top: number; left: number; perRow: number; center: boolean };
export type Placement = { id: string; x: number; y: number; width: number; height: number; rotated: boolean };

// All geometry is in millimetres. A copy is never placed outside the printable bounds.
export function layoutPhotos(photos: SheetPhoto[], settings: SheetSettings) {
  const placements: Placement[] = [];
  let omitted = 0;
  let y = settings.top;
  let row: Placement[] = [];
  let used = 0;
  let rowHeight = 0;
  const available = Math.max(0, settings.width - settings.left * 2);
  function flush() {
    const offset = settings.left + (settings.center ? (available - used) / 2 : 0);
    for (const item of row) placements.push({ ...item, x: item.x + offset });
    y += rowHeight + settings.gap;
    row = []; used = 0; rowHeight = 0;
  }
  for (const photo of photos) {
    for (const kind of ['passport', 'stamp'] as const) {
      for (let i = 0; i < photo[kind];) {
        const baseW = kind === 'stamp' ? 20 : photo.width;
        const baseH = kind === 'stamp' ? 25 : photo.height;
        const width = photo.rotated ? baseH : baseW;
        const height = photo.rotated ? baseW : baseH;
        // Stamp copies fill each column top-to-bottom before starting the next.
        const copies = kind === 'stamp' && photo[kind] - i >= 2 && height * 2 + settings.gap <= settings.height - settings.top * 2 ? 2 : 1;
        i += copies;
        const columnHeight = height * copies + settings.gap * (copies - 1);
        if (width > available || columnHeight > settings.height - settings.top * 2) { omitted += copies; continue; }
        const extra = row.length ? settings.gap : 0;
        const columns = new Set(row.map(item => item.x)).size;
        if (row.length && (columns >= settings.perRow || used + extra + width > available)) flush();
        if (y + columnHeight > settings.height - settings.top) { omitted += copies; continue; }
        const x = used + (row.length ? settings.gap : 0);
        for (let copy = 0; copy < copies; copy++) {
          row.push({ id: photo.id, x, y: y + copy * (height + settings.gap), width, height, rotated: photo.rotated });
        }
        used = x + width; rowHeight = Math.max(rowHeight, columnHeight);
      }
    }
    // Keep each customer's copies together in their own rows.
    if (row.length) flush();
  }
  return { placements, omitted };
}