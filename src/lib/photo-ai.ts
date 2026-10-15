// Loaded only from photo-tool event handlers; never import AI runtimes during SSR.
export async function removePhotoBackground(src: string, progress: (value: number) => void) {
  const { pipeline, env } = await import('@huggingface/transformers');
  env.allowLocalModels = false;
  const segmenter = await pipeline('background-removal', 'Xenova/modnet', {
    dtype: 'fp32',
    device: 'wasm',
    progress_callback: (event) => {
      if (event.status === 'progress') progress(Math.min(85, Math.round(event.progress * 0.85)));
    },
  });
  try {
    progress(90);
    const output = await segmenter(src);
    const blob: Blob = await output.toBlob('image/png');
    progress(100);
    return blob;
  } finally {
    await segmenter.dispose();
  }
}

function imageFrom(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('ছবি পড়া যায়নি'));
    image.src = src;
  });
}

export async function upscalePhoto(src: string, scale: 2 | 4, progress: (value: number) => void) {
  const image = await imageFrom(src);
  if (image.width * image.height * scale * scale > 16_000_000 || Math.max(image.width, image.height) * scale > 8192) {
    throw new Error('এই ছবি অনেক বড়। ছোট ছবি অথবা ২× নির্বাচন করুন (সর্বোচ্চ ১৬ মেগাপিক্সেল)।');
  }
  const [{ default: Upscaler }, model] = await Promise.all([
    import('upscaler'),
    scale === 2 ? import('@upscalerjs/esrgan-slim/2x') : import('@upscalerjs/esrgan-slim/4x'),
  ]);
  const upscaler = new Upscaler({ model: model.default });
  try {
    const result = await upscaler.upscale(image, {
      patchSize: 64,
      padding: 4,
      output: 'base64',
      progress: (amount: number) => progress(Math.round(amount * 100)),
      awaitNextFrame: true,
    });
    // ESRGAN predicts RGB only: preserve and resize the source alpha separately.
    const enlarged = await imageFrom(result);
    const canvas = document.createElement('canvas');
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('ছবি তৈরি করা যায়নি');
    ctx.drawImage(enlarged, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('ছবি তৈরি করা যায়নি')), 'image/png',
    ));
  } finally {
    await upscaler.dispose();
  }
}