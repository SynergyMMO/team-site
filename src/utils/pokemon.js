export function normalizePokemonName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[.'']/g, '')
    .replace(/\s+/g, '-')
}

export function getPokemonImageUrl(name, shiny = true) {
  const urlName = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[.']/g, '')
    .replace(/[♀]/g, 'f')
    .replace(/[♂]/g, 'm')
    .replace(/\[.*\]/, '')
  return `https://img.pokemondb.net/sprites/black-white/anim/${shiny ? 'shiny' : 'normal'}/${urlName}.gif`
}

export function formatPokemonName(name) {
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : name
}
