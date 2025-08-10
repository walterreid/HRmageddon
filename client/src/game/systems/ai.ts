import { type GameState, type Unit, type Coordinate, ActionType, TileType } from 'shared'

export class AIController {
  private state!: GameState
  constructor(private difficulty: 'easy' | 'normal' | 'hard' = 'normal') {}

  takeTurn(state: GameState): void {
    this.state = state
    const myUnits = state.units.filter((u) => u.playerId === state.currentPlayerId)
    for (const unit of myUnits) {
      let safety = 10
      while (unit.actionsRemaining > 0 && safety-- > 0) {
        const action = this.chooseAction(unit)
        if (!action) break
        this.executeAction(action)
      }
    }
  }

  private chooseAction(unit: Unit): any | null {
    const actions = this.evaluateActions(unit)
    if (actions.length === 0) return null
    actions.sort((a, b) => b.score - a.score)
    if (this.difficulty === 'easy') return actions[Math.floor(Math.random() * actions.length)]
    if (this.difficulty === 'normal') return actions.slice(0, 3)[Math.floor(Math.random() * Math.min(3, actions.length))]
    return actions[0]
  }

  private evaluateActions(unit: Unit): any[] {
    const actions: any[] = []
    // attacks
    for (const enemy of this.calculatePossibleTargets(unit)) {
      const score = 50 + (enemy.maxHp - enemy.hp) * 20 + (enemy.hp <= unit.attackDamage ? 100 : 0) + enemy.cost * 5
      actions.push({ type: ActionType.ATTACK_UNIT, unitId: unit.id, targetId: enemy.id, score })
    }
    // captures
    for (const tile of this.getCapturableTiles(unit)) {
      let score = 40
      const centerX = 4, centerY = 5
      const dist = Math.abs(tile.x - centerX) + Math.abs(tile.y - centerY)
      score += (10 - dist) * 5
      const nearbyEnemies = this.state.units.filter((u) => u.playerId !== unit.playerId && Math.abs(u.position.x - tile.x) + Math.abs(u.position.y - tile.y) <= u.attackRange + u.moveRange)
      score -= nearbyEnemies.length * 15
      actions.push({ type: ActionType.CAPTURE_CUBICLE, unitId: unit.id, target: tile, score })
    }
    // moves
    for (const move of this.calculatePossibleMoves(unit)) {
      let score = 0
      const centerX = 4, centerY = 5
      const currentDist = Math.abs(unit.position.x - centerX) + Math.abs(unit.position.y - centerY)
      const newDist = Math.abs(move.x - centerX) + Math.abs(move.y - centerY)
      score += (currentDist - newDist) * 10
      actions.push({ type: ActionType.MOVE_UNIT, unitId: unit.id, target: move, score })
    }
    return actions
  }

  private calculatePossibleMoves(unit: Unit): Coordinate[] {
    // Leave to store logic in real usage
    return []
  }

  private calculatePossibleTargets(unit: Unit): Unit[] {
    return this.state.units.filter((u) => u.playerId !== unit.playerId && Math.abs(u.position.x - unit.position.x) + Math.abs(u.position.y - unit.position.y) <= unit.attackRange)
  }

  private getCapturableTiles(unit: Unit): Coordinate[] {
    const tiles: Coordinate[] = []
    const adj = [
      { x: unit.position.x + 1, y: unit.position.y },
      { x: unit.position.x - 1, y: unit.position.y },
      { x: unit.position.x, y: unit.position.y + 1 },
      { x: unit.position.x, y: unit.position.y - 1 },
    ]
    for (const c of adj) {
      const t = this.state.board[c.y]?.[c.x]
      if (t?.type === TileType.CUBICLE && t.owner !== unit.playerId) tiles.push(c)
    }
    return tiles
  }

  private executeAction(action: any): void {
    console.log('AI executing action:', action)
  }
}


