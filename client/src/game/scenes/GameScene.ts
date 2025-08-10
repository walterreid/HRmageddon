import Phaser from 'phaser'
import { useGameStore } from '../../stores/gameStore'
import { TileType, type Unit, type Tile, type Coordinate } from 'shared'
import { getAbilityById, getValidTargets } from '../systems/abilities.ts'

export class GameScene extends Phaser.Scene {
  private tileGraphics!: Phaser.GameObjects.Graphics
  private highlightGraphics!: Phaser.GameObjects.Graphics
  private unitSprites: Map<string, Phaser.GameObjects.Container> = new Map()
  private unsubscribe?: () => void
  
  // Action menu integration
  private actionMode: 'none' | 'move' | 'attack' | 'ability' = 'none'
  private validTargets: (Unit | Coordinate)[] = []
  private targetingMode: boolean = false
  private abilityTargetGraphics!: Phaser.GameObjects.Graphics

  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    console.log('GameScene created')
    
    // Set up graphics for tiles and highlights
    this.tileGraphics = this.add.graphics()
    this.highlightGraphics = this.add.graphics()
    this.abilityTargetGraphics = this.add.graphics()
    
    // Subscribe to game store changes
    this.unsubscribe = useGameStore.subscribe((state) => {
      this.drawBoard(state.board)
      this.drawUnits(state.units)
      this.updateHighlights(state.highlightedTiles, state.selectedUnit)
      this.updateAbilityTargeting(state.selectedUnit, state.selectedAbility)
    })
    
    // Set up input handling
    this.input.on('pointerdown', this.handleClick, this)
    
    // Initial render
    const store = useGameStore.getState()
    this.drawBoard(store.board)
    this.drawUnits(store.units)
  }

  public getTileSize(): number {
    // Calculate tile size based on canvas dimensions
    // Use 80% of available space for the board, divided by grid dimensions
    return Math.min(
      (this.game.config.width as number) * 0.8 / 8,  // 8 columns
      (this.game.config.height as number) * 0.8 / 10  // 10 rows
    )
  }

  public getBoardOffsetX(): number {
    const tileSize = this.getTileSize()
    return ((this.game.config.width as number) - (8 * tileSize)) / 2
  }

  public getBoardOffsetY(): number {
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
      const circleColor = unit.playerId === 'player1' ? 0xFFD700 : 0x191970 // Gold vs Navy
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
    
    // Create a map to track multiple highlight types per tile
    const highlightMap = new Map<string, string[]>()
    
    // Group highlights by coordinate
    highlighted.forEach((type, key) => {
      if (!highlightMap.has(key)) {
        highlightMap.set(key, [])
      }
      highlightMap.get(key)!.push(type)
    })
    
    // Draw each highlight type with appropriate rendering
    highlightMap.forEach((types, coordKey) => {
      const [x, y] = coordKey.split(',').map(Number)
      const tileSize = this.getTileSize()
      const boardOffsetX = this.getBoardOffsetX()
      const boardOffsetY = this.getBoardOffsetY()
      const px = boardOffsetX + x * tileSize
      const py = boardOffsetY + y * tileSize
      
      // Draw each highlight type for this tile
      types.forEach(type => {
        this.drawHighlight(px, py, tileSize, type)
      })
    })

    // Draw selected unit highlight
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

  private drawHighlight(x: number, y: number, tileSize: number, type: string) {
    let color = 0x22c55e // Default green
    let alpha = 0.3
    let isOutline = false
    let isFilled = true
    
    switch (type) {
      case 'movement':
        color = 0x06b6d4 // Cyan outline for movement
        alpha = 0.8
        isOutline = true
        isFilled = false
        break
      case 'attack':
        color = 0xef4444 // Red outline for attack
        alpha = 0.8
        isOutline = true
        isFilled = false
        break
      case 'attack_range':
        color = 0xdc2626 // Darker red for attack range
        alpha = 0.3
        isOutline = true
        isFilled = false
        break
      case 'ability':
        color = 0x8b5cf6 // Purple for ability targeting
        alpha = 0.6
        isOutline = true
        isFilled = false
        break
      case 'ability_aoe':
        color = 0xec4899 // Pink for AOE abilities
        alpha = 0.4
        isOutline = false
        isFilled = true
        break
      case 'target_enemy':
        color = 0xdc2626 // Red filled for enemy targets
        alpha = 0.6
        isOutline = false
        isFilled = true
        break
      case 'target_ally':
        color = 0x16a34a // Green filled for ally targets
        alpha = 0.6
        isOutline = false
        isFilled = true
        break
      case 'capture':
        color = 0x06b6d4 // Cyan for capture
        alpha = 0.4
        isOutline = false
        isFilled = true
        break
      case 'invalid':
        color = 0x6b7280 // Gray for invalid targets
        alpha = 0.5
        isOutline = false
        isFilled = true
        break
      default:
        color = 0x22c55e // Default green
        alpha = 0.3
        isOutline = false
        isFilled = true
    }
    
    if (isFilled) {
      this.highlightGraphics.fillStyle(color, alpha)
      this.highlightGraphics.fillRect(x, y, tileSize - 2, tileSize - 2)
    }
    
    if (isOutline) {
      this.highlightGraphics.lineStyle(2, color, alpha)
      this.highlightGraphics.strokeRect(x, y, tileSize - 2, tileSize - 2)
    }
  }

  private updateAbilityTargeting(selectedUnit?: Unit, selectedAbility?: string) {
    this.abilityTargetGraphics.clear()
    
    if (!selectedUnit || !selectedAbility) {
      this.targetingMode = false
      this.validTargets = []
      return
    }

    const ability = getAbilityById(selectedAbility)
    if (!ability) return

    const store = useGameStore.getState()
    this.validTargets = getValidTargets(selectedUnit, ability, store.board)
    this.targetingMode = true

    // Handle different targeting types
    switch (ability.targetingType) {
      case 'aoe_cone':
        this.showConePreview(selectedUnit, ability)
        break
      case 'aoe_circle':
        this.showCirclePreview(selectedUnit, ability)
        break
      case 'single_target':
      default:
        this.showStandardTargeting()
        break
    }
  }

  private showStandardTargeting() {
    // Highlight valid targets with standard targeting
    this.validTargets.forEach(target => {
      if ('x' in target) {
        // Target is a coordinate
        const tileSize = this.getTileSize()
        const boardOffsetX = this.getBoardOffsetX()
        const boardOffsetY = this.getBoardOffsetY()
        const px = boardOffsetX + target.x * tileSize
        const py = boardOffsetY + target.y * tileSize
        
        this.abilityTargetGraphics.lineStyle(2, 0xf59e0b, 0.8)
        this.abilityTargetGraphics.strokeRect(px, py, tileSize, tileSize)
        this.abilityTargetGraphics.fillRect(px, py, tileSize, tileSize)
        this.abilityTargetGraphics.fillStyle(0xf59e0b, 0.2)
        this.abilityTargetGraphics.fillRect(px, py, tileSize, tileSize)
      } else {
        // Target is a unit
        const tileSize = this.getTileSize()
        const boardOffsetX = this.getBoardOffsetX()
        const boardOffsetY = this.getBoardOffsetY()
        const px = boardOffsetX + target.position.x * tileSize
        const py = boardOffsetY + target.position.y * tileSize
        
        this.abilityTargetGraphics.lineStyle(2, 0xf59e0b, 0.8)
        this.abilityTargetGraphics.strokeCircle(px + tileSize/2, py + tileSize/2, tileSize/2 + 2)
        this.abilityTargetGraphics.fillStyle(0xf59e0b, 0.2)
        this.abilityTargetGraphics.fillCircle(px + tileSize/2, py + tileSize/2, tileSize/2)
      }
    })
  }

  private showConePreview(caster: Unit, ability: any) {
    // For cone abilities, show a preview of the cone area
    const tileSize = this.getTileSize()
    const boardOffsetX = this.getBoardOffsetX()
    const boardOffsetY = this.getBoardOffsetY()
    const casterX = boardOffsetX + caster.position.x * tileSize + tileSize / 2
    const casterY = boardOffsetY + caster.position.y * tileSize + tileSize / 2
    
    // Draw cone preview (simplified for now - can be enhanced with mouse tracking)
    const coneRadius = (ability.aoeRadius || 3) * tileSize
    const coneAngle = (ability.coneAngle || 90) * Math.PI / 180 // Convert to radians
    
    // Draw cone outline
    this.abilityTargetGraphics.lineStyle(3, 0xec4899, 0.8)
    this.abilityTargetGraphics.beginPath()
    this.abilityTargetGraphics.moveTo(casterX, casterY)
    
    // Draw cone arc (facing right for now)
    const startAngle = -coneAngle / 2
    const endAngle = coneAngle / 2
    this.abilityTargetGraphics.arc(casterX, casterY, coneRadius, startAngle, endAngle)
    this.abilityTargetGraphics.lineTo(casterX, casterY)
    this.abilityTargetGraphics.strokePath()
    
    // Fill cone area
    this.abilityTargetGraphics.fillStyle(0xec4899, 0.2)
    this.abilityTargetGraphics.fill()
  }

  private showCirclePreview(caster: Unit, ability: any) {
    // For circle AOE abilities, show the area of effect
    const tileSize = this.getTileSize()
    const boardOffsetX = this.getBoardOffsetX()
    const boardOffsetY = this.getBoardOffsetY()
    const casterX = boardOffsetX + caster.position.x * tileSize + tileSize / 2
    const casterY = boardOffsetY + caster.position.y * tileSize + tileSize / 2
    
    const aoeRadius = (ability.aoeRadius || 2) * tileSize
    
    // Draw circle outline
    this.abilityTargetGraphics.lineStyle(3, 0xec4899, 0.8)
    this.abilityTargetGraphics.strokeCircle(casterX, casterY, aoeRadius)
    
    // Fill circle area
    this.abilityTargetGraphics.fillStyle(0xec4899, 0.2)
    this.abilityTargetGraphics.fill()
  }

  private handleClick(pointer: Phaser.Input.Pointer) {
    
    const store = useGameStore.getState()
    
    // If we're in ability targeting mode, handle ability target selection
    if (this.targetingMode && store.selectedAbility) {
      const tileSize = this.getTileSize()
      const boardOffsetX = this.getBoardOffsetX()
      const boardOffsetY = this.getBoardOffsetY()
      const tileX = Math.floor((pointer.x - boardOffsetX) / tileSize)
      const tileY = Math.floor((pointer.y - boardOffsetY) / tileSize)
      
      // Check if clicked on a valid target
      const clickedTarget = this.validTargets.find(target => {
        if ('x' in target) {
          return target.x === tileX && target.y === tileY
        } else {
          return target.position.x === tileX && target.position.y === tileY
        }
      })
      
      if (clickedTarget && store.selectedUnit) {
        // Use the ability on the target
        store.useAbility(store.selectedUnit.id, store.selectedAbility, clickedTarget)
        // Clear targeting mode and action mode
        store.selectAbility('')
        this.actionMode = 'none'
        return
      }
      
      // If clicked outside valid targets, cancel targeting
      store.selectAbility('')
      this.actionMode = 'none'
      return
    }
    
    // If we're in action mode, handle tile clicks for movement/attack FIRST
    if (this.actionMode !== 'none' && store.selectedUnit) {
      const previousActionMode = this.actionMode
      this.handleActionModeClick(store.selectedUnit, pointer)
      
      // If the action wasn't completed, check if we clicked outside valid tiles
      if (this.actionMode === previousActionMode) {
        const tileSize = this.getTileSize()
        const boardOffsetX = this.getBoardOffsetX()
        const boardOffsetY = this.getBoardOffsetY()
        const tileX = Math.floor((pointer.x - boardOffsetX) / tileSize)
        const tileY = Math.floor((pointer.y - boardOffsetY) / tileSize)
        
        // Check if clicked outside the board or on an invalid tile
        const board = store.board
        if (tileX < 0 || tileX >= board[0].length || tileY < 0 || tileY >= board.length) {
          // Clicked outside board - cancel action mode
          this.setActionMode('none')
          return
        }
        
        // Check if clicked on a tile that's not a valid move/attack target
        let isValidTarget = false
        if (this.actionMode === 'move') {
          isValidTarget = store.possibleMoves.some(move => move.x === tileX && move.y === tileY)
        } else if (this.actionMode === 'attack') {
          isValidTarget = store.possibleTargets.some(target => target.x === tileX && target.y === tileY)
        }
        
        if (!isValidTarget) {
          // Clicked on invalid tile - cancel action mode
          this.setActionMode('none')
          return
        }
      }
      return
    }
    
    // Check if we clicked on a unit
    for (const [unitId, container] of this.unitSprites) {
      const bounds = container.getBounds()
      if (bounds.contains(pointer.x, pointer.y)) {
        const unit = store.units.find(u => u.id === unitId)
        if (unit) {
          // PRIORITY: If we're in action mode and this is a valid target, execute the action
          if (this.actionMode !== 'none' && store.selectedUnit) {
            if (this.actionMode === 'attack') {
              // Check if this unit is a valid attack target
              const isValidTarget = store.possibleTargets.some(target => 
                target.x === unit.position.x && target.y === unit.position.y
              )
              if (isValidTarget && unit.playerId !== store.selectedUnit.playerId) {
                // Execute attack on this enemy unit
                store.attackTarget(store.selectedUnit.id, unit.id)
                this.actionMode = 'none'
                return
              }
            } else if (this.actionMode === 'move') {
              // Check if this unit's position is a valid move target
              const isValidMove = store.possibleMoves.some(move => 
                move.x === unit.position.x && move.y === unit.position.y
              )
              if (isValidMove) {
                // Execute move to this position
                store.moveUnit(store.selectedUnit.id, unit.position)
                this.actionMode = 'none'
                return
              }
            }
          }
          
          // If not in action mode or not a valid target, proceed with normal unit selection
          // Check if we should execute an action instead of selecting the unit
          if (store.shouldExecuteActionInsteadOfSelect && 
              store.shouldExecuteActionInsteadOfSelect(unit, store.selectedUnit)) {
            // Execute the action instead of switching units
            if (store.selectedUnit && store.isValidAttackTarget) {
              // Double-check that this is a valid attack target
              if (store.isValidAttackTarget(store.selectedUnit, unit)) {
                store.attackTarget(store.selectedUnit.id, unit.id)
                return
              }
            }
          }

          // Check if we should execute a move instead of selecting the unit
          if (store.shouldExecuteMoveInsteadOfSelect && 
              store.shouldExecuteMoveInsteadOfSelect(unit, store.selectedUnit)) {
            // Execute the move instead of switching units
            if (store.selectedUnit) {
              store.moveUnit(store.selectedUnit.id, unit.position)
              return
            }
          }
          
          // Select the unit (this will show the action menu for player units)
          store.selectUnit(unit)
          return
        }
      }
    }
    
    // Fall back to tile selection - emit event for GameHUD to handle
    // This should only happen when not in action mode to avoid conflicts
    if (this.actionMode === 'none') {
      const tileSize = this.getTileSize()
      const boardOffsetX = this.getBoardOffsetX()
      const boardOffsetY = this.getBoardOffsetY()
      const tileX = Math.floor((pointer.x - boardOffsetX) / tileSize)
      const tileY = Math.floor((pointer.y - boardOffsetY) / tileSize)
      const board = store.board
      
      if (tileX >= 0 && tileX < board[0].length && tileY >= 0 && tileY < board.length) {
        // Emit tile click event for GameHUD to handle
        const event = new CustomEvent('gameTileClick', {
          detail: { coord: { x: tileX, y: tileY } }
        })
        window.dispatchEvent(event)
        
        // Also handle tile selection in store for backward compatibility
        store.selectTile({ x: tileX, y: tileY })
      }
    }
  }

  private handleActionModeClick(unit: Unit, pointer: Phaser.Input.Pointer) {
    const store = useGameStore.getState()
    const tileSize = this.getTileSize()
    const boardOffsetX = this.getBoardOffsetX()
    const boardOffsetY = this.getBoardOffsetY()
    const tileX = Math.floor((pointer.x - boardOffsetX) / tileSize)
    const tileY = Math.floor((pointer.y - boardOffsetY) / tileSize)
    
    // Emit tile click event for GameHUD to handle
    const event = new CustomEvent('gameTileClick', {
      detail: { coord: { x: tileX, y: tileY } }
    })
    window.dispatchEvent(event)
    
    switch (this.actionMode) {
      case 'move':
        // Check if the clicked tile is a valid move
        const isValidMove = store.possibleMoves.some(move => move.x === tileX && move.y === tileY)
        if (isValidMove) {
          store.moveUnit(unit.id, { x: tileX, y: tileY })
          this.actionMode = 'none'
          // Clear highlights after successful move
          this.highlightGraphics.clear()
        }
        break
        
      case 'attack':
        // Check if the clicked tile has an enemy unit
        const targetUnit = store.units.find(u => u.position.x === tileX && u.position.y === tileY && u.playerId !== unit.playerId)
        if (targetUnit) {
          store.attackTarget(unit.id, targetUnit.id)
          this.actionMode = 'none'
          // Clear highlights after successful attack
          this.highlightGraphics.clear()
        }
        break
        
      case 'ability':
        // Handle ability targeting (already handled above)
        break
    }
  }

  // Public method to set action mode from the ActionMenu
  setActionMode(mode: 'none' | 'move' | 'attack' | 'ability', abilityId?: string) {
    this.actionMode = mode
    
    if (mode === 'none') {
      // Clear highlights when exiting action mode
      this.highlightGraphics.clear()
      // Restore normal unit highlights
      const store = useGameStore.getState()
      if (store.selectedUnit) {
        this.updateHighlights(store.highlightedTiles, store.selectedUnit)
      }
    } else if (mode === 'move') {
      // Clear existing highlights and show move highlights
      this.highlightGraphics.clear()
      const store = useGameStore.getState()
      if (store.selectedUnit) {
        // Show move highlights
        store.possibleMoves.forEach(move => {
          const tileSize = this.getTileSize()
          const boardOffsetX = this.getBoardOffsetX()
          const boardOffsetY = this.getBoardOffsetY()
          const px = boardOffsetX + move.x * tileSize
          const py = boardOffsetY + move.y * tileSize
          
          // Draw blue highlight for move targets
          this.highlightGraphics.fillStyle(0x3b82f6, 0.6)
          this.highlightGraphics.fillRect(px, py, tileSize, tileSize)
          this.highlightGraphics.lineStyle(2, 0x1d4ed8, 1)
          this.highlightGraphics.strokeRect(px, py, tileSize, tileSize)
        })
      }
    } else if (mode === 'attack') {
      // Show attack highlights on enemies in range
      this.showAttackHighlights()
    } else if (mode === 'ability' && abilityId) {
      // Show ability highlights on valid targets
      this.showAbilityHighlights(abilityId)
    }
  }

  // Public getter for action mode
  getActionMode(): 'none' | 'move' | 'attack' | 'ability' {
    return this.actionMode
  }

  // Public method to clear action mode
  clearActionMode() {
    this.actionMode = 'none'
    this.highlightGraphics.clear()
    // Restore normal unit highlights
    const store = useGameStore.getState()
    if (store.selectedUnit) {
      this.updateHighlights(store.highlightedTiles, store.selectedUnit)
    }
  }

  // Show attack highlights on enemies in attack range
  private showAttackHighlights() {
    const store = useGameStore.getState()
    if (!store.selectedUnit) return

    // Clear existing highlights
    this.highlightGraphics.clear()
    
    // Get only enemies in attack range (use possibleTargets from store)
    const possibleTargets = store.possibleTargets
    const enemies = store.units.filter(u => 
      u.playerId !== store.selectedUnit!.playerId &&
      possibleTargets.some(target => target.x === u.position.x && target.y === u.position.y)
    )
    
    // Highlight each enemy position with red
    enemies.forEach(enemy => {
      const tileSize = this.getTileSize()
      const boardOffsetX = this.getBoardOffsetX()
      const boardOffsetY = this.getBoardOffsetY()
      const px = boardOffsetX + enemy.position.x * tileSize
      const py = boardOffsetY + enemy.position.y * tileSize
      
      // Draw red highlight for enemy targets
      this.highlightGraphics.fillStyle(0xef4444, 0.6)
      this.highlightGraphics.fillRect(px, py, tileSize, tileSize)
      this.highlightGraphics.lineStyle(2, 0xdc2626, 1)
      this.highlightGraphics.strokeRect(px, py, tileSize, tileSize)
    })
  }

  // Show ability highlights on valid targets
  private showAbilityHighlights(abilityId: string) {
    const store = useGameStore.getState()
    if (!store.selectedUnit) return

    // Clear existing highlights
    this.highlightGraphics.clear()
    
    // Get valid targets for this ability
    const validTargets = getValidTargets(store.selectedUnit, { id: abilityId } as any, store.board)
    
    // Highlight each valid target with purple
    validTargets.forEach(target => {
      const tileSize = this.getTileSize()
      const boardOffsetX = this.getBoardOffsetX()
      const boardOffsetY = this.getBoardOffsetY()
      
      let px: number, py: number
      if ('x' in target) {
        // Coordinate target
        px = boardOffsetX + target.x * tileSize
        py = boardOffsetY + target.y * tileSize
      } else {
        // Unit target
        px = boardOffsetX + target.position.x * tileSize
        py = boardOffsetY + target.position.y * tileSize
      }
      
      // Draw purple highlight for ability targets
      this.highlightGraphics.fillStyle(0x8b5cf6, 0.6)
      this.highlightGraphics.fillRect(px, py, tileSize, tileSize)
      this.highlightGraphics.lineStyle(2, 0x7c3aed, 1)
      this.highlightGraphics.strokeRect(px, py, tileSize, tileSize)
    })
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe()
  }

  // Ability visual effects
  playAbilityEffect(abilityId: string, target: Unit | Coordinate) {
    const ability = getAbilityById(abilityId)
    if (!ability) return

    switch (ability.visualEffect) {
      case 'coffee_steam':
        this.createCoffeeParticles(target)
        break
      case 'pink_slip_flash':
        this.createPinkSlipEffect(target)
        break
      case 'paper_flying':
        this.createPaperEffect(target)
        break
      case 'harass_aura':
        this.createHarassEffect(target)
        break
      case 'overtime_glow':
        this.createOvertimeEffect(target)
        break
      default:
        this.createGenericEffect(target)
    }
  }

  private createCoffeeParticles(target: Unit | Coordinate) {
    const position = this.getTargetPosition(target)
    if (!position) return

    // Create simple coffee steam effect with graphics
    for (let i = 0; i < 8; i++) {
      const steam = this.add.graphics()
      steam.fillStyle(0x8B4513, 0.6)
      steam.fillCircle(0, 0, 3)
      
      steam.setPosition(position.x, position.y)
      
      this.tweens.add({
        targets: steam,
        x: position.x + (Math.random() - 0.5) * 60,
        y: position.y - Math.random() * 80,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 1500,
        onComplete: () => steam.destroy()
      })
    }
  }

  private createPinkSlipEffect(target: Unit | Coordinate) {
    const position = this.getTargetPosition(target)
    if (!position) return

    // Create a flash effect
    const flash = this.add.graphics()
    flash.fillStyle(0xff0000, 0.8)
    flash.fillRect(position.x - 20, position.y - 20, 40, 40)
    
    // Fade out
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      onComplete: () => flash.destroy()
    })
  }

  private createPaperEffect(target: Unit | Coordinate) {
    const position = this.getTargetPosition(target)
    if (!position) return

    // Create flying paper effect
    for (let i = 0; i < 5; i++) {
      const paper = this.add.graphics()
      paper.fillStyle(0xffffff, 0.9)
      paper.fillRect(0, 0, 8, 10)
      
      paper.setPosition(position.x, position.y)
      
      this.tweens.add({
        targets: paper,
        x: position.x + (Math.random() - 0.5) * 100,
        y: position.y + (Math.random() - 0.5) * 100,
        rotation: Math.PI * 2,
        alpha: 0,
        duration: 1000,
        onComplete: () => paper.destroy()
      })
    }
  }

  private createHarassEffect(target: Unit | Coordinate) {
    const position = this.getTargetPosition(target)
    if (!position) return

    // Create harassing aura effect
    const aura = this.add.graphics()
    aura.lineStyle(3, 0xff0000, 0.6)
    aura.strokeCircle(position.x, position.y, 30)
    
    this.tweens.add({
      targets: aura,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 800,
      onComplete: () => aura.destroy()
    })
  }

  private createOvertimeEffect(target: Unit | Coordinate) {
    const position = this.getTargetPosition(target)
    if (!position) return

    // Create overtime glow effect
    const glow = this.add.graphics()
    glow.fillStyle(0xffff00, 0.4)
    glow.fillCircle(position.x, position.y, 25)
    
    this.tweens.add({
      targets: glow,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 1200,
      onComplete: () => glow.destroy()
    })
  }

  private createGenericEffect(target: Unit | Coordinate) {
    const position = this.getTargetPosition(target)
    if (!position) return

    // Generic sparkle effect
    const sparkle = this.add.graphics()
    sparkle.fillStyle(0x00ffff, 0.7)
    sparkle.fillCircle(position.x, position.y, 15)
    
    this.tweens.add({
      targets: sparkle,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 600,
      onComplete: () => sparkle.destroy()
    })
  }

  private getTargetPosition(target: Unit | Coordinate): { x: number, y: number } | null {
    const tileSize = this.getTileSize()
    const boardOffsetX = this.getBoardOffsetX()
    const boardOffsetY = this.getBoardOffsetY()
    
    if ('x' in target) {
      // Target is a coordinate
      return {
        x: boardOffsetX + target.x * tileSize + tileSize / 2,
        y: boardOffsetY + target.y * tileSize + tileSize / 2
      }
    } else {
      // Target is a unit
      return {
        x: boardOffsetX + target.position.x * tileSize + tileSize / 2,
        y: boardOffsetY + target.position.y * tileSize + tileSize / 2
      }
    }
  }
}


