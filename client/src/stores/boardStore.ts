import { create } from 'zustand'
import { type Tile, type Coordinate, TileType } from 'shared'
import { mapRegistry } from '../game/map/MapRegistry'
import { MAPS } from '../game/map/registry'

interface BoardStore {
  // State - Single Source of Truth for Board
  board: Tile[][]

  // Actions
  setBoard: (board: Tile[][]) => void
  createBoard: () => void
  updateTileOwner: (coord: Coordinate, playerId: string) => void
  
  // Queries
  getTileAt: (coord: Coordinate) => Tile | undefined
  getCubicleTiles: () => Tile[]
  getCubicleTilesByOwner: (playerId: string) => Tile[]
  getBoardDimensions: () => { width: number; height: number }
}

// Helper function to create the game board
function createBoardFromMap(): Tile[][] {
  // Get the actual map dimensions and capture points from the tilemap
  const startingPositions = mapRegistry.getStartingPositions('OfficeLayout')
  const capturePoints = mapRegistry.getCapturePoints('OfficeLayout')
  
  if (!startingPositions) {
    console.warn('Starting positions not available, using fallback board')
    return createFallbackBoard()
  }
  
  // Get map dimensions from configuration
  const mapId = 'OfficeLayout'
  const mapSpec = MAPS[mapId]
  const width = mapSpec.width
  const height = mapSpec.height
  const board: Tile[][] = []
  
  // Initialize all tiles as NORMAL
  for (let y = 0; y < height; y++) {
    const row: Tile[] = []
    for (let x = 0; x < width; x++) {
      row.push({ x, y, type: TileType.NORMAL })
    }
    board.push(row)
  }
  
  // Mark starting positions as HQ tiles
  startingPositions.goldTeam.forEach((pos: { x: number; y: number }) => {
    board[pos.y][pos.x].type = TileType.HQ_BLUE
  })
  
  startingPositions.navyTeam.forEach((pos: { x: number; y: number }) => {
    board[pos.y][pos.x].type = TileType.HQ_RED
  })

  // Mark capture points as CUBICLE tiles
  if (capturePoints) {
    capturePoints.forEach((pos: { x: number; y: number; gid: number }) => {
      if (pos.gid === 472) { // GID 472 = capture point
        board[pos.y][pos.x].type = TileType.CUBICLE
        console.log('Marked capture point at:', { x: pos.x, y: pos.y })
      }
    })
  }
  
  console.log('Created board with dimensions:', { width, height, capturePoints: capturePoints?.length || 0 })
  return board
}

function createFallbackBoard(): Tile[][] {
  // Fallback board using config dimensions if tilemap data isn't available
  const mapId = 'OfficeLayout'
  const mapSpec = MAPS[mapId]
  const width = mapSpec.width
  const height = mapSpec.height
  const board: Tile[][] = []
  for (let y = 0; y < height; y++) {
    const row: Tile[] = []
    for (let x = 0; x < width; x++) {
      let type: TileType = TileType.NORMAL
      if (y === 0 && x <= 1) type = TileType.HQ_BLUE
      if (y === height - 1 && x >= width - 2) type = TileType.HQ_RED
      if (y >= 2 && y <= height - 3 && x >= 2 && x <= width - 3) {
        if ((x + y) % 2 === 0) type = TileType.CUBICLE
      }
      if ((x === 3 && y === 5) || (x === 4 && y === 4)) type = TileType.OBSTACLE
      
      const tile = { x, y, type }
      row.push(tile)
    }
    board.push(row)
  }
  
  console.log('Created fallback board with dimensions:', { width, height })
  return board
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  // Initial state
  board: [],

  // Actions
  setBoard: (board) => {
    set({ board })
  },

  createBoard: () => {
    const board = createBoardFromMap()
    set({ board })
  },

  updateTileOwner: (coord, playerId) => {
    set((state) => ({
      board: state.board.map((row) =>
        row.map((tile) =>
          tile.x === coord.x && tile.y === coord.y
            ? { ...tile, owner: playerId }
            : tile
        )
      )
    }))
  },

  // Queries
  getTileAt: (coord) => {
    const { board } = get()
    return board[coord.y]?.[coord.x]
  },

  getCubicleTiles: () => {
    return get().board.flat().filter((tile) => tile.type === TileType.CUBICLE)
  },

  getCubicleTilesByOwner: (playerId) => {
    return get().board
      .flat()
      .filter((tile) => tile.type === TileType.CUBICLE && tile.owner === playerId)
  },

  getBoardDimensions: () => {
    const { board } = get()
    return {
      width: board[0]?.length || 0,
      height: board.length
    }
  }
}))
