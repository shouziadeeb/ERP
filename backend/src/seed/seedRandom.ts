export type SeededRandom = () => number

export function createSeededRandom(seed: number): SeededRandom {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

export function pick<T>(rand: SeededRandom, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!
}

export function pickIndex(rand: SeededRandom, max: number): number {
  return Math.floor(rand() * max)
}

export function padNum(n: number, width: number): string {
  return String(n).padStart(width, '0')
}
