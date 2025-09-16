import { create } from 'zustand'

interface UIStore {
  // State - Single Source of Truth for UI-specific state
  highlightedTiles: Map<string, string>
  actionMode: 'none' | 'move' | 'attack' | 'ability'
  selectedAbility: string | undefined
  targetingMode: boolean
  abilityAwaitingDirection: string | null

  // Actions
  setHighlightedTiles: (tiles: Map<string, string>) => void
  setActionMode: (mode: 'none' | 'move' | 'attack' | 'ability') => void
  setSelectedAbility: (abilityId: string | undefined) => void
  setTargetingMode: (mode: boolean) => void
  setAbilityAwaitingDirection: (abilityId: string | null) => void
  clearActionMode: () => void
  clearHighlights: () => void
  addHighlight: (coord: string, type: string) => void
  removeHighlight: (coord: string) => void
  
  // Queries
  hasHighlight: (coord: string) => boolean
  getHighlightType: (coord: string) => string | undefined
  isInActionMode: () => boolean
  isAbilitySelected: () => boolean
}

export const useUIStore = create<UIStore>((set, get) => ({
  // Initial state
  highlightedTiles: new Map<string, string>(),
  actionMode: 'none',
  selectedAbility: undefined,
  targetingMode: false,
  abilityAwaitingDirection: null,

  // Actions
  setHighlightedTiles: (tiles) => {
    set({ highlightedTiles: tiles })
  },

  setActionMode: (mode) => {
    set({ actionMode: mode })
    
    // Clear ability selection when changing action mode
    if (mode !== 'ability') {
      set({ 
        selectedAbility: undefined,
        targetingMode: false,
        abilityAwaitingDirection: null
      })
    }
  },

  setSelectedAbility: (abilityId) => {
    set({ 
      selectedAbility: abilityId,
      actionMode: abilityId ? 'ability' : 'none',
      targetingMode: !!abilityId
    })
  },

  setTargetingMode: (mode) => {
    set({ targetingMode: mode })
  },

  setAbilityAwaitingDirection: (abilityId) => {
    set({ 
      abilityAwaitingDirection: abilityId,
      targetingMode: !!abilityId
    })
  },

  clearActionMode: () => {
    set({
      actionMode: 'none',
      selectedAbility: undefined,
      targetingMode: false,
      abilityAwaitingDirection: null,
      highlightedTiles: new Map()
    })
  },

  clearHighlights: () => {
    set({ highlightedTiles: new Map() })
  },

  addHighlight: (coord, type) => {
    set((state) => {
      const newHighlights = new Map(state.highlightedTiles)
      newHighlights.set(coord, type)
      return { highlightedTiles: newHighlights }
    })
  },

  removeHighlight: (coord) => {
    set((state) => {
      const newHighlights = new Map(state.highlightedTiles)
      newHighlights.delete(coord)
      return { highlightedTiles: newHighlights }
    })
  },

  // Queries
  hasHighlight: (coord) => {
    return get().highlightedTiles.has(coord)
  },

  getHighlightType: (coord) => {
    return get().highlightedTiles.get(coord)
  },

  isInActionMode: () => {
    return get().actionMode !== 'none'
  },

  isAbilitySelected: () => {
    return !!get().selectedAbility
  }
}))
