import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { type Tile, TileType, type Unit } from 'shared'
import { MAPS } from '../game/map/registry'
import { getCubicleData as getCubicleDataUtil } from '../game/core/victory'

/**
 * Board Store Slice
 * 
 * Manages all board-related state and actions.
 * This slice handles tiles, capture points, and board operations.
 */

export interface BoardState {
  // Board data
  board: Tile[][]
  boardWidth: number
  boardHeight: number
  
  // Board actions
  createBoard: () => void
  createFallbackBoard: () => void
  updateTile: (x: number, y: number, updates: Partial<Tile>) => void
  captureCubicle: (x: number, y: number, playerId: string) => void
  
  // Board queries
  getTileAt: (x: number, y: number) => Tile | undefined
  getTileAtPosition: (position: { x: number; y: number }) => Tile | undefined
  getCubicles: () => Tile[]
  getCubiclesByOwner: (ownerId: string) => Tile[]
  getUnclaimedCubicles: () => Tile[]
  getCubicleData: () => { totalCubicles: number; count: number; positions: { x: number; y: number }[] }
  
  // Board validation
  isValidPosition: (x: number, y: number) => boolean
  isPositionBlocked: (x: number, y: number) => boolean
  isPositionOccupied: (x: number, y: number, units: Unit[]) => boolean
  
  // Board utilities
  getNeighboringTiles: (x: number, y: number) => Tile[]
  getTilesInRange: (centerX: number, centerY: number, range: number) => Tile[]
  getPath: (from: { x: number; y: number }, to: { x: number; y: number }) => { x: number; y: number }[]
  
  // Board state helpers
  getBoardDimensions: () => { width: number; height: number }
  getBoardSize: () => number
  isBoardEmpty: () => boolean
  getBoardHash: () => string
}

export const useBoardStore = create<BoardState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    board: [],
    boardWidth: MAPS['OfficeLayout'].width,
    boardHeight: MAPS['OfficeLayout'].height,
    
    // Board actions
    createBoard: () => {
      const { boardWidth, boardHeight } = get()
      const board: Tile[][] = []
      
      // Create empty board
      for (let y = 0; y < boardHeight; y++) {
        const row: Tile[] = []
        for (let x = 0; x < boardWidth; x++) {
          row.push({ x, y, type: TileType.NORMAL })
        }
        board.push(row)
      }
      
      // Place HQs
      const hqPositions = [
        { x: 0, y: 0 },
        { x: boardWidth - 1, y: boardHeight - 1 }
      ]
      
      hqPositions.forEach((pos, index) => {
        if (board[pos.y] && board[pos.y][pos.x]) {
          board[pos.y][pos.x] = {
            x: pos.x,
            y: pos.y,
            type: TileType.HQ_BLUE,
            owner: `player${index + 1}`
          }
        }
      })
      
      // Place capture points (cubicles)
      const cubiclePositions = [
        { x: 2, y: 2 },
        { x: boardWidth - 3, y: 2 },
        { x: 2, y: boardHeight - 3 },
        { x: boardWidth - 3, y: boardHeight - 3 },
        { x: Math.floor(boardWidth / 2), y: Math.floor(boardHeight / 2) }
      ]
      
      cubiclePositions.forEach(pos => {
        if (board[pos.y] && board[pos.y][pos.x]) {
          board[pos.y][pos.x] = {
            x: pos.x,
            y: pos.y,
            type: TileType.CUBICLE,
            owner: undefined
          }
        }
      })
      
      set({ board })
    },
    
    createFallbackBoard: () => {
      const { boardWidth, boardHeight } = get()
      const board: Tile[][] = []
      
      // Create simple fallback board
      for (let y = 0; y < boardHeight; y++) {
        const row: Tile[] = []
        for (let x = 0; x < boardWidth; x++) {
          row.push({ x, y, type: TileType.NORMAL })
        }
        board.push(row)
      }
      
      set({ board })
    },
    
    updateTile: (x, y, updates) => {
      set((state) => ({
        board: state.board.map((row, rowIndex) =>
          rowIndex === y
            ? row.map((tile, colIndex) =>
                colIndex === x ? { ...tile, ...updates } : tile
              )
            : row
        ),
      }))
    },
    
    captureCubicle: (x, y, playerId) => {
      set((state) => ({
        board: state.board.map((row, rowIndex) =>
          rowIndex === y
            ? row.map((tile, colIndex) =>
                colIndex === x && tile.type === TileType.CUBICLE
                  ? { ...tile, owner: playerId }
                  : tile
              )
            : row
        ),
      }))
    },
    
    // Board queries
    getTileAt: (x, y) => {
      const { board } = get()
      return board[y]?.[x]
    },
    
    getTileAtPosition: (position) => {
      const { board } = get()
      return board[position.y]?.[position.x]
    },
    
    getCubicles: () => {
      const { board } = get()
      return board.flat().filter(tile => tile.type === TileType.CUBICLE)
    },
    
    getCubiclesByOwner: (ownerId) => {
      const { board } = get()
      return board.flat().filter(tile => 
        tile.type === TileType.CUBICLE && tile.owner === ownerId
      )
    },
    
    getUnclaimedCubicles: () => {
      const { board } = get()
      return board.flat().filter(tile => 
        tile.type === TileType.CUBICLE && !tile.owner
      )
    },
    
    getCubicleData: () => {
      const { board } = get()
      return getCubicleDataUtil(board)
    },
    
    // Board validation
    isValidPosition: (x, y) => {
      const { boardWidth, boardHeight } = get()
      return x >= 0 && x < boardWidth && y >= 0 && y < boardHeight
    },
    
    isPositionBlocked: (x, y) => {
      const tile = get().getTileAt(x, y)
      return tile?.type === TileType.OBSTACLE
    },
    
    isPositionOccupied: (x, y, units) => {
      return units.some(unit => unit.position.x === x && unit.position.y === y)
    },
    
    // Board utilities
    getNeighboringTiles: (x, y) => {
      const neighbors: Tile[] = []
      const directions = [
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 }
      ]
      
      directions.forEach(({ dx, dy }) => {
        const newX = x + dx
        const newY = y + dy
        const tile = get().getTileAt(newX, newY)
        if (tile) neighbors.push(tile)
      })
      
      return neighbors
    },
    
    getTilesInRange: (centerX, centerY, range) => {
      const { board } = get()
      const tiles: Tile[] = []
      
      for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board[y].length; x++) {
          const distance = Math.abs(x - centerX) + Math.abs(y - centerY)
          if (distance <= range) {
            tiles.push(board[y][x])
          }
        }
      }
      
      return tiles
    },
    
    getPath: (from, to) => {
      // Simple pathfinding (BFS)
      const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = []
      const visited = new Set<string>()
      
      queue.push({ x: from.x, y: from.y, path: [from] })
      visited.add(`${from.x},${from.y}`)
      
      while (queue.length > 0) {
        const current = queue.shift()!
        
        if (current.x === to.x && current.y === to.y) {
          return current.path
        }
        
        const directions = [
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 }
        ]
        
        directions.forEach(({ dx, dy }) => {
          const newX = current.x + dx
          const newY = current.y + dy
          const key = `${newX},${newY}`
          
          if (!visited.has(key) && get().isValidPosition(newX, newY) && !get().isPositionBlocked(newX, newY)) {
            visited.add(key)
            queue.push({
              x: newX,
              y: newY,
              path: [...current.path, { x: newX, y: newY }]
            })
          }
        })
      }
      
      return [] // No path found
    },
    
    // Board state helpers
    getBoardDimensions: () => {
      const { boardWidth, boardHeight } = get()
      return { width: boardWidth, height: boardHeight }
    },
    
    getBoardSize: () => {
      const { boardWidth, boardHeight } = get()
      return boardWidth * boardHeight
    },
    
    isBoardEmpty: () => {
      const { board } = get()
      return board.length === 0
    },
    
    getBoardHash: () => {
      const { board } = get()
      return JSON.stringify(board)
    },
  }))
)

// Selectors for performance optimization
export const boardSelectors = {
  getBoard: (state: BoardState) => state.board,
  getCubicles: (state: BoardState) => state.board.flat().filter(tile => tile.type === TileType.CUBICLE),
  getCubiclesByOwner: (state: BoardState, ownerId: string) => 
    state.board.flat().filter(tile => tile.type === TileType.CUBICLE && tile.owner === ownerId),
  getUnclaimedCubicles: (state: BoardState) => 
    state.board.flat().filter(tile => tile.type === TileType.CUBICLE && !tile.owner),
  getBoardDimensions: (state: BoardState) => ({ width: state.boardWidth, height: state.boardHeight }),
}
