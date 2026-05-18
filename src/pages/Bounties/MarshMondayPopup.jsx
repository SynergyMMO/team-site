import React from 'react';
import './MarshMondayPopup.css';

import { usePokemonSprites } from '../../hooks/usePokemonSprites';

function PokemonGif({ name }) {
  const sprites = usePokemonSprites(name);
  // Try to get animated gif from gen 5, fallback to any available
  let gifUrl = null;
  if (sprites['generation-v']) {
    const genVSprites = sprites['generation-v'];
    const gif = genVSprites.find(s => s.type === 'gif' && s.url);
    if (gif) gifUrl = gif.url;
  }
  if (!gifUrl) {
    for (const gen of Object.keys(sprites)) {
      const sprite = sprites[gen].find(s => s.url);
      if (sprite) {
        gifUrl = sprite.url;
        break;
      }
    }
  }
  if (!gifUrl) return null;
  return <img className="marsh-monday-pokemon-sprite" src={gifUrl} alt={name} title={name} />;
}

export default function MarshMondayPopup() {
  return (
    <div className="marsh-monday-popup" role="status" aria-live="polite">
      <div className="marsh-monday-popup-title">Marsh Mondays</div>
      <div className="marsh-monday-popup-desc">
        Catch a shiny Pokemon in the Great Marsh for 500rp, active every monday!
      </div>
      <div className="marsh-monday-pokemon-row">
        <PokemonGif name="skorupi" />
        <PokemonGif name="carnivine" />
        <PokemonGif name="croagunk" />
      </div>
    </div>
  );
}
