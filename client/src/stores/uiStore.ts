import { create } from 'zustand'

export interface UIState {
  // UI-specific state
  highlightedTiles: Map<string, string>
  targetingMode: boolean
  selectedAbility?: string
  actionMode: 'none' | 'move' | 'attack' | 'ability'
  abilityAwaitingDirection: string | null
  
  // UI actions
  setHighlightedTiles: (tiles: Map<string, string>) => void
  setActionMode: (mode: 'none' | 'move' | 'attack' | 'ability') => void
  setTargetingMode: (mode: boolean) => void
  setSelectedAbility: (ability?: string) => void
  setAbilityAwaitingDirection: (ability: string | null) => void
  clearActionMode: () => void
  clearHighlights: () => void
}

export const useUIStore = create<UIState>((set) => ({
  // Initial UI state
  highlightedTiles: new Map(),
  targetingMode: false,
  selectedAbility: undefined,
  actionMode: 'none',
  abilityAwaitingDirection: null,

  // UI actions
  setHighlightedTiles: (tiles) => set({ highlightedTiles: tiles }),
  
  setActionMode: (mode) => set({ 
    actionMode: mode, 
    highlightedTiles: new Map() // Clear highlights when changing mode
  }),
  
  setTargetingMode: (mode) => set({ targetingMode: mode }),
  
  setSelectedAbility: (ability) => set({ selectedAbility: ability }),
  
  setAbilityAwaitingDirection: (ability) => set({ abilityAwaitingDirection: ability }),
  
  clearActionMode: () => set({ 
    actionMode: 'none', 
    selectedAbility: undefined,
    targetingMode: false,
    highlightedTiles: new Map()
  }),
  
  clearHighlights: () => set({ highlightedTiles: new Map() })
}))
