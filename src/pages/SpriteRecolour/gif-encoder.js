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

function collectGlobalPalette(frames) {
  let hasTransparency = false;
  const visibleColors = new Map();

  for (const frame of frames) {
    for (let p = 0; p < frame.length; p += 4) {
      if (frame[p + 3] === 0) {
        hasTransparency = true;
        continue;
      }

      const color = packRgb(frame[p], frame[p + 1], frame[p + 2]);
      if (!visibleColors.has(color)) {
        visibleColors.set(color, visibleColors.size + (hasTransparency ? 1 : 0));
      }
    }
  }

  const maxVisibleColors = hasTransparency ? 255 : 256;
  if (visibleColors.size > maxVisibleColors) {
    return null;
  }

  const palette = hasTransparency ? [0x000000] : [];
  const colorToIndex = new Map();

  for (const color of visibleColors.keys()) {
    colorToIndex.set(color, palette.length);
    palette.push(color);
  }

  const paddedPaletteLength = nextPowerOfTwo(palette.length);
  while (palette.length < paddedPaletteLength) {
    palette.push(0x000000);
  }

  return {
    palette,
    colorToIndex,
    transparentIndex: hasTransparency ? 0 : null,
  };
}

function buildIndexedFrameWithPalette(frame, globalPalette) {
  const indexedPixels = new Uint8Array(frame.length / 4);

  for (let p = 0, pixelIndex = 0; p < frame.length; p += 4, pixelIndex += 1) {
    if (frame[p + 3] === 0) {
      indexedPixels[pixelIndex] = globalPalette.transparentIndex ?? 0;
      continue;
    }

    const color = packRgb(frame[p], frame[p + 1], frame[p + 2]);
    const paletteIndex = globalPalette.colorToIndex.get(color);

    if (paletteIndex === undefined) {
      throw new Error('A frame used a color that was missing from the GIF palette.');
    }

    indexedPixels[pixelIndex] = paletteIndex;
  }

  return indexedPixels;
}

export async function encodeGif(frames, width, height, delays = []) {
  const estimatedSize = Math.max(width * height * Math.max(frames.length, 1) * 5, 1024);
  const output = new Uint8Array(estimatedSize);
  const globalPalette = collectGlobalPalette(frames);
  const writer = new GifWriter(output, width, height, globalPalette
    ? { loop: 0, palette: globalPalette.palette }
    : { loop: 0 });

  for (let i = 0; i < frames.length; i += 1) {
    const frameOptions = {
      delay: Math.max(0, Math.round((delays[i] || 100) / 10)),
      disposal: 2,
    };

    if (globalPalette) {
      const indexedPixels = buildIndexedFrameWithPalette(frames[i], globalPalette);

      writer.addFrame(0, 0, width, height, indexedPixels, {
        ...frameOptions,
        transparent: globalPalette.transparentIndex,
      });
      continue;
    }

    const { indexedPixels, palette, transparentIndex } = buildIndexedFrame(frames[i]);

    writer.addFrame(0, 0, width, height, indexedPixels, {
      ...frameOptions,
      palette,
      transparent: transparentIndex,
    });
  }

  const gifLength = writer.end();
  return new Blob([output.slice(0, gifLength)], { type: 'image/gif' });
}
