import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { type Unit, type Coordinate } from 'shared'
import { useGameStore } from './gameStore'
import { calculatePossibleMoves as calcMoves, isValidMove as isValidMoveUtil } from '../game/core/movement'
import { calculatePossibleTargets as calcTargets, isValidAttack as isValidAttackUtil } from '../game/core/combat'
import { getTilesInCone } from '../game/core/targeting'
import { ABILITIES } from '../game/core/abilities'

/**
 * Unit Store Slice
 * 
 * Manages all unit-related state and actions.
 * This slice is focused on unit data, movement, and combat.
 */

export interface UnitState {
  // Unit data
  units: Unit[]
  selectedUnit: Unit | null
  
  // Unit actions
  selectUnit: (unit: Unit | null) => void
  moveUnit: (unitId: string, to: Coordinate) => void
  attackUnit: (attackerId: string, targetId: string) => void
  useAbility: (unitId: string, abilityId: string, target: Unit | Coordinate) => void
  
  // Unit queries
  getUnitById: (id: string) => Unit | undefined
  getUnitsByPlayer: (playerId: string) => Unit[]
  getUnitsByType: (type: string) => Unit[]
  getMyUnits: (currentPlayerId: string) => Unit[]
  getEnemyUnits: (currentPlayerId: string) => Unit[]
  
  // Movement queries
  getPossibleMoves: (unit: Unit, board: any[][], allUnits: Unit[]) => Coordinate[]
  canUnitMove: (unit: Unit) => boolean
  isValidMove: (unit: Unit, to: Coordinate, board: any[][], allUnits: Unit[]) => boolean
  
  // Combat queries
  getPossibleTargets: (unit: Unit, allUnits: Unit[]) => Coordinate[]
  canUnitAttack: (unit: Unit) => boolean
  isValidAttack: (attacker: Unit, target: Unit, allUnits: Unit[]) => boolean
  
  // Unit management
  addUnit: (unit: Unit) => void
  removeUnit: (unitId: string) => void
  updateUnit: (unitId: string, updates: Partial<Unit>) => void
  resetUnitActions: (unitId: string) => void
  resetAllUnitActions: () => void
  
  // Unit state helpers
  getUnitAtPosition: (position: Coordinate) => Unit | undefined
  getUnitsInRange: (position: Coordinate, range: number) => Unit[]
  findNearestUnit: (position: Coordinate, filter?: (unit: Unit) => boolean) => Unit | undefined
}

export const useUnitStore = create<UnitState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    units: [],
    selectedUnit: null,
    
    // Unit actions
    selectUnit: (unit) => set({ selectedUnit: unit }),
    
    moveUnit: (unitId, to) => {
      set((state) => ({
        units: state.units.map((unit) =>
          unit.id === unitId
            ? {
                ...unit,
                position: to,
                hasMoved: true,
                actionsRemaining: Math.max(0, unit.actionsRemaining - 1),
              }
            : unit
        ),
      }))
    },
    
    attackUnit: (attackerId, targetId) => {
      set((state) => {
        const attacker = state.units.find((u) => u.id === attackerId)
        const target = state.units.find((u) => u.id === targetId)
        
        if (!attacker || !target) return state
        
        // Calculate damage (simplified for now)
        const damage = 1 // This should use the combat utility function
        
        return {
          units: state.units.map((unit) => {
            if (unit.id === targetId) {
              const newHp = Math.max(0, unit.hp - damage)
              return {
                ...unit,
                hp: newHp,
                isDead: newHp === 0,
              }
            }
            if (unit.id === attackerId) {
              return {
                ...unit,
                hasAttacked: true,
                actionsRemaining: Math.max(0, unit.actionsRemaining - 1),
              }
            }
            return unit
          }),
        }
      })
    },
    
    useAbility: (unitId, abilityId, target) => {
      set((state) => {
        const unit = state.units.find((u) => u.id === unitId)
        const ability = ABILITIES[abilityId]
        if (!unit || !ability) return state

        let finalUnits = state.units

        // Check for directional ability
        if (ability.requiresDirection && target && 'direction' in target) {
          const affectedTiles = getTilesInCone(unit.position, target.direction, ability.range, ability.coneAngle || 90)
          const affectedUnitIds = new Set(
            state.units
              .filter(u => u.playerId !== unit.playerId && affectedTiles.some(t => t.x === u.position.x && t.y === u.position.y))
              .map(u => u.id)
          )

          // Apply effect to all affected units
          finalUnits = state.units.map(u => {
            if (affectedUnitIds.has(u.id)) {
              // This is a simplified damage effect. You can expand on ability.effect() results.
              return { ...u, hp: Math.max(0, u.hp - 1) } // Assuming paperclip_storm does 1 damage
            }
            return u
          })

        } else {
          // Handle existing single-target logic here...
          // const result = ability.effect(unit, target);
          // ...apply single target effects
        }

        // Consume action points and set cooldown for the caster
        finalUnits = finalUnits.map(u =>
          u.id === unitId ? {
            ...u,
            hasAttacked: true, // Abilities often count as an attack action
            actionsRemaining: Math.max(0, u.actionsRemaining - (ability.cost || 1)),
            abilityCooldowns: { ...u.abilityCooldowns, [abilityId]: ability.cooldown }
          } : u
        )

        return { units: finalUnits }
      })

      // Also reset the UI state in the main gameStore
      useGameStore.setState({
        targetingMode: false,
        selectedAbility: undefined,
        abilityAwaitingDirection: null,
        highlightedTiles: new Map(),
      })
    },
    
    // Unit queries
    getUnitById: (id) => get().units.find((unit) => unit.id === id),
    
    getUnitsByPlayer: (playerId) => get().units.filter((unit) => unit.playerId === playerId),
    
    getUnitsByType: (type) => get().units.filter((unit) => unit.type === type),
    
    getMyUnits: (currentPlayerId) => get().units.filter((unit) => unit.playerId === currentPlayerId),
    
    getEnemyUnits: (currentPlayerId) => get().units.filter((unit) => unit.playerId !== currentPlayerId),
    
    // Movement queries
    getPossibleMoves: (unit, board, allUnits) => calcMoves(unit, { board, units: allUnits }),
    
    canUnitMove: (unit) => unit.actionsRemaining > 0 && !unit.hasMoved,
    
    isValidMove: (unit, to, board, allUnits) => isValidMoveUtil(unit, to, { board, units: allUnits }),
    
    // Combat queries
    getPossibleTargets: (unit, allUnits) => calcTargets(unit, { units: allUnits }),
    
    canUnitAttack: (unit) => unit.actionsRemaining > 0 && !unit.hasAttacked,
    
    isValidAttack: (attacker, target, allUnits) => isValidAttackUtil(attacker, target, { units: allUnits }),
    
    // Unit management
    addUnit: (unit) => set((state) => ({ units: [...state.units, unit] })),
    
    removeUnit: (unitId) => set((state) => ({ units: state.units.filter((unit) => unit.id !== unitId) })),
    
    updateUnit: (unitId, updates) => {
      set((state) => ({
        units: state.units.map((unit) =>
          unit.id === unitId ? { ...unit, ...updates } : unit
        ),
      }))
    },
    
    resetUnitActions: (unitId) => {
      set((state) => ({
        units: state.units.map((unit) =>
          unit.id === unitId
            ? {
                ...unit,
                hasMoved: false,
                hasAttacked: false,
                actionsRemaining: unit.maxActions,
              }
            : unit
        ),
      }))
    },
    
    resetAllUnitActions: () => {
      set((state) => ({
        units: state.units.map((unit) => ({
          ...unit,
          hasMoved: false,
          hasAttacked: false,
          actionsRemaining: unit.maxActions,
        })),
      }))
    },
    
    // Unit state helpers
    getUnitAtPosition: (position) => {
      return get().units.find(
        (unit) => unit.position.x === position.x && unit.position.y === position.y
      )
    },
    
    getUnitsInRange: (position, range) => {
      return get().units.filter((unit) => {
        const distance = Math.abs(unit.position.x - position.x) + Math.abs(unit.position.y - position.y)
        return distance <= range
      })
    },
    
    findNearestUnit: (position, filter) => {
      const units = filter ? get().units.filter(filter) : get().units
      if (units.length === 0) return undefined
      
      let nearest = units[0]
      let nearestDistance = Math.abs(nearest.position.x - position.x) + Math.abs(nearest.position.y - position.y)
      
      for (const unit of units) {
        const distance = Math.abs(unit.position.x - position.x) + Math.abs(unit.position.y - position.y)
        if (distance < nearestDistance) {
          nearest = unit
          nearestDistance = distance
        }
      }
      
      return nearest
    },
  }))
)

// Selectors for performance optimization
export const unitSelectors = {
  getSelectedUnit: (state: UnitState) => state.selectedUnit,
  getMyUnits: (state: UnitState, currentPlayerId: string) => state.units.filter(unit => unit.playerId === currentPlayerId),
  getEnemyUnits: (state: UnitState, currentPlayerId: string) => state.units.filter(unit => unit.playerId !== currentPlayerId),
  getUnitsByType: (state: UnitState, type: string) => state.units.filter(unit => unit.type === type),
  getActionableUnits: (state: UnitState, currentPlayerId: string) => 
    state.units.filter(unit => 
      unit.playerId === currentPlayerId && 
      (unit.actionsRemaining > 0 && (!unit.hasMoved || !unit.hasAttacked))
    ),
}
