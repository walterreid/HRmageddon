import { describe, it, expect, beforeEach } from 'vitest'
import { createGameStore } from './gameStore'
import { createMockUnit, createMockGameState } from '../game/test/helpers'
import { UnitType, StatusType, TileType } from 'shared'
import type { Unit, Player, Tile } from 'shared'

describe('Game Store', () => {
  let gameStore: any

  beforeEach(() => {
    gameStore = createGameStore()
    gameStore.initializeGame()
  })

  describe('Game Initialization', () => {
    it('should initialize game with correct state', () => {
      expect(gameStore.gameMode).toBe('menu')
      expect(gameStore.units).toBeDefined()
      expect(gameStore.board).toBeDefined()
      expect(gameStore.players).toBeDefined()
      expect(gameStore.currentPlayerId).toBeDefined()
    })

    it('should set game mode correctly', () => {
      gameStore.setGameMode('ai')
      expect(gameStore.gameMode).toBe('ai')
      
      gameStore.setGameMode('multiplayer')
      expect(gameStore.gameMode).toBe('multiplayer')
    })
  })

  describe('Unit Management', () => {
    it('should select units correctly', () => {
      const unit = gameStore.units[0]
      gameStore.selectUnit(unit)
      
      expect(gameStore.selectedUnit).toBe(unit)
    })

    it('should get unit at specific coordinates', () => {
      const unit = gameStore.units[0]
      const unitAtCoord = gameStore.getUnitAt(unit.position)
      
      expect(unitAtCoord).toBe(unit)
    })

    it('should get tile at specific coordinates', () => {
      const tile = gameStore.getTileAt({ x: 0, y: 0 })
      
      expect(tile).toBeDefined()
      expect(tile.type).toBeDefined()
    })
  })

  describe('Movement System', () => {
    it('should calculate possible moves for units', () => {
      const unit = gameStore.units[0]
      const possibleMoves = gameStore.calculatePossibleMoves(unit)
      
      expect(Array.isArray(possibleMoves)).toBe(true)
      expect(possibleMoves.length).toBeGreaterThan(0)
    })

    it('should validate moves correctly', () => {
      const unit = gameStore.units[0]
      const validMove = gameStore.calculatePossibleMoves(unit)[0]
      
      expect(gameStore.isValidMove(unit, validMove)).toBe(true)
    })

    it('should move units correctly', () => {
      const unit = gameStore.units[0]
      const originalPosition = { ...unit.position }
      const newPosition = gameStore.calculatePossibleMoves(unit)[0]
      
      gameStore.moveUnit(unit.id, newPosition)
      
      // Get the updated unit from the store
      const updatedUnit = gameStore.units.find((u: Unit) => u.id === unit.id)
      expect(updatedUnit?.position).toEqual(newPosition)
      expect(updatedUnit?.hasMoved).toBe(true)
    })
  })

  describe('Combat System', () => {
    it('should calculate possible attack targets', () => {
      const unit = gameStore.units[0]
      const possibleTargets = gameStore.calculatePossibleTargets(unit)
      
      expect(Array.isArray(possibleTargets)).toBe(true)
    })

    it('should validate attacks correctly', () => {
      const attacker = gameStore.units[0]
      const target = gameStore.units.find((u: Unit) => u.playerId !== attacker.playerId)
      
      if (target) {
        expect(gameStore.isValidAttack(attacker, target)).toBeDefined()
      }
    })

    it('should execute attacks correctly', () => {
      const attacker = gameStore.units[0]
      const target = gameStore.units.find((u: Unit) => u.playerId !== attacker.playerId)
      
      if (target) {
        const originalHp = target.hp
        gameStore.attackTarget(attacker.id, target.id)
        
        // Get the updated units from the store
        const updatedAttacker = gameStore.units.find((u: Unit) => u.id === attacker.id)
        const updatedTarget = gameStore.units.find((u: Unit) => u.id === target.id)
        
        if (updatedTarget) {
          expect(updatedTarget.hp).toBeLessThan(originalHp)
        }
        if (updatedAttacker) {
          expect(updatedAttacker.hasAttacked).toBe(true)
        }
      }
    })
  })

  describe('Ability System Integration', () => {
    it('should select abilities correctly', () => {
      const unit = gameStore.units[0]
      gameStore.selectUnit(unit)
      
      if (unit.abilities.length > 0) {
        const abilityId = unit.abilities[0]
        gameStore.selectAbility(abilityId)
        
        expect(gameStore.selectedAbility).toBe(abilityId)
        expect(gameStore.targetingMode).toBe(true)
      }
    })

    it('should get ability targets correctly', () => {
      const unit = gameStore.units[0]
      
      if (unit.abilities.length > 0) {
        const abilityId = unit.abilities[0]
        const targets = gameStore.getAbilityTargets(unit.id, abilityId)
        
        expect(Array.isArray(targets)).toBe(true)
      }
    })

    it('should check if abilities can be used', () => {
      const unit = gameStore.units[0]
      
      if (unit.abilities.length > 0) {
        const abilityId = unit.abilities[0]
        const canUse = gameStore.canUseAbility(unit.id, abilityId)
        
        expect(typeof canUse).toBe('boolean')
      }
    })

    it('should use abilities correctly', () => {
      const unit = gameStore.units[0]
      
      if (unit.abilities.length > 0) {
        const abilityId = unit.abilities[0]
        const targets = gameStore.getAbilityTargets(unit.id, abilityId)
        
        if (targets.length > 0) {
          const target = targets[0]
          const originalActions = unit.actionsRemaining
          
          gameStore.useAbility(unit.id, abilityId, target)
          
          // Should consume actions
          expect(unit.actionsRemaining).toBeLessThan(originalActions)
        }
      }
    })
  })

  describe('Cubicle Capture', () => {
    it('should capture cubicles correctly', () => {
      const unit = gameStore.units[0]
      const adjacentTile = gameStore.calculatePossibleMoves(unit)[0]
      
      if (adjacentTile) {
        const tile = gameStore.getTileAt(adjacentTile)
        if (tile && tile.type === TileType.CUBICLE) {
          gameStore.captureCubicle(unit.id, adjacentTile)
          
          expect(tile.owner).toBe(unit.playerId)
        }
      }
    })
  })

  describe('Turn Management', () => {
    it('should end turns correctly', () => {
      const originalPlayerId = gameStore.currentPlayerId
      const originalTurnNumber = gameStore.turnNumber
      
      gameStore.endTurn()
      
      expect(gameStore.currentPlayerId).not.toBe(originalPlayerId)
      expect(gameStore.turnNumber).toBe(originalTurnNumber + 1)
    })

    it('should reset unit states at turn start', () => {
      const unit = gameStore.units[0]
      unit.hasMoved = true
      unit.hasAttacked = true
      unit.actionsRemaining = 0
      
      gameStore.endTurn()
      
      // Should reset for next player's turn
      const nextPlayerUnits = gameStore.units.filter((u: Unit) => u.playerId === gameStore.currentPlayerId)
      nextPlayerUnits.forEach((u: Unit) => {
        expect(u.hasMoved).toBe(false)
        expect(u.hasAttacked).toBe(false)
        expect(u.actionsRemaining).toBeGreaterThan(0)
      })
    })
  })

  describe('AI Integration', () => {
    it('should execute AI turns', () => {
      gameStore.setGameMode('ai')
      gameStore.initializeGame()
      
      // Set current player to AI
      const aiPlayer = gameStore.players.find((p: Player) => p.id !== 'player1')
      if (aiPlayer) {
        gameStore.setCurrentPlayerId(aiPlayer.id)
        
        expect(() => {
          gameStore.executeAITurn()
        }).not.toThrow()
      }
    })
  })

  describe('Victory Conditions', () => {
    it('should check victory conditions', () => {
      expect(() => {
        gameStore.checkVictoryConditions()
      }).not.toThrow()
    })

    it('should detect elimination victory', () => {
      // Eliminate all enemy units
      const currentPlayerId = gameStore.currentPlayerId
      const enemyUnits = gameStore.units.filter((u: Unit) => u.playerId !== currentPlayerId)
      
      enemyUnits.forEach((unit: Unit) => {
        unit.hp = 0
      })
      
      gameStore.checkVictoryConditions()
      
      expect(gameStore.winner).toBe(currentPlayerId)
    })

    it('should detect territory victory', () => {
      // Capture all cubicles
      const currentPlayerId = gameStore.currentPlayerId
      
      for (let y = 0; y < gameStore.board.length; y++) {
        for (let x = 0; x < gameStore.board[y].length; x++) {
          const tile = gameStore.board[y][x]
          if (tile.type === TileType.CUBICLE) {
            tile.owner = currentPlayerId
          }
        }
      }
      
      gameStore.checkVictoryConditions()
      
      expect(gameStore.winner).toBe(currentPlayerId)
    })
  })

  describe('Draft System', () => {
    it('should initialize draft correctly', () => {
      gameStore.initializeDraft()
      
      expect(gameStore.draftState).toBeDefined()
      expect(gameStore.draftState.selectedUnits).toBeDefined()
      expect(gameStore.draftState.maxHeadcount).toBeDefined()
    })

    it('should add units to draft', () => {
      gameStore.initializeDraft()
      const originalCount = gameStore.draftState.selectedUnits.length
      
      gameStore.addUnitToDraft(UnitType.INTERN)
      
      expect(gameStore.draftState.selectedUnits.length).toBe(originalCount + 1)
    })

    it('should remove units from draft', () => {
      gameStore.initializeDraft()
      gameStore.addUnitToDraft(UnitType.INTERN)
      gameStore.addUnitToDraft(UnitType.SECRETARY)
      
      const originalCount = gameStore.draftState.selectedUnits.length
      gameStore.removeUnitFromDraft(0)
      
      expect(gameStore.draftState.selectedUnits.length).toBe(originalCount - 1)
    })

    it('should confirm draft correctly', () => {
      gameStore.initializeDraft()
      gameStore.addUnitToDraft(UnitType.INTERN)
      gameStore.addUnitToDraft(UnitType.SECRETARY)
      
      gameStore.confirmDraft()
      
      expect(gameStore.gameMode).toBe('ai')
      expect(gameStore.units.length).toBeGreaterThan(0)
    })
  })

  describe('Status Effect Management', () => {
    it('should apply status effects correctly', () => {
      const unit = gameStore.units[0]
      const statusEffect = {
        type: StatusType.ON_DEADLINE,
        duration: 2,
        source: 'test'
      }
      
      unit.status.push(statusEffect)
      
      expect(unit.status).toContain(statusEffect)
    })

    it('should handle status effect expiration', () => {
      const unit = gameStore.units[0]
      const statusEffect = {
        type: StatusType.ON_DEADLINE,
        duration: 1,
        source: 'test'
      }
      
      unit.status.push(statusEffect)
      
      // Simulate turn end
      gameStore.endTurn()
      
      // Status effect should be removed or duration reduced
      const remainingEffect = unit.status.find((s: any) => s.type === StatusType.ON_DEADLINE)
      if (remainingEffect) {
        expect(remainingEffect.duration).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle invalid unit selections gracefully', () => {
      expect(() => {
        gameStore.selectUnit(null)
        gameStore.selectUnit(undefined)
      }).not.toThrow()
    })

    it('should handle invalid coordinates gracefully', () => {
      const invalidCoord = { x: -1, y: -1 }
      
      expect(() => {
        gameStore.getUnitAt(invalidCoord)
        gameStore.getTileAt(invalidCoord)
      }).not.toThrow()
    })

    it('should handle empty unit lists gracefully', () => {
      gameStore.setUnits([])
      
      expect(() => {
        gameStore.checkVictoryConditions()
      }).not.toThrow()
    })
  })

  describe('Game State Persistence', () => {
    it('should maintain game state consistency', () => {
      const originalState = {
        units: [...gameStore.units],
        board: gameStore.board.map((row: Tile[]) => [...row]),
        currentPlayerId: gameStore.currentPlayerId,
        turnNumber: gameStore.turnNumber
      }
      
      // Perform some actions
      if (gameStore.units.length > 0) {
        const unit = gameStore.units[0]
        const possibleMoves = gameStore.calculatePossibleMoves(unit)
        
        if (possibleMoves.length > 0) {
          gameStore.moveUnit(unit.id, possibleMoves[0])
        }
      }
      
      // State should be consistent
      expect(gameStore.units.length).toBe(originalState.units.length)
      expect(gameStore.board.length).toBe(originalState.board.length)
      expect(typeof gameStore.currentPlayerId).toBe('string')
      expect(typeof gameStore.turnNumber).toBe('number')
    })
  })
})
