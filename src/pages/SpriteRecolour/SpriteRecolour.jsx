
import React, { useRef, useEffect, useState } from "react";
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
import { getLocalPokemonGif } from "../../utils/pokemon.js";

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

function normalizePokemonSearch(value) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, " ");
}

export default function SpriteRecolour() {
  const fileInputRef = useRef();
  const canvasRef = useRef();
  const colorInputRefs = useRef({});
  const resumeAnimationOnLeaveRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [originalPalette, setOriginalPalette] = useState([]); // Store original palette
  const [colorMap, setColorMap] = useState({});
  const [hasGif, setHasGif] = useState(false);
  const [frameInfo, setFrameInfo] = useState("");
  const [selectedPaletteHex, setSelectedPaletteHex] = useState("");
  const [pokemonSearch, setPokemonSearch] = useState("");
  const [selectedSourceLabel, setSelectedSourceLabel] = useState("");

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

  // Setup DOM element bindings for the vanilla JS modules
  useEffect(() => {
    // Attach canvas to dom.js for compatibility
    if (canvasRef.current) {
      elements.previewCanvas = canvasRef.current;
      elements.ctx = canvasRef.current.getContext("2d");
    }
    // Minimal stub for required elements
    elements.loading = { classList: { add: () => {}, remove: () => {} } };
    elements.mainContent = { classList: { add: () => {}, remove: () => {} } };
    elements.paletteGrid = document.createElement("div"); // Not used in React
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

  // Update palette state from global state
  // No longer needed: updatePaletteFromState

  async function loadFile(file, sourceLabel = "") {
    if (!file) return;
    setLoading(true);
    await fileHandler.handleFiles([file], () => {});
    setHasGif(true);
    // Build original palette from originalFrames (not currentFrames)
    const colorSet = new Map();
    for (const frame of state.originalFrames) {
      for (let i = 0; i < frame.length; i += 4) {
        const r = frame[i], g = frame[i+1], b = frame[i+2], a = frame[i+3];
        if (a > 0) {
          const hex = rgbToHex(r, g, b);
          if (!colorSet.has(hex)) colorSet.set(hex, { r, g, b, hex });
        }
      }
    }
    const pal = Array.from(colorSet.values());
    setOriginalPalette(pal);
    // Initialize colorMap to identity mapping
    const map = {};
    pal.forEach(c => (map[c.hex] = c.hex));
    setColorMap(map);
    setSelectedPaletteHex("");
    setSelectedSourceLabel(sourceLabel);
    setLoading(false);
  }

  async function handleFileChange(e) {
    const file = e.target.files[0];
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

  // Prevent unnecessary re-renders that close the color picker
  const handleColorChange = React.useCallback((oldHex, newHex) => {
    // Find the colorKey for oldHex in originalPalette
    const entry = originalPalette.find(p => p.hex === oldHex);
    if (!entry) return;
    const [r, g, b] = [
      parseInt(newHex.slice(1, 3), 16),
      parseInt(newHex.slice(3, 5), 16),
      parseInt(newHex.slice(5, 7), 16)
    ];
    // Remove any previous swap for this color from editHistory
    state.editHistory = state.editHistory.filter(
      e => !(e.type === "swap" && e.swap.from.r === entry.r && e.swap.from.g === entry.g && e.swap.from.b === entry.b)
    );
    state.editHistory.push({
      type: "swap",
      swap: {
        from: { r: entry.r, g: entry.g, b: entry.b },
        to: { r, g, b }
      }
    });
    // Reset currentFrames to originalFrames and re-apply all edits
    state.currentFrames = state.originalFrames.map(f => new Uint8ClampedArray(f));
    for (const edit of state.editHistory) {
      exportMod.applyEditEntry(edit);
    }
    // Re-render the preview
    import('./animation.js').then(mod => {
      if (mod.renderCurrentFrame) mod.renderCurrentFrame();
    });
    // Update colorMap for UI
    setColorMap(prev => ({ ...prev, [oldHex]: newHex }));
  }, [originalPalette]);


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

        // Trigger download in the browser
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (state.projectName || 'palette-swapped') + '.gif';
        document.body.appendChild(a); // Needed for Firefox
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('GIF generation failed:', err);
        alert('Failed to generate GIF. See console for details.');
    }
    }


  return (
    <div className={styles["page-container"]}>
      <h1>Sprite Recolour Tool</h1>
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
            width: 350,
            height: 350,
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
      {loading && <div>Processing…</div>}
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
                style={{ backgroundColor: hex }}
              />
              <input
                type="color"
                value={colorMap[hex] || hex}
                onChange={e => handleColorChange(hex, e.target.value)}
                ref={node => {
                  if (node) {
                    colorInputRefs.current[hex] = node;
                  } else {
                    delete colorInputRefs.current[hex];
                  }
                }}
                key={`color-input-${hex}`}
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
    </div>
  );
}
