import React, { useRef, useEffect, useState } from "react";
import { parseGIF, decompressFrames } from "https://cdn.jsdelivr.net/npm/gifuct-js@2.1.2/+esm";
import SearchBar from "../../components/SearchBar/SearchBar.jsx";
import { useDocumentHead } from "../../hooks/useDocumentHead";
import styles from "./SpriteRecolour.module.css";
import * as fileHandler from "./file-handler.js";
import * as exportMod from "./export.js";
import { state } from "./state.js";
import { elements } from "./dom.js";
import { rgbToHex } from "./utils.js";
import { encodeGif } from "./gif-encoder.js";
import tierPokemon from "../../data/tier_pokemon.json";
import pokemonSprites from "../../data/pokemmo_data/pokemon-sprites.json";
import { getLocalPokemonGif } from "../../utils/pokemon.js";

function parseHexColor(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function buildParsedSprite(name, width, height, originalFrames, frameDelays) {
  const colorSet = new Map();

  for (let frameIndex = 0; frameIndex < originalFrames.length; frameIndex += 1) {
    const frame = originalFrames[frameIndex];
    for (let i = 0; i < frame.length; i += 4) {
      const r = frame[i];
      const g = frame[i + 1];
      const b = frame[i + 2];
      const a = frame[i + 3];

      if (a === 0) continue;

      const hex = rgbToHex(r, g, b);
      if (!colorSet.has(hex)) {
        colorSet.set(hex, { r, g, b, hex });
      }
    }
  }

  const palette = Array.from(colorSet.values());

  return {
    name,
    width,
    height,
    originalFrames,
    currentFrames: originalFrames.map((frame) => new Uint8ClampedArray(frame)),
    frameDelays,
    palette,
    colorPixels: null,
    appliedColorMap: Object.fromEntries(palette.map(({ hex }) => [hex, hex])),
  };
}

function ensureSpriteColorPixels(sprite) {
  if (!sprite || sprite.colorPixels) {
    return sprite;
  }

  const colorPixels = new Map(
    sprite.palette.map(({ hex }) => [
      hex,
      Array.from({ length: sprite.originalFrames.length }, () => []),
    ])
  );

  for (let frameIndex = 0; frameIndex < sprite.originalFrames.length; frameIndex += 1) {
    const frame = sprite.originalFrames[frameIndex];
    for (let i = 0; i < frame.length; i += 4) {
      if (frame[i + 3] === 0) continue;

      const hex = rgbToHex(frame[i], frame[i + 1], frame[i + 2]);
      colorPixels.get(hex)?.[frameIndex].push(i);
    }
  }

  return {
    ...sprite,
    colorPixels: Object.fromEntries(
      sprite.palette.map(({ hex }) => [
        hex,
        colorPixels.get(hex).map((offsets) => Uint32Array.from(offsets)),
      ])
    ),
  };
}

async function parseSpriteFile(file) {
  if (!file) return null;

  if (file.type === "image/gif") {
    const arrayBuffer = await file.arrayBuffer();
    const gif = parseGIF(arrayBuffer);
    const frames = decompressFrames(gif, true);

    if (!frames.length) {
      throw new Error(`Could not parse GIF frames for ${file.name}.`);
    }

    const width = gif.lsd.width;
    const height = gif.lsd.height;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
    const originalFrames = [];
    const frameDelays = [];
    let restoreFrameImageData = null;

    for (let i = 0; i < frames.length; i += 1) {
      const frame = frames[i];

      if (i > 0) {
        const previousFrame = frames[i - 1];
        if (previousFrame.disposalType === 2) {
          tempCtx.clearRect(
            previousFrame.dims.left,
            previousFrame.dims.top,
            previousFrame.dims.width,
            previousFrame.dims.height
          );
        } else if (previousFrame.disposalType === 3) {
          if (restoreFrameImageData) {
            tempCtx.putImageData(restoreFrameImageData, 0, 0);
          } else {
            tempCtx.clearRect(0, 0, width, height);
          }
        }
      }

      restoreFrameImageData = frame.disposalType === 3
        ? tempCtx.getImageData(0, 0, width, height)
        : null;

      tempCtx.putImageData(
        new ImageData(
          new Uint8ClampedArray(frame.patch),
          frame.dims.width,
          frame.dims.height
        ),
        frame.dims.left,
        frame.dims.top
      );

      const fullFrameData = tempCtx.getImageData(0, 0, width, height);
      originalFrames.push(new Uint8ClampedArray(fullFrameData.data));
      frameDelays.push(frame.delay || 100);
    }

    return buildParsedSprite(file.name, width, height, originalFrames, frameDelays);
  }

  if (!file.type.startsWith("image/")) {
    throw new Error(`Unsupported file type for ${file.name}.`);
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not load ${file.name}.`));
      img.src = objectUrl;
    });

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = image.width;
    tempCanvas.height = image.height;
    const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
    tempCtx.drawImage(image, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, image.width, image.height);

    return buildParsedSprite(
      file.name,
      image.width,
      image.height,
      [new Uint8ClampedArray(imageData.data)],
      [100]
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function applyColorMapToSprite(sprite, colorMap) {
  if (!sprite) return null;

  const indexedSprite = ensureSpriteColorPixels(sprite);

  const nextAppliedColorMap = Object.fromEntries(
    indexedSprite.palette.map(({ hex }) => [hex, colorMap[hex] || hex])
  );
  const changedHexes = indexedSprite.palette
    .map(({ hex }) => hex)
    .filter((hex) => (indexedSprite.appliedColorMap?.[hex] || hex) !== nextAppliedColorMap[hex]);

  if (!changedHexes.length) {
    return indexedSprite;
  }

  const currentFrames = indexedSprite.currentFrames.map((frame) => frame);
  const clonedFrameIndexes = new Set();

  for (const hex of changedHexes) {
    const { r, g, b } = parseHexColor(nextAppliedColorMap[hex]);
    const frameOffsetsList = indexedSprite.colorPixels?.[hex] || [];

    for (let frameIndex = 0; frameIndex < frameOffsetsList.length; frameIndex += 1) {
      const offsets = frameOffsetsList[frameIndex];
      if (!offsets?.length) continue;

      if (!clonedFrameIndexes.has(frameIndex)) {
        currentFrames[frameIndex] = new Uint8ClampedArray(currentFrames[frameIndex]);
        clonedFrameIndexes.add(frameIndex);
      }

      const frame = currentFrames[frameIndex];
      for (let offsetIndex = 0; offsetIndex < offsets.length; offsetIndex += 1) {
        const offset = offsets[offsetIndex];
        frame[offset] = r;
        frame[offset + 1] = g;
        frame[offset + 2] = b;
      }
    }
  }

  return {
    ...indexedSprite,
    currentFrames,
    appliedColorMap: nextAppliedColorMap,
  };
}

function SpriteCanvasPreview({ sprite, title, onPickColor }) {
  const canvasRef = useRef(null);
  const timeoutRef = useRef(null);
  const frameRequestRef = useRef(null);
  const frameIndexRef = useRef(0);
  const wasPlayingOnHoverRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sprite?.currentFrames?.length) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let cancelled = false;
    let frameIndex = 0;
    const frameImages = sprite.currentFrames.map(
      (frame) => new ImageData(frame, sprite.width, sprite.height)
    );

    canvas.width = sprite.width;
    canvas.height = sprite.height;
    ctx.imageSmoothingEnabled = false;

    const drawFrame = (index) => {
      const frameImage = frameImages[index];
      if (!frameImage) return;
      frameIndexRef.current = index;
      ctx.putImageData(frameImage, 0, 0);
    };

    const tick = () => {
      if (cancelled) return;

      drawFrame(frameIndex);

      if (sprite.currentFrames.length < 2) return;

      const delay = sprite.frameDelays[frameIndex] || 100;
      timeoutRef.current = window.setTimeout(() => {
        frameRequestRef.current = window.requestAnimationFrame(() => {
          frameIndex = (frameIndex + 1) % sprite.currentFrames.length;
          tick();
        });
      }, delay);
    };

    tick();

    return () => {
      cancelled = true;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      if (frameRequestRef.current) {
        window.cancelAnimationFrame(frameRequestRef.current);
      }
    };
  }, [sprite]);

  const handleClick = React.useCallback((event) => {
    if (!sprite?.originalFrames?.length || !onPickColor || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / sprite.width;
    const scaleY = rect.height / sprite.height;
    const x = Math.floor((event.clientX - rect.left) / scaleX);
    const y = Math.floor((event.clientY - rect.top) / scaleY);

    if (x < 0 || y < 0 || x >= sprite.width || y >= sprite.height) return;

    const frameIndex = Math.min(frameIndexRef.current, sprite.originalFrames.length - 1);
    const originalFrame = sprite.originalFrames[frameIndex];
    if (!originalFrame) return;

    const pixelIndex = (y * sprite.width + x) * 4;
    if (originalFrame[pixelIndex + 3] === 0) return;

    onPickColor(rgbToHex(
      originalFrame[pixelIndex],
      originalFrame[pixelIndex + 1],
      originalFrame[pixelIndex + 2]
    ));
  }, [onPickColor, sprite]);

  const handleMouseEnter = React.useCallback(() => {
    if (!sprite?.currentFrames?.length || sprite.currentFrames.length < 2) return;

    wasPlayingOnHoverRef.current = Boolean(timeoutRef.current || frameRequestRef.current);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (frameRequestRef.current) {
      window.cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }
  }, [sprite]);

  const handleMouseLeave = React.useCallback(() => {
    if (!wasPlayingOnHoverRef.current || !sprite?.currentFrames?.length || sprite.currentFrames.length < 2) {
      return;
    }

    wasPlayingOnHoverRef.current = false;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    let frameIndex = frameIndexRef.current;
    const frameImages = sprite.currentFrames.map(
      (frame) => new ImageData(frame, sprite.width, sprite.height)
    );

    const drawFrame = (index) => {
      const frameImage = frameImages[index];
      if (!frameImage) return;
      frameIndexRef.current = index;
      ctx.putImageData(frameImage, 0, 0);
    };

    const tick = () => {
      if (cancelled) return;

      drawFrame(frameIndex);

      const delay = sprite.frameDelays[frameIndex] || 100;
      timeoutRef.current = window.setTimeout(() => {
        frameRequestRef.current = window.requestAnimationFrame(() => {
          frameIndex = (frameIndex + 1) % sprite.currentFrames.length;
          tick();
        });
      }, delay);
    };

    tick();

    return () => {
      cancelled = true;
    };
  }, [sprite]);

  if (!sprite) {
    return (
      <div className={styles["mod-preview-placeholder"]}>
        <div className={styles["mod-preview-title"]}>{title}</div>
        <div className={styles["helper-text"]}>Upload a sprite to preview it here.</div>
      </div>
    );
  }

  const previewMaxSize = 220;
  const scale = Math.min(
    previewMaxSize / (sprite.width || previewMaxSize),
    previewMaxSize / (sprite.height || previewMaxSize)
  );
  const displayWidth = Math.max(1, Math.round((sprite.width || previewMaxSize) * scale));
  const displayHeight = Math.max(1, Math.round((sprite.height || previewMaxSize) * scale));

  return (
    <div className={styles["mod-preview-card"]}>
      <div className={styles["mod-preview-title"]}>{title}</div>
      <canvas
        ref={canvasRef}
        width={sprite.width}
        height={sprite.height}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={onPickColor ? "Click a colour to open it in the palette editor" : undefined}
        style={{
          width: displayWidth,
          height: displayHeight,
          imageRendering: "pixelated",
          cursor: onPickColor ? "crosshair" : "default",
        }}
      />
      <div className={styles["mod-preview-name"]}>{sprite.name}</div>
    </div>
  );
}

const pokemonOptions = Object.values(tierPokemon)
  .flat()
  .filter((name, index, names) => names.indexOf(name) === index)
  .sort((a, b) => a.localeCompare(b))
  .map((name) => ({
    value: name,
    label: name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
  }));

const pokemonLabelToValue = Object.fromEntries(
  pokemonOptions.map((option) => [option.label, option.value])
);

const formatPokemonLabel = (name) => name
  .split("-")
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

const modCreatorPokemonOptions = Object.values(pokemonSprites)
  .filter((entry) => {
    const animatedSprites = entry?.sprites?.versions?.["generation-v"]?.["black-white"]?.animated;
    return animatedSprites?.front_shiny && animatedSprites?.back_shiny;
  })
  .sort((a, b) => a.id - b.id)
  .map((entry) => ({
    value: entry.name,
    label: formatPokemonLabel(entry.name),
  }));

const modCreatorPokemonLabelToValue = Object.fromEntries(
  modCreatorPokemonOptions.map((option) => [option.label, option.value])
);

function normalizePokemonSearch(value) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, " ");
}

export default function SpriteRecolour() {
  const fileInputRef = useRef();
  const canvasRef = useRef();
  const colorInputRefs = useRef({});
  const modColorInputRefs = useRef({ front: {}, back: {} });
  const resumeAnimationOnLeaveRef = useRef(false);
  const [activeTab, setActiveTab] = useState("sprite-recolourer");
  const [loading, setLoading] = useState(false);
  const [originalPalette, setOriginalPalette] = useState([]);
  const [colorMap, setColorMap] = useState({});
  const [hasGif, setHasGif] = useState(false);
  const [frameInfo, setFrameInfo] = useState("");
  const [selectedPaletteHex, setSelectedPaletteHex] = useState("");
  const [pokemonSearch, setPokemonSearch] = useState("");
  const [selectedSourceLabel, setSelectedSourceLabel] = useState("");
  const [modCreatorSprites, setModCreatorSprites] = useState({ front: null, back: null });
  const [modColorMap, setModColorMap] = useState({});
  const [modLoadingKey, setModLoadingKey] = useState("");
  const [modPokemonSearch, setModPokemonSearch] = useState("");
  const [selectedModPokemonLabel, setSelectedModPokemonLabel] = useState("");
  const [selectedModPokemonId, setSelectedModPokemonId] = useState(null);

  const previewMaxSize = 350;
  const previewScale = Math.min(
    previewMaxSize / (state.gifWidth || 256),
    previewMaxSize / (state.gifHeight || 256)
  );
  const previewDisplayWidth = Math.max(1, Math.round((state.gifWidth || 256) * previewScale));
  const previewDisplayHeight = Math.max(1, Math.round((state.gifHeight || 256) * previewScale));

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Sprite Recolour Tool", url: "/sprite-recolour/" }
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Sprite Recolour Tool",
    "applicationCategory": "DesignApplication",
    "operatingSystem": "Web",
    "url": "https://synergymmo.com/sprite-recolour/",
    "description": "Recolour Pokemon sprite GIFs in your browser with palette editing, click-to-pick colours, local Pokemon GIF search, and custom GIF uploads.",
    "creator": {
      "@type": "Organization",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Search and load Pokemon GIFs from the local library",
      "Upload your own GIFs and images",
      "Click colours directly on the preview to edit them",
      "Export recoloured sprites as PNG or GIF"
    ]
  };

  useDocumentHead({
    title: "Sprite Recolour Tool - Edit Pokemon GIF Palettes",
    description: "Recolour Pokemon sprite GIFs in your browser. Search the local Pokemon GIF library, upload your own GIFs, click colours directly on the preview, and export the result as PNG or GIF.",
    canonicalPath: "/sprite-recolour/",
    ogImage: "https://synergymmo.com/images/pokemon_gifs/tier_0/charizard.gif",
    imageAlt: "Animated Charizard sprite used for the Sprite Recolour Tool",
    breadcrumbs,
    structuredData,
    author: "Team Synergy"
  });

  useEffect(() => {
    if (canvasRef.current) {
      elements.previewCanvas = canvasRef.current;
      elements.ctx = canvasRef.current.getContext("2d");
    }

    elements.loading = { classList: { add: () => {}, remove: () => {} } };
    elements.mainContent = { classList: { add: () => {}, remove: () => {} } };
    elements.paletteGrid = document.createElement("div");
    elements.colorCount = { textContent: "" };
    elements.colorCountLabel = { textContent: "" };
    elements.frameInfo = {
      _text: "",
      get textContent() {
        return this._text;
      },
      set textContent(value) {
        this._text = value;
        setFrameInfo(value);
      }
    };
    elements.projectNameInput = { value: "" };
    elements.exportPngBtn = { disabled: false, textContent: "" };
  }, []);

  async function loadFile(file, sourceLabel = "") {
    if (!file) return;

    setLoading(true);
    await fileHandler.handleFiles([file], () => {});
    setHasGif(true);

    const colorSet = new Map();
    for (const frame of state.originalFrames) {
      for (let i = 0; i < frame.length; i += 4) {
        const r = frame[i];
        const g = frame[i + 1];
        const b = frame[i + 2];
        const a = frame[i + 3];
        if (a > 0) {
          const hex = rgbToHex(r, g, b);
          if (!colorSet.has(hex)) {
            colorSet.set(hex, { r, g, b, hex });
          }
        }
      }
    }

    const palette = Array.from(colorSet.values());
    const nextColorMap = {};
    palette.forEach((color) => {
      nextColorMap[color.hex] = color.hex;
    });

    setOriginalPalette(palette);
    setColorMap(nextColorMap);
    setSelectedPaletteHex("");
    setSelectedSourceLabel(sourceLabel);
    setLoading(false);
  }

  async function handleFileChange(event) {
    const file = event.target.files[0];
    await loadFile(file, file?.name || "");
  }

  async function handlePokemonSelect(selectionLabel) {
    const matchedOption = pokemonOptions.find((option) => (
      normalizePokemonSearch(option.label) === normalizePokemonSearch(selectionLabel)
    ));
    const pokemonName = matchedOption?.value || pokemonLabelToValue[selectionLabel];
    if (!pokemonName) {
      alert("Choose a Pokemon from the autocomplete list, or upload your own GIF.");
      return;
    }

    setPokemonSearch(matchedOption?.label || selectionLabel);

    try {
      setLoading(true);
      const response = await fetch(getLocalPokemonGif(pokemonName));
      if (!response.ok) {
        throw new Error(`Unable to load ${selectionLabel} GIF from the Pokemon library.`);
      }

      const blob = await response.blob();
      const file = new File([blob], `${pokemonName}.gif`, { type: blob.type || "image/gif" });
      await loadFile(file, matchedOption?.label || selectionLabel);
    } catch (error) {
      console.error("Pokemon GIF load failed:", error);
      alert(error.message || "Failed to load Pokemon GIF.");
      setLoading(false);
    }
  }

  const handlePreviewClick = React.useCallback((event) => {
    if (!canvasRef.current || !state.originalFrames.length) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / state.gifWidth;
    const scaleY = rect.height / state.gifHeight;
    const x = Math.floor((event.clientX - rect.left) / scaleX);
    const y = Math.floor((event.clientY - rect.top) / scaleY);

    if (x < 0 || y < 0 || x >= state.gifWidth || y >= state.gifHeight) return;

    const pixelIndex = (y * state.gifWidth + x) * 4;
    const currentFrame = state.currentFrames[state.currentFrameIndex];
    const originalFrame = state.originalFrames[state.currentFrameIndex];

    if (!currentFrame || !originalFrame) return;
    if (currentFrame[pixelIndex + 3] === 0 || originalFrame[pixelIndex + 3] === 0) return;

    const originalHex = rgbToHex(
      originalFrame[pixelIndex],
      originalFrame[pixelIndex + 1],
      originalFrame[pixelIndex + 2]
    );

    setSelectedPaletteHex(originalHex);

    const input = colorInputRefs.current[originalHex];
    if (!input) return;

    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus();

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.click();
  }, []);

  const handlePreviewMouseEnter = React.useCallback(async () => {
    if (!state.currentFrames.length || state.currentFrames.length < 2) return;

    const animation = await import("./animation.js");
    resumeAnimationOnLeaveRef.current = state.isPlaying;

    if (state.isPlaying) {
      animation.stopAnimation();
      animation.showFrame(state.currentFrameIndex);
    }
  }, []);

  const handlePreviewMouseLeave = React.useCallback(async () => {
    if (!resumeAnimationOnLeaveRef.current) return;

    const animation = await import("./animation.js");
    animation.startAnimation();
    resumeAnimationOnLeaveRef.current = false;
  }, []);

  const handleColorChange = React.useCallback((oldHex, newHex) => {
    const entry = originalPalette.find((paletteEntry) => paletteEntry.hex === oldHex);
    if (!entry) return;

    const [r, g, b] = [
      parseInt(newHex.slice(1, 3), 16),
      parseInt(newHex.slice(3, 5), 16),
      parseInt(newHex.slice(5, 7), 16)
    ];

    state.editHistory = state.editHistory.filter(
      (editEntry) => !(
        editEntry.type === "swap" &&
        editEntry.swap.from.r === entry.r &&
        editEntry.swap.from.g === entry.g &&
        editEntry.swap.from.b === entry.b
      )
    );

    state.editHistory.push({
      type: "swap",
      swap: {
        from: { r: entry.r, g: entry.g, b: entry.b },
        to: { r, g, b }
      }
    });

    state.currentFrames = state.originalFrames.map((frame) => new Uint8ClampedArray(frame));
    for (const edit of state.editHistory) {
      exportMod.applyEditEntry(edit);
    }

    import("./animation.js").then((mod) => {
      if (mod.renderCurrentFrame) {
        mod.renderCurrentFrame();
      }
    });

    setColorMap((prev) => ({ ...prev, [oldHex]: newHex }));
  }, [originalPalette]);

// Unified handleModFileChange for Mod Creator
const handleModFileChange = React.useCallback(async (side, fileOrUrl) => {
  if (!fileOrUrl) return;

  setModLoadingKey(side);

  try {
    let file = fileOrUrl;

    // If fileOrUrl is a URL string, fetch it
    if (typeof fileOrUrl === "string") {
      const response = await fetch(fileOrUrl, { mode: "cors" });
      if (!response.ok) throw new Error(`Failed to load ${side} sprite from URL`);
      const buffer = await response.arrayBuffer();
      file = new File([buffer], `${side}.gif`, { type: "image/gif" });
    }

    // Parse GIF using Sprite Recolourer pipeline
    const parsedSprite = await parseSpriteFile(file);

    // Merge with existing mod color map
    const mergedColorMap = { ...modColorMap };
    parsedSprite.palette.forEach(({ hex }) => {
      if (!mergedColorMap[hex]) mergedColorMap[hex] = hex;
    });

    setModColorMap(mergedColorMap);

    // Apply color map to sprite if needed
    const finalSprite = applyColorMapToSprite(parsedSprite, mergedColorMap);

    setModCreatorSprites((prev) => ({
      ...prev,
      [side]: finalSprite,
    }));
  } catch (error) {
    console.error(`${side} sprite load failed:`, error);
    alert(error.message || `Failed to load the ${side} sprite.`);
  } finally {
    setModLoadingKey("");
  }
}, [modColorMap]);


// Unified Mod Creator loader for both front and back GIFs
const handleModPokemonSelect = React.useCallback(async (selectionLabel) => {
  const matchedOption = modCreatorPokemonOptions.find(
    (option) => normalizePokemonSearch(option.label) === normalizePokemonSearch(selectionLabel)
  );
  const pokemonName = matchedOption?.value || modCreatorPokemonLabelToValue[selectionLabel];

  if (!pokemonName) {
    alert("Choose a Pokemon from the autocomplete list, or upload front and back GIFs manually.");
    return;
  }

  const animatedSprites = pokemonSprites[pokemonName]?.sprites?.versions?.["generation-v"]?.["black-white"]?.animated;
  const frontUrl = animatedSprites?.front_default;
  const backUrl = animatedSprites?.back_default;

  if (!frontUrl || !backUrl) {
    alert("That Pokemon does not have both front and back GIFs available.");
    return;
  }

  const selectedLabel = matchedOption?.label || selectionLabel;
  const selectedPokemonId = pokemonSprites[pokemonName]?.id ?? null;

  setModPokemonSearch(selectedLabel);
  setSelectedModPokemonLabel(selectedLabel);
  setSelectedModPokemonId(selectedPokemonId);
  setModLoadingKey("pokemon");

  try {
    // Fetch front and back GIFs
    const [frontResponse, backResponse] = await Promise.all([fetch(frontUrl), fetch(backUrl)]);
    if (!frontResponse.ok || !backResponse.ok) throw new Error(`Unable to load front/back GIFs for ${selectedLabel}.`);

    const [frontBuffer, backBuffer] = await Promise.all([frontResponse.arrayBuffer(), backResponse.arrayBuffer()]);

    // Parse fresh sprites
    const frontFile = new File([frontBuffer], `${pokemonName}-front.gif`, { type: "image/gif" });
    const backFile = new File([backBuffer], `${pokemonName}-back.gif`, { type: "image/gif" });

    const [frontSprite, backSprite] = await Promise.all([
      parseSpriteFile(frontFile),
      parseSpriteFile(backFile)
    ]);

    // Merge palettes into modColorMap
    const mergedColorMap = { ...modColorMap };
    [...frontSprite.palette, ...backSprite.palette].forEach(({ hex }) => {
      if (!mergedColorMap[hex]) mergedColorMap[hex] = hex;
    });
    setModColorMap(mergedColorMap);

    // Apply color maps, deep cloning all frames to prevent glitches
    const applyDeepColorMap = (sprite, colorMap) => {
      if (!sprite) return null;
      const indexedSprite = ensureSpriteColorPixels(sprite);

      // Deep clone every frame
      const clonedFrames = indexedSprite.currentFrames.map(frame => new Uint8ClampedArray(frame));

      for (const { hex, r, g, b } of indexedSprite.palette) {
        const targetColor = parseHexColor(colorMap[hex] || hex);
        const frameOffsetsList = indexedSprite.colorPixels[hex] || [];

        frameOffsetsList.forEach((offsets, frameIndex) => {
          const frame = clonedFrames[frameIndex];
          offsets.forEach(offset => {
            frame[offset] = targetColor.r;
            frame[offset + 1] = targetColor.g;
            frame[offset + 2] = targetColor.b;
          });
        });
      }

      return { ...indexedSprite, currentFrames: clonedFrames, appliedColorMap: { ...colorMap } };
    };

    setModCreatorSprites({
      front: applyDeepColorMap(frontSprite, mergedColorMap),
      back: applyDeepColorMap(backSprite, mergedColorMap)
    });

  } catch (error) {
    console.error("Mod Creator GIF load failed:", error);
    alert(error.message || "Failed to load Pokemon GIFs for the mod creator.");
  } finally {
    setModLoadingKey("");
  }
}, [modColorMap]);



  async function handleDownload() {
    exportMod.exportCurrentFrame();
  }

  async function handleDownloadGif() {
    if (!state.currentFrames || !state.currentFrames.length) return;

    try {
      const blob = await encodeGif(
        state.currentFrames,
        state.gifWidth,
        state.gifHeight,
        state.frameDelays
      );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${state.projectName || "palette-swapped"}.gif`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("GIF generation failed:", error);
      alert("Failed to generate GIF. See console for details.");
    }
  }

  async function handleDownloadModGifs() {
    if (!selectedModPokemonId || !modCreatorSprites.front?.currentFrames?.length || !modCreatorSprites.back?.currentFrames?.length) {
      return;
    }

    try {
      const downloads = [
        {
          side: "front",
          sprite: modCreatorSprites.front,
        },
        {
          side: "back",
          sprite: modCreatorSprites.back,
        },
      ];

      for (const { side, sprite } of downloads) {
        const blob = await encodeGif(
          sprite.currentFrames,
          sprite.width,
          sprite.height,
          sprite.frameDelays
        );

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${selectedModPokemonId}_${side}_s.gif`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Mod GIF generation failed:", error);
      alert("Failed to generate one or more mod GIFs. See console for details.");
    }
  }

  const modPaletteSections = [
    { key: "front", label: "Front palette", sprite: modCreatorSprites.front },
    { key: "back", label: "Back palette", sprite: modCreatorSprites.back },
  ];

  return (
    <div className={styles["page-container"]}>
      <h1>Sprite Recolour Tool</h1>

      <div className={styles["tab-list"]} role="tablist" aria-label="Sprite recolour modes">
        <button
          type="button"
          role="tab"
          className={styles["tab-button"]}
          data-active={activeTab === "sprite-recolourer"}
          aria-selected={activeTab === "sprite-recolourer"}
          onClick={() => setActiveTab("sprite-recolourer")}
        >
          Sprite Recolourer
        </button>
        {/* <button
          type="button"
          role="tab"
          className={styles["tab-button"]}
          data-active={activeTab === "mod-creator"}
          aria-selected={activeTab === "mod-creator"}
          onClick={() => setActiveTab("mod-creator")}
        >
          Mod Creator
        </button>{*/}
      </div>

      {activeTab === "sprite-recolourer" && (
        <>
          <div className={styles["picker-panel"]}>
            <div className={styles["search-panel"]}>
              <label className={styles["panel-label"]}>Choose a Pokemon GIF</label>
              <SearchBar
                value={pokemonSearch}
                onChange={setPokemonSearch}
                placeholder="Search for a Pokemon..."
                suggestions={pokemonOptions.map((option) => option.label)}
                onSuggestionSelect={handlePokemonSelect}
              />
            </div>

            <div className={styles["upload-panel"]}>
              <label className={styles["panel-label"]} htmlFor="fileInput">Or upload your own GIF</label>
              <input
                type="file"
                accept="image/gif,image/png,image/jpeg,image/webp"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={loading}
                id="fileInput"
              />
            </div>
          </div>

          {selectedSourceLabel && (
            <div className={styles["selected-source"]}>
              Loaded: <strong>{selectedSourceLabel}</strong>
            </div>
          )}

          <div style={{ margin: "1em 0" }}>
            <canvas
              ref={canvasRef}
              width={state.gifWidth || 256}
              height={state.gifHeight || 256}
              onClick={handlePreviewClick}
              onMouseEnter={handlePreviewMouseEnter}
              onMouseLeave={handlePreviewMouseLeave}
              title="Hover to pause the preview, then click a colour to open it in the palette editor"
              style={{
                border: "1px solid #ccc",
                imageRendering: "pixelated",
                width: previewDisplayWidth,
                height: previewDisplayHeight,
                cursor: "crosshair",
              }}
            />
            {frameInfo && (
              <div style={{ marginTop: 8, fontSize: "0.95rem" }}>
                {frameInfo}
                <span> - hover to pause, then click a colour in the preview to open that colour in the palette editor.</span>
              </div>
            )}
          </div>

          {loading && <div>Processing...</div>}

          {originalPalette.length > 0 && (
            <div className={styles["palette-list"]}>
              <h2>Palette</h2>
              {originalPalette.map(({ hex }) => (
                <div
                  className={styles["palette-color"]}
                  key={hex}
                  style={selectedPaletteHex === hex ? { outline: "2px solid #fff", borderRadius: 8, padding: 4 } : undefined}
                >
                  <div
                    className={styles["color-box"]}
                    style={{ backgroundColor: colorMap[hex] || hex }}
                  />
                  <input
                    type="color"
                    value={colorMap[hex] || hex}
                    onChange={(event) => handleColorChange(hex, event.target.value)}
                    ref={(node) => {
                      if (node) {
                        colorInputRefs.current[hex] = node;
                      } else {
                        delete colorInputRefs.current[hex];
                      }
                    }}
                  />
                  <span>{hex}</span>
                </div>
              ))}
            </div>
          )}

          {hasGif && (
            <>
              <button onClick={handleDownload} disabled={loading}>
                Download Current Frame as PNG
              </button>
              <button onClick={handleDownloadGif} disabled={loading} style={{ marginLeft: 8 }}>
                Download as GIF
              </button>
            </>
          )}
        </>
      )}

      {activeTab === "mod-creator" && (
        <div className={styles["mod-creator-layout"]}>
          <div className={styles["picker-panel"]}>
            <div className={styles["search-panel"]}>
              <label className={styles["panel-label"]}>Choose a Pokemon</label>
              <SearchBar
                value={modPokemonSearch}
                onChange={setModPokemonSearch}
                placeholder="Search for a Pokemon..."
                suggestions={modCreatorPokemonOptions.map((option) => option.label)}
                onSuggestionSelect={handleModPokemonSelect}
              />
              <p className={styles["helper-text"]}>
                Loads the animated Gen V shiny front and back GIFs from <code>pokemon-sprites.json</code>.
              </p>
            </div>

            <div className={styles["upload-panel"]}>
              <label className={styles["panel-label"]} htmlFor="frontGifInput">Front gif</label>
              <input
                type="file"
                accept="image/gif,image/png,image/jpeg,image/webp"
                id="frontGifInput"
                disabled={modLoadingKey === "front"}
                onChange={(event) => handleModFileChange("front", event.target.files?.[0])}
              />
            </div>

            <div className={styles["upload-panel"]}>
              <label className={styles["panel-label"]} htmlFor="backGifInput">Back Gif</label>
              <input
                type="file"
                accept="image/gif,image/png,image/jpeg,image/webp"
                id="backGifInput"
                disabled={modLoadingKey === "back"}
                onChange={(event) => handleModFileChange("back", event.target.files?.[0])}
              />
            </div>
          </div>

          {selectedModPokemonLabel && (
            <div className={styles["selected-source"]}>
              Loaded for mod creator: <strong>{selectedModPokemonLabel}</strong>
            </div>
          )}

          <div className={styles["mod-preview-grid"]}>
            <SpriteCanvasPreview
              sprite={modCreatorSprites.front}
              title="Front"
              onPickColor={(hex) => handleModPreviewColorPick("front", hex)}
            />
            <SpriteCanvasPreview
              sprite={modCreatorSprites.back}
              title="Back"
              onPickColor={(hex) => handleModPreviewColorPick("back", hex)}
            />
          </div>

          {modLoadingKey && <div>Processing...</div>}

          {selectedModPokemonId && modCreatorSprites.front && modCreatorSprites.back && (
            <button onClick={handleDownloadModGifs} disabled={Boolean(modLoadingKey)}>
              Download Front + Back GIFs
            </button>
          )}

          <div className={styles["mod-palette-grid"]}>
            {modPaletteSections.map(({ key, label, sprite }) => (
              <div className={styles["mod-palette-card"]} key={key}>
                <h2>{label}</h2>
                {!sprite && <p className={styles["helper-text"]}>Upload a sprite to edit this palette.</p>}
                {sprite?.palette?.length > 0 && (
                  <div className={styles["palette-list"]}>
                    {sprite.palette.map(({ hex }) => (
                      <div
                        className={styles["palette-color"]}
                        key={`${key}-${hex}`}
                        style={selectedPaletteHex === hex ? { outline: "2px solid #fff", borderRadius: 8, padding: 4 } : undefined}
                      >
                        <div
                          className={styles["color-box"]}
                          style={{ backgroundColor: modColorMap[hex] || hex }}
                        />
                        <input
                          type="color"
                          value={modColorMap[hex] || hex}
                          onChange={(event) => handleModColorChange(hex, event.target.value)}
                          ref={(node) => {
                            if (node) {
                              modColorInputRefs.current[key][hex] = node;
                            } else {
                              delete modColorInputRefs.current[key][hex];
                            }
                          }}
                        />
                        <span>{hex}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
