import { describe, expect, it } from 'vitest';
import { validCorners, scanDimensions, ID_SIZE, printPixels } from './scan-geometry';
describe('scan print geometry', () => {
  it('rejects crossed or collapsed crop corners', () => {
    expect(validCorners([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 0, y: 1 }])).toBe(false);
    expect(validCorners([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }])).toBe(false);
  });
  it('preserves manual crop size without stretching the document', () => {
    const corners = [{ x: .1, y: .1 }, { x: .9, y: .1 }, { x: .9, y: .9 }, { x: .1, y: .9 }] as const;
    expect(scanDimensions([...corners], 1000, 500)).toEqual({ width: 800, height: 400 });
    expect(validCorners([...corners])).toBe(true);
  });
  it('renders both ID sides using the same physical card preset', () => {
    expect(printPixels(ID_SIZE.width)).toBe(1011);
    expect(printPixels(ID_SIZE.height)).toBe(638);
    expect(printPixels(210)).toBe(2480);
  });
});