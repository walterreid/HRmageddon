import Phaser from 'phaser'
import { type Unit, type Coordinate, AbilityTargetingType, type Ability, type AttackPattern } from 'shared'
import { useGameStore } from '../../stores/gameStore'
import { useUIStore } from '../../stores/uiStore'
import { useUnitStore } from '../../stores/unitStore'
import { useBoardStore } from '../../stores/boardStore'
import { getAbilityById, getValidTargets } from '../core/abilities'
import { getTilesInCone } from '../core/targeting'
import { dataManager } from '../data/DataManager'

// Visual configuration for highlights
const HIGHLIGHT_CONFIG = {
  COLORS: {
    MOVEMENT: 0x3b82f6,      // Blue for movement
    ATTACK: 0xef4444,        // Red for attack
    ATTACK_RANGE: 0xdc2626,  // Darker red for attack range
    ABILITY: 0x9333ea,       // Purple for abilities
    ABILITY_AOE: 0xec4899,   // Pink for AOE abilities
    TARGET_ENEMY: 0xef4444,  // Red for enemy targets
    TARGET_ALLY: 0x16a34a,   // Green for ally targets
    CAPTURE: 0x06b6d4,       // Cyan for capture
    INVALID: 0x6b7280,       // Gray for invalid targets
  },
  HIGHLIGHT: {
    MOVEMENT_ALPHA: 0.4,
    ATTACK_ALPHA: 0.4,
    ATTACK_RANGE_ALPHA: 0.4,
    ABILITY_ALPHA: 0.4,
    AOE_ALPHA: 0.4,
    BORDER_WIDTH: 2,
    TILE_BORDER_ALPHA: 0.5,
  }
}

export class HighlightManager {
  private scene: Phaser.Scene
  private highlightGraphics!: Phaser.GameObjects.Graphics
  private abilityTargetGraphics!: Phaser.GameObjects.Graphics
  private tileSizePx: number
  private tileToWorld: (tx: number, ty: number) => { x: number, y: number }
  private worldToTile: (px: number, py: number) => { x: number, y: number }
  private validTargets: (Unit | Coordinate)[] = []
  private targetingMode: boolean = false

  constructor(scene: Phaser.Scene, tileSizePx: number, tileToWorld: (tx: number, ty: number) => { x: number, y: number }, worldToTile: (px: number, py: number) => { x: number, y: number }) {
    this.scene = scene
    this.tileSizePx = tileSizePx
    this.tileToWorld = tileToWorld
    this.worldToTile = worldToTile
    
    // Initialize graphics
    this.highlightGraphics = this.scene.add.graphics()
    this.abilityTargetGraphics = this.scene.add.graphics()
    
    // Ensure ability graphics are drawn on top
    this.abilityTargetGraphics.setDepth(100)
    this.highlightGraphics.setDepth(10)
  }

  updateTileSize(newTileSize: number) {
    this.tileSizePx = newTileSize
    this.clearAll()
  }

  updateHighlights(highlighted: Map<string, string>, selectedUnit?: Unit) {
    try {
      if (!this.highlightGraphics) {
        console.warn('highlightGraphics not initialized, skipping highlight update')
        return
      }
      
      // ALWAYS clear first
      this.highlightGraphics.clear()

      highlighted.forEach((type, coordKey) => {
        const [x, y] = coordKey.split(',').map(Number)
        const { x: px, y: py } = this.tileToWorld(x, y)
        this.drawHighlight(px, py, this.tileSizePx, type)
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
          color = HIGHLIGHT_CONFIG.COLORS.MOVEMENT
          alpha = HIGHLIGHT_CONFIG.HIGHLIGHT.MOVEMENT_ALPHA
          break
        case 'attack':
          color = HIGHLIGHT_CONFIG.COLORS.ATTACK
          alpha = HIGHLIGHT_CONFIG.HIGHLIGHT.ATTACK_ALPHA
          break
        case 'ability':
          color = HIGHLIGHT_CONFIG.COLORS.ABILITY
          alpha = HIGHLIGHT_CONFIG.HIGHLIGHT.ABILITY_ALPHA
          break
        case 'attack_range':
          color = HIGHLIGHT_CONFIG.COLORS.ATTACK_RANGE
          alpha = HIGHLIGHT_CONFIG.HIGHLIGHT.ATTACK_RANGE_ALPHA
          break
        case 'ability_aoe':
          color = HIGHLIGHT_CONFIG.COLORS.ABILITY_AOE
          alpha = HIGHLIGHT_CONFIG.HIGHLIGHT.AOE_ALPHA
          break
        case 'target_enemy':
          color = HIGHLIGHT_CONFIG.COLORS.TARGET_ENEMY
          alpha = 0.6
          break
        case 'target_ally':
          color = HIGHLIGHT_CONFIG.COLORS.TARGET_ALLY
          alpha = 0.6
          break
        case 'capture':
          color = HIGHLIGHT_CONFIG.COLORS.CAPTURE
          alpha = 0.4
          break
        case 'invalid':
          color = HIGHLIGHT_CONFIG.COLORS.INVALID
          alpha = 0.5
          break
        case 'range':
          color = 0x60a5fa // Light blue for range area
          alpha = 0.2
          break
        case 'target':
          color = 0xef4444 // Red for valid targets
          alpha = 0.6
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

  updateAbilityTargeting(selectedUnit?: Unit, selectedAbility?: string) {
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

    const ability = getAbilityById(selectedAbility, selectedUnit)
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
    
    // Show attack pattern if available
    this.showAttackPattern(selectedUnit, ability)
    
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

  private showAbilityRange(caster: Unit, ability: Ability) {
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
      rangeColor = HIGHLIGHT_CONFIG.COLORS.ATTACK_RANGE
      rangeAlpha = 0.25 // Good visibility without being too opaque
      console.log('Using negative ability colors:', { rangeColor: rangeColor.toString(16), rangeAlpha })
    } else {
      // Greenish for positive abilities (helpful to allies)
      rangeColor = 0x16a34a // Green
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
    const selectedUnit = useUnitStore.getState().selectedUnit
    this.validTargets.forEach(target => {
      if ('x' in target) {
        // Target is a coordinate
        const { x: px, y: py } = this.tileToWorld(target.x, target.y)
        
        // Determine if this is a positive or negative ability
        const ability = getAbilityById(useUIStore.getState().selectedAbility || '', selectedUnit)
        const isNegativeAbility = ability?.targetType === 'enemy'
        
        // Use appropriate colors for target highlighting
        let targetColor: number
        let targetAlpha: number
        
        if (isNegativeAbility) {
          // Reddish for negative abilities
          targetColor = HIGHLIGHT_CONFIG.COLORS.ATTACK
          targetAlpha = HIGHLIGHT_CONFIG.HIGHLIGHT.ATTACK_ALPHA
        } else {
          // Greenish for positive abilities
          targetColor = 0x16a34a // Green
          targetAlpha = HIGHLIGHT_CONFIG.HIGHLIGHT.ABILITY_ALPHA
        }
        
        this.abilityTargetGraphics.lineStyle(HIGHLIGHT_CONFIG.HIGHLIGHT.BORDER_WIDTH, targetColor, targetAlpha)
        this.abilityTargetGraphics.strokeRect(px, py, this.tileSizePx, this.tileSizePx)
        this.abilityTargetGraphics.fillStyle(targetColor, targetAlpha * 0.3)
        this.abilityTargetGraphics.fillRect(px, py, this.tileSizePx, this.tileSizePx)
      } else {
        // Target is a unit
        const { x: px, y: py } = this.tileToWorld(target.position.x, target.position.y)
        
        // Determine if this is a positive or negative ability
        const ability = getAbilityById(useUIStore.getState().selectedAbility || '', selectedUnit)
        const isNegativeAbility = ability?.targetType === 'enemy'
        
        // Use appropriate colors for target highlighting
        let targetColor: number
        let targetAlpha: number
        
        if (isNegativeAbility) {
          // Reddish for negative abilities
          targetColor = HIGHLIGHT_CONFIG.COLORS.ATTACK
          targetAlpha = HIGHLIGHT_CONFIG.HIGHLIGHT.ATTACK_ALPHA
        } else {
          // Greenish for positive abilities
          targetColor = 0x16a34a // Green
          targetAlpha = HIGHLIGHT_CONFIG.HIGHLIGHT.ABILITY_ALPHA
        }
        
        this.abilityTargetGraphics.lineStyle(HIGHLIGHT_CONFIG.HIGHLIGHT.BORDER_WIDTH, targetColor, targetAlpha)
        this.abilityTargetGraphics.strokeCircle(px + this.tileSizePx/2, py + this.tileSizePx/2, this.tileSizePx/2 + 2)
        this.abilityTargetGraphics.fillStyle(targetColor, targetAlpha * 0.3)
        this.abilityTargetGraphics.fillCircle(px + this.tileSizePx/2, py + this.tileSizePx/2, this.tileSizePx/2)
      }
    })
  }

  private showConePreview(caster: Unit, ability: Ability) {
    // For cone abilities, show a preview of the cone area
    // Check if this is a directional ability awaiting direction input
    const uiStore = useUIStore.getState()
    if (ability.requiresDirection && uiStore.abilityAwaitingDirection) {
      // Start listening for pointer movement to draw the preview
      this.scene.input.on('pointermove', this.updateConePreview, this)
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
    this.abilityTargetGraphics.lineStyle(HIGHLIGHT_CONFIG.HIGHLIGHT.BORDER_WIDTH, HIGHLIGHT_CONFIG.COLORS.ABILITY_AOE, HIGHLIGHT_CONFIG.HIGHLIGHT.ABILITY_ALPHA)
    this.abilityTargetGraphics.beginPath()
    this.abilityTargetGraphics.moveTo(casterCenterX, casterCenterY)
    
    // Draw cone arc (facing right for now)
    const startAngle = -coneAngle / 2
    const endAngle = coneAngle / 2
    this.abilityTargetGraphics.arc(casterCenterX, casterCenterY, coneRadius, startAngle, endAngle)
    this.abilityTargetGraphics.lineTo(casterCenterX, casterCenterY)
    this.abilityTargetGraphics.strokePath()
    
    // Fill cone area
    this.abilityTargetGraphics.fillStyle(HIGHLIGHT_CONFIG.COLORS.ABILITY_AOE, HIGHLIGHT_CONFIG.HIGHLIGHT.AOE_ALPHA)
    this.abilityTargetGraphics.fill()
  }

  // NEW METHOD to dynamically draw the cone preview
  private updateConePreview = (pointer: Phaser.Input.Pointer) => {
    const unitState = useUnitStore.getState()
    const uiStore = useUIStore.getState()
    const caster = unitState.selectedUnit
    const abilityId = uiStore.abilityAwaitingDirection

    if (!caster || !abilityId) {
      this.scene.input.off('pointermove', this.updateConePreview, this) // Stop listening
      return
    }

    this.abilityTargetGraphics.clear() // Clear previous preview
    const ability = getAbilityById(abilityId, caster)
    if (!ability) return

    const { x: tileX, y: tileY } = this.worldToTile(pointer.x, pointer.y)
    const direction = { x: tileX - caster.position.x, y: tileY - caster.position.y }

    const affectedTiles = getTilesInCone(caster.position, direction, ability.range, ability.coneAngle || 90)

    // Draw the highlight for all affected tiles
    this.abilityTargetGraphics.fillStyle(HIGHLIGHT_CONFIG.COLORS.ABILITY_AOE, HIGHLIGHT_CONFIG.HIGHLIGHT.AOE_ALPHA)
    affectedTiles.forEach(tile => {
      const { x: px, y: py } = this.tileToWorld(tile.x, tile.y)
      this.abilityTargetGraphics.fillRect(px, py, this.tileSizePx, this.tileSizePx)
    })
  }

  private showCirclePreview(caster: Unit, ability: Ability) {
    // For circle AOE abilities, show the area of effect
    const { x: casterX, y: casterY } = this.tileToWorld(caster.position.x, caster.position.y)
    const casterCenterX = casterX + this.tileSizePx / 2
    const casterCenterY = casterY + this.tileSizePx / 2
    
    const aoeRadius = (ability.aoeRadius || 2) * this.tileSizePx
    
    // Draw circle outline
    this.abilityTargetGraphics.lineStyle(HIGHLIGHT_CONFIG.HIGHLIGHT.BORDER_WIDTH, HIGHLIGHT_CONFIG.COLORS.ABILITY_AOE, HIGHLIGHT_CONFIG.HIGHLIGHT.ABILITY_ALPHA)
    this.abilityTargetGraphics.strokeCircle(casterCenterX, casterCenterY, aoeRadius)
    
    // Fill circle area
    this.abilityTargetGraphics.fillStyle(HIGHLIGHT_CONFIG.COLORS.ABILITY_AOE, HIGHLIGHT_CONFIG.HIGHLIGHT.AOE_ALPHA)
    this.abilityTargetGraphics.fill()
  }

  private showAttackPattern(caster: Unit, ability: Ability) {
    // Get the attack pattern from DataManager
    const attackPattern = dataManager.getAttackPattern(ability.range_pattern_key || 'single_target_melee')
    if (!attackPattern) {
      console.log('No attack pattern found for ability:', ability.id)
      return
    }

    console.log('Drawing attack pattern:', attackPattern.key, 'for ability:', ability.name)
    this.drawAttackPattern(attackPattern, caster)
  }

  private drawAttackPattern(pattern: AttackPattern, caster: Unit) {
    if (!this.abilityTargetGraphics) {
      console.error('abilityTargetGraphics not initialized!')
      return
    }

    const boardState = useBoardStore.getState()
    
    // Get the center of the pattern (where the caster is)
    const patternCenterX = Math.floor(pattern.pattern[0].length / 2)
    const patternCenterY = Math.floor(pattern.pattern.length / 2)
    
    console.log('Pattern center:', { patternCenterX, patternCenterY })
    console.log('Pattern dimensions:', { width: pattern.pattern[0].length, height: pattern.pattern.length })
    
    // Iterate through the pattern array
    for (let row = 0; row < pattern.pattern.length; row++) {
      for (let col = 0; col < pattern.pattern[row].length; col++) {
        const patternValue = pattern.pattern[row][col]
        
        // Only draw tiles marked as 1 (hit tiles)
        if (patternValue === 1) {
          // Calculate the relative position from the caster
          const relativeX = col - patternCenterX
          const relativeY = row - patternCenterY
          
          // Calculate the actual tile position
          const targetX = caster.position.x + relativeX
          const targetY = caster.position.y + relativeY
          
          // Check if this position is on the board
          if (targetX >= 0 && targetX < boardState.board[0].length && 
              targetY >= 0 && targetY < boardState.board.length) {
            
            // Check if this tile contains a valid target
            const hasValidTarget = this.validTargets.some(target => {
              if ('x' in target) {
                return target.x === targetX && target.y === targetY
              } else {
                return target.position.x === targetX && target.position.y === targetY
              }
            })
            
            // Only draw the pattern overlay if there's a valid target
            if (hasValidTarget) {
              const { x: px, y: py } = this.tileToWorld(targetX, targetY)
              
              console.log(`Drawing pattern tile at (${targetX}, ${targetY}) -> screen (${px}, ${py})`)
              
              // Draw pattern overlay with distinct color
              this.abilityTargetGraphics.fillStyle(0xff6b6b, 0.4) // Semi-transparent red
              this.abilityTargetGraphics.fillRect(px, py, this.tileSizePx, this.tileSizePx)
              
              // Add pattern border
              this.abilityTargetGraphics.lineStyle(2, 0xff6b6b, 0.8)
              this.abilityTargetGraphics.strokeRect(px, py, this.tileSizePx, this.tileSizePx)
            }
          }
        }
      }
    }
  }

  showAttackHighlights() {
    const unitState = useUnitStore.getState()
    const gameStore = useGameStore.getState()
    if (!unitState.selectedUnit) return

    // Clear existing highlights
    this.highlightGraphics.clear()
    
    // Get only enemies in attack range (use possibleTargets from store)
    const possibleTargets = gameStore.calculatePossibleTargets(unitState.selectedUnit)
    const enemies = unitState.units.filter((u) => 
      u.playerId !== unitState.selectedUnit!.playerId &&
      possibleTargets.some((target) => target.x === u.position.x && target.y === u.position.y)
    )
    
    // Highlight each enemy position with red
    enemies.forEach((enemy) => {
      const { x: px, y: py } = this.tileToWorld(enemy.position.x, enemy.position.y)
      
      // Draw red highlight for enemy targets
      this.highlightGraphics.fillStyle(HIGHLIGHT_CONFIG.COLORS.ATTACK, HIGHLIGHT_CONFIG.HIGHLIGHT.ATTACK_ALPHA)
      this.highlightGraphics.fillRect(px, py, this.tileSizePx, this.tileSizePx)
      this.highlightGraphics.lineStyle(HIGHLIGHT_CONFIG.HIGHLIGHT.BORDER_WIDTH, HIGHLIGHT_CONFIG.COLORS.ATTACK_RANGE, 1)
      this.highlightGraphics.strokeRect(px, py, this.tileSizePx, this.tileSizePx)
    })
  }

  showAbilityHighlights(abilityId: string) {
    const unitState = useUnitStore.getState()
    const boardState = useBoardStore.getState()
    if (!unitState.selectedUnit) return

    // Clear existing highlights
    this.highlightGraphics.clear()
    
    // Get valid targets for this ability
    const validTargets = getValidTargets(unitState.selectedUnit, { id: abilityId } as Ability, boardState.board, unitState.units)
    
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
      this.highlightGraphics.fillStyle(HIGHLIGHT_CONFIG.COLORS.ABILITY, HIGHLIGHT_CONFIG.HIGHLIGHT.ABILITY_ALPHA)
      this.highlightGraphics.fillRect(px, py, this.tileSizePx, this.tileSizePx)
      this.highlightGraphics.lineStyle(HIGHLIGHT_CONFIG.HIGHLIGHT.BORDER_WIDTH, 0x7c3aed, 1)
      this.highlightGraphics.strokeRect(px, py, this.tileSizePx, this.tileSizePx)
    })
  }

  clearAll() {
    if (this.highlightGraphics) {
      this.highlightGraphics.clear()
    }
    if (this.abilityTargetGraphics) {
      this.abilityTargetGraphics.clear()
    }
  }

  getValidTargets(): (Unit | Coordinate)[] {
    return this.validTargets
  }

  isTargetingMode(): boolean {
    return this.targetingMode
  }

  destroy() {
    if (this.highlightGraphics) {
      this.highlightGraphics.destroy()
    }
    if (this.abilityTargetGraphics) {
      this.abilityTargetGraphics.destroy()
    }
  }
}
