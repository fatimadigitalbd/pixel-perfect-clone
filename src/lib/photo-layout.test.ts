import { describe, expect, it } from 'vitest';
import { layoutPhotos, type SheetPhoto } from './photo-layout';
const photo: SheetPhoto = { id: 'a', image: '', width: 40, height: 50, passport: 5, stamp: 4, rotated: false };
const settings = { width: 210, height: 297, gap: 2, top: 4, left: 4, perRow: 5, center: false };
describe('photo sheet layout', () => {
  it('places mixed copies and rotated customer photos inside paper', () => {
    const result = layoutPhotos([photo, { ...photo, id: 'b', rotated: true }], settings);
    expect(result.placements).toHaveLength(18); expect(result.omitted).toBe(0);
    for (const p of result.placements) { expect(p.x).toBeGreaterThanOrEqual(4); expect(p.x + p.width).toBeLessThanOrEqual(206); expect(p.y + p.height).toBeLessThanOrEqual(293); }
  });
  it('reports overflow rather than clipping', () => {
    const result = layoutPhotos([{ ...photo, passport: 60 }], { ...settings, width: 101.6, height: 152.4 });
    expect(result.omitted).toBeGreaterThan(0); expect(result.placements.length + result.omitted).toBe(64);
  });
  it('handles empty quantities and oversized photos', () => {
    expect(layoutPhotos([{ ...photo, passport: 0, stamp: 0 }], settings).placements).toHaveLength(0);
    expect(layoutPhotos([{ ...photo, width: 300, passport: 1, stamp: 0 }], settings).omitted).toBe(1);
  });
  it('centers and obeys per-row maximum', () => {
    const result = layoutPhotos([{ ...photo, passport: 2, stamp: 0 }], { ...settings, center: true, perRow: 1 });
    expect(result.placements[0].x).toBe(85); expect(result.placements[1].y).toBe(56);
  });
  it('stacks stamp copies top-to-bottom alongside passport photos', () => {
    const result = layoutPhotos([{ ...photo, passport: 4, stamp: 4 }], settings);
    expect(result.omitted).toBe(0);
    const stamps = result.placements.slice(4);
    expect(stamps.map(p => [p.x, p.y])).toEqual([[172, 4], [172, 31], [4, 58], [4, 85]]);
  });
  it('counts a stamp pair as one column and leaves an odd copy on top', () => {
    const result = layoutPhotos([{ ...photo, passport: 0, stamp: 5 }], { ...settings, perRow: 2 });
    expect(result.placements.map(p => [p.x, p.y])).toEqual([[4, 4], [4, 31], [26, 4], [26, 31], [4, 58]]);
    expect(result.omitted).toBe(0);
  });
  it('stacks rotated stamp copies without overlapping or leaving the page', () => {
    const result = layoutPhotos([{ ...photo, passport: 0, stamp: 5, rotated: true }], { ...settings, center: true, perRow: 2 });
    expect(result.placements.map(p => [p.x, p.y, p.width, p.height])).toEqual([[79, 4, 25, 20], [79, 26, 25, 20], [106, 4, 25, 20], [106, 26, 25, 20], [92.5, 48, 25, 20]]);
  });
});