import { type GameState, type Unit, type Coordinate, TileType } from 'shared'
import { type Ability } from 'shared'
import { getUnitAbilities, canUseAbility, getValidTargets } from './abilities'

interface AIActions {
  moveUnit: (unitId: string, to: Coordinate) => void
  attackTarget: (attackerId: string, targetId: string) => void
  captureCubicle: (unitId: string, coord: Coordinate) => void
  useAbility: (unitId: string, abilityId: string, target?: Unit | Coordinate) => void
  endTurn: () => void
}

export class AIController {
  private difficulty: 'easy' | 'normal' | 'hard'
  
  constructor(difficulty: 'easy' | 'normal' | 'hard' = 'normal') {
    this.difficulty = difficulty
  }

  takeTurn(state: GameState, actions: AIActions, getState: () => GameState): void {
    const myUnits = state.units.filter((u) => u.playerId === state.currentPlayerId)
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
        const currentUnit = freshState.units.find(u => u.id === unit.id)
        
        if (!currentUnit || currentUnit.actionsRemaining <= 0) {
          console.log('Unit', unit.id, 'has no actions remaining or was destroyed, moving to next unit')
          break
        }
        
        const decision = this.makeDecision(currentUnit, freshState)
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
            actions.moveUnit(currentUnit.id, decision.position!)
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

  private makeDecision(unit: Unit, state: GameState): any {
    console.log('makeDecision called for unit:', unit.id, 'at position:', unit.position, 'actions:', unit.actionsRemaining)
    
    // Check if unit can still perform actions
    if (unit.actionsRemaining === 0) {
      console.log('Unit has no actions remaining')
      return null
    }
    
    // Priority order:
    // 1. Use abilities strategically
    // 2. Attack low-health enemies in range
    // 3. Capture nearby unowned cubicles
    // 4. Move toward objectives (enemies or cubicles)
    
    // Check for ability usage opportunities
    const abilityDecision = this.evaluateAbilityUsage(unit, state)
    if (abilityDecision) {
      console.log('Ability decision:', abilityDecision)
      return abilityDecision
    }
    
    // Check for attack opportunities
    const enemiesInRange = this.getEnemiesInRange(unit, state)
    console.log('Enemies in range:', enemiesInRange.length)
    if (enemiesInRange.length > 0 && !unit.hasAttacked && unit.actionsRemaining > 0) {
      // Sort by HP (attack weakest first)
      enemiesInRange.sort((a, b) => a.hp - b.hp)
      console.log('Attack decision: target', enemiesInRange[0].id)
      return { type: 'attack', targetId: enemiesInRange[0].id }
    }
    
    // Check for capture opportunities (move to cubicles)
    const capturableTiles = this.getCapturableTiles(unit, state)
    console.log('Capturable tiles:', capturableTiles.length)
    if (capturableTiles.length > 0 && unit.actionsRemaining > 0 && !unit.hasMoved) {
      console.log('Move to capture decision: position', capturableTiles[0])
      return { type: 'move', position: capturableTiles[0] }
    }
    
    // Move toward nearest objective
    if (!unit.hasMoved && unit.actionsRemaining > 0) {
      const moveTarget = this.getBestMovePosition(unit, state)
      console.log('Move target:', moveTarget)
      if (moveTarget) {
        console.log('Move decision: position', moveTarget)
        return { type: 'move', position: moveTarget }
      }
    }
    
    console.log('No decision found')
    return null
  }

  private evaluateAbilityUsage(unit: Unit, state: GameState): any {
    // Check if unit has abilities and enough actions to use them
    if (!unit.abilities || unit.abilities.length === 0 || unit.actionsRemaining < 1) {
      return null
    }

    const availableAbilities = getUnitAbilities(unit.type).filter(ability => 
      canUseAbility(unit, ability.id)
    )

    if (availableAbilities.length === 0) {
      return null
    }

    // Score each ability based on strategic value
    let bestAbility = null
    let bestScore = -Infinity
    let bestTarget = null

    for (const ability of availableAbilities) {
              const validTargets = getValidTargets(unit, ability, state.board, state.units)
      
      for (const target of validTargets) {
        const score = this.scoreAbilityUsage(ability, target, unit)
        
        if (score > bestScore) {
          bestScore = score
          bestAbility = ability
          bestTarget = target
        }
      }
    }

    if (bestAbility && bestScore > 5) { // Threshold for using ability
      return {
        type: 'ability',
        abilityId: bestAbility.id,
        target: bestTarget
      }
    }

    return null
  }

  private scoreAbilityUsage(ability: Ability, target: Unit | Coordinate, caster: Unit): number {
    let score = 0

    // Base score for different ability types
    switch (ability.id) {
      case 'pink_slip':
        // High value for execution abilities
        if ('hp' in target && target.hp <= 2) {
          score += 20
        }
        break
      case 'fetch_coffee':
        // Good for supporting allies
        if ('playerId' in target && target.playerId === caster.playerId) {
          score += 8
        }
        break
      case 'overtime':
        // Good when actions are needed
        if (caster.actionsRemaining <= 1) {
          score += 10
        }
        break
      case 'file_it':
        // Good for debuffing enemies
        if ('playerId' in target && target.playerId !== caster.playerId) {
          score += 6
        }
        break
      case 'harass':
        // Good for preventing captures
        if ('playerId' in target && target.playerId !== caster.playerId) {
          score += 7
        }
        break
      default:
        score += 3
    }

    // Bonus for targeting low HP enemies
    if ('hp' in target && target.hp <= 3) {
      score += 5
    }

    // Bonus for targeting high-value units (HR Managers, Executives)
    if ('type' in target) {
      if (target.type === 'hr_manager' || target.type === 'executive') {
        score += 4
      }
    }

    return score
  }

  private getEnemiesInRange(unit: Unit, state: GameState): Unit[] {
    const enemies = state.units.filter(enemy => {
      if (enemy.playerId === unit.playerId) return false
      const distance = Math.abs(enemy.position.x - unit.position.x) + 
                      Math.abs(enemy.position.y - unit.position.y)
      const inRange = distance <= unit.attackRange
      console.log('Enemy', enemy.id, 'at', enemy.position, 'distance:', distance, 'in range:', inRange, 'unit attack range:', unit.attackRange)
      return inRange
    })
    
    console.log('Enemies in range for unit', unit.id, ':', enemies.map(e => ({ id: e.id, position: e.position, hp: e.hp })))
    return enemies
  }

  private getCapturableTiles(unit: Unit, state: GameState): Coordinate[] {
    // AI now moves TO cubicles instead of capturing from adjacent positions
    // The actual capture happens at turn end when the unit is on the tile
    const possibleMoves = this.calculatePossibleMoves(unit, state)
    
    const capturable = possibleMoves.filter(coord => {
      const tile = state.board[coord.y]?.[coord.x]
      console.log('Checking moveable tile at', coord, 'type:', tile?.type, 'owner:', tile?.owner, 'unit player:', unit.playerId)
      
      // Check if it's a cubicle and not owned by this unit's player
      return tile?.type === TileType.CUBICLE && tile.owner !== unit.playerId
    })
    
    console.log('Capturable tiles found (AI will move to):', capturable)
    return capturable
  }

  private getBestMovePosition(unit: Unit, state: GameState): Coordinate | null {
    // Find all possible move positions
    const possibleMoves = this.calculatePossibleMoves(unit, state)
    console.log('Possible moves for unit', unit.id, ':', possibleMoves)
    
    if (possibleMoves.length === 0) {
      console.log('No possible moves found for unit', unit.id)
      return null
    }
    
    // Score each position based on proximity to objectives
    let bestMove = possibleMoves[0]
    let bestScore = -Infinity
    
    for (const move of possibleMoves) {
      let score = 0
      
      // Score based on proximity to enemies
      const nearestEnemy = this.findNearestEnemy(move, unit.playerId, state)
      if (nearestEnemy) {
        const distance = Math.abs(nearestEnemy.position.x - move.x) + 
                        Math.abs(nearestEnemy.position.y - move.y)
        score += (10 - distance) * 2 // Closer is better
      }
      
      // Score based on proximity to uncaptured cubicles
      const nearestCubicle = this.findNearestCubicle(move, unit.playerId, state)
      if (nearestCubicle) {
        const distance = Math.abs(nearestCubicle.x - move.x) + 
                        Math.abs(nearestCubicle.y - move.y)
        score += (10 - distance) // Closer is better
      }
      
      // Add randomness based on difficulty
      if (this.difficulty === 'easy') score += Math.random() * 5
      if (this.difficulty === 'normal') score += Math.random() * 2
      
      if (score > bestScore) {
        bestScore = score
        bestMove = move
      }
    }
    
    console.log('Best move for unit', unit.id, ':', bestMove, 'score:', bestScore)
    return bestMove
  }

  private calculatePossibleMoves(unit: Unit, state: GameState): Coordinate[] {
    const moves: Coordinate[] = []
    const visited = new Set<string>()
    const queue: { coord: Coordinate; distance: number }[] = [
      { coord: unit.position, distance: 0 }
    ]
    
    console.log('Calculating moves for unit', unit.id, 'at', unit.position, 'move range:', unit.moveRange)
    
    while (queue.length > 0) {
      const { coord, distance } = queue.shift()!
      const key = `${coord.x},${coord.y}`
      
      if (visited.has(key)) continue
      visited.add(key)
      
      if (distance > 0 && distance <= unit.moveRange) {
        const tile = state.board[coord.y]?.[coord.x]
        const occupied = state.units.some(u => 
          u.position.x === coord.x && u.position.y === coord.y
        )
        
        if (tile && tile.type !== TileType.OBSTACLE && !occupied) {
          moves.push(coord)
          console.log('Valid move found at', coord, 'distance:', distance)
        } else {
          console.log('Invalid move at', coord, 'tile type:', tile?.type, 'occupied:', occupied)
        }
      }
      
      if (distance < unit.moveRange) {
        const neighbors = [
          { x: coord.x + 1, y: coord.y },
          { x: coord.x - 1, y: coord.y },
          { x: coord.x, y: coord.y + 1 },
          { x: coord.x, y: coord.y - 1 },
        ]
        
        for (const neighbor of neighbors) {
          if (neighbor.x >= 0 && neighbor.x < state.board[0].length &&
              neighbor.y >= 0 && neighbor.y < state.board.length) {
            queue.push({ coord: neighbor, distance: distance + 1 })
          }
        }
      }
    }
    
    console.log('Total valid moves found:', moves.length)
    return moves
  }

  private findNearestEnemy(position: Coordinate, playerId: string, state: GameState): Unit | null {
    const enemies = state.units.filter(u => u.playerId !== playerId)
    if (enemies.length === 0) return null
    
    return enemies.reduce((nearest, enemy) => {
      const distToEnemy = Math.abs(enemy.position.x - position.x) + 
                         Math.abs(enemy.position.y - position.y)
      const distToNearest = Math.abs(nearest.position.x - position.x) + 
                           Math.abs(nearest.position.y - position.y)
      return distToEnemy < distToNearest ? enemy : nearest
    })
  }

  private findNearestCubicle(position: Coordinate, playerId: string, state: GameState): Coordinate | null {
    let nearest: Coordinate | null = null
    let minDistance = Infinity
    
    for (let y = 0; y < state.board.length; y++) {
      for (let x = 0; x < state.board[y].length; x++) {
        const tile = state.board[y][x]
        if (tile.type === TileType.CUBICLE && tile.owner !== playerId) {
          const distance = Math.abs(x - position.x) + Math.abs(y - position.y)
          if (distance < minDistance) {
            minDistance = distance
            nearest = { x, y }
          }
        }
      }
    }
    
    return nearest
  }
}


