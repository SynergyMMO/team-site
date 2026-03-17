import { GifWriter } from 'omggif';

function packRgb(r, g, b) {
  return (r << 16) | (g << 8) | b;
}

function nextPowerOfTwo(value) {
  let size = 2;

  while (size < value && size < 256) {
    size *= 2;
  }

  return size;
}

function buildIndexedFrame(frame) {
  const hasTransparency = frame.some((_, index) => index % 4 === 3 && frame[index] === 0);
  const maxVisibleColors = hasTransparency ? 255 : 256;
  const colorToIndex = new Map();
  const palette = [];
  const indexedPixels = new Uint8Array(frame.length / 4);

  if (hasTransparency) {
    palette.push(0x000000);
  }

  for (let p = 0, pixelIndex = 0; p < frame.length; p += 4, pixelIndex += 1) {
    if (frame[p + 3] === 0) {
      indexedPixels[pixelIndex] = 0;
      continue;
    }

    const color = packRgb(frame[p], frame[p + 1], frame[p + 2]);
    let paletteIndex = colorToIndex.get(color);

    if (paletteIndex === undefined) {
      if (palette.length >= maxVisibleColors + (hasTransparency ? 1 : 0)) {
        throw new Error(
          'This GIF frame uses more than 256 colors after editing, so it cannot be exported losslessly as a GIF.'
        );
      }

      paletteIndex = palette.length;
      colorToIndex.set(color, paletteIndex);
      palette.push(color);
    }

    indexedPixels[pixelIndex] = paletteIndex;
  }

  const paddedPaletteLength = nextPowerOfTwo(palette.length);
  while (palette.length < paddedPaletteLength) {
    palette.push(0x000000);
  }

  return {
    indexedPixels,
    palette,
    transparentIndex: hasTransparency ? 0 : null,
  };
}

export async function encodeGif(frames, width, height, delays = []) {
  const estimatedSize = Math.max(width * height * Math.max(frames.length, 1) * 5, 1024);
  const output = new Uint8Array(estimatedSize);
  const writer = new GifWriter(output, width, height, { loop: 0 });

  for (let i = 0; i < frames.length; i += 1) {
    const { indexedPixels, palette, transparentIndex } = buildIndexedFrame(frames[i]);

    writer.addFrame(0, 0, width, height, indexedPixels, {
      delay: Math.max(0, Math.round((delays[i] || 100) / 10)),
      disposal: 2,
      palette,
      transparent: transparentIndex,
    });
  }

  const gifLength = writer.end();
  return new Blob([output.slice(0, gifLength)], { type: 'image/gif' });
}
