import { create } from 'zustand'
import { type Unit, type Coordinate } from 'shared'

interface UnitStore {
  // State - Single Source of Truth for Units
  units: Unit[]
  selectedUnit: Unit | undefined

  // Actions
  setUnits: (units: Unit[]) => void
  selectUnit: (unit: Unit | null) => void
  updateUnit: (unitId: string, updates: Partial<Unit>) => void
  removeUnit: (unitId: string) => void
  resetAllUnitActions: (playerId: string) => void
  
  // Queries
  getUnitById: (unitId: string) => Unit | undefined
  getUnitAt: (coord: Coordinate) => Unit | undefined
  getUnitsByPlayer: (playerId: string) => Unit[]
  getEnemyUnits: (playerId: string) => Unit[]
  getUnitsInRange: (position: Coordinate, range: number) => Unit[]
}

export const useUnitStore = create<UnitStore>((set, get) => ({
  // Initial state
  units: [],
  selectedUnit: undefined,

  // Actions
  setUnits: (units) => {
    set({ units })
  },

  selectUnit: (unit) => {
    set({ selectedUnit: unit || undefined })
  },

  updateUnit: (unitId, updates) => {
    set((state) => ({
      units: state.units.map((unit) =>
        unit.id === unitId ? { ...unit, ...updates } : unit
      ),
      // Update selectedUnit if it's the one being updated
      selectedUnit: state.selectedUnit?.id === unitId 
        ? { ...state.selectedUnit, ...updates }
        : state.selectedUnit
    }))
  },

  removeUnit: (unitId) => {
    set((state) => ({
      units: state.units.filter((unit) => unit.id !== unitId),
      // Clear selectedUnit if it's the one being removed
      selectedUnit: state.selectedUnit?.id === unitId 
        ? undefined 
        : state.selectedUnit
    }))
  },

  resetAllUnitActions: (playerId) => {
    set((state) => ({
      units: state.units.map((unit) =>
        unit.playerId === playerId
          ? {
              ...unit,
              actionsRemaining: unit.maxActions,
              hasMoved: false,
              hasAttacked: false,
              movementUsed: 0,
              remainingMovement: unit.moveRange
            }
          : unit
      )
    }))
  },

  // Queries
  getUnitById: (unitId) => {
    return get().units.find((unit) => unit.id === unitId)
  },

  getUnitAt: (coord) => {
    return get().units.find((unit) => 
      unit.position.x === coord.x && unit.position.y === coord.y
    )
  },

  getUnitsByPlayer: (playerId) => {
    return get().units.filter((unit) => unit.playerId === playerId)
  },

  getEnemyUnits: (playerId) => {
    return get().units.filter((unit) => unit.playerId !== playerId)
  },

  getUnitsInRange: (position, range) => {
    return get().units.filter((unit) => {
      const distance = Math.abs(unit.position.x - position.x) + 
                     Math.abs(unit.position.y - position.y)
      return distance <= range
    })
  }
}))
