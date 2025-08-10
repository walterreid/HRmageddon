import Phaser from 'phaser'
import { useGameStore } from '../../stores/gameStore'
import { TileType, type Unit, type Tile } from 'shared'

const TILE_SIZE = 64
const BOARD_OFFSET_X = 100
const BOARD_OFFSET_Y = 80

export class GameScene extends Phaser.Scene {
  private tileGraphics: Phaser.GameObjects.Graphics
  private highlightGraphics: Phaser.GameObjects.Graphics
  private unitSprites: Map<string, Phaser.GameObjects.Container> = new Map()
  private unsubscribe?: () => void

  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    const store = useGameStore.getState()
    store.initializeGame()

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

    this.input.on('pointerdown', this.handleClick, this)
  }

  private drawBoard(board: Tile[][]) {
    this.tileGraphics.clear()
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        const tile = board[y][x]
        const px = BOARD_OFFSET_X + x * TILE_SIZE
        const py = BOARD_OFFSET_Y + y * TILE_SIZE

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
        this.tileGraphics.fillRect(px, py, TILE_SIZE - 2, TILE_SIZE - 2)
        this.tileGraphics.lineStyle(1, 0x0f172a, 0.5)
        this.tileGraphics.strokeRect(px, py, TILE_SIZE - 2, TILE_SIZE - 2)
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

    for (const unit of units) {
      const targetX = BOARD_OFFSET_X + unit.position.x * TILE_SIZE + TILE_SIZE / 2
      const targetY = BOARD_OFFSET_Y + unit.position.y * TILE_SIZE + TILE_SIZE / 2
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
      container.setSize(TILE_SIZE, TILE_SIZE)
      container.setData('unitId', unit.id)
      container.setInteractive()
      container.on('pointerdown', () => {
        const u = useGameStore.getState().units.find((uu) => uu.id === unit.id)
        if (u) useGameStore.getState().selectUnit(u)
      })
      this.unitSprites.set(unit.id, container)
    }
  }

  private updateHighlights(highlighted: Map<string, string>, selectedUnit?: Unit) {
    this.highlightGraphics.clear()
    highlighted.forEach((type, key) => {
      const [x, y] = key.split(',').map(Number)
      const px = BOARD_OFFSET_X + x * TILE_SIZE
      const py = BOARD_OFFSET_Y + y * TILE_SIZE
      let color = 0x22c55e
      if (type === 'attack') color = 0xef4444
      if (type === 'ability') color = 0xf59e0b
      if (type === 'capture') color = 0x06b6d4
      this.highlightGraphics.fillStyle(color, 0.3)
      this.highlightGraphics.fillRect(px, py, TILE_SIZE - 2, TILE_SIZE - 2)
    })

    if (selectedUnit) {
      const px = BOARD_OFFSET_X + selectedUnit.position.x * TILE_SIZE
      const py = BOARD_OFFSET_Y + selectedUnit.position.y * TILE_SIZE
      this.highlightGraphics.lineStyle(3, 0xf59e0b, 1)
      this.highlightGraphics.strokeRect(px - 1, py - 1, TILE_SIZE, TILE_SIZE)
    }
  }

  private handleClick(pointer: Phaser.Input.Pointer) {
    const tileX = Math.floor((pointer.x - BOARD_OFFSET_X) / TILE_SIZE)
    const tileY = Math.floor((pointer.y - BOARD_OFFSET_Y) / TILE_SIZE)
    const state = useGameStore.getState()
    const board = state.board
    if (tileX >= 0 && tileX < board[0].length && tileY >= 0 && tileY < board.length) {
      state.selectTile({ x: tileX, y: tileY })
    }
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe()
    super.destroy()
  }
}


