const STORAGE_KEY = 'bingoCard'

export function checkBingo(completed, size) {
  let lines = 0
  // Rows
  for (let r = 0; r < size; r++)
    if ([...Array(size).keys()].every(c => completed.includes(r * size + c)))
      lines++
  // Columns
  for (let c = 0; c < size; c++)
    if ([...Array(size).keys()].every(r => completed.includes(r * size + c)))
      lines++
  // Main diagonal
  if ([...Array(size).keys()].every(i => completed.includes(i * size + i)))
    lines++
  // Anti-diagonal
  if ([...Array(size).keys()].every(i => completed.includes(i * size + (size - 1 - i))))
    lines++
  return lines
}

export function saveBingo(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function loadBingo() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return null
  try {
    return JSON.parse(saved)
  } catch {
    return null
  }
}
