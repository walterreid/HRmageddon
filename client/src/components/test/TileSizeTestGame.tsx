import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { MAPS } from '../../game/map/registry'

interface TileSizeTestGameProps {
  tileSize: 48 | 32 | 24
  showTileGraphics: boolean
}

// Create a simplified test scene that only handles the specified tile size
class TileSizeTestScene extends Phaser.Scene {
  private tileSizePx: number
  private showTileGraphics: boolean
  private tileGraphics: Phaser.GameObjects.Graphics | null = null
  private unitGraphics: Phaser.GameObjects.Graphics | null = null
  private tilemap: Phaser.Tilemaps.Tilemap | null = null
  private tileset: Phaser.Tilemaps.Tileset | null = null

  constructor(tileSize: number, showTileGraphics: boolean = false) {
    super({ key: 'TileSizeTestScene' })
    this.tileSizePx = tileSize
    this.showTileGraphics = showTileGraphics
  }

  create() {
    console.log(`TileSizeTestScene: Creating test scene with ${this.tileSizePx}px tiles`)
    
    // Calculate board dimensions
    const boardWidth = 16
    const boardHeight = 12
    const canvasWidth = boardWidth * this.tileSizePx
    const canvasHeight = boardHeight * this.tileSizePx
    
    console.log(`TileSizeTestScene: Board dimensions: ${canvasWidth}x${canvasHeight}`)
    
    // Create graphics for tiles
    this.tileGraphics = this.add.graphics()
    this.unitGraphics = this.add.graphics()
    
    // Draw the board grid (only if tile graphics are disabled)
    if (!this.showTileGraphics) {
      this.drawBoard()
    } else {
      // Draw actual tile graphics
      this.drawTileGraphics()
    }
    
    // Draw some test units
    this.drawTestUnits()
    
    // Add some debug text
    this.add.text(10, 10, `Test Scene: ${this.tileSizePx}px tiles`, {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 }
    })
  }

  private drawBoard() {
    if (!this.tileGraphics) return
    
    this.tileGraphics.clear()
    this.tileGraphics.lineStyle(1, 0x666666, 0.5)
    
    const boardWidth = 16
    const boardHeight = 12
    
    // Draw grid lines
    for (let x = 0; x <= boardWidth; x++) {
      const xPos = x * this.tileSizePx
      this.tileGraphics.moveTo(xPos, 0)
      this.tileGraphics.lineTo(xPos, boardHeight * this.tileSizePx)
    }
    
    for (let y = 0; y <= boardHeight; y++) {
      const yPos = y * this.tileSizePx
      this.tileGraphics.moveTo(0, yPos)
      this.tileGraphics.lineTo(boardWidth * this.tileSizePx, yPos)
    }
    
    this.tileGraphics.strokePath()
    
    // Draw some sample tiles
    this.tileGraphics.fillStyle(0x1e40af, 0.3) // Blue for player 1 area
    this.tileGraphics.fillRect(0, 0, 6 * this.tileSizePx, 3 * this.tileSizePx)
    
    this.tileGraphics.fillStyle(0x1e3a8a, 0.3) // Darker blue for player 2 area
    this.tileGraphics.fillRect(10 * this.tileSizePx, 9 * this.tileSizePx, 6 * this.tileSizePx, 3 * this.tileSizePx)
    
    // Draw capture points
    this.tileGraphics.fillStyle(0xfbbf24, 0.6) // Yellow for capture points
    const capturePoints = [
      { x: 10, y: 1 }, { x: 6, y: 4 }, { x: 12, y: 5 },
      { x: 4, y: 6 }, { x: 1, y: 7 }, { x: 9, y: 7 },
      { x: 14, y: 7 }, { x: 5, y: 10 }
    ]
    
    capturePoints.forEach(point => {
      const x = point.x * this.tileSizePx + this.tileSizePx / 2
      const y = point.y * this.tileSizePx + this.tileSizePx / 2
      const radius = Math.max(8, this.tileSizePx * 0.3)
      this.tileGraphics?.fillCircle(x, y, radius)
    })
  }

  private drawTileGraphics() {
    if (!this.showTileGraphics) return
    
    try {
      // Clear any existing fallback graphics first
      if (this.tileGraphics) {
        this.tileGraphics.clear()
      }
      
      // Load the tilemap if not already loaded
      if (!this.tilemap) {
        this.loadTilemap()
        return
      }
      
      // Create layers with proper scaling
      this.createTilemapLayers()
      
      console.log('TileSizeTestScene: Tilemap layers created successfully')
      
    } catch (error) {
      console.warn('TileSizeTestScene: Could not load tilemap:', error)
      // Fallback to simple graphics if tilemap fails
      this.drawFallbackGraphics()
    }
  }

  preload() {
    // Load assets in preload phase (like the real game does)
    console.log(`TileSizeTestScene: Preloading assets for ${this.tileSizePx}px tiles`)
    
    // Load tilemap JSON
    this.load.tilemapTiledJSON('OfficeLayout16x12', '/assets/tilemaps/OfficeLayout16x12.json')
    
    // Load tileset image (correct path from tilesets folder)
    this.load.image('inside', '/assets/tilesets/inside.png')
    
    console.log('TileSizeTestScene: Assets preloaded successfully')
  }

  private loadTilemap() {
    try {
      console.log(`TileSizeTestScene: Creating tilemap with ${this.tileSizePx}px tiles`)
      
      // Create tilemap from preloaded JSON
      this.tilemap = this.make.tilemap({ key: 'OfficeLayout16x12' })
      
      console.log('TileSizeTestScene: Tilemap created:', this.tilemap)
      
      // Create tileset from preloaded image
      this.tileset = this.tilemap.addTilesetImage('OfficeLayout', 'inside', 16, 16, 0, 0)
      
      console.log('TileSizeTestScene: Tileset created:', this.tileset)
      
      if (!this.tileset) {
        throw new Error('Failed to create tileset')
      }
      
      console.log(`TileSizeTestScene: Tilemap loaded successfully with ${this.tileSizePx}px tiles`)
      
    } catch (error) {
      console.error('TileSizeTestScene: Error loading tilemap:', error)
      throw error
    }
  }

  private createTilemapLayers() {
    if (!this.tilemap || !this.tileset) {
      console.warn('TileSizeTestScene: Cannot create layers - tilemap or tileset missing')
      return
    }
    
    try {
      // Create background layer (floor tiles)
      const backgroundLayer = this.tilemap.createLayer('Background', this.tileset, 0, 0)
      if (backgroundLayer) {
        backgroundLayer.setScale(this.tileSizePx / 16) // Scale from 16px to target size
        backgroundLayer.setDepth(10) // Above fallback graphics
      }
      
      // Create foreground layer (walls, obstacles)
      const foregroundLayer = this.tilemap.createLayer('Foreground', this.tileset, 0, 0)
      if (foregroundLayer) {
        foregroundLayer.setScale(this.tileSizePx / 16)
        foregroundLayer.setDepth(110) // Above background
      }
      
      // Create capture points layer
      const captureLayer = this.tilemap.createLayer('CapturePoints', this.tileset, 0, 0)
      if (captureLayer) {
        captureLayer.setScale(this.tileSizePx / 16)
        captureLayer.setDepth(210) // Above foreground
      }
      
      // Create starting positions layer
      const startingLayer = this.tilemap.createLayer('StartingPositions', this.tileset, 0, 0)
      if (startingLayer) {
        startingLayer.setScale(this.tileSizePx / 16)
        startingLayer.setDepth(160) // Above background, below foreground
      }
      
      console.log(`TileSizeTestScene: All tilemap layers created with ${this.tileSizePx}px scaling`)
      
    } catch (error) {
      console.error('TileSizeTestScene: Error creating layers:', error)
      throw error
    }
  }

  private drawFallbackGraphics() {
    // Fallback to simple colored rectangles if tilemap fails
    if (!this.tileGraphics) {
      this.tileGraphics = this.add.graphics()
    }
    
    this.tileGraphics.clear()
    this.tileGraphics.setDepth(1) // Below tilemap layers
    
    const boardWidth = 16
    const boardHeight = 12
    
    // Draw basic grid with fallback colors
    this.tileGraphics.lineStyle(1, 0x666666, 0.5)
    for (let x = 0; x <= boardWidth; x++) {
      const xPos = x * this.tileSizePx
      this.tileGraphics.moveTo(xPos, 0)
      this.tileGraphics.lineTo(xPos, boardHeight * this.tileSizePx)
    }
    for (let y = 0; y <= boardHeight; y++) {
      const yPos = y * this.tileSizePx
      this.tileGraphics.moveTo(0, yPos)
      this.tileGraphics.lineTo(boardWidth * this.tileSizePx, yPos)
    }
    this.tileGraphics.strokePath()
    
    console.log('TileSizeTestScene: Using fallback graphics')
  }

  private drawTestUnits() {
    if (!this.unitGraphics) return
    
    this.unitGraphics.clear()
    
    // Player 1 units (top-left area)
    const player1Units = [
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
      { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 2, y: 2 },
      { x: 3, y: 2 }, { x: 4, y: 2 }
    ]
    
    player1Units.forEach((unit, index) => {
      const x = unit.x * this.tileSizePx + this.tileSizePx / 2
      const y = unit.y * this.tileSizePx + this.tileSizePx / 2
      const radius = Math.max(12, this.tileSizePx * 0.4)
      
      // Unit circle
      this.unitGraphics?.fillStyle(0xfbbf24, 1) // Gold
      this.unitGraphics?.fillCircle(x, y, radius)
      
      // Unit number
      this.add.text(x - 4, y - 8, `${index + 1}`, {
        fontSize: `${Math.max(10, this.tileSizePx * 0.25)}px`,
        color: '#000000',
        fontStyle: 'bold'
      }).setOrigin(0.5)
    })
    
    // Player 2 units (bottom-right area)
    const player2Units = [
      { x: 11, y: 9 }, { x: 12, y: 9 }, { x: 13, y: 9 },
      { x: 10, y: 10 }, { x: 11, y: 10 }, { x: 12, y: 10 },
      { x: 13, y: 10 }, { x: 14, y: 10 }
    ]
    
    player2Units.forEach((unit, index) => {
      const x = unit.x * this.tileSizePx + this.tileSizePx / 2
      const y = unit.y * this.tileSizePx + this.tileSizePx / 2
      const radius = Math.max(12, this.tileSizePx * 0.4)
      
      // Unit circle
      this.unitGraphics?.fillStyle(0x1e3a8a, 1) // Navy
      this.unitGraphics?.fillCircle(x, y, radius)
      
      // Unit number
      this.add.text(x - 4, y - 8, `${index + 1}`, {
        fontSize: `${Math.max(10, this.tileSizePx * 0.25)}px`,
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5)
    })
  }
}

export function TileSizeTestGame({ tileSize, showTileGraphics }: TileSizeTestGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [gameInfo, setGameInfo] = useState({
    tileSize,
    boardWidth: 16 * tileSize,
    boardHeight: 12 * tileSize,
    status: 'Initializing...'
  })

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    console.log(`TileSizeTestGame: Creating test game with ${tileSize}px tiles`)
    
    const boardWidth = 16 * tileSize
    const boardHeight = 12 * tileSize
    
    setGameInfo({
      tileSize,
      boardWidth,
      boardHeight,
      status: 'Creating game...'
    })

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#0f172a',
      scale: {
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.NO_CENTER,
        width: boardWidth,
        height: boardHeight,
        min: { width: 400, height: 300 },
        max: { width: MAPS['OfficeLayout'].width * 64, height: MAPS['OfficeLayout'].height * 64 }
      },
      scene: [new TileSizeTestScene(tileSize, showTileGraphics)],
      physics: { default: 'arcade' }
    })

    gameRef.current = game

    // Listen for scene creation
    game.events.once('scene-start', () => {
      setGameInfo(prev => ({ ...prev, status: 'Game ready!' }))
      console.log(`TileSizeTestGame: Test game ready with ${tileSize}px tiles`)
    })

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
    }
  }, [tileSize, showTileGraphics])

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Test Game Board</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-slate-400">Tile Size:</span>
            <span className="ml-2 font-mono">{gameInfo.tileSize}px</span>
          </div>
          <div>
            <span className="text-slate-400">Width:</span>
            <span className="ml-2 font-mono">{gameInfo.boardWidth}px</span>
          </div>
          <div>
            <span className="text-slate-400">Height:</span>
            <span className="ml-2 font-mono">{gameInfo.boardHeight}px</span>
          </div>
          <div>
            <span className="text-slate-400">Status:</span>
            <span className="ml-2 text-green-400">{gameInfo.status}</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <div 
          ref={containerRef}
          className="border-2 border-slate-600 rounded-lg"
          style={{
            width: gameInfo.boardWidth,
            height: gameInfo.boardHeight,
            maxWidth: '100%'
          }}
        />
      </div>
      
      <div className="mt-4 text-center text-sm text-slate-400">
        <p>This test board uses fixed {tileSize}px tiles to compare with the responsive system</p>
        <p>Check console for detailed logging and compare behavior with main game</p>
      </div>
    </div>
  )
}
