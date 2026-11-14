import { describe, expect, it, vi } from 'vitest';
import { backgroundRemovalOptions } from './photo-ai';

describe('background removal runtime', () => {
  it('always selects the CPU WebAssembly backend instead of WebGPU', () => {
    const progress = vi.fn();

    expect(backgroundRemovalOptions(progress)).toEqual({
      dtype: 'fp32',
      device: 'wasm',
      progress_callback: progress,
    });
  });
});