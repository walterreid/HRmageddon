import Phaser from 'phaser'
import { useGameStore } from '../../stores/gameStore'
import { useUIStore } from '../../stores/uiStore'
import { useUnitStore } from '../../stores/unitStore'
import { useBoardStore } from '../../stores/boardStore'
import { TileType, type Unit, type Tile, type Coordinate, AbilityTargetingType } from 'shared'
import { getAbilityById, getValidTargets } from '../core/abilities.ts'
import { getTilesInCone } from '../core/targeting'
import { MAPS } from '../map/registry'
import { MapManager } from '../map/MapManager'
import { GridOverlay } from '../debug/GridOverlay'
import { VisualEffectsPool } from '../visuals/VisualEffectsPool'

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
      PLAYER1_CUBICLE: 0xfbbf24, // Amber-400 (Bright gold for Player 1)
      PLAYER2_CUBICLE: 0x3b82f6, // Blue-500 (Bright blue for Player 2 - more distinct from gray)
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
  private unsubscribeUI?: () => void
  private unsubscribeUnits?: () => void
  private isDestroyed: boolean = false
  private lastSelectedAbility?: string // Track ability changes for synchronization
  
  // Action menu integration
  private actionMode: 'none' | 'move' | 'attack' | 'ability' = 'none'
  private validTargets: (Unit | Coordinate)[] = []
  private targetingMode: boolean = false
  private abilityTargetGraphics!: Phaser.GameObjects.Graphics

  // Map management
  private mapMgr!: MapManager
  
  // Visual effects pooling
  private visualEffectsPool!: VisualEffectsPool
  // These are loaded from the map but not directly used yet - kept for future features
  /** @ts-expect-error - Intentionally unused, kept for future map features */
  private _tilemap!: Phaser.Tilemaps.Tilemap
  /** @ts-expect-error - Intentionally unused, kept for future map features */
  private _backgroundLayer!: Phaser.Tilemaps.TilemapLayer
  /** @ts-expect-error - Intentionally unused, kept for future map features */
  private _foregroundLayer!: Phaser.Tilemaps.TilemapLayer
  /** @ts-expect-error - Intentionally unused, kept for future map features */
  private _capturePointsLayer!: Phaser.Tilemaps.TilemapLayer
  /** @ts-expect-error - Intentionally unused, kept for future map features */
  private _startingPositionsLayer!: Phaser.Tilemaps.TilemapLayer

  private boardCols!: number
  private boardRows!: number
  private tileSizePx!: number
  


  private tileToWorld!: (tx:number, ty:number) => {x:number, y:number}
  private worldToTile!: (px:number, py:number) => {x:number, y:number}
  // Blocked helper for future movement validation
  /** @ts-expect-error - Intentionally unused, kept for future movement validation */
  private _isBlocked!: (tx:number, ty:number) => boolean

  constructor() {
    super({ key: 'GameScene' })
  }

  preload() {
    this.mapMgr = new MapManager(this, MAPS.OfficeLayout)
    this.mapMgr.preload()
  }

  create() {
    console.log('GameScene created')
    
    // Set up graphics for tiles and highlights
    this.tileGraphics = this.add.graphics()
    this.highlightGraphics = this.add.graphics()
    this.abilityTargetGraphics = this.add.graphics()
    
    // Initialize visual effects pool
    this.visualEffectsPool = new VisualEffectsPool(this)
    
    // Ensure ability graphics are drawn on top
    this.abilityTargetGraphics.setDepth(100)
    
    // Create the Tiled map
    console.log('GameScene: Creating Tiled map...');
    const created = this.mapMgr.create()
    console.log('GameScene: Map created:', created);
    
    this._tilemap    = created.map
    this._backgroundLayer = created.background
    this._foregroundLayer = created.foreground
    this._capturePointsLayer = created.capturePoints
    this._startingPositionsLayer = created.startingPositions

    this.boardCols = created.board.cols
    this.boardRows = created.board.rows
    this.tileSizePx = created.targetTileSizePx

    this.tileToWorld = created.tileToWorld
    this.worldToTile = created.worldToTile
    this._isBlocked   = created.isBlocked
    

    
    console.log('GameScene: Map setup complete:', {
      cols: this.boardCols,
      rows: this.boardRows,
      tileSize: this.tileSizePx
    });

    // Keep highlights above map
    this.highlightGraphics.setDepth(10)

    // Optional: toggle grid with 'G'
    new GridOverlay(this, this.boardCols, this.boardRows, this.tileSizePx)
    
    // Force initial render after map is ready
    const initialUnitState = useUnitStore.getState()
    const initialBoardState = useBoardStore.getState()
    if (initialBoardState.board && initialUnitState.units) {
      this.drawBoard(initialBoardState.board)
      this.drawUnits(initialUnitState.units)
    }
    
            // MapRegistry is now populated with starting positions
        console.log('GameScene: MapRegistry populated with starting positions for OfficeLayout')
    
    console.log('Graphics initialized:', {
      tileGraphics: !!this.tileGraphics,
      highlightGraphics: !!this.highlightGraphics,
      abilityTargetGraphics: !!this.abilityTargetGraphics
    })
    
    // Subscribe to UI store changes for highlights
    this.unsubscribeUI = useUIStore.subscribe((uiState) => {
      try {
        // Check if scene is still valid
        if (this.isDestroyed || !this.scene || !this.scene.manager || !this.scene.isActive || !this.scene.isActive()) {
          return
        }
        
        if (!this.highlightGraphics) {
          return
        }
        
        // Get current game state from slice stores
        const unitState = useUnitStore.getState()
        
        // Update highlights when UI store changes
        console.log('UI store changed, updating highlights:', {
          highlightCount: uiState.highlightedTiles.size,
          actionMode: uiState.actionMode,
          selectedAbility: uiState.selectedAbility
        })
        
        this.updateHighlights(uiState.highlightedTiles, unitState.selectedUnit)
      } catch (error) {
        console.error('Error in UI store subscription:', error)
      }
    })
    
    // Subscribe to unit store changes for unit rendering
    this.unsubscribeUnits = useUnitStore.subscribe((unitState) => {
      try {
        // Check if scene is still valid and has a valid manager
        if (this.isDestroyed || !this.scene || !this.scene.manager || !this.scene.isActive || !this.scene.isActive()) {
          console.warn('Scene destroyed or not active, skipping unit render update')
          return
        }
        
        if (!this.tileGraphics || !this.highlightGraphics || !this.abilityTargetGraphics) {
          console.warn('Graphics not initialized, skipping unit render update')
          return
        }
        
        // Redraw units when unit state changes
        this.drawUnits(unitState.units)
      } catch (error) {
        console.error('Error in unit store subscription:', error)
      }
    })
    
    // Subscribe to game store changes
    this.unsubscribe = useGameStore.subscribe(() => {
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
        
        // Get current state from slice stores
        const unitState = useUnitStore.getState()
        const boardState = useBoardStore.getState()
        const uiState = useUIStore.getState()
        
        // Check for ability changes specifically
        if (uiState.selectedAbility !== this.lastSelectedAbility) {
          console.log('Ability selection changed:', {
            from: this.lastSelectedAbility,
            to: uiState.selectedAbility
          })
          this.lastSelectedAbility = uiState.selectedAbility
          
          // Force complete re-render of highlights
          this.highlightGraphics.clear()
          this.abilityTargetGraphics.clear()
          
        if (uiState.selectedAbility) {
          console.log('Ability mode active, updating ability targeting')
          this.updateAbilityTargeting(unitState.selectedUnit, uiState.selectedAbility)
        } else {
          console.log('Ability mode cleared, updating normal highlights')
          this.updateHighlights(uiState.highlightedTiles, unitState.selectedUnit)
        }
        } else {
          // Regular update (no ability change)
          console.log('Regular rendering update:', {
            board: boardState.board?.length,
            units: unitState.units?.length,
            highlights: uiState.highlightedTiles?.size,
            selectedUnit: !!unitState.selectedUnit,
            selectedAbility: !!uiState.selectedAbility
          })
          
          this.drawBoard(boardState.board)
          this.drawUnits(unitState.units)
          
          // If an ability is selected, don't show movement highlights
          if (uiState.selectedAbility) {
            console.log('Ability selected, clearing movement highlights and showing ability range')
            // Clear movement highlights when ability is active
            this.highlightGraphics.clear()
            // Only show ability targeting
            this.updateAbilityTargeting(unitState.selectedUnit, uiState.selectedAbility)
          } else {
            console.log('No ability selected, showing normal highlights')
            // Show normal highlights (movement, attack, etc.)
            this.updateHighlights(uiState.highlightedTiles, unitState.selectedUnit)
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
    
    // Set up input handling with mobile touch optimizations
    this.input.on('pointerdown', this.handleClick, this)
    
    // Mobile touch optimizations
    this.input.on('pointerover', this.handlePointerOver, this)
    this.input.on('pointerout', this.handlePointerOut, this)
    
    // Prevent zoom on mobile devices
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number, _deltaZ: number) => {
      void _pointer; void _gameObjects; void _deltaX; void _deltaZ; // Suppress unused parameter warnings
      // Prevent zoom/scroll on mobile
      if (Math.abs(deltaY) > 0) {
        return false
      }
    })
    
    // Touch event optimizations for mobile
    this.input.setDefaultCursor('pointer')
    
    // Disable right-click context menu on mobile
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        return false
      }
    })
    
    // Initial render
    const finalUnitState = useUnitStore.getState()
    const finalBoardState = useBoardStore.getState()
    this.drawBoard(finalBoardState.board)
    this.drawUnits(finalUnitState.units)
  }

  // In GameScene.ts - replace getTileSize() with:
  public getTileSize(): number {
  // Get tile size from ResponsiveGameManager instead of calculating
  const responsiveManager = (this.game as Phaser.Game & { responsiveManager?: { getCurrentTileSize(): number } }).responsiveManager
  if (responsiveManager) {
    return responsiveManager.getCurrentTileSize()
  }
  
  // Fallback if ResponsiveGameManager not available
  return 40
}

  public getBoardOffsetX(): number {
    // With Tiled map, board starts at (0,0) - no offset needed
    return 0
  }

  public getBoardOffsetY(): number {
    // With Tiled map, board starts at (0,0) - no offset needed
    return 0
  }

  private drawBoard(board: Tile[][]) {
    try {
      if (!this.tileGraphics) {
        console.warn('tileGraphics not initialized, skipping board draw')
        return
      }
      
      // Don't clear the graphics - we want ownership overlays to persist
      // this.tileGraphics.clear()
      
      // With Tiled map, we don't need to draw the base tiles anymore
      // The map layers handle the visual representation
      // We only need to draw ownership overlays for cubicles
      
      let ownershipOverlaysDrawn = 0
      
      for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board[y].length; x++) {
          const tile = board[y][x]
          
          // Only draw ownership overlays for cubicles
          if (tile.type === TileType.CUBICLE && tile.owner) {
            const { x: wx, y: wy } = this.tileToWorld(x, y)
            const color = tile.owner === 'player1' ? VISUAL_CONFIG.COLORS.OWNERSHIP.PLAYER1_CUBICLE : VISUAL_CONFIG.COLORS.OWNERSHIP.PLAYER2_CUBICLE
            
            this.tileGraphics.fillStyle(color, 0.8) // Increased opacity to 0.8 for maximum visibility
            this.tileGraphics.fillRect(wx, wy, this.tileSizePx, this.tileSizePx)
            
            // Add a bold border to make ownership even clearer
            this.tileGraphics.lineStyle(3, color, 1.0) // Full opacity border
            this.tileGraphics.strokeRect(wx, wy, this.tileSizePx, this.tileSizePx)
            
            ownershipOverlaysDrawn++
            
            // Debug logging for ownership overlays
            console.log('Drawing ownership overlay:', {
              position: { x, y },
              owner: tile.owner,
              color: color.toString(16),
              worldPos: { wx, wy }
            })
          }
        }
      }
      
      // Set the highest depth to ensure ownership overlays are on top
      this.tileGraphics.setDepth(200)
      
      console.log('Board drawing complete:', {
        totalTiles: board.length * board[0].length,
        cubicles: board.flat().filter(t => t.type === TileType.CUBICLE).length,
        ownedCubicles: board.flat().filter(t => t.type === TileType.CUBICLE && t.owner).length,
        ownershipOverlaysDrawn,
        tileGraphicsDepth: this.tileGraphics.depth
      })
      
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

      for (const unit of units) {
        const { x: wx, y: wy } = this.tileToWorld(unit.position.x, unit.position.y)
        const targetX = wx + this.tileSizePx / 2
        const targetY = wy + this.tileSizePx / 2
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

        const container = this.add.container(targetX, targetY).setDepth(50)
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
        container.setSize(this.tileSizePx, this.tileSizePx)
        container.setData('unitId', unit.id)
        
        // Enhanced interactivity for Safari compatibility
        container.setInteractive(new Phaser.Geom.Rectangle(-this.tileSizePx/2, -this.tileSizePx/2, this.tileSizePx, this.tileSizePx), Phaser.Geom.Rectangle.Contains)
        
        // Add multiple event listeners for better compatibility
        container.on('pointerdown', () => {
          console.log('Unit clicked:', unit.id) // Debug log
          const u = useUnitStore.getState().units.find((uu) => uu.id === unit.id)
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
      const uiStore = useUIStore.getState()
      if (uiStore.selectedAbility && uiStore.targetingMode) {
        console.log('Ability mode active, showing ability highlights only')
        // Only render highlights with type 'ability'
        highlighted.forEach((type, coordKey) => {
          if (type === 'ability') {
            const [x, y] = coordKey.split(',').map(Number)
            const { x: px, y: py } = this.tileToWorld(x, y)
            
            // Use DISTINCT purple color for abilities
            this.drawHighlight(px, py, this.tileSizePx, 'ability')
          }
        })
        return // Don't show any other highlights
      }
      
      console.log('updateHighlights:', {
        hasAbility: !!uiStore.selectedAbility,
        targetingMode: uiStore.targetingMode,
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
        const { x: px, y: py } = this.tileToWorld(x, y)
        
        types.forEach(type => {
          this.drawHighlight(px, py, this.tileSizePx, type)
        })
      })

      // Always draw selected unit highlight last
      if (selectedUnit) {
        const { x: px, y: py } = this.tileToWorld(selectedUnit.position.x, selectedUnit.position.y)
        this.highlightGraphics.lineStyle(3, 0xfbbf24, 1) // Gold selection
        this.highlightGraphics.strokeRect(px - 1, py - 1, this.tileSizePx, this.tileSizePx)
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

    const unitState = useUnitStore.getState()
    const boardState = useBoardStore.getState()
    this.validTargets = getValidTargets(selectedUnit, ability, boardState.board, unitState.units)
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
  private showAbilityRange(caster: Unit, ability: { name: string; range: number; targetType: string }) {
    console.log('showAbilityRange called for:', ability.name, 'with range:', ability.range)
    console.log('Caster position:', caster.position)
    
    // Validate graphics context
    if (!this.abilityTargetGraphics) {
      console.error('abilityTargetGraphics not initialized!')
      return
    }
    
    console.log('Tile size:', this.tileSizePx, 'Board offset: (0,0) - Tiled map')
    
    // Determine if this is a positive or negative ability based on target type
    const isNegativeAbility = ability.targetType === 'enemy'
    
    console.log('Ability type:', { isPositiveAbility: false, isNegativeAbility, targetType: ability.targetType })
    
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
          const boardState = useBoardStore.getState()
          if (targetX >= 0 && targetX < boardState.board[0].length && 
              targetY >= 0 && targetY < boardState.board.length) {
            
            const { x: px, y: py } = this.tileToWorld(targetX, targetY)
            
            console.log(`Highlighting tile at (${targetX}, ${targetY}) -> screen (${px}, ${py})`)
            
            // Draw range highlight
            this.abilityTargetGraphics.fillStyle(rangeColor, rangeAlpha)
            this.abilityTargetGraphics.fillRect(px, py, this.tileSizePx, this.tileSizePx)
            
            // Add subtle border
            this.abilityTargetGraphics.lineStyle(1, rangeColor, rangeAlpha + 0.2)
            this.abilityTargetGraphics.strokeRect(px, py, this.tileSizePx, this.tileSizePx)
            
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
        const { x: px, y: py } = this.tileToWorld(target.x, target.y)
        
        // Determine if this is a positive or negative ability
        const ability = getAbilityById(useUIStore.getState().selectedAbility || '')
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
        this.abilityTargetGraphics.strokeRect(px, py, this.tileSizePx, this.tileSizePx)
        this.abilityTargetGraphics.fillStyle(targetColor, targetAlpha * 0.3)
        this.abilityTargetGraphics.fillRect(px, py, this.tileSizePx, this.tileSizePx)
      } else {
        // Target is a unit
        const { x: px, y: py } = this.tileToWorld(target.position.x, target.position.y)
        
        // Determine if this is a positive or negative ability
        const ability = getAbilityById(useUIStore.getState().selectedAbility || '')
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
        this.abilityTargetGraphics.strokeCircle(px + this.tileSizePx/2, py + this.tileSizePx/2, this.tileSizePx/2 + 2)
        this.abilityTargetGraphics.fillStyle(targetColor, targetAlpha * 0.3)
        this.abilityTargetGraphics.fillCircle(px + this.tileSizePx/2, py + this.tileSizePx/2, this.tileSizePx/2)
      }
    })
  }

  private showConePreview(caster: Unit, ability: { range: number; coneAngle?: number; requiresDirection?: boolean }) {
    // For cone abilities, show a preview of the cone area
    // Check if this is a directional ability awaiting direction input
    const uiStore = useUIStore.getState()
    if (ability.requiresDirection && uiStore.abilityAwaitingDirection) {
      // Start listening for pointer movement to draw the preview
      this.input.on('pointermove', this.updateConePreview, this)
      console.log('Cone preview mode activated - listening for mouse movement')
      return
    }
    
    // Default cone preview (facing right)
    const { x: casterX, y: casterY } = this.tileToWorld(caster.position.x, caster.position.y)
    const casterCenterX = casterX + this.tileSizePx / 2
    const casterCenterY = casterY + this.tileSizePx / 2
    
    // Draw cone preview (simplified for now - can be enhanced with mouse tracking)
    const coneRadius = (ability.range || 3) * this.tileSizePx
    const coneAngle = (ability.coneAngle || 90) * Math.PI / 180 // Convert to radians
    
    // Draw cone outline
    this.abilityTargetGraphics.lineStyle(VISUAL_CONFIG.HIGHLIGHT.BORDER_WIDTH, VISUAL_CONFIG.COLORS.HIGHLIGHTS.ABILITY_AOE, VISUAL_CONFIG.HIGHLIGHT.ABILITY_ALPHA)
    this.abilityTargetGraphics.beginPath()
    this.abilityTargetGraphics.moveTo(casterCenterX, casterCenterY)
    
    // Draw cone arc (facing right for now)
    const startAngle = -coneAngle / 2
    const endAngle = coneAngle / 2
    this.abilityTargetGraphics.arc(casterCenterX, casterCenterY, coneRadius, startAngle, endAngle)
    this.abilityTargetGraphics.lineTo(casterCenterX, casterCenterY)
    this.abilityTargetGraphics.strokePath()
    
    // Fill cone area
    this.abilityTargetGraphics.fillStyle(VISUAL_CONFIG.COLORS.HIGHLIGHTS.ABILITY_AOE, VISUAL_CONFIG.HIGHLIGHT.AOE_ALPHA)
    this.abilityTargetGraphics.fill()
  }

  // NEW METHOD to dynamically draw the cone preview
  private updateConePreview(pointer: Phaser.Input.Pointer) {
    const unitState = useUnitStore.getState()
    const uiStore = useUIStore.getState()
    const caster = unitState.selectedUnit
    const abilityId = uiStore.abilityAwaitingDirection

    if (!caster || !abilityId) {
      this.input.off('pointermove', this.updateConePreview, this) // Stop listening
      return
    }

    this.abilityTargetGraphics.clear() // Clear previous preview
    const ability = getAbilityById(abilityId)
    if (!ability) return

    const { x: tileX, y: tileY } = this.worldToTile(pointer.x, pointer.y)
    const direction = { x: tileX - caster.position.x, y: tileY - caster.position.y }

    const affectedTiles = getTilesInCone(caster.position, direction, ability.range, ability.coneAngle || 90)

    // Draw the highlight for all affected tiles
    this.abilityTargetGraphics.fillStyle(VISUAL_CONFIG.COLORS.HIGHLIGHTS.ABILITY_AOE, VISUAL_CONFIG.HIGHLIGHT.AOE_ALPHA)
    affectedTiles.forEach(tile => {
      const { x: px, y: py } = this.tileToWorld(tile.x, tile.y)
      this.abilityTargetGraphics.fillRect(px, py, this.tileSizePx, this.tileSizePx)
    })
  }

  private showCirclePreview(caster: Unit, ability: { range: number; aoeRadius?: number }) {
    // For circle AOE abilities, show the area of effect
    const { x: casterX, y: casterY } = this.tileToWorld(caster.position.x, caster.position.y)
    const casterCenterX = casterX + this.tileSizePx / 2
    const casterCenterY = casterY + this.tileSizePx / 2
    
    const aoeRadius = (ability.aoeRadius || 2) * this.tileSizePx
    
    // Draw circle outline
    this.abilityTargetGraphics.lineStyle(VISUAL_CONFIG.HIGHLIGHT.BORDER_WIDTH, VISUAL_CONFIG.COLORS.HIGHLIGHTS.ABILITY_AOE, VISUAL_CONFIG.HIGHLIGHT.ABILITY_ALPHA)
    this.abilityTargetGraphics.strokeCircle(casterCenterX, casterCenterY, aoeRadius)
    
    // Fill circle area
    this.abilityTargetGraphics.fillStyle(VISUAL_CONFIG.COLORS.HIGHLIGHTS.ABILITY_AOE, VISUAL_CONFIG.HIGHLIGHT.AOE_ALPHA)
    this.abilityTargetGraphics.fill()
  }

  // Mobile touch event handlers
  private handlePointerOver(_pointer: Phaser.Input.Pointer) {
    void _pointer; // Suppress unused parameter warning
    // Add hover effects for desktop (optional for mobile)
    if (!this.isMobileDevice()) {
      // Desktop hover effects can go here
    }
  }

  private handlePointerOut(_pointer: Phaser.Input.Pointer) {
    void _pointer; // Suppress unused parameter warning
    // Clear hover effects for desktop (optional for mobile)
    if (!this.isMobileDevice()) {
      // Desktop hover cleanup can go here
    }
  }

  // Helper to detect mobile devices
  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth < 768
  }

  private handleClick(pointer: Phaser.Input.Pointer) {
    // Validate scene state before processing clicks
    if (this.isDestroyed || !this.scene || !this.scene.manager || !this.scene.isActive || !this.scene.isActive()) {
      console.warn('Scene destroyed or not active, ignoring click')
      return
    }
    
    const unitState = useUnitStore.getState()
    const gameState = useGameStore.getState()
    
    // HIGHEST PRIORITY: Check if we are aiming a directional ability
    const uiStore = useUIStore.getState()
    if (uiStore.abilityAwaitingDirection && unitState.selectedUnit) {
      const caster = unitState.selectedUnit
      const { x: tileX, y: tileY } = this.worldToTile(pointer.x, pointer.y)

      // Don't allow clicking on the caster itself to set direction
      if (tileX === caster.position.x && tileY === caster.position.y) return

      // The clicked tile determines the direction vector
      const direction = { x: tileX - caster.position.x, y: tileY - caster.position.y }

      // Use the ability, passing the direction as a special target
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gameState.useAbility(caster.id, uiStore.abilityAwaitingDirection, { direction } as any)

      // Reset the aiming state
      useUIStore.getState().setAbilityAwaitingDirection(null)
      useUIStore.getState().clearHighlights()
      return // End the click handling here
    }
    
    // If we're in ability targeting mode, handle ability target selection
    if (this.targetingMode && uiStore.selectedAbility) {
      const { x: tileX, y: tileY } = this.worldToTile(pointer.x, pointer.y)
      
      // Check if clicked on a valid target
      const clickedTarget = this.validTargets.find(target => {
        if ('x' in target) {
          return target.x === tileX && target.y === tileY
        } else {
          return target.position.x === tileX && target.position.y === tileY
        }
      })
      
      if (clickedTarget && unitState.selectedUnit) {
        // Use the ability on the target
        gameState.useAbility(unitState.selectedUnit.id, uiStore.selectedAbility, clickedTarget)
        // Clear targeting mode and action mode
        useUIStore.getState().setSelectedAbility(undefined)
        this.actionMode = 'none'
        
        // CRITICAL: Notify GameHUD that ability was used
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('abilityUsed', { detail: { abilityId: uiStore.selectedAbility } })
          window.dispatchEvent(event)
        }
        return
      }
      
      // If clicked outside valid targets, cancel targeting
      console.log('Clicked outside ability range, cancelling ability')
      useUIStore.getState().setSelectedAbility(undefined)
      this.actionMode = 'none'
      
      // CRITICAL: Notify GameHUD that ability was cancelled
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('abilityCancelled')
        window.dispatchEvent(event)
      }
      return
    }
    
    // If we're in action mode, handle tile clicks for movement/attack FIRST
    if (this.actionMode !== 'none' && unitState.selectedUnit) {
      const previousActionMode = this.actionMode
      this.handleActionModeClick(unitState.selectedUnit, pointer)
      
      // If the action wasn't completed, check if we clicked outside valid tiles
      if (this.actionMode === previousActionMode) {
        const { x: tileX, y: tileY } = this.worldToTile(pointer.x, pointer.y)
        
        // Check if clicked outside the board or on an invalid tile
        const boardState = useBoardStore.getState()
        const board = boardState.board
        if (tileX < 0 || tileX >= board[0].length || tileY < 0 || tileY >= board.length) {
          // Clicked outside board - cancel action mode
          console.log('Clicked outside board, cancelling action mode')
          this.setActionMode('none')
          return
        }
        
        // Check if clicked on a tile that's not a valid move/attack/ability target
        let isValidTarget = false
        if (this.actionMode === 'move') {
          const possibleMoves = gameState.calculatePossibleMoves(unitState.selectedUnit!)
          isValidTarget = possibleMoves.some((move: Coordinate) => move.x === tileX && move.y === tileY)
        } else if (this.actionMode === 'attack') {
          const possibleTargets = gameState.calculatePossibleTargets(unitState.selectedUnit!)
          isValidTarget = possibleTargets.some((target: Coordinate) => target.x === tileX && target.y === tileY)
        } else if (this.actionMode === 'ability') {
          // For abilities, check if this tile is within range and a valid target
          const selectedAbility = uiStore.selectedAbility
          if (selectedAbility) {
            const ability = getAbilityById(selectedAbility)
            if (ability) {
              // Check if tile is within range
              const distance = Math.abs(tileX - unitState.selectedUnit!.position.x) + Math.abs(tileY - unitState.selectedUnit!.position.y)
              if (distance <= ability.range) {
                // Check if this is a valid target for the ability
                const validTargets = getValidTargets(unitState.selectedUnit!, ability, boardState.board, unitState.units)
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
          if (this.actionMode === 'ability' && uiStore.selectedAbility) {
            console.log('Cancelling ability due to invalid target')
            useUIStore.getState().setSelectedAbility(undefined)
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
        const unit = unitState.units.find(u => u.id === unitId)
        if (unit) {
          // PRIORITY: If we're in action mode and this is a valid target, execute the action
          if (this.actionMode !== 'none' && unitState.selectedUnit) {
            if (this.actionMode === 'attack') {
              // Check if this unit is a valid attack target
              const possibleTargets = gameState.calculatePossibleTargets(unitState.selectedUnit!)
              const isValidTarget = possibleTargets.some((target: Coordinate) => 
                target.x === unit.position.x && target.y === unit.position.y
              )
              if (isValidTarget && unit.playerId !== unitState.selectedUnit.playerId) {
                // Execute attack on this enemy unit
                gameState.attackTarget(unitState.selectedUnit.id, unit.id)
                this.actionMode = 'none'
                return
              }
            } else if (this.actionMode === 'move') {
              // Check if this unit's position is a valid move target
              const possibleMoves = gameState.calculatePossibleMoves(unitState.selectedUnit!)
              const isValidMove = possibleMoves.some((move: Coordinate) => 
                move.x === unit.position.x && move.y === unit.position.y
              )
              if (isValidMove) {
                // Execute move to this position
                gameState.moveUnit(unitState.selectedUnit.id, unit.position)
                this.actionMode = 'none'
                return
              }
            } else if (this.actionMode === 'ability') {
              // Check if this unit is a valid ability target
              const selectedAbility = uiStore.selectedAbility
              if (selectedAbility) {
                const ability = getAbilityById(selectedAbility)
                if (ability) {
                  // Check if unit is within range
                  const distance = Math.abs(unit.position.x - unitState.selectedUnit!.position.x) + 
                                 Math.abs(unit.position.y - unitState.selectedUnit!.position.y)
                  if (distance <= ability.range) {
                    // Check if this is a valid target for the ability
                    const boardState = useBoardStore.getState()
                    const validTargets = getValidTargets(unitState.selectedUnit!, ability, boardState.board, unitState.units)
                    const isValidTarget = validTargets.some(target => {
                      if ('id' in target) {
                        return target.id === unit.id
                      }
                      return false
                    })
                    
                    if (isValidTarget) {
                      // Execute ability on this unit
                      gameState.useAbility(unitState.selectedUnit!.id, selectedAbility, unit)
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
          if (gameState.shouldExecuteActionInsteadOfSelect && 
              gameState.shouldExecuteActionInsteadOfSelect(unit, unitState.selectedUnit)) {
            // Execute the action instead of switching units
            if (unitState.selectedUnit && gameState.isValidAttackTarget) {
              // Double-check that this is a valid attack target
              if (gameState.isValidAttackTarget(unitState.selectedUnit, unit)) {
                gameState.attackTarget(unitState.selectedUnit.id, unit.id)
                return
              }
            }
          }

          // Check if we should execute a move instead of selecting the unit
          if (gameState.shouldExecuteMoveInsteadOfSelect && 
              gameState.shouldExecuteMoveInsteadOfSelect(unit, unitState.selectedUnit)) {
            // Execute the move instead of switching units
            if (unitState.selectedUnit) {
              gameState.moveUnit(unitState.selectedUnit.id, unit.position)
              return
            }
          }
          
          // Don't re-select the unit if we just completed an action
          // This prevents the action menu from staying open after a move
          if (this.actionMode === 'none') {
            // Select the unit (this will show the action menu for player units)
            gameState.selectUnit(unit)
            
            // Calculate and set the action menu position for player units
            if (unit.playerId === 'player1') {
              const { x: wx, y: wy } = this.tileToWorld(unit.position.x, unit.position.y)
              const screenX = wx + this.tileSizePx / 2
              const screenY = wy + this.tileSizePx / 2
              
              console.log('Setting action menu position for unit:', {
                unitId: unit.id,
                unitPosition: unit.position,
                screenPosition: { x: screenX, y: screenY },
                tileSize: this.tileSizePx
              })
              
              useUIStore.getState().setActionMenu({ x: screenX, y: screenY })
            }
          }
          return
        }
      }
    }
    
    // Fall back to tile selection - emit event for GameHUD to handle
    // This should only happen when not in action mode to avoid conflicts
    if (this.actionMode === 'none') {
      const { x: tileX, y: tileY } = this.worldToTile(pointer.x, pointer.y)
      const boardState = useBoardStore.getState()
      const board = boardState.board
      
      if (tileX >= 0 && tileX < board[0].length && tileY >= 0 && tileY < board.length) {
        // Emit tile click event for GameHUD to handle
        const event = new CustomEvent('gameTileClick', {
          detail: { coord: { x: tileX, y: tileY } }
        })
        window.dispatchEvent(event)
        
        // Also handle tile selection in store for backward compatibility
        gameState.selectTile({ x: tileX, y: tileY })
      }
    }
  }

  private handleActionModeClick(unit: Unit, pointer: Phaser.Input.Pointer) {
    const gameState = useGameStore.getState()
    const unitState = useUnitStore.getState()
    const { x: tileX, y: tileY } = this.worldToTile(pointer.x, pointer.y)
    
    // Emit tile click event for GameHUD to handle
    const event = new CustomEvent('gameTileClick', {
      detail: { coord: { x: tileX, y: tileY } }
    })
    window.dispatchEvent(event)
    
    switch (this.actionMode) {
      case 'move': {
        // Check if the clicked tile is a valid move
        const possibleMoves = gameState.calculatePossibleMoves(unit)
        const isValidMove = possibleMoves.some((move: Coordinate) => move.x === tileX && move.y === tileY)
        if (isValidMove) {
          gameState.moveUnit(unit.id, { x: tileX, y: tileY })
          this.actionMode = 'none'
          // Clear highlights after successful move
          this.highlightGraphics.clear()
          
          // Clear action mode in GameScene
          this.clearActionMode()
          
          // Emit action completed event
          if (typeof window !== 'undefined') {
            const actionEvent = new CustomEvent('actionCompleted', {
              detail: { actionType: 'move', unitId: unit.id }
            })
            window.dispatchEvent(actionEvent)
          }
        }
        break
      }
      case 'attack': {
        // Check if the clicked tile has an enemy unit
        const targetUnit = unitState.units.find(u => u.position.x === tileX && u.position.y === tileY && u.playerId !== unit.playerId)
        if (targetUnit) {
          gameState.attackTarget(unit.id, targetUnit.id)
          this.actionMode = 'none'
          // Clear highlights after successful attack
          this.highlightGraphics.clear()
          
          // Clear action mode in GameScene
          this.clearActionMode()
          
          // Emit action completed event
          if (typeof window !== 'undefined') {
            const actionEvent = new CustomEvent('actionCompleted', {
              detail: { actionType: 'attack', unitId: unit.id }
            })
            window.dispatchEvent(actionEvent)
          }
        }
        break
      }
      case 'ability': {
        // Handle ability targeting (already handled above)
        break
      }
    }
  }

  // Public method to set action mode from the ActionMenu
  setActionMode(mode: 'none' | 'move' | 'attack' | 'ability', abilityId?: string) {
    this.actionMode = mode
    
    if (mode === 'none') {
      // Clear highlights when exiting action mode
      this.highlightGraphics.clear()
      // Restore normal unit highlights
      const unitState = useUnitStore.getState()
      const uiState = useUIStore.getState()
      if (unitState.selectedUnit) {
        this.updateHighlights(uiState.highlightedTiles, unitState.selectedUnit)
      }
    } else if (mode === 'move') {
      // Clear existing highlights and show move highlights
      this.highlightGraphics.clear()
      const unitState = useUnitStore.getState()
      const gameState = useGameStore.getState()
      if (unitState.selectedUnit) {
        // Show move highlights
        const possibleMoves = gameState.calculatePossibleMoves(unitState.selectedUnit)
        possibleMoves.forEach((move: Coordinate) => {
          const { x: px, y: py } = this.tileToWorld(move.x, move.y)
          
          // Draw blue highlight for move targets
          this.highlightGraphics.fillStyle(VISUAL_CONFIG.COLORS.TILES.HQ_BLUE, VISUAL_CONFIG.HIGHLIGHT.ABILITY_ALPHA)
          this.highlightGraphics.fillRect(px, py, this.tileSizePx, this.tileSizePx)
          this.highlightGraphics.lineStyle(VISUAL_CONFIG.HIGHLIGHT.BORDER_WIDTH, 0x1d4ed8, 1)
          this.highlightGraphics.strokeRect(px, py, this.tileSizePx, this.tileSizePx)
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
    const unitState = useUnitStore.getState()
    const uiState = useUIStore.getState()
    if (unitState.selectedUnit) {
      this.updateHighlights(uiState.highlightedTiles, unitState.selectedUnit)
    }
  }

  // Show attack highlights on enemies in attack range
  private showAttackHighlights() {
    const unitState = useUnitStore.getState()
    const gameState = useGameStore.getState()
    if (!unitState.selectedUnit) return

    // Clear existing highlights
    this.highlightGraphics.clear()
    
    // Get only enemies in attack range (use possibleTargets from store)
    const possibleTargets = gameState.calculatePossibleTargets(unitState.selectedUnit!)
    const enemies = unitState.units.filter(u => 
      u.playerId !== unitState.selectedUnit!.playerId &&
      possibleTargets.some((target: Coordinate) => target.x === u.position.x && target.y === u.position.y)
    )
    
    // Highlight each enemy position with red
    enemies.forEach(enemy => {
      const { x: px, y: py } = this.tileToWorld(enemy.position.x, enemy.position.y)
      
      // Draw red highlight for enemy targets
      this.highlightGraphics.fillStyle(VISUAL_CONFIG.COLORS.HIGHLIGHTS.ATTACK, VISUAL_CONFIG.HIGHLIGHT.ATTACK_ALPHA)
      this.highlightGraphics.fillRect(px, py, this.tileSizePx, this.tileSizePx)
      this.highlightGraphics.lineStyle(VISUAL_CONFIG.HIGHLIGHT.BORDER_WIDTH, VISUAL_CONFIG.COLORS.HIGHLIGHTS.ATTACK_RANGE, 1)
      this.highlightGraphics.strokeRect(px, py, this.tileSizePx, this.tileSizePx)
    })
  }

  // Show ability highlights on valid targets
  private showAbilityHighlights(abilityId: string) {
    const unitState = useUnitStore.getState()
    const boardState = useBoardStore.getState()
    if (!unitState.selectedUnit) return

    // Clear existing highlights
    this.highlightGraphics.clear()
    
    // Get valid targets for this ability
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validTargets = getValidTargets(unitState.selectedUnit, { id: abilityId } as any, boardState.board, unitState.units)
    
    // Highlight each valid target with purple
    validTargets.forEach(target => {
      let px: number, py: number
      if ('x' in target) {
        // Coordinate target
        const { x: wx, y: wy } = this.tileToWorld(target.x, target.y)
        px = wx
        py = wy
      } else {
        // Unit target
        const { x: wx, y: wy } = this.tileToWorld(target.position.x, target.position.y)
        px = wx
        py = wy
      }
      
      // Draw purple highlight for ability targets
      this.highlightGraphics.fillStyle(VISUAL_CONFIG.COLORS.HIGHLIGHTS.ABILITY, VISUAL_CONFIG.HIGHLIGHT.ABILITY_ALPHA)
      this.highlightGraphics.fillRect(px, py, this.tileSizePx, this.tileSizePx)
      this.highlightGraphics.lineStyle(VISUAL_CONFIG.HIGHLIGHT.BORDER_WIDTH, 0x7c3aed, 1)
      this.highlightGraphics.strokeRect(px, py, this.tileSizePx, this.tileSizePx)
    })
  }

  destroy() {
    console.log('GameScene destroy called')
    
    // Mark as destroyed to prevent further operations
    this.isDestroyed = true
    
    // Clean up subscriptions first
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = undefined
    }
    if (this.unsubscribeUI) {
      this.unsubscribeUI()
      this.unsubscribeUI = undefined
    }
    if (this.unsubscribeUnits) {
      this.unsubscribeUnits()
      this.unsubscribeUnits = undefined
    }
    
    // Clear graphics to prevent further operations
    if (this.tileGraphics) {
      this.tileGraphics.destroy()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.tileGraphics = undefined as any
    }
    if (this.highlightGraphics) {
      this.highlightGraphics.destroy()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.highlightGraphics = undefined as any
    }
    if (this.abilityTargetGraphics) {
      this.abilityTargetGraphics.destroy()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.abilityTargetGraphics = undefined as any
    }
    
    // Clear unit sprites
    this.unitSprites.forEach(container => {
      if (container && container.destroy) {
        container.destroy()
      }
    })
    this.unitSprites.clear()
    
    // Clean up visual effects pool
    if (this.visualEffectsPool) {
      this.visualEffectsPool.destroy()
    }
    
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

    this.visualEffectsPool.createCoffeeParticles(target, position)
  }

  private createPinkSlipEffect(target: Unit | Coordinate) {
    const position = this.getTargetPosition(target)
    if (!position) return

    this.visualEffectsPool.createPinkSlipEffect(target, position)
  }

  private createPaperEffect(target: Unit | Coordinate) {
    const position = this.getTargetPosition(target)
    if (!position) return

    this.visualEffectsPool.createPaperEffect(target, position)
  }

  private createHarassEffect(target: Unit | Coordinate) {
    const position = this.getTargetPosition(target)
    if (!position) return

    this.visualEffectsPool.createHarassEffect(target, position)
  }

  private createOvertimeEffect(target: Unit | Coordinate) {
    const position = this.getTargetPosition(target)
    if (!position) return

    this.visualEffectsPool.createOvertimeGlow(target, position)
  }

  private createGenericEffect(target: Unit | Coordinate) {
    const position = this.getTargetPosition(target)
    if (!position) return

    // Use money sparkle for generic effect
    this.visualEffectsPool.createMoneySparkle(target, position)
  }

  private getTargetPosition(target: Unit | Coordinate): { x: number, y: number } | null {
    if ('x' in target) {
      // Target is a coordinate
      const { x: wx, y: wy } = this.tileToWorld(target.x, target.y)
      return {
        x: wx + this.tileSizePx / 2,
        y: wy + this.tileSizePx / 2
      }
    } else {
      // Target is a unit
      const { x: wx, y: wy } = this.tileToWorld(target.position.x, target.position.y)
      return {
        x: wx + this.tileSizePx / 2,
        y: wy + this.tileSizePx / 2
      }
    }
  }

  // ===== RESPONSIVE TILE SIZING =====
  
  /**
   * Updates tile sprites and positioning when tile size changes
   * Called by ResponsiveGameManager when viewport resizes
   */
  public updateTileSprites(newTileSize: number): void {
    if (this.isDestroyed) return;
    
    console.log(`GameScene: Updating tile size from ${this.tileSizePx} to ${newTileSize}`);
    
    // Update the tile size
    this.tileSizePx = newTileSize;
    
    // Clear existing graphics - add null checks to prevent errors
    if (this.tileGraphics && this.tileGraphics.clear) {
      this.tileGraphics.clear();
    }
    if (this.highlightGraphics && this.highlightGraphics.clear) {
      this.highlightGraphics.clear();
    }
    if (this.abilityTargetGraphics && this.abilityTargetGraphics.clear) {
      this.abilityTargetGraphics.clear();
    }
    
    // Redraw the board with new tile size
    const updateBoardState = useBoardStore.getState();
    if (updateBoardState.board) {
      this.drawBoard(updateBoardState.board);
    }
    
    // Update unit positions and sizes
    this.updateUnitSprites();
    
    // Clear any existing highlights (using existing clear methods) - add null checks
    if (this.highlightGraphics && this.highlightGraphics.clear) {
      this.highlightGraphics.clear();
    }
    if (this.abilityTargetGraphics && this.abilityTargetGraphics.clear) {
      this.abilityTargetGraphics.clear();
    }
    
    // Get actual board dimensions for logging
    const logBoardState = useBoardStore.getState()
    const boardWidth = logBoardState.board?.[0]?.length || 16
    const boardHeight = logBoardState.board?.length || 12
    console.log(`GameScene: Tile size update complete. New dimensions: ${boardWidth * newTileSize}x${boardHeight * newTileSize}`);
  }
  
  private updateUnitSprites(): void {
    // Update all unit sprites with new tile size
    this.unitSprites.forEach((container, unitId) => {
      const unitState = useUnitStore.getState()
      const unit = unitState.units.find(u => u.id === unitId);
      if (unit) {
        // Update container size
        container.setSize(this.tileSizePx, this.tileSizePx);
        
        // Update interactive area
        container.setInteractive(new Phaser.Geom.Rectangle(
          -this.tileSizePx/2, 
          -this.tileSizePx/2, 
          this.tileSizePx, 
          this.tileSizePx
        ), Phaser.Geom.Rectangle.Contains);
        
        // Update position
        const { x: wx, y: wy } = this.tileToWorld(unit.position.x, unit.position.y);
        container.setPosition(wx + this.tileSizePx / 2, wy + this.tileSizePx / 2);
        
        // Update unit circle radius proportionally
        const unitCircle = container.getByName('circle') as Phaser.GameObjects.Arc;
        if (unitCircle && unitCircle.setRadius) {
          const newRadius = Math.max(12, this.tileSizePx * 0.4); // Proportional radius with minimum
          // Use existing color logic from VISUAL_CONFIG
          const circleColor = unit.playerId === 'player1' ? VISUAL_CONFIG.COLORS.UNITS.PLAYER1 : VISUAL_CONFIG.COLORS.UNITS.PLAYER2;
          unitCircle.setRadius(newRadius);
          unitCircle.setFillStyle(circleColor, 1);
        } else {
          console.warn(`GameScene: unitCircle not found or invalid for unit ${unitId}`);
        }
        
        // Update HP bar positioning
        const hpBar = container.getByName('hpBg') as Phaser.GameObjects.Rectangle;
        if (hpBar) {
          const hpBarWidth = Math.max(30, this.tileSizePx * 0.8);
          const hpBarHeight = Math.max(4, this.tileSizePx * 0.1);
          const hpBarOffsetY = -this.tileSizePx / 2 - 8;
          
          // HP bar will be redrawn when needed, just update positioning
          container.setData('hpBarConfig', { width: hpBarWidth, height: hpBarHeight, offsetY: hpBarOffsetY });
        }
      }
    });
  }
}


