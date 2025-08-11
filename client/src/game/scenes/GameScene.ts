import Phaser from 'phaser'
import { useGameStore } from '../../stores/gameStore'
import { TileType, type Unit, type Tile, type Coordinate, AbilityTargetingType } from 'shared'
import { getAbilityById, getValidTargets } from '../systems/abilities.ts'

// ===== GAME SCENE CONFIGURATION =====
const VISUAL_CONFIG = {
  // Tile Colors (Corporate Beige & Gray Theme)
  COLORS: {
    TILES: {
      NORMAL: 0xf5f5f4,        // Stone-100 (Light beige)
      CUBICLE: 0xfef3c7,       // Amber-100 (Very light amber)
      OBSTACLE: 0x78716c,      // Stone-500 (Medium gray)
      CONFERENCE_ROOM: 0xd6d3d1, // Stone-300 (Light gray)
      HQ_BLUE: 0x57534e,       // Stone-600 (Dark gray for Player 1 HQ)
      HQ_RED: 0x44403c,        // Stone-700 (Darker gray for Player 2 HQ)
    },
    OWNERSHIP: {
      PLAYER1_CUBICLE: 0xfbbf24, // Amber-400 (Gold for Player 1)
      PLAYER2_CUBICLE: 0x6b7280, // Stone-500 (Gray for Player 2)
    },
    UNITS: {
      PLAYER1: 0xf59e0b,       // Amber-500 (Corporate gold)
      PLAYER2: 0x57534e,       // Stone-600 (Corporate gray)
      HP_BAR_BG: 0x000000,     // Black (kept for contrast)
      HP_BAR_FILL: 0x16a34a,   // Green-600 (kept for healing)
      SELECTION_BORDER: 0xf59e0b, // Amber-500 (Corporate gold)
      HOVER_BORDER: 0x78716c,  // Stone-500 (Corporate gray)
    },
    HIGHLIGHTS: {
      MOVEMENT: 0x78716c,      // Stone-500 (Corporate gray for movement)
      ATTACK: 0xef4444,        // Red-500 (Kept red for damage/attack)
      ATTACK_RANGE: 0xdc2626,  // Red-600 (Kept red for attack range)
      ABILITY: 0xf59e0b,       // Amber-500 (Corporate gold for abilities)
      ABILITY_AOE: 0xfbbf24,   // Amber-400 (Lighter gold for AOE abilities)
      MOVEMENT_BORDER: 0x57534e, // Stone-600 (Darker border for movement)
      ATTACK_BORDER: 0xdc2626,   // Red-600 (Darker border for attack)
      ABILITY_BORDER: 0xd97706,  // Amber-600 (Darker border for abilities)
    }
  },
  
  // Visual Properties
  UNIT: {
    CIRCLE_RADIUS: 20,
    FONT_SIZE: '14px',
    HP_BAR_WIDTH: 40,
    HP_BAR_HEIGHT: 6,
    HP_BAR_OFFSET_Y: -28,
    SELECTION_BORDER_WIDTH: 3,
    HOVER_BORDER_WIDTH: 2,
    HOVER_ALPHA: 0.9,
  },
  
  // Highlight Properties
  HIGHLIGHT: {
    MOVEMENT_ALPHA: 0.4,
    ATTACK_ALPHA: 0.3,
    ATTACK_RANGE_ALPHA: 0.2,
    ABILITY_ALPHA: 0.3,
    AOE_ALPHA: 0.4,
    BORDER_WIDTH: 2,
    TILE_BORDER_ALPHA: 0.5,
    OVERLAY_ENABLED: true, // Use transparent overlays instead of borders
  },
  
  // Animation
  ANIMATION: {
    MOVEMENT_DURATION: 250,
    CLICK_SCALE_DURATION: 100,
    CLICK_SCALE_FACTOR: 0.9,
  }
}
// ===== END CONFIGURATION =====

export class GameScene extends Phaser.Scene {
  private tileGraphics!: Phaser.GameObjects.Graphics
  private highlightGraphics!: Phaser.GameObjects.Graphics
  private unitSprites: Map<string, Phaser.GameObjects.Container> = new Map()
  private unsubscribe?: () => void
  private isDestroyed: boolean = false
  private lastSelectedAbility?: string // Track ability changes for synchronization
  
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
    
    // Ensure ability graphics are drawn on top
    this.abilityTargetGraphics.setDepth(100)
    
    console.log('Graphics initialized:', {
      tileGraphics: !!this.tileGraphics,
      highlightGraphics: !!this.highlightGraphics,
      abilityTargetGraphics: !!this.abilityTargetGraphics
    })
    
    // Subscribe to game store changes
    this.unsubscribe = useGameStore.subscribe((state) => {
      try {
        // Check if scene is still valid and has a valid manager
        if (this.isDestroyed || !this.scene || !this.scene.manager || !this.scene.isActive || !this.scene.isActive()) {
          console.warn('Scene destroyed or not active, skipping render update')
          return
        }
        
        if (!this.tileGraphics || !this.highlightGraphics || !this.abilityTargetGraphics) {
          console.warn('Graphics not initialized, skipping render update')
          return
        }
        
        // Check for ability changes specifically
        if (state.selectedAbility !== this.lastSelectedAbility) {
          console.log('Ability selection changed:', {
            from: this.lastSelectedAbility,
            to: state.selectedAbility
          })
          this.lastSelectedAbility = state.selectedAbility
          
          // Force complete re-render of highlights
          this.highlightGraphics.clear()
          this.abilityTargetGraphics.clear()
          
          if (state.selectedAbility) {
            console.log('Ability mode active, updating ability targeting')
            this.updateAbilityTargeting(state.selectedUnit, state.selectedAbility)
          } else {
            console.log('Ability mode cleared, updating normal highlights')
            this.updateHighlights(state.highlightedTiles, state.selectedUnit)
          }
        } else {
          // Regular update (no ability change)
          console.log('Regular rendering update:', {
            board: state.board?.length,
            units: state.units?.length,
            highlights: state.highlightedTiles?.size,
            selectedUnit: !!state.selectedUnit,
            selectedAbility: !!state.selectedAbility
          })
          
          this.drawBoard(state.board)
          this.drawUnits(state.units)
          
          // If an ability is selected, don't show movement highlights
          if (state.selectedAbility) {
            console.log('Ability selected, clearing movement highlights and showing ability range')
            // Clear movement highlights when ability is active
            this.highlightGraphics.clear()
            // Only show ability targeting
            this.updateAbilityTargeting(state.selectedUnit, state.selectedAbility)
          } else {
            console.log('No ability selected, showing normal highlights')
            // Show normal highlights (movement, attack, etc.)
            this.updateHighlights(state.highlightedTiles, state.selectedUnit)
            // Clear ability targeting graphics
            this.abilityTargetGraphics.clear()
          }
        }
      } catch (error) {
        console.error('Error in game store subscription:', error)
        // Try to recover by re-initializing graphics if they were lost
        if (!this.tileGraphics || !this.highlightGraphics || !this.abilityTargetGraphics) {
          console.log('Attempting to recover graphics...')
          this.tileGraphics = this.add.graphics()
          this.highlightGraphics = this.add.graphics()
          this.abilityTargetGraphics.clear()
        }
      }
    })
    
    // Set up input handling
    this.input.on('pointerdown', this.handleClick, this)
    
    // Initial render
    const store = useGameStore.getState()
    this.drawBoard(store.board)
    this.drawUnits(store.units)
  }

  public getTileSize(): number {
    // Validate scene state before accessing game config
    if (!this.game || !this.game.config) {
      console.warn('Game not initialized, returning default tile size')
      return 40 // Default fallback tile size
    }
    
    // Calculate tile size based on canvas dimensions
    // Use 80% of available space for the board, divided by grid dimensions
    return Math.min(
      (this.game.config.width as number) * 0.8 / 8,  // 8 columns
      (this.game.config.height as number) * 0.8 / 10  // 10 rows
    )
  }

  public getBoardOffsetX(): number {
    const tileSize = this.getTileSize()
    if (!this.game || !this.game.config) {
      return 0 // Default fallback offset
    }
    return ((this.game.config.width as number) - (8 * tileSize)) / 2
  }

  public getBoardOffsetY(): number {
    const tileSize = this.getTileSize()
    if (!this.game || !this.game.config) {
      return 0 // Default fallback offset
    }
    return ((this.game.config.height as number) - (10 * tileSize)) / 2
  }

  private drawBoard(board: Tile[][]) {
    try {
      if (!this.tileGraphics) {
        console.warn('tileGraphics not initialized, skipping board draw')
        return
      }
      
      this.tileGraphics.clear()
      const tileSize = this.getTileSize()
      const boardOffsetX = this.getBoardOffsetX()
      const boardOffsetY = this.getBoardOffsetY()
      
      for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board[y].length; x++) {
          const tile = board[y][x]
          const px = boardOffsetX + x * tileSize
          const py = boardOffsetY + y * tileSize

          let color = 0xcccccc // Default fallback color
          switch (tile.type) {
            case TileType.NORMAL:
              color = VISUAL_CONFIG.COLORS.TILES.NORMAL
              break
            case TileType.CUBICLE:
              color = VISUAL_CONFIG.COLORS.TILES.CUBICLE
              break
            case TileType.OBSTACLE:
              color = VISUAL_CONFIG.COLORS.TILES.OBSTACLE
              break
            case TileType.CONFERENCE_ROOM:
              color = VISUAL_CONFIG.COLORS.TILES.CONFERENCE_ROOM
              break
            case TileType.HQ_BLUE:
              color = VISUAL_CONFIG.COLORS.TILES.HQ_BLUE
              break
            case TileType.HQ_RED:
              color = VISUAL_CONFIG.COLORS.TILES.HQ_RED
              break
          }

          // owner tint for cubicles
          if (tile.type === TileType.CUBICLE && tile.owner) {
            color = tile.owner === 'player1' ? VISUAL_CONFIG.COLORS.OWNERSHIP.PLAYER1_CUBICLE : VISUAL_CONFIG.COLORS.OWNERSHIP.PLAYER2_CUBICLE
          }

          this.tileGraphics.fillStyle(color, 1)
          this.tileGraphics.fillRect(px, py, tileSize, tileSize)
          this.tileGraphics.lineStyle(1, 0x0f172a, VISUAL_CONFIG.HIGHLIGHT.TILE_BORDER_ALPHA)
          this.tileGraphics.strokeRect(px, py, tileSize, tileSize)
        }
      }
    } catch (error) {
      console.error('Error drawing board:', error)
    }
  }

  private drawUnits(units: Unit[]) {
    try {
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
          this.tweens.add({ targets: existing, x: targetX, y: targetY, duration: VISUAL_CONFIG.ANIMATION.MOVEMENT_DURATION, ease: 'Power2' })
          
          // Update HP bar width
          const hpFill = existing.getByName('hpFill') as Phaser.GameObjects.Rectangle
          if (hpFill) hpFill.width = VISUAL_CONFIG.UNIT.HP_BAR_WIDTH * (unit.hp / unit.maxHp)
          
          // Update transparency for "done" state
          const circle = existing.getByName('circle') as Phaser.GameObjects.Graphics
          const label = existing.getByName('label') as Phaser.GameObjects.Text
          const hpBg = existing.getByName('hpBg') as Phaser.GameObjects.Rectangle
          
          const alpha = unit.actionsRemaining === 0 ? 0.5 : 1.0
          if (circle) circle.setAlpha(alpha)
          if (label) label.setAlpha(alpha)
          if (hpBg) hpBg.setAlpha(alpha)
          if (hpFill) hpFill.setAlpha(alpha)
          
          continue
        }

        const container = this.add.container(targetX, targetY)
        const circleColor = unit.playerId === 'player1' ? VISUAL_CONFIG.COLORS.UNITS.PLAYER1 : VISUAL_CONFIG.COLORS.UNITS.PLAYER2 // Gold vs Navy
        const circle = this.add.circle(0, 0, VISUAL_CONFIG.UNIT.CIRCLE_RADIUS, circleColor).setName('circle')
        const label = this.add.text(0, 0, unit.type.charAt(0).toUpperCase(), { color: '#fff', fontSize: VISUAL_CONFIG.UNIT.FONT_SIZE }).setName('label')
        label.setOrigin(0.5)
        const hpBg = this.add.rectangle(0, VISUAL_CONFIG.UNIT.HP_BAR_OFFSET_Y, VISUAL_CONFIG.UNIT.HP_BAR_WIDTH, VISUAL_CONFIG.UNIT.HP_BAR_HEIGHT, VISUAL_CONFIG.COLORS.UNITS.HP_BAR_BG).setOrigin(0.5).setName('hpBg')
        const hpFill = this.add.rectangle(-20, VISUAL_CONFIG.UNIT.HP_BAR_OFFSET_Y, VISUAL_CONFIG.UNIT.HP_BAR_WIDTH * (unit.hp / unit.maxHp), VISUAL_CONFIG.UNIT.HP_BAR_HEIGHT, VISUAL_CONFIG.COLORS.UNITS.HP_BAR_FILL)
          .setOrigin(0, 0.5)
          .setName('hpFill')
        
        // Set transparency for units with no actions remaining (visual "done" state)
        if (unit.actionsRemaining === 0) {
          circle.setAlpha(0.5) // Semi-transparent to show "done" state
          label.setAlpha(0.5)
          hpBg.setAlpha(0.5)
          hpFill.setAlpha(0.5)
        } else {
          circle.setAlpha(1.0) // Full opacity for active units
          label.setAlpha(1.0)
          hpBg.setAlpha(1.0)
          hpFill.setAlpha(1.0)
        }
        
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
          circle.setScale(VISUAL_CONFIG.ANIMATION.CLICK_SCALE_FACTOR)
          this.time.delayedCall(VISUAL_CONFIG.ANIMATION.CLICK_SCALE_DURATION, () => {
            circle.setScale(1)
          })
        })
        
        // Add visual feedback for interactivity
        container.on('pointerover', () => {
          circle.setStrokeStyle(VISUAL_CONFIG.UNIT.HOVER_BORDER_WIDTH, VISUAL_CONFIG.COLORS.UNITS.HOVER_BORDER, VISUAL_CONFIG.UNIT.HOVER_ALPHA)
          // Add a subtle glow effect
          circle.setAlpha(0.9)
        })
        
        container.on('pointerout', () => {
          circle.setStrokeStyle(0)
          circle.setAlpha(1)
        })
        
        this.unitSprites.set(unit.id, container)
      }
    } catch (error) {
      console.error('Error drawing units:', error)
    }
  }

  private updateHighlights(highlighted: Map<string, string>, selectedUnit?: Unit) {
    try {
      if (!this.highlightGraphics) {
        console.warn('highlightGraphics not initialized, skipping highlight update')
        return
      }
      
      // ALWAYS clear first
      this.highlightGraphics.clear()
      
      // Check ability state FIRST
      const store = useGameStore.getState()
      if (store.selectedAbility && store.targetingMode) {
        console.log('Ability mode active, showing ability highlights only')
        // Only render highlights with type 'ability'
        highlighted.forEach((type, coordKey) => {
          if (type === 'ability') {
            const [x, y] = coordKey.split(',').map(Number)
            const tileSize = this.getTileSize()
            const boardOffsetX = this.getBoardOffsetX()
            const boardOffsetY = this.getBoardOffsetY()
            const px = boardOffsetX + x * tileSize
            const py = boardOffsetY + y * tileSize
            
            // Use DISTINCT purple color for abilities
            this.drawHighlight(px, py, tileSize, 'ability')
          }
        })
        return // Don't show any other highlights
      }
      
      console.log('updateHighlights:', {
        hasAbility: !!store.selectedAbility,
        targetingMode: store.targetingMode,
        highlightCount: highlighted.size,
        highlightTypes: Array.from(highlighted.values())
      })
      
      // Normal mode - show movement/attack highlights
      console.log('Normal mode active, showing movement/attack highlights')
      const highlightMap = new Map<string, string[]>()
      
      highlighted.forEach((type, key) => {
        // IGNORE ability highlights in normal mode
        if (type !== 'ability') {
          if (!highlightMap.has(key)) {
            highlightMap.set(key, [])
          }
          highlightMap.get(key)!.push(type)
        }
      })
      
      // Draw movement/attack highlights
      highlightMap.forEach((types, coordKey) => {
        const [x, y] = coordKey.split(',').map(Number)
        const tileSize = this.getTileSize()
        const boardOffsetX = this.getBoardOffsetX()
        const boardOffsetY = this.getBoardOffsetY()
        const px = boardOffsetX + x * tileSize
        const py = boardOffsetY + y * tileSize
        
        types.forEach(type => {
          this.drawHighlight(px, py, tileSize, type)
        })
      })

      // Always draw selected unit highlight last
      if (selectedUnit) {
        const tileSize = this.getTileSize()
        const boardOffsetX = this.getBoardOffsetX()
        const boardOffsetY = this.getBoardOffsetY()
        const px = boardOffsetX + selectedUnit.position.x * tileSize
        const py = boardOffsetY + selectedUnit.position.y * tileSize
        this.highlightGraphics.lineStyle(3, 0xfbbf24, 1) // Gold selection
        this.highlightGraphics.strokeRect(px - 1, py - 1, tileSize, tileSize)
      }
    } catch (error) {
      console.error('Error updating highlights:', error)
    }
  }

  private drawHighlight(x: number, y: number, tileSize: number, type: string) {
    try {
      if (!this.highlightGraphics) {
        console.warn('highlightGraphics not initialized, skipping highlight draw')
        return
      }
      
      let color = 0x16a34a // Default green
      let alpha = 0.3
      
      switch (type) {
        case 'movement':
          color = 0x3b82f6 // Blue for movement
          alpha = 0.4
          break
        case 'attack':
          color = 0xef4444 // Red for attack
          alpha = 0.4
          break
        case 'ability':
          color = 0x9333ea // DISTINCT Purple for abilities
          alpha = 0.5
          break
        case 'attack_range':
          color = 0xdc2626 // Darker red for attack range
          alpha = 0.3
          break
        case 'ability_aoe':
          color = 0xec4899 // Pink for AOE abilities
          alpha = 0.4
          break
        case 'target_enemy':
          color = 0xef4444 // Red for enemy targets
          alpha = 0.6
          break
        case 'target_ally':
          color = 0x16a34a // Green for ally targets
          alpha = 0.6
          break
        case 'capture':
          color = 0x06b6d4 // Cyan for capture
          alpha = 0.4
          break
        case 'invalid':
          color = 0x6b7280 // Gray for invalid targets
          alpha = 0.5
          break
        default:
          color = 0x16a34a // Default green
          alpha = 0.3
      }
      
      // Fill the tile
      this.highlightGraphics.fillStyle(color, alpha)
      this.highlightGraphics.fillRect(x, y, tileSize, tileSize)
      
      // Add border for clarity
      this.highlightGraphics.lineStyle(2, color, alpha + 0.3)
      this.highlightGraphics.strokeRect(x, y, tileSize, tileSize)
    } catch (error) {
      console.error('Error drawing highlight:', error)
    }
  }

  private updateAbilityTargeting(selectedUnit?: Unit, selectedAbility?: string) {
    console.log('updateAbilityTargeting called with:', { 
      selectedUnit: selectedUnit?.id, 
      selectedAbility,
      hasGraphics: !!this.abilityTargetGraphics 
    })
    
    this.abilityTargetGraphics.clear()
    
    if (!selectedUnit || !selectedAbility) {
      console.log('No unit or ability selected, clearing targeting')
      this.targetingMode = false
      this.validTargets = []
      return
    }

    const ability = getAbilityById(selectedAbility)
    if (!ability) {
      console.log('Ability not found:', selectedAbility)
      return
    }

    console.log('Found ability:', ability.name, 'with range:', ability.range)

    const store = useGameStore.getState()
    this.validTargets = getValidTargets(selectedUnit, ability, store.board)
    this.targetingMode = true
    
    console.log('Valid targets found:', this.validTargets.length)

    // Show range highlight first
    this.showAbilityRange(selectedUnit, ability)
    
    // Handle different targeting types
    switch (ability.targetingType) {
      case AbilityTargetingType.AOE_CONE:
        this.showConePreview(selectedUnit, ability)
        break
      case AbilityTargetingType.AOE_CIRCLE:
        this.showCirclePreview(selectedUnit, ability)
        break
      case AbilityTargetingType.SINGLE_TARGET:
      default:
        this.showStandardTargeting()
        break
    }
  }

  // Show the range area for an ability
  private showAbilityRange(caster: Unit, ability: any) {
    console.log('showAbilityRange called for:', ability.name, 'with range:', ability.range)
    console.log('Caster position:', caster.position)
    
    // Validate graphics context
    if (!this.abilityTargetGraphics) {
      console.error('abilityTargetGraphics not initialized!')
      return
    }
    
    const tileSize = this.getTileSize()
    const boardOffsetX = this.getBoardOffsetX()
    const boardOffsetY = this.getBoardOffsetY()
    
    console.log('Tile size:', tileSize, 'Board offset:', { x: boardOffsetX, y: boardOffsetY })
    
    // Determine if this is a positive or negative ability based on target type
    const isPositiveAbility = ability.targetType === 'ally' || ability.targetType === 'self'
    const isNegativeAbility = ability.targetType === 'enemy'
    
    console.log('Ability type:', { isPositiveAbility, isNegativeAbility, targetType: ability.targetType })
    
    // Use appropriate colors for range highlighting
    let rangeColor: number
    let rangeAlpha: number
    
    if (isNegativeAbility) {
      // Reddish for negative abilities (harmful to enemies)
      rangeColor = VISUAL_CONFIG.COLORS.HIGHLIGHTS.ATTACK_RANGE
      rangeAlpha = 0.25 // Good visibility without being too opaque
      console.log('Using negative ability colors:', { rangeColor: rangeColor.toString(16), rangeAlpha })
    } else {
      // Greenish for positive abilities (helpful to allies)
      rangeColor = VISUAL_CONFIG.COLORS.UNITS.HP_BAR_FILL
      rangeAlpha = 0.25 // Good visibility without being too opaque
      console.log('Using positive ability colors:', { rangeColor: rangeColor.toString(16), rangeAlpha })
    }
    
    // Draw range highlight for all tiles within range
    const range = ability.range || 1
    let tilesHighlighted = 0
    
    console.log('Drawing range highlights for range:', range)
    
    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        // Check if this tile is within the actual range (Manhattan distance)
        if (Math.abs(dx) + Math.abs(dy) <= range) {
          const targetX = caster.position.x + dx
          const targetY = caster.position.y + dy
          
          // Check if this position is on the board
          const store = useGameStore.getState()
          if (targetX >= 0 && targetX < store.board[0].length && 
              targetY >= 0 && targetY < store.board.length) {
            
            const px = boardOffsetX + targetX * tileSize
            const py = boardOffsetY + targetY * tileSize
            
            console.log(`Highlighting tile at (${targetX}, ${targetY}) -> screen (${px}, ${py})`)
            
            // Draw range highlight
            this.abilityTargetGraphics.fillStyle(rangeColor, rangeAlpha)
            this.abilityTargetGraphics.fillRect(px, py, tileSize, tileSize)
            
            // Add subtle border
            this.abilityTargetGraphics.lineStyle(1, rangeColor, rangeAlpha + 0.2)
            this.abilityTargetGraphics.strokeRect(px, py, tileSize, tileSize)
            
            tilesHighlighted++
          }
        }
      }
    }
    
    console.log(`Range highlighting complete. Tiles highlighted: ${tilesHighlighted}`)
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
        
        // Determine if this is a positive or negative ability
        const ability = getAbilityById(useGameStore.getState().selectedAbility || '')
        const isPositiveAbility = ability?.targetType === 'ally' || ability?.targetType === 'self'
        const isNegativeAbility = ability?.targetType === 'enemy'
        
        // Use appropriate colors for target highlighting
        let targetColor: number
        let targetAlpha: number
        
        if (isNegativeAbility) {
          // Reddish for negative abilities
          targetColor = VISUAL_CONFIG.COLORS.HIGHLIGHTS.ATTACK
          targetAlpha = VISUAL_CONFIG.HIGHLIGHT.ATTACK_ALPHA
        } else {
          // Greenish for positive abilities
          targetColor = VISUAL_CONFIG.COLORS.UNITS.HP_BAR_FILL
          targetAlpha = VISUAL_CONFIG.HIGHLIGHT.ABILITY_ALPHA
        }
        
        this.abilityTargetGraphics.lineStyle(VISUAL_CONFIG.HIGHLIGHT.BORDER_WIDTH, targetColor, targetAlpha)
        this.abilityTargetGraphics.strokeRect(px, py, tileSize, tileSize)
        this.abilityTargetGraphics.fillStyle(targetColor, targetAlpha * 0.3)
        this.abilityTargetGraphics.fillRect(px, py, tileSize, tileSize)
      } else {
        // Target is a unit
        const tileSize = this.getTileSize()
        const boardOffsetX = this.getBoardOffsetX()
        const boardOffsetY = this.getBoardOffsetY()
        const px = boardOffsetX + target.position.x * tileSize
        const py = boardOffsetY + target.position.y * tileSize
        
        // Determine if this is a positive or negative ability
        const ability = getAbilityById(useGameStore.getState().selectedAbility || '')
        const isPositiveAbility = ability?.targetType === 'ally' || ability?.targetType === 'self'
        const isNegativeAbility = ability?.targetType === 'enemy'
        
        // Use appropriate colors for target highlighting
        let targetColor: number
        let targetAlpha: number
        
        if (isNegativeAbility) {
          // Reddish for negative abilities
          targetColor = VISUAL_CONFIG.COLORS.HIGHLIGHTS.ATTACK
          targetAlpha = VISUAL_CONFIG.HIGHLIGHT.ATTACK_ALPHA
        } else {
          // Greenish for positive abilities
          targetColor = VISUAL_CONFIG.COLORS.UNITS.HP_BAR_FILL
          targetAlpha = VISUAL_CONFIG.HIGHLIGHT.ABILITY_ALPHA
        }
        
        this.abilityTargetGraphics.lineStyle(VISUAL_CONFIG.HIGHLIGHT.BORDER_WIDTH, targetColor, targetAlpha)
        this.abilityTargetGraphics.strokeCircle(px + tileSize/2, py + tileSize/2, tileSize/2 + 2)
        this.abilityTargetGraphics.fillStyle(targetColor, targetAlpha * 0.3)
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
    this.abilityTargetGraphics.lineStyle(VISUAL_CONFIG.HIGHLIGHT.BORDER_WIDTH, VISUAL_CONFIG.COLORS.HIGHLIGHTS.ABILITY_AOE, VISUAL_CONFIG.HIGHLIGHT.ABILITY_ALPHA)
    this.abilityTargetGraphics.beginPath()
    this.abilityTargetGraphics.moveTo(casterX, casterY)
    
    // Draw cone arc (facing right for now)
    const startAngle = -coneAngle / 2
    const endAngle = coneAngle / 2
    this.abilityTargetGraphics.arc(casterX, casterY, coneRadius, startAngle, endAngle)
    this.abilityTargetGraphics.lineTo(casterX, casterY)
    this.abilityTargetGraphics.strokePath()
    
    // Fill cone area
    this.abilityTargetGraphics.fillStyle(VISUAL_CONFIG.COLORS.HIGHLIGHTS.ABILITY_AOE, VISUAL_CONFIG.HIGHLIGHT.AOE_ALPHA)
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
    this.abilityTargetGraphics.lineStyle(VISUAL_CONFIG.HIGHLIGHT.BORDER_WIDTH, VISUAL_CONFIG.COLORS.HIGHLIGHTS.ABILITY_AOE, VISUAL_CONFIG.HIGHLIGHT.ABILITY_ALPHA)
    this.abilityTargetGraphics.strokeCircle(casterX, casterY, aoeRadius)
    
    // Fill circle area
    this.abilityTargetGraphics.fillStyle(VISUAL_CONFIG.COLORS.HIGHLIGHTS.ABILITY_AOE, VISUAL_CONFIG.HIGHLIGHT.AOE_ALPHA)
    this.abilityTargetGraphics.fill()
  }

  private handleClick(pointer: Phaser.Input.Pointer) {
    // Validate scene state before processing clicks
    if (this.isDestroyed || !this.scene || !this.scene.manager || !this.scene.isActive || !this.scene.isActive()) {
      console.warn('Scene destroyed or not active, ignoring click')
      return
    }
    
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
        
        // CRITICAL: Notify GameHUD that ability was used
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('abilityUsed', { detail: { abilityId: store.selectedAbility } })
          window.dispatchEvent(event)
        }
        return
      }
      
      // If clicked outside valid targets, cancel targeting
      console.log('Clicked outside ability range, cancelling ability')
      store.selectAbility('')
      this.actionMode = 'none'
      
      // CRITICAL: Notify GameHUD that ability was cancelled
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('abilityCancelled')
        window.dispatchEvent(event)
      }
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
          console.log('Clicked outside board, cancelling action mode')
          this.setActionMode('none')
          return
        }
        
        // Check if clicked on a tile that's not a valid move/attack/ability target
        let isValidTarget = false
        if (this.actionMode === 'move') {
          isValidTarget = store.possibleMoves.some(move => move.x === tileX && move.y === tileY)
        } else if (this.actionMode === 'attack') {
          isValidTarget = store.possibleTargets.some(target => target.x === tileX && target.y === tileY)
        } else if (this.actionMode === 'ability') {
          // For abilities, check if this tile is within range and a valid target
          const selectedAbility = store.selectedAbility
          if (selectedAbility) {
            const ability = getAbilityById(selectedAbility)
            if (ability) {
              // Check if tile is within range
              const distance = Math.abs(tileX - store.selectedUnit!.position.x) + Math.abs(tileY - store.selectedUnit!.position.y)
              if (distance <= ability.range) {
                // Check if this is a valid target for the ability
                const targetCoord = { x: tileX, y: tileY }
                const validTargets = getValidTargets(store.selectedUnit!, ability, store.board)
                isValidTarget = validTargets.some(target => {
                  if ('x' in target) {
                    return target.x === tileX && target.y === tileY
                  }
                  return false
                })
              }
            }
          }
        }
        
        if (!isValidTarget) {
          // Clicked on invalid tile - cancel action mode
          console.log('Clicked on invalid target, cancelling action mode')
          
          // If this was an ability, notify GameHUD
          if (this.actionMode === 'ability' && store.selectedAbility) {
            console.log('Cancelling ability due to invalid target')
            store.selectAbility('')
            if (typeof window !== 'undefined') {
              const event = new CustomEvent('abilityCancelled')
              window.dispatchEvent(event)
            }
          }
          
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
            } else if (this.actionMode === 'ability') {
              // Check if this unit is a valid ability target
              const selectedAbility = store.selectedAbility
              if (selectedAbility) {
                const ability = getAbilityById(selectedAbility)
                if (ability) {
                  // Check if unit is within range
                  const distance = Math.abs(unit.position.x - store.selectedUnit!.position.x) + 
                                 Math.abs(unit.position.y - store.selectedUnit!.position.y)
                  if (distance <= ability.range) {
                    // Check if this is a valid target for the ability
                    const validTargets = getValidTargets(store.selectedUnit!, ability, store.board)
                    const isValidTarget = validTargets.some(target => {
                      if ('id' in target) {
                        return target.id === unit.id
                      }
                      return false
                    })
                    
                    if (isValidTarget) {
                      // Execute ability on this unit
                      store.useAbility(store.selectedUnit!.id, selectedAbility, unit)
                      this.actionMode = 'none'
                      return
                    }
                  }
                }
              }
              
              // If we get here, the unit is not a valid ability target
              console.log('Clicked on invalid ability target, cancelling action mode')
              this.setActionMode('none')
              return
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
          
          // Emit action completed event
          if (typeof window !== 'undefined') {
            const actionEvent = new CustomEvent('actionCompleted', {
              detail: { actionType: 'move', unitId: unit.id }
            })
            window.dispatchEvent(actionEvent)
          }
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
          
          // Emit action completed event
          if (typeof window !== 'undefined') {
            const actionEvent = new CustomEvent('actionCompleted', {
              detail: { actionType: 'attack', unitId: unit.id }
            })
            window.dispatchEvent(actionEvent)
          }
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
                  this.highlightGraphics.fillStyle(VISUAL_CONFIG.COLORS.TILES.HQ_BLUE, VISUAL_CONFIG.HIGHLIGHT.ABILITY_ALPHA)
        this.highlightGraphics.fillRect(px, py, tileSize, tileSize)
        this.highlightGraphics.lineStyle(VISUAL_CONFIG.HIGHLIGHT.BORDER_WIDTH, 0x1d4ed8, 1)
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
              this.highlightGraphics.fillStyle(VISUAL_CONFIG.COLORS.HIGHLIGHTS.ATTACK, VISUAL_CONFIG.HIGHLIGHT.ATTACK_ALPHA)
      this.highlightGraphics.fillRect(px, py, tileSize, tileSize)
              this.highlightGraphics.lineStyle(VISUAL_CONFIG.HIGHLIGHT.BORDER_WIDTH, VISUAL_CONFIG.COLORS.HIGHLIGHTS.ATTACK_RANGE, 1)
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
              this.highlightGraphics.fillStyle(VISUAL_CONFIG.COLORS.HIGHLIGHTS.ABILITY, VISUAL_CONFIG.HIGHLIGHT.ABILITY_ALPHA)
      this.highlightGraphics.fillRect(px, py, tileSize, tileSize)
              this.highlightGraphics.lineStyle(VISUAL_CONFIG.HIGHLIGHT.BORDER_WIDTH, 0x7c3aed, 1)
      this.highlightGraphics.strokeRect(px, py, tileSize, tileSize)
    })
  }

  destroy() {
    console.log('GameScene destroy called')
    
    // Mark as destroyed to prevent further operations
    this.isDestroyed = true
    
    // Clean up subscription first
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = undefined
    }
    
    // Clear graphics to prevent further operations
    if (this.tileGraphics) {
      this.tileGraphics.destroy()
      this.tileGraphics = undefined as any
    }
    if (this.highlightGraphics) {
      this.highlightGraphics.destroy()
      this.highlightGraphics = undefined as any
    }
    if (this.abilityTargetGraphics) {
      this.abilityTargetGraphics.destroy()
      this.abilityTargetGraphics = undefined as any
    }
    
    // Clear unit sprites
    this.unitSprites.forEach(container => {
      if (container && container.destroy) {
        container.destroy()
      }
    })
    this.unitSprites.clear()
    
    console.log('GameScene destroy completed')
  }

  // Ability visual effects
  playAbilityEffect(abilityId: string, target: Unit | Coordinate) {
    try {
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
    } catch (error) {
      console.error('Error playing ability effect:', error)
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


