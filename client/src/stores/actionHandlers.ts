import { useGameStore } from './gameStore'
import { useUIStore } from './uiStore'
import { useUnitStore } from './unitStore'
import { useBoardStore } from './boardStore'
import { getAbilityById, getValidTargets } from '../game/core/abilities'
import { type Unit, type Coordinate } from 'shared'

/**
 * Action handlers that coordinate between UI store and game store
 * This creates a clean separation between UI state and game logic
 */

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
    
    // Create highlights map
    const highlights = new Map<string, string>()
    targets.forEach(target => highlights.set(`${target.x},${target.y}`, 'attack'))
    
    // Update UI state
    uiStore.setActionMode('attack')
    uiStore.setHighlightedTiles(highlights)
    
    console.log('Entered attack mode:', { unitId: unit.id, targetCount: targets.length })
  },

  /**
   * Enter ability mode - calculate valid targets and highlight them
   */
  enterAbilityMode: (unit: Unit, abilityId: string) => {
    const uiStore = useUIStore.getState()
    
    const ability = getAbilityById(abilityId)
    if (!ability) {
      console.log('Ability not found:', abilityId)
      return
    }
    
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
    
    // Create highlights map
    const highlights = new Map<string, string>()
    validTargets.forEach(target => {
      if ('x' in target) {
        highlights.set(`${target.x},${target.y}`, 'ability')
      } else {
        highlights.set(`${target.position.x},${target.position.y}`, 'ability')
      }
    })
    
    // Update UI state
    uiStore.setActionMode('ability')
    uiStore.setSelectedAbility(abilityId)
    uiStore.setHighlightedTiles(highlights)
    
    console.log('Entered ability mode:', { abilityId, unitId: unit.id, targetCount: validTargets.length })
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
