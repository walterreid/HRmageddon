import { useGameStore } from './gameStore'
import { useUIStore } from './uiStore'
import { useUnitStore } from './unitStore'
import { useBoardStore } from './boardStore'
import { getAbilityById, getValidTargets } from '../game/core/abilities'
import { dataManager } from '../game/data/DataManager'
import { type Unit, type Coordinate } from 'shared'

/**
 * Action handlers that coordinate between UI store and game store
 * This creates a clean separation between UI state and game logic
 */

// Helper function to get range tiles from attack pattern
function getRangeTilesFromPattern(unit: Unit, patternKey: string): Coordinate[] {
  const attackPattern = dataManager.getAttackPattern(patternKey)
  if (!attackPattern) return []
  
  const rangeTiles: Coordinate[] = []
  const patternCenterX = Math.floor(attackPattern.pattern[0].length / 2)
  const patternCenterY = Math.floor(attackPattern.pattern.length / 2)
  
  for (let row = 0; row < attackPattern.pattern.length; row++) {
    for (let col = 0; col < attackPattern.pattern[row].length; col++) {
      const patternValue = attackPattern.pattern[row][col]
      if (patternValue === 1 || patternValue === 2) { // 1 = range, 2 = center
        const relativeX = col - patternCenterX
        const relativeY = row - patternCenterY
        const targetX = unit.position.x + relativeX
        const targetY = unit.position.y + relativeY
        
        // Check if tile is within board bounds
        const boardState = useBoardStore.getState()
        if (targetX >= 0 && targetX < boardState.board[0].length && 
            targetY >= 0 && targetY < boardState.board.length) {
          rangeTiles.push({ x: targetX, y: targetY })
        }
      }
    }
  }
  
  return rangeTiles
}

export const actionHandlers = {
  /**
   * Enter move mode - calculate possible moves and highlight them
   */
  enterMoveMode: (unit: Unit) => {
    const gameStore = useGameStore.getState()
    const uiStore = useUIStore.getState()
    
    // Calculate possible moves
    const moves = gameStore.calculatePossibleMoves(unit)
    
    // Create highlights map
    const highlights = new Map<string, string>()
    moves.forEach(move => highlights.set(`${move.x},${move.y}`, 'movement'))
    
    // Update UI state
    uiStore.setActionMode('move')
    uiStore.setHighlightedTiles(highlights)
    
    console.log('Entered move mode:', { unitId: unit.id, moveCount: moves.length })
  },

  /**
   * Enter attack mode - calculate possible targets and highlight them
   */
  enterAttackMode: (unit: Unit) => {
    const gameStore = useGameStore.getState()
    const uiStore = useUIStore.getState()
    
    // Calculate possible targets
    const targets = gameStore.calculatePossibleTargets(unit)
    
    // Determine attack pattern based on unit's attack range
    let patternKey = 'single_target_melee' // Default
    if (unit.attackRange > 1) {
      patternKey = 'single_target_ranged'
    }
    
    // Get range pattern for attack based on unit's actual range
    const rangeTiles = getRangeTilesFromPattern(unit, patternKey)
    
    // Create highlights map with both range and target highlights
    const highlights = new Map<string, string>()
    
    // Add range highlights (light blue/gray)
    rangeTiles.forEach(tile => highlights.set(`${tile.x},${tile.y}`, 'range'))
    
    // Add target highlights (red) for valid targets
    targets.forEach(target => highlights.set(`${target.x},${target.y}`, 'target'))
    
    // Update UI state
    uiStore.setActionMode('attack')
    uiStore.setHighlightedTiles(highlights)
    
    console.log('Entered attack mode:', { unitId: unit.id, attackRange: unit.attackRange, patternKey, targetCount: targets.length, rangeCount: rangeTiles.length })
  },

  /**
   * Enter ability mode - calculate valid targets and highlight them
   */
  enterAbilityMode: (unit: Unit, abilityId: string) => {
    const uiStore = useUIStore.getState()
    
    try {
      const ability = getAbilityById(abilityId, unit)
      
      // Check if this is a directional ability
      if (ability.requiresDirection) {
        uiStore.setAbilityAwaitingDirection(abilityId)
        uiStore.setActionMode('ability')
        uiStore.setSelectedAbility(abilityId)
        console.log('Entered directional ability mode:', { abilityId, unitId: unit.id })
        return
      }
      
      // Calculate valid targets for the ability
      const unitState = useUnitStore.getState()
      const boardState = useBoardStore.getState()
      const validTargets = getValidTargets(unit, ability, boardState.board, unitState.units)
      
      // Get range pattern for ability
      const rangeTiles = getRangeTilesFromPattern(unit, ability.range_pattern_key || 'single_target_melee')
      
      // Create highlights map with both range and target highlights
      const highlights = new Map<string, string>()
      
      // Add range highlights (light blue/gray)
      rangeTiles.forEach(tile => highlights.set(`${tile.x},${tile.y}`, 'range'))
      
      // Add target highlights (purple) for valid targets
      validTargets.forEach(target => {
        if ('x' in target) {
          highlights.set(`${target.x},${target.y}`, 'target')
        } else {
          highlights.set(`${target.position.x},${target.position.y}`, 'target')
        }
      })
      
      // Update UI state
      uiStore.setActionMode('ability')
      uiStore.setSelectedAbility(abilityId)
      uiStore.setHighlightedTiles(highlights)
      
      console.log('Entered ability mode:', { abilityId, unitId: unit.id, targetCount: validTargets.length, rangeCount: rangeTiles.length })
    } catch (error) {
      console.error('Failed to enter ability mode:', error)
      // FUTURE STEP: We could add UI feedback here, e.g., uiStore.setErrorMessage(error.message)
      return // Stop the action
    }
  },

  /**
   * Execute a move action
   */
  executeMove: (unit: Unit, target: Coordinate) => {
    const gameStore = useGameStore.getState()
    const uiStore = useUIStore.getState()
    
    // Execute the move
    gameStore.moveUnit(unit.id, target)
    
    // Clear action mode
    uiStore.clearActionMode()
    
    console.log('Executed move:', { unitId: unit.id, target })
  },

  /**
   * Execute an attack action
   */
  executeAttack: (attacker: Unit, target: Unit) => {
    const gameStore = useGameStore.getState()
    const uiStore = useUIStore.getState()
    
    // Execute the attack
    gameStore.attackTarget(attacker.id, target.id)
    
    // Clear action mode
    uiStore.clearActionMode()
    
    console.log('Executed attack:', { attackerId: attacker.id, targetId: target.id })
  },

  /**
   * Execute an ability action
   */
  executeAbility: (unit: Unit, abilityId: string, target?: Unit | Coordinate) => {
    const gameStore = useGameStore.getState()
    const uiStore = useUIStore.getState()
    
    // Execute the ability
    gameStore.useAbility(unit.id, abilityId, target)
    
    // Clear action mode
    uiStore.clearActionMode()
    
    console.log('Executed ability:', { unitId: unit.id, abilityId, target })
  },

  /**
   * Cancel current action
   */
  cancelAction: () => {
    const uiStore = useUIStore.getState()
    uiStore.clearActionMode()
    console.log('Cancelled action')
  }
}
