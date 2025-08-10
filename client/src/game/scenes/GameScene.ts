import Phaser from 'phaser'
import { useGameStore } from '../../stores/gameStore'
import { TileType, type Unit, type Tile } from 'shared'

export class GameScene extends Phaser.Scene {
  private tileGraphics!: Phaser.GameObjects.Graphics
  private highlightGraphics!: Phaser.GameObjects.Graphics
  private unitSprites: Map<string, Phaser.GameObjects.Container> = new Map()
  private unsubscribe?: () => void

  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    const store = useGameStore.getState()
    // Don't call initializeGame here - the game should already be initialized
    // from the draft system or other initialization flow

    this.tileGraphics = this.add.graphics()
    this.highlightGraphics = this.add.graphics()

    this.drawBoard(store.board)
    this.drawUnits(store.units)
    this.updateHighlights(store.highlightedTiles, store.selectedUnit)

    this.unsubscribe = useGameStore.subscribe((state) => {
      this.drawBoard(state.board)
      this.drawUnits(state.units)
      this.updateHighlights(state.highlightedTiles, state.selectedUnit)
    })

    // Enhanced input handling for Safari compatibility
    this.input.on('pointerdown', this.handleClick, this)
    
    // Configure input for better Safari support
    this.input.setDefaultCursor('pointer')
    
    console.log('GameScene created with enhanced input handling') // Debug log
  }

  private getTileSize(): number {
    // Calculate tile size based on canvas dimensions
    // Use 80% of available space for the board, divided by grid dimensions
    return Math.min(
      (this.game.config.width as number) * 0.8 / 8,  // 8 columns
      (this.game.config.height as number) * 0.8 / 10  // 10 rows
    )
  }

  private getBoardOffsetX(): number {
    const tileSize = this.getTileSize()
    return ((this.game.config.width as number) - (8 * tileSize)) / 2
  }

  private getBoardOffsetY(): number {
    const tileSize = this.getTileSize()
    return ((this.game.config.height as number) - (10 * tileSize)) / 2
  }

  private drawBoard(board: Tile[][]) {
    this.tileGraphics.clear()
    const tileSize = this.getTileSize()
    const boardOffsetX = this.getBoardOffsetX()
    const boardOffsetY = this.getBoardOffsetY()
    
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        const tile = board[y][x]
        const px = boardOffsetX + x * tileSize
        const py = boardOffsetY + y * tileSize

        let color = 0xcccccc
        switch (tile.type) {
          case TileType.NORMAL:
            color = 0x94a3b8
            break
          case TileType.CUBICLE:
            color = 0xfde68a
            break
          case TileType.OBSTACLE:
            color = 0x475569
            break
          case TileType.CONFERENCE_ROOM:
            color = 0x8b7355
            break
          case TileType.HQ_BLUE:
            color = 0x3b82f6
            break
          case TileType.HQ_RED:
            color = 0xef4444
            break
        }

        // owner tint for cubicles
        if (tile.type === TileType.CUBICLE && tile.owner) {
          color = tile.owner === 'player1' ? 0x93c5fd : 0xfca5a5
        }

        this.tileGraphics.fillStyle(color, 1)
        this.tileGraphics.fillRect(px, py, tileSize - 2, tileSize - 2)
        this.tileGraphics.lineStyle(1, 0x0f172a, 0.5)
        this.tileGraphics.strokeRect(px, py, tileSize - 2, tileSize - 2)
      }
    }
  }

  private drawUnits(units: Unit[]) {
    // remove containers that no longer exist
    this.unitSprites.forEach((container, id) => {
      if (!units.find((u) => u.id === id)) {
        container.destroy()
        this.unitSprites.delete(id)
      }
    })

    const tileSize = this.getTileSize()
    const boardOffsetX = this.getBoardOffsetX()
    const boardOffsetY = this.getBoardOffsetY()

    for (const unit of units) {
      const targetX = boardOffsetX + unit.position.x * tileSize + tileSize / 2
      const targetY = boardOffsetY + unit.position.y * tileSize + tileSize / 2
      const existing = this.unitSprites.get(unit.id)
      if (existing) {
        this.tweens.add({ targets: existing, x: targetX, y: targetY, duration: 250, ease: 'Power2' })
        // Update HP bar width
        const hpFill = existing.getByName('hpFill') as Phaser.GameObjects.Rectangle
        if (hpFill) hpFill.width = 40 * (unit.hp / unit.maxHp)
        continue
      }

      const container = this.add.container(targetX, targetY)
      const circleColor = unit.playerId === 'player1' ? 0x2563eb : 0xdc2626
      const circle = this.add.circle(0, 0, 20, circleColor)
      const label = this.add.text(0, 0, unit.type.charAt(0).toUpperCase(), { color: '#fff', fontSize: '14px' })
      label.setOrigin(0.5)
      const hpBg = this.add.rectangle(0, -28, 40, 6, 0x000000).setOrigin(0.5)
      const hpFill = this.add.rectangle(-20, -28, 40 * (unit.hp / unit.maxHp), 6, 0x16a34a)
        .setOrigin(0, 0.5)
        .setName('hpFill')
      container.add([circle, label, hpBg, hpFill])
      
      // Make the container interactive with proper hit area
      container.setSize(tileSize, tileSize)
      container.setData('unitId', unit.id)
      
      // Enhanced interactivity for Safari compatibility
      container.setInteractive(new Phaser.Geom.Rectangle(-tileSize/2, -tileSize/2, tileSize, tileSize), Phaser.Geom.Rectangle.Contains)
      
      // Add multiple event listeners for better compatibility
      container.on('pointerdown', () => {
        console.log('Unit clicked:', unit.id) // Debug log
        const u = useGameStore.getState().units.find((uu) => uu.id === unit.id)
        if (u) useGameStore.getState().selectUnit(u)
        
        // Add click feedback
        circle.setScale(0.9)
        this.time.delayedCall(100, () => {
          circle.setScale(1)
        })
      })
      
      // Add visual feedback for interactivity
      container.on('pointerover', () => {
        circle.setStrokeStyle(2, 0xffffff, 0.8)
        // Add a subtle glow effect
        circle.setAlpha(0.9)
      })
      
      container.on('pointerout', () => {
        circle.setStrokeStyle(0)
        circle.setAlpha(1)
      })
      
      this.unitSprites.set(unit.id, container)
    }
  }

  private updateHighlights(highlighted: Map<string, string>, selectedUnit?: Unit) {
    this.highlightGraphics.clear()
    highlighted.forEach((type, key) => {
      const [x, y] = key.split(',').map(Number)
      const tileSize = this.getTileSize()
      const boardOffsetX = this.getBoardOffsetX()
      const boardOffsetY = this.getBoardOffsetY()
      const px = boardOffsetX + x * tileSize
      const py = boardOffsetY + y * tileSize
      let color = 0x22c55e
      if (type === 'attack') color = 0xef4444
      if (type === 'ability') color = 0xf59e0b
      if (type === 'capture') color = 0x06b6d4
      this.highlightGraphics.fillStyle(color, 0.3)
      this.highlightGraphics.fillRect(px, py, tileSize - 2, tileSize - 2)
    })

    if (selectedUnit) {
      const tileSize = this.getTileSize()
      const boardOffsetX = this.getBoardOffsetX()
      const boardOffsetY = this.getBoardOffsetY()
      const px = boardOffsetX + selectedUnit.position.x * tileSize
      const py = boardOffsetY + selectedUnit.position.y * tileSize
      this.highlightGraphics.lineStyle(3, 0xf59e0b, 1)
      this.highlightGraphics.strokeRect(px - 1, py - 1, tileSize, tileSize)
    }
  }

  private handleClick(pointer: Phaser.Input.Pointer) {
    console.log('Click detected at:', pointer.x, pointer.y) // Debug log
    
    // Check if we clicked on a unit first by checking all unit containers
    for (const [unitId, container] of this.unitSprites) {
      const bounds = container.getBounds()
      if (bounds.contains(pointer.x, pointer.y)) {
        console.log('Click hit unit container:', unitId) // Debug log
        const unit = useGameStore.getState().units.find(u => u.id === unitId)
        if (unit) {
          useGameStore.getState().selectUnit(unit)
          return
        }
      }
    }
    
    // Fall back to tile selection
    const tileSize = this.getTileSize()
    const boardOffsetX = this.getBoardOffsetX()
    const boardOffsetY = this.getBoardOffsetY()
    const tileX = Math.floor((pointer.x - boardOffsetX) / tileSize)
    const tileY = Math.floor((pointer.y - boardOffsetY) / tileSize)
    const state = useGameStore.getState()
    const board = state.board
    if (tileX >= 0 && tileX < board[0].length && tileY >= 0 && tileY < board.length) {
      console.log('Selecting tile:', tileX, tileY) // Debug log
      state.selectTile({ x: tileX, y: tileY })
    }
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe()
  }
}


