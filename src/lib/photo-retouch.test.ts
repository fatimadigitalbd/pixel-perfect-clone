import { describe, expect, it } from 'vitest';
import { correctPixel, neutralRetouch } from './photo-retouch';
describe('non-generative portrait corrections', () => {
  it('keeps pixels unchanged when adjustments are off', () => expect(correctPixel(140, 100, 80, .5, .4, neutralRetouch)).toEqual([140, 100, 80]));
  it('limits face correction to skin in the face region', () => {
    expect(correctPixel(140, 100, 80, .5, .4, { ...neutralRetouch, face: 20 })).toEqual([149, 109, 89]);
    expect(correctPixel(140, 100, 80, .5, .9, { ...neutralRetouch, face: 20 })).toEqual([140, 100, 80]);
  });
  it('adjusts dark hair without replacing pixels or skin', () => {
    expect(correctPixel(60, 60, 60, .5, .2, { ...neutralRetouch, hair: 30 })).toEqual([48, 48, 48]);
    expect(correctPixel(140, 100, 80, .5, .2, { ...neutralRetouch, hair: 30 })).toEqual([140, 100, 80]);
  });
});