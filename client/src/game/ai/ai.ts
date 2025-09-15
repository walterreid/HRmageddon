import { type GameState, type Unit, type Coordinate, TileType, type Ability } from 'shared'
import { getUnitAbilities, canUseAbility, getValidTargets } from '../core/abilities'
import { GameQueries, type GameState as QueryGameState } from './gameStateQueries'
import { type MainStoreState } from '../../stores/mainStore'
import { calculatePossibleMoves, findNearestCoordinate } from '../core/movement'

interface AIActions {
  moveUnit: (unitId: string, to: Coordinate) => void
  attackTarget: (attackerId: string, targetId: string) => void
  captureCubicle: (unitId: string, coord: Coordinate) => void
  useAbility: (unitId: string, abilityId: string, target?: Unit | Coordinate) => void
  endTurn: () => void
}

interface AIAction {
  type: 'move' | 'attack' | 'ability' | 'capture'
  target?: Coordinate
  targetId?: string
  abilityId?: string
}

export class AIController {
  // private _difficulty: 'easy' | 'normal' | 'hard' // Currently unused
  
  constructor(_difficulty: 'easy' | 'normal' | 'hard' = 'normal') {
    // Difficulty setting currently unused
    void _difficulty; // Suppress unused parameter warning
  }

  takeTurnWithMainStore(mainStore: MainStoreState): void {
    const gameState = mainStore.getGameState()
    const queryState: QueryGameState = {
      units: gameState.units,
      board: gameState.board,
      players: gameState.players,
      currentPlayerId: gameState.currentPlayerId,
      phase: gameState.phase,
      turnNumber: gameState.turnNumber
    }
    
    const myUnits = GameQueries.getMyUnits(queryState)
    console.log('AI takeTurn called with', myUnits.length, 'units')
    
    // Process each unit
    for (const unit of myUnits) {
      console.log('Processing AI unit:', unit.id, 'actions remaining:', unit.actionsRemaining)
      
      // Process this unit until it has no actions left
      let shouldContinue = true
      let iterationCount = 0
      const maxIterations = 5 // Safety limit to detect infinite loops
      
      while (shouldContinue) {
        iterationCount++
        
        if (iterationCount > maxIterations) {
          console.error('🚨 INFINITE LOOP DETECTED! Unit', unit.id, 'has been processed', iterationCount, 'times without consuming actions')
          console.error('This indicates a bug in the action execution or state update logic')
          shouldContinue = false
          break
        }
        
        // Get fresh state before making decision
        const freshGameState = mainStore.getGameState()
        const freshQueryState: QueryGameState = {
          units: freshGameState.units,
          board: freshGameState.board,
          players: freshGameState.players,
          currentPlayerId: freshGameState.currentPlayerId,
          phase: freshGameState.phase,
          turnNumber: freshGameState.turnNumber
        }
        
        const currentUnit = GameQueries.getUnitById(freshQueryState, unit.id)
        
        if (!currentUnit || currentUnit.actionsRemaining <= 0) {
          console.log('Unit', unit.id, 'has no actions remaining or was destroyed, moving to next unit')
          break
        }
        
        const decision = this.makeDecisionWithQueries(currentUnit, freshQueryState)
        console.log('AI decision for unit', currentUnit.id, ':', decision)
        
        if (!decision) {
          console.log('No decision found for unit', currentUnit.id)
          break
        }
        
        // Execute the decision through the main store
        this.executeDecisionWithMainStore(decision, currentUnit, mainStore)
      }
    }
    
    console.log('AI turn completed')
    // End the AI turn to return control to the player
    mainStore.endTurn()
  }

  private executeDecisionWithMainStore(decision: AIAction, unit: Unit, mainStore: MainStoreState): void {
    console.log('Executing AI decision:', decision, 'for unit:', unit.id)
    
    switch (decision.type) {
      case 'move':
        if (decision.target) {
          console.log('AI moving unit', unit.id, 'to', decision.target)
          mainStore.moveUnit(unit.id, decision.target)
        }
        break
        
      case 'attack':
        if (decision.targetId) {
          console.log('AI attacking with unit', unit.id, 'target:', decision.targetId)
          mainStore.attackUnit(unit.id, decision.targetId)
        }
        break
        
      case 'ability':
        if (decision.abilityId && decision.target) {
          console.log('AI using ability', decision.abilityId, 'with unit', unit.id, 'target:', decision.target)
          mainStore.useAbility(unit.id, decision.abilityId, decision.target)
        }
        break
        
      case 'capture':
        if (decision.target) {
          console.log('AI capturing cubicle with unit', unit.id, 'at', decision.target)
          mainStore.captureCubicle(unit.id, decision.target)
        }
        break
        
      default:
        console.warn('Unknown AI decision type:', decision)
    }
  }

  takeTurn(state: GameState, actions: AIActions, getState: () => GameState): void {
    const queryState: QueryGameState = {
      units: state.units,
      board: state.board,
      players: state.players,
      currentPlayerId: state.currentPlayerId,
      phase: state.phase,
      turnNumber: state.turnNumber
    }
    
    const myUnits = GameQueries.getMyUnits(queryState)
    console.log('AI takeTurn called with', myUnits.length, 'units')
    
    // Process each unit
    for (const unit of myUnits) {
      console.log('Processing AI unit:', unit.id, 'actions remaining:', unit.actionsRemaining)
      
      // Process this unit until it has no actions left
      let shouldContinue = true
      let iterationCount = 0
      const maxIterations = 5 // Safety limit to detect infinite loops
      
      while (shouldContinue) {
        iterationCount++
        
        if (iterationCount > maxIterations) {
          console.error('🚨 INFINITE LOOP DETECTED! Unit', unit.id, 'has been processed', iterationCount, 'times without consuming actions')
          console.error('This indicates a bug in the action execution or state update logic')
          shouldContinue = false
          break
        }
        // Get fresh state before making decision
        const freshState = getState()
        const queryState: QueryGameState = {
          units: freshState.units,
          board: freshState.board,
          players: freshState.players,
          currentPlayerId: freshState.currentPlayerId,
          phase: freshState.phase,
          turnNumber: freshState.turnNumber
        }
        
        const currentUnit = GameQueries.getUnitById(queryState, unit.id)
        
        if (!currentUnit || currentUnit.actionsRemaining <= 0) {
          console.log('Unit', unit.id, 'has no actions remaining or was destroyed, moving to next unit')
          break
        }
        
        const decision = this.makeDecisionWithQueries(currentUnit, queryState)
        console.log('AI decision for unit', currentUnit.id, ':', decision)
        
        if (!decision) {
          console.log('No decision found for unit', currentUnit.id)
          break
        }
        
        // Execute the decision through the action callbacks
        switch (decision.type) {
          case 'attack':
            console.log('Executing attack decision')
            actions.attackTarget(currentUnit.id, decision.targetId!)
            break
          case 'move':
            console.log('Executing move decision')
            actions.moveUnit(currentUnit.id, decision.target!)
            break
          case 'ability':
            console.log('Executing ability decision')
            actions.useAbility(currentUnit.id, decision.abilityId!, decision.target)
            break
          default:
            console.log('Unknown decision type:', decision.type)
            shouldContinue = false // Skip if no valid action
        }
        
        // After executing an action, check if we should continue
        // Get fresh state to see if actions were consumed
        const updatedState = getState()
        const updatedUnit = updatedState.units.find(u => u.id === unit.id)
        
        console.log('After action execution - Unit:', unit.id, 'Actions before:', currentUnit.actionsRemaining, 'Actions after:', updatedUnit?.actionsRemaining)
        
        if (!updatedUnit || updatedUnit.actionsRemaining <= 0) {
          console.log('Unit', unit.id, 'actions consumed, stopping processing')
          shouldContinue = false
        } else {
          console.log('Unit', unit.id, 'still has actions, continuing...')
        }
        
        // Small delay to allow state to update
        setTimeout(() => {}, 10)
      }
    }
    
    console.log('AI turn completed')
    // End the AI turn to return control to the player
    actions.endTurn()
  }

  private makeDecisionWithQueries(unit: Unit, queryState: QueryGameState): AIAction | null {
    console.log('Making decision for unit:', unit.id, 'type:', unit.type, 'actions:', unit.actionsRemaining)
    
    // 1. Check for ability opportunities first (highest priority)
    const abilityDecision = this.evaluateAbilities(unit, queryState)
    if (abilityDecision) {
      console.log('Ability decision:', abilityDecision)
      return abilityDecision
    }
    
    // 2. Check for attack opportunities (high priority)
    const enemiesInRange = GameQueries.getEnemiesInRange(queryState, unit)
    if (enemiesInRange.length > 0) {
      // Find the weakest enemy in range
      const weakestEnemy = enemiesInRange.reduce((weakest, enemy) => 
        enemy.hp < weakest.hp ? enemy : weakest
      )
      console.log('Attack decision: target', weakestEnemy.id, 'HP:', weakestEnemy.hp)
      return { type: 'attack', targetId: weakestEnemy.id }
    }
    
    // 3. Check for capture opportunities (medium priority)
    const capturableTiles = this.getCapturableTiles(unit, {
      id: 'ai-game-state',
      units: queryState.units,
      board: queryState.board,
      players: queryState.players,
      phase: queryState.phase,
      currentPlayerId: queryState.currentPlayerId,
      turnNumber: queryState.turnNumber
    })
    
    if (capturableTiles.length > 0) {
      // Find the closest capturable tile
      const nearestCapture = findNearestCoordinate(unit.position, capturableTiles)
      if (nearestCapture) {
        console.log('Capture decision: move to', nearestCapture)
        return { type: 'move', target: nearestCapture }
      }
    }
    
    // 4. Move towards nearest enemy (low priority)
    const nearestEnemy = GameQueries.findNearestEnemy(queryState, unit.position, unit.playerId)
    if (nearestEnemy) {
      const possibleMoves = GameQueries.getPossibleMoves(queryState, unit)
      if (possibleMoves.length > 0) {
        // Find the move that gets us closest to the enemy
        const bestMove = this.findBestMoveTowardsTarget(unit.position, nearestEnemy.position, possibleMoves)
        if (bestMove) {
          console.log('Enemy pursuit decision: move to', bestMove, 'towards', nearestEnemy.id)
          return { type: 'move', target: bestMove }
        }
      }
    }
    
    // 5. Move towards nearest objective (fallback)
    const nearestObjective = GameQueries.findNearestObjective(queryState, unit.position, unit.playerId)
    if (nearestObjective) {
      const possibleMoves = GameQueries.getPossibleMoves(queryState, unit)
      if (possibleMoves.length > 0) {
        const bestMove = this.findBestMoveTowardsTarget(unit.position, nearestObjective, possibleMoves)
        if (bestMove) {
          console.log('Objective decision: move to', bestMove, 'towards', nearestObjective)
          return { type: 'move', target: bestMove }
        }
      }
    }
    
    // 6. Random move if nothing else works (last resort)
    const possibleMoves = GameQueries.getPossibleMoves(queryState, unit)
    if (possibleMoves.length > 0) {
      const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]
      console.log('Random move decision:', randomMove)
      return { type: 'move', target: randomMove }
    }
    
    console.log('No decision found for unit', unit.id)
    return null
  }

  private evaluateAbilities(unit: Unit, queryState: QueryGameState): AIAction | null {
    const abilities = getUnitAbilities(unit.type)
    
    for (const ability of abilities) {
      if (!canUseAbility(unit, ability.id)) continue
      
      const validTargets = getValidTargets(unit, ability, queryState.board, queryState.units)
      if (validTargets.length === 0) continue
      
      // Score this ability based on its potential impact
      const score = this.scoreAbility(unit, ability, validTargets, queryState)
      if (score > 0.7) { // Threshold for using ability
        const bestTarget = validTargets[0] // For now, just use first target
        return { type: 'ability', abilityId: ability.id, target: bestTarget as Coordinate }
      }
    }
    
    return null
  }

  private scoreAbility(unit: Unit, ability: Ability, targets: (Unit | Coordinate)[], _queryState: QueryGameState): number {
    void _queryState; // Suppress unused parameter warning
    let score = 0

    // Base score for different ability types
    switch (ability.id) {
      case 'pink_slip': {
        // High value for execution abilities
        const target = targets[0] as Unit
        if (target && 'hp' in target && target.hp <= 2) {
          score += 0.9
        }
        break
      }
      case 'fetch_coffee': {
        // Good for supporting allies
        if (targets[0] && 'playerId' in targets[0] && targets[0].playerId === unit.playerId) {
          score += 0.8
        }
        break
      }
      case 'overtime': {
        // Good when actions are needed
        if (unit.actionsRemaining <= 1) {
          score += 0.7
        }
        break
      }
      case 'file_it': {
        // Good for debuffing enemies
        if (targets[0] && 'playerId' in targets[0] && targets[0].playerId !== unit.playerId) {
          score += 0.6
        }
        break
      }
      case 'harass': {
        // Good for preventing captures
        if (targets[0] && 'playerId' in targets[0] && targets[0].playerId !== unit.playerId) {
          score += 0.7
        }
        break
      }
      default:
        score += 0.3
    }

    // Bonus for targeting low HP enemies
    if (targets[0] && 'hp' in targets[0] && targets[0].hp <= 3) {
      score += 0.5
    }

    // Bonus for targeting high-value units (HR Managers, Executives)
    if (targets[0] && 'type' in targets[0]) {
      if (targets[0].type === 'hr_manager' || targets[0].type === 'executive') {
        score += 0.4
      }
    }

    return score
  }


  private getCapturableTiles(unit: Unit, state: GameState): Coordinate[] {
    // AI now moves TO cubicles instead of capturing from adjacent positions
    // The actual capture happens at turn end when the unit is on the tile
    const possibleMoves = calculatePossibleMoves(unit, { board: state.board, units: state.units })
    
    const capturable = possibleMoves.filter(coord => {
      const tile = state.board[coord.y]?.[coord.x]
      console.log('Checking moveable tile at', coord, 'type:', tile?.type, 'owner:', tile?.owner, 'unit player:', unit.playerId)
      
      // Check if it's a cubicle and not owned by this unit's player
      return tile?.type === TileType.CUBICLE && tile.owner !== unit.playerId
    })
    
    console.log('Capturable tiles found (AI will move to):', capturable)
    return capturable
  }




  private findBestMoveTowardsTarget(_currentPosition: Coordinate, targetPosition: Coordinate, possibleMoves: Coordinate[]): Coordinate | null {
    if (possibleMoves.length === 0) return null
    
    // Find the move that gets us closest to the target
    let bestMove = possibleMoves[0]
    let bestDistance = this.getDistance(bestMove, targetPosition)
    
    for (const move of possibleMoves) {
      const distance = this.getDistance(move, targetPosition)
      if (distance < bestDistance) {
        bestDistance = distance
        bestMove = move
      }
    }
    
    return bestMove
  }

  private getDistance(pos1: Coordinate, pos2: Coordinate): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)
  }
}


