export const GRID_CONFIG = {
  width: 10,
  height: 8,
  tile: 48,
}

export type Vec2 = { x: number; y: number }

export function manhattan(a: Vec2, b: Vec2) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

export function isAdjacent(a: Vec2, b: Vec2) {
  return manhattan(a, b) === 1
}


