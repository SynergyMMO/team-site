
export const ROLE_MEMBERS = {
  'Shiny Hunter of the Month!': ["GAMJI"],
  Owner: ['Hyper', 'Bloom', 'BaldBabyBat'],
  Admin: ["ItsTurn", "TFastest"],
  Moderator: ["Indica", "Russoto", "Stinky", "Zempex"],
  '2026 Official Shiny Wars MVP': ["Ezra"],
  '2025 Official Shiny Wars MVP': ["Torskin"],
}

export const ROLE_DEFINITIONS = {
  // pinned: always listed first on the showcase, banner: text shown above the card
  'Shiny Hunter of the Month!': { icon: '\uD83C\uDF1F', color: '#ffd700', gradient: ['#ffd700', '#fff6b0', '#d4a017'], pinned: true, banner: 'Shiny Hunter of the Month!' },
  Owner: { icon: '\uD83D\uDC51', color: '#ffd700', gradient: ['#ffd700', '#ff8c00', '#fff1a8'] },
  Admin: { icon: '\uD83D\uDEE1\uFE0F', color: '#00ffff', gradient: ['#ff0000', '#00ff00', '#0000ff'] },
  Moderator: { icon: '\uD83D\uDD28', color: '#9a5f1b', gradient: ['#9a831b', '#645b07', '#b9cc4d'] },
  '2026 Official Shiny Wars MVP': { icon: '\uD83C\uDFC6', color: '#e5e4e2', gradient: ['#e5e4e2', '#00e5ff', '#ffffff'] },
  '2025 Official Shiny Wars MVP': { icon: '\uD83E\uDD47', color: '#ff69b4', gradient: ['#ff69b4', '#c0c0c0', '#ffc0e0'] },
}

const lookup = new Map()
Object.keys(ROLE_DEFINITIONS).forEach((role) => {
  ;(ROLE_MEMBERS[role] || []).forEach((name) => {
    const key = name.toLowerCase()
    if (!lookup.has(key)) lookup.set(key, role)
  })
})

// Returns { name, icon, color, gradient } or null
export function getPlayerRole(playerName) {
  if (!playerName) return null
  const role = lookup.get(String(playerName).toLowerCase())
  return role ? { name: role, ...ROLE_DEFINITIONS[role] } : null
}

export function getRoleStyle(role) {
  if (!role) return undefined
  const [a, b, c] = role.gradient
  return { '--role-color': role.color, '--role-a': a, '--role-b': b, '--role-c': c }
}
