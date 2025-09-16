import { create } from 'zustand'
import {
  GamePhase,
  type Unit,
  type Coordinate,
  type Tile,
  TileType,
  UnitType,
  type DraftState,
  StatusType,
} from 'shared'
import { AIController } from '../game/ai/ai.ts'
import { generateAIDraft } from '../game/ai/aiDraft.ts'
import { canUseAbility, getValidTargets, getAbilityById } from '../game/core/abilities.ts'
import { mapRegistry } from '../game/map/MapRegistry'
import { MAPS } from '../game/map/registry'
import { calculatePossibleMoves as calcMoves, isValidMove as isValidMoveUtil } from '../game/core/movement'
import { calculatePossibleTargets as calcTargets, isValidAttack as isValidAttackUtil, calculateDamage } from '../game/core/combat'
import { checkVictoryConditions as checkVictory } from '../game/core/victory'
import { useUnitStore } from './unitStore'
import { useBoardStore } from './boardStore'
import { usePlayerStore } from './playerStore'
import { useUIStore } from './uiStore'
import { dataManager } from '../game/data/DataManager'
import { actionHandlers } from './actionHandlers'

// Type for window.gameScene
interface GameScene {
  tileToWorld: (x: number, y: number) => { x: number; y: number }
}

// Extended window interface
interface ExtendedWindow extends Window {
  gameScene?: GameScene
}

// Helper functions for memoization


function getCachedPossibleMoves(unit: Unit, cache: MemoizationCache, calculateFn: () => Coordinate[]): Coordinate[] {
  const key = `${unit.id}-${unit.position.x}-${unit.position.y}-${unit.actionsRemaining}-${unit.hasMoved}`
  
  if (!cache.possibleMoves.has(key)) {
    const moves = calculateFn()
    cache.possibleMoves.set(key, moves)
  }
  
  return cache.possibleMoves.get(key)!
}

function getCachedPossibleTargets(unit: Unit, cache: MemoizationCache, calculateFn: () => Coordinate[]): Coordinate[] {
  const key = `${unit.id}-${unit.position.x}-${unit.position.y}-${unit.actionsRemaining}-${unit.hasAttacked}`
  
  if (!cache.possibleTargets.has(key)) {
    const targets = calculateFn()
    cache.possibleTargets.set(key, targets)
  }
  
  return cache.possibleTargets.get(key)!
}

function clearMemoizationCache(cache: MemoizationCache) {
  cache.possibleMoves.clear()
  cache.possibleTargets.clear()
  cache.cubicleCount = null
  cache.cubiclePositions = null
  cache.lastBoardHash = null
}


type GameMode = 'menu' | 'ai' | 'multiplayer' | 'test'

// Memoization cache for expensive calculations
interface MemoizationCache {
  possibleMoves: Map<string, Coordinate[]>
  possibleTargets: Map<string, Coordinate[]>
  cubicleCount: number | null
  cubiclePositions: Coordinate[] | null
  lastBoardHash: string | null
}

type GameStore = {
  // Orchestrator-specific state only
  gameMode: GameMode
  draftState: DraftState
  pendingCubicleCaptures: Map<string, { unitId: string; coord: Coordinate; playerId: string }>
  memoCache: MemoizationCache

  // Orchestrator actions
  setGameMode: (mode: GameMode) => void
  enterTestMode: () => void
  initializeGame: () => void
  initializeDraft: () => void
  addUnitToDraft: (employeeKey: string) => void
  removeUnitFromDraft: (index: number) => void
  confirmDraft: () => void
  selectUnit: (unit: Unit | undefined | null) => void
  selectTile: (coord: Coordinate) => void
  moveUnit: (unitId: string, to: Coordinate) => void
  attackTarget: (attackerId: string, targetId: string) => void
  captureCubicle: (unitId: string, coord: Coordinate) => void
  endTurn: () => void
  executeAITurn: () => void
  returnToMenu: () => void

  // Pure utility functions (delegated to core modules)
  getUnitAt: (coord: Coordinate) => Unit | undefined
  getTileAt: (coord: Coordinate) => Tile | undefined
  calculatePossibleMoves: (unit: Unit) => Coordinate[]
  calculatePossibleTargets: (unit: Unit) => Coordinate[]
  isValidMove: (unit: Unit, to: Coordinate) => boolean
  isValidAttack: (attacker: Unit, target: Unit) => boolean
  checkVictoryConditions: () => void
  
  // Ability system methods
  useAbility: (unitId: string, abilityId: string, target?: Unit | Coordinate) => void
  getAbilityTargets: (unitId: string, abilityId: string) => (Unit | Coordinate)[]
  canUseAbility: (unitId: string, abilityId: string) => boolean
  
  // Helper functions for smart action availability
  canUnitMove: (unit: Unit) => boolean
  canUnitAttack: (unit: Unit) => boolean
  getEnemiesInRange: (unit: Unit) => Unit[]
  getRemainingMovement: (unit: Unit) => number
  canSelectUnit: (unit: Unit, currentlySelected?: Unit) => boolean
  shouldExecuteActionInsteadOfSelect: (unit: Unit, currentlySelected?: Unit) => boolean
  shouldExecuteMoveInsteadOfSelect: (unit: Unit, currentlySelected?: Unit) => boolean
  isValidAttackTarget: (attacker: Unit, target: Unit) => boolean
}

export const useGameStore = create<GameStore>((set, get) => {
  return {
  // Orchestrator-specific state only
  gameMode: 'menu',
  draftState: {
    playerBudget: 200,
    maxHeadcount: 6,
    selectedUnits: [],
    aiUnits: [],
  },
  pendingCubicleCaptures: new Map(),
  memoCache: {
    possibleMoves: new Map(),
    possibleTargets: new Map(),
    cubicleCount: null,
    cubiclePositions: null,
    lastBoardHash: null
  },

  setGameMode: (mode) => {
    set({ gameMode: mode })
  },

  enterTestMode: () => {
    set({ gameMode: 'test' })
  },

  returnToMenu: () => {
    // Reset orchestrator state
    set({
      gameMode: 'menu',
      pendingCubicleCaptures: new Map(),
      draftState: {
        playerBudget: 200,
        maxHeadcount: 6,
        selectedUnits: [],
        aiUnits: [],
      },
    })
    
    // Reset all slice stores
    useUnitStore.getState().setUnits([])
    useUnitStore.getState().selectUnit(null)
    useBoardStore.getState().setBoard([])
    usePlayerStore.getState().setPlayers([])
    usePlayerStore.getState().setCurrentPlayerId('')
    usePlayerStore.getState().setTurnNumber(1)
    usePlayerStore.getState().setPhase(GamePhase.SETUP)
    // Don't set winner to undefined, just clear it
    // usePlayerStore.getState().setWinner(undefined)
    useUIStore.getState().clearActionMode()
  },

  initializeGame: () => {
    // Initialize board and players through slice stores
    useBoardStore.getState().createBoard()
    usePlayerStore.getState().initializePlayers()
    
    // Get starting positions from the MapRegistry
    const getMapStartingPositions = (teamId: string): Coordinate[] => {
      try {
        const startingPositions = mapRegistry.getStartingPositions('OfficeLayout')
        if (!startingPositions) {
          console.warn('Starting positions not available in MapRegistry, using fallback positions')
          return getFallbackStartPositions(teamId)
        }
        
        if (teamId === 'player1') {
          return startingPositions.goldTeam?.map((pos: { x: number; y: number }) => ({ x: pos.x, y: pos.y })) || []
        } else {
          return startingPositions.navyTeam?.map((pos: { x: number; y: number }) => ({ x: pos.x, y: pos.y })) || []
        }
      } catch (error) {
        console.warn('Error getting map starting positions from MapRegistry, using fallback:', error)
        return getFallbackStartPositions(teamId)
      }
    }
    
    // Fallback starting positions if map data isn't available
    const getFallbackStartPositions = (teamId: string): Coordinate[] => {
      const mapSpec = MAPS['OfficeLayout']
      const boardWidth = mapSpec.width
      const boardHeight = mapSpec.height
      
      if (teamId === 'player1') {
        return [
          { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
          { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
        ]
      } else {
        return [
          { x: boardWidth - 1, y: boardHeight - 1 }, 
          { x: boardWidth - 2, y: boardHeight - 1 }, 
          { x: boardWidth - 3, y: boardHeight - 1 },
          { x: boardWidth - 1, y: boardHeight - 2 }, 
          { x: boardWidth - 2, y: boardHeight - 2 }, 
          { x: boardWidth - 3, y: boardHeight - 2 },
        ]
      }
    }
    
    // Create units using map starting positions
    const playerPositions = getMapStartingPositions('player1')
    const aiPositions = getMapStartingPositions('player2')
    
    // Create units using DataManager
    const units: Unit[] = []
    
    // Get employee data from DataManager
    const internEmployee = dataManager.getEmployee('salesman') // Using salesman as intern for now
    const secretaryEmployee = dataManager.getEmployee('secretary')
    
    if (internEmployee && secretaryEmployee) {
      // Player units (Gold team)
      units.push(
        dataManager.createUnitFromEmployee(
          internEmployee, 
          'blue-intern-1', 
          'player1', 
          playerPositions[0] || { x: 0, y: 1 }
        )
      )
      units.push(
        dataManager.createUnitFromEmployee(
          secretaryEmployee, 
          'blue-secretary-1', 
          'player1', 
          playerPositions[1] || { x: 1, y: 1 }
        )
      )
      
      // AI units (Navy team)
      units.push(
        dataManager.createUnitFromEmployee(
          internEmployee, 
          'red-intern-1', 
          'player2', 
          aiPositions[0] || { x: 7, y: 8 }
        )
      )
      units.push(
        dataManager.createUnitFromEmployee(
          secretaryEmployee, 
          'red-secretary-1', 
          'player2', 
          aiPositions[1] || { x: 6, y: 8 }
        )
      )
    } else {
      console.error('Failed to load employee data from DataManager')
      // Fallback to basic units if data loading failed
      units.push({
        id: 'blue-intern-1',
        playerId: 'player1',
        type: UnitType.INTERN,
        position: playerPositions[0] || { x: 0, y: 1 },
        hp: 2,
        maxHp: 2,
        moveRange: 3,
        attackRange: 1,
        attackDamage: 1,
        actionsRemaining: 2,
        maxActions: 2,
        status: [],
        cost: 2,
        hasMoved: false,
        hasAttacked: false,
        abilities: [],
        abilityCooldowns: {},
        movementUsed: 0,
        remainingMovement: 3,
      })
    }

    // Set units through unit store
    useUnitStore.getState().setUnits(units)
    
    // Clear memoization cache
    clearMemoizationCache(get().memoCache)
  },

  initializeDraft: () => {
    const config = dataManager.getConfig()
    const budget = config.draft_config?.starting_funds || 1000
    const maxHeadcount = config.gameplay_rules?.max_team_size || 4
    
    const aiUnits = generateAIDraft(budget, maxHeadcount)
    set((state) => ({
      draftState: {
        ...state.draftState,
        playerBudget: budget,
        maxHeadcount,
        aiUnits,
      }
    }))
    usePlayerStore.getState().setPhase(GamePhase.DRAFT)
  },

  addUnitToDraft: (employeeKey) => {
    const state = get()
    const employee = dataManager.getEmployee(employeeKey)
    if (!employee) {
      console.error(`Employee not found: ${employeeKey}`)
      return
    }
    
    const cost = employee.cost
    const currentCost = state.draftState.selectedUnits.reduce((sum, unit) => {
      const unitEmployee = dataManager.getEmployee(unit.employeeKey)
      return sum + (unitEmployee?.cost || 0)
    }, 0)
    
    if (state.draftState.selectedUnits.length >= state.draftState.maxHeadcount) return
    if (currentCost + cost > state.draftState.playerBudget) return
    
    set((state) => ({
      draftState: {
        ...state.draftState,
        selectedUnits: [...state.draftState.selectedUnits, { employeeKey }]
      }
    }))
  },

  removeUnitFromDraft: (index) => {
    set((state) => ({
      draftState: {
        ...state.draftState,
        selectedUnits: state.draftState.selectedUnits.filter((_, i) => i !== index)
      }
    }))
  },

  confirmDraft: () => {
    const state = get()
    if (state.draftState.selectedUnits.length === 0) return
    
    // Get starting positions from the MapRegistry
    const getMapStartingPositions = (teamId: string): Coordinate[] => {
      try {
        const startingPositions = mapRegistry.getStartingPositions('OfficeLayout')
        if (!startingPositions) {
          console.warn('Starting positions not available in MapRegistry, using fallback positions')
          return getFallbackStartPositions(teamId)
        }
        
        if (teamId === 'player1') {
          return startingPositions.goldTeam?.map((pos: { x: number; y: number }) => ({ x: pos.x, y: pos.y })) || []
        } else {
          return startingPositions.navyTeam?.map((pos: { x: number; y: number }) => ({ x: pos.x, y: pos.y })) || []
        }
      } catch (error) {
        console.warn('Error getting map starting positions from MapRegistry, using fallback:', error)
        return getFallbackStartPositions(teamId)
      }
    }
    
    // Fallback starting positions if map data isn't available
    const getFallbackStartPositions = (teamId: string): Coordinate[] => {
      const mapSpec = MAPS['OfficeLayout']
      const boardWidth = mapSpec.width
      const boardHeight = mapSpec.height
      
      if (teamId === 'player1') {
        return [
          { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
          { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
        ]
      } else {
        return [
          { x: boardWidth - 1, y: boardHeight - 1 }, 
          { x: boardWidth - 2, y: boardHeight - 1 }, 
          { x: boardWidth - 3, y: boardHeight - 1 },
          { x: boardWidth - 1, y: boardHeight - 2 }, 
          { x: boardWidth - 2, y: boardHeight - 2 }, 
          { x: boardWidth - 3, y: boardHeight - 2 },
        ]
      }
    }
    
    // Create units from draft selections
    const playerPositions = getMapStartingPositions('player1')
    const aiPositions = getMapStartingPositions('player2')
    
    const playerUnits: Unit[] = state.draftState.selectedUnits.map((draftUnit, index) => {
      const employee = dataManager.getEmployee(draftUnit.employeeKey)
      if (!employee) {
        console.error(`Employee not found: ${draftUnit.employeeKey}`)
        // Fallback to basic unit
      return {
          id: `player1-${draftUnit.employeeKey}-${index}`,
        playerId: 'player1',
          type: UnitType.INTERN,
        position: playerPositions[index] || { x: 0, y: 0 },
          hp: 2,
          maxHp: 2,
          moveRange: 3,
          attackRange: 1,
          attackDamage: 1,
          actionsRemaining: 2,
          maxActions: 2,
        status: [],
        hasMoved: false,
        hasAttacked: false,
          cost: 2,
          abilities: [],
        abilityCooldowns: {},
        movementUsed: 0,
          remainingMovement: 3,
        }
      }
      
      return dataManager.createUnitFromEmployee(
        employee,
        `player1-${draftUnit.employeeKey}-${index}`,
        'player1',
        playerPositions[index] || { x: 0, y: 0 }
      )
    })
    
    const aiUnits: Unit[] = state.draftState.aiUnits.map((draftUnit, index) => {
      const employee = dataManager.getEmployee(draftUnit.employeeKey)
      if (!employee) {
        console.error(`Employee not found: ${draftUnit.employeeKey}`)
        // Fallback to basic unit
      return {
          id: `player2-${draftUnit.employeeKey}-${index}`,
        playerId: 'player2',
          type: UnitType.INTERN,
        position: aiPositions[index] || { x: 7, y: 9 },
          hp: 2,
          maxHp: 2,
          moveRange: 3,
          attackRange: 1,
          attackDamage: 1,
          actionsRemaining: 2,
          maxActions: 2,
        status: [],
        hasMoved: false,
        hasAttacked: false,
          cost: 2,
          abilities: [],
        abilityCooldowns: {},
        movementUsed: 0,
          remainingMovement: 3,
        }
      }
      
      return dataManager.createUnitFromEmployee(
        employee,
        `player2-${draftUnit.employeeKey}-${index}`,
        'player2',
        aiPositions[index] || { x: 7, y: 9 }
      )
    })
    
    // Initialize the game with drafted units
    useBoardStore.getState().createBoard()
    usePlayerStore.getState().initializePlayers()
    useUnitStore.getState().setUnits([...playerUnits, ...aiUnits])
    
    // Set game mode to 'ai' after draft confirmation
    set({ gameMode: 'ai' })
    
    // Clear memoization cache
    clearMemoizationCache(get().memoCache)
  },

  selectUnit: (unit) => {
    const unitStore = useUnitStore.getState()
    const uiStore = useUIStore.getState()
    const playerStore = usePlayerStore.getState()

    if (!unit) {
      unitStore.selectUnit(null)
      uiStore.clearActionMode() // Use clearActionMode for a full reset
      return
    }

    // --- START OF CRITICAL FIX ---

    // Select the unit in the unitStore
    unitStore.selectUnit(unit)
    uiStore.clearHighlights()

    // Check if the selected unit can be controlled
    const isPlayerUnit = unit.playerId === playerStore.currentPlayerId
    const canControl = isPlayerUnit && unit.actionsRemaining > 0

    if (canControl) {
      // If it can be controlled, tell the GameScene to position the action menu
      if (typeof window !== 'undefined' && (window as ExtendedWindow).gameScene) {
        console.log(`Setting action menu position for unit: ${unit.id}`)
        const scene = (window as ExtendedWindow).gameScene!
        const screenPos = scene.tileToWorld(unit.position.x, unit.position.y)
        uiStore.setActionMenu(screenPos)
      }
    } else {
      // If the unit can't be controlled (e.g., an enemy unit or no actions left), ensure the menu is hidden.
      uiStore.setActionMenu(null)
    }
    // --- END OF CRITICAL FIX ---
  },

  selectTile: (coord) => {
    const unitStore = useUnitStore.getState()
    const unitAtCoord = unitStore.getUnitAt(coord)

    if (unitAtCoord) {
      // If a tile with a unit is clicked, defer to the selectUnit logic.
      get().selectUnit(unitAtCoord)
    } else {
      // If an empty tile is clicked, deselect the current unit.
      console.log('Empty tile clicked, deselecting unit.')
      get().selectUnit(null)
    }
  },

  moveUnit: (unitId, to) => {
    // Get current state from slice stores
    const unitStore = useUnitStore.getState()
    const boardStore = useBoardStore.getState()
    const uiStore = useUIStore.getState()
    
    const unit = unitStore.getUnitById(unitId)
    if (!unit || !get().isValidMove(unit, to)) return

      console.log('Moving unit:', {
        unitId,
        from: unit.position,
        to,
        hasMoved: unit.hasMoved,
        actionsRemaining: unit.actionsRemaining
      })

    // Update unit position and actions
    unitStore.updateUnit(unitId, { 
      position: to, 
      hasMoved: true, 
      actionsRemaining: unit.actionsRemaining - 1 
    })

    // --- START OF CRITICAL FIX ---
    const finalUnitState = useUnitStore.getState().getUnitById(unitId)
    if (finalUnitState && finalUnitState.actionsRemaining <= 0) {
      console.log(`Unit ${unitId} has no actions left. Deselecting.`)
      useUnitStore.getState().selectUnit(null)
    }
    // --- END OF CRITICAL FIX ---

      // Clear memoization cache when units move
    clearMemoizationCache(get().memoCache)

      // Check if the unit landed on a cubicle for potential capture
    const targetTile = boardStore.getTileAt(to)
      if (targetTile && targetTile.type === TileType.CUBICLE) {
        console.log('Unit landed on cubicle:', {
          unitId,
          unitPlayer: unit.playerId,
          tilePosition: to,
          tileOwner: targetTile.owner,
          tileType: targetTile.type
        })
        
        // If the cubicle is not owned by this unit's player, add to pending captures
        if (targetTile.owner !== unit.playerId) {
          const captureKey = `${to.x},${to.y}`
        set((state) => {
          const updatedPendingCaptures = new Map(state.pendingCubicleCaptures)
          updatedPendingCaptures.set(captureKey, {
            unitId,
            coord: to,
            playerId: unit.playerId
          })
          return { pendingCubicleCaptures: updatedPendingCaptures }
          })
          
          console.log('Added to pending captures:', {
            captureKey,
          pendingCapturesCount: get().pendingCubicleCaptures.size
        })
      }
    }

    // Get updated unit for selection logic
    const updatedUnit = unitStore.getUnitById(unitId)
    const shouldKeepSelected = updatedUnit && updatedUnit.actionsRemaining > 0
    
    if (shouldKeepSelected) {
      unitStore.selectUnit(updatedUnit)
    } else {
      unitStore.selectUnit(null)
    }

    // Clear UI highlights
    uiStore.clearHighlights()

      // Emit action completed event for UI cleanup
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('actionCompleted', {
        detail: { actionType: 'move', unitId, remainingActions: updatedUnit?.actionsRemaining || 0 }
        })
        window.dispatchEvent(event)
      }
  },

  attackTarget: (attackerId, targetId) => {
    // Get current state from slice stores
    const unitStore = useUnitStore.getState()
    const uiStore = useUIStore.getState()
    
    const attacker = unitStore.getUnitById(attackerId)
    const target = unitStore.getUnitById(targetId)
    
    if (!attacker || !target || !get().isValidAttack(attacker, target)) return

      const damage = calculateDamage(attacker, target)

    // Update attacker
    unitStore.updateUnit(attackerId, { 
      actionsRemaining: attacker.actionsRemaining - 1, 
      hasAttacked: true 
    })

    // Update target
    const newHp = Math.max(0, target.hp - damage)
    if (newHp > 0) {
      unitStore.updateUnit(targetId, { hp: newHp })
    } else {
      unitStore.removeUnit(targetId)
    }

    // --- START OF CRITICAL FIX ---
    const finalAttackerState = useUnitStore.getState().getUnitById(attackerId)
    if (finalAttackerState && finalAttackerState.actionsRemaining <= 0) {
      console.log(`Unit ${attackerId} has no actions left. Deselecting.`)
      useUnitStore.getState().selectUnit(null)
    }
    // --- END OF CRITICAL FIX ---

    // Clear memoization cache
    clearMemoizationCache(get().memoCache)

    // Get updated attacker for highlights
    const updatedAttacker = unitStore.getUnitById(attackerId)
    if (updatedAttacker) {
      const moves = get().calculatePossibleMoves(updatedAttacker)
      const targets = get().calculatePossibleTargets(updatedAttacker)
      
      const highlights = new Map<string, string>()
      moves.forEach((m) => highlights.set(`${m.x},${m.y}`, 'movement'))
      targets.forEach((t) => highlights.set(`${t.x},${t.y}`, 'attack'))
      
      uiStore.setHighlightedTiles(highlights)
    }

      // Emit action completed event
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('actionCompleted', {
        detail: { actionType: 'attack', unitId: attackerId, remainingActions: updatedAttacker?.actionsRemaining || 0 }
        })
        window.dispatchEvent(event)
      }
  },

  captureCubicle: (unitId, coord) => {
    console.log('captureCubicle called with:', { unitId, coord })
    
    const unitStore = useUnitStore.getState()
    const boardStore = useBoardStore.getState()
    const playerStore = usePlayerStore.getState()
    const uiStore = useUIStore.getState()
    
    const unit = unitStore.getUnitById(unitId)
      if (!unit || unit.actionsRemaining === 0) {
        console.log('Cannot capture: unit not found or no actions remaining', { unit, actionsRemaining: unit?.actionsRemaining })
      return
      }

    const tile = boardStore.getTileAt(coord)
      if (!tile || tile.type !== TileType.CUBICLE) {
        console.log('Cannot capture: not a cubicle tile', { tile, coord })
      return
      }

      if (tile.owner === unit.playerId) {
        console.log('Cannot capture: already owned by this player', { tileOwner: tile.owner, unitPlayer: unit.playerId })
      return
      }

      console.log('Capturing cubicle:', {
        unitId,
        unitPlayer: unit.playerId,
        coord,
        currentOwner: tile.owner,
        tileType: tile.type
      })

    // Update board tile ownership
    boardStore.updateTileOwner(coord, unit.playerId)

    // Update unit actions
    unitStore.updateUnit(unitId, { actionsRemaining: unit.actionsRemaining - 1 })

    // Update player cubicle count and income
    const cubicleCount = boardStore.getCubicleTilesByOwner(unit.playerId).length
      console.log('Updated cubicle count for player', unit.playerId, ':', cubicleCount)

    // Update player data
    const players = playerStore.players.map((p) =>
        p.id === unit.playerId ? { ...p, controlledCubicles: cubicleCount, income: cubicleCount } : p
      )
    playerStore.setPlayers(players)

    // Clear selection and highlights
    unitStore.selectUnit(null)
    uiStore.clearHighlights()

    console.log('Cubicle capture completed')
  },

  endTurn: () => {
    const unitStore = useUnitStore.getState()
    const boardStore = useBoardStore.getState()
    const playerStore = usePlayerStore.getState()
    const uiStore = useUIStore.getState()
    
    const currentPlayerIndex = playerStore.players.findIndex((p) => p.id === playerStore.currentPlayerId)
    const nextPlayerIndex = (currentPlayerIndex + 1) % playerStore.players.length
    const nextPlayer = playerStore.players[nextPlayerIndex]

      // Process pending cubicle captures before ending turn
    const updatedPendingCaptures = new Map(get().pendingCubicleCaptures)
      
      console.log('Processing pending cubicle captures:', {
      count: get().pendingCubicleCaptures.size,
      captures: Array.from(get().pendingCubicleCaptures.entries())
      })
      
      // Process each pending capture
    for (const [captureKey, capture] of get().pendingCubicleCaptures) {
        const { unitId, coord, playerId } = capture
        
        // Verify the unit is still at the capture location
      const unit = unitStore.getUnitById(unitId)
        if (unit && unit.position.x === coord.x && unit.position.y === coord.y) {
          // Execute the capture
        const tile = boardStore.getTileAt(coord)
          if (tile && tile.type === TileType.CUBICLE && tile.owner !== playerId) {
            console.log('Executing pending capture:', { unitId, coord, playerId })
            
            // Update the board
          boardStore.updateTileOwner(coord, playerId)
            
            // Remove from pending captures
            updatedPendingCaptures.delete(captureKey)
          }
        } else {
          // Unit is no longer at the capture location, remove from pending
          console.log('Unit no longer at capture location, removing pending capture:', { unitId, coord })
          updatedPendingCaptures.delete(captureKey)
        }
      }
      
      // Update player cubicle counts and income
      const cubicleCounts = new Map<string, number>()
    boardStore.board.flat().forEach(tile => {
        if (tile.type === TileType.CUBICLE && tile.owner) {
          cubicleCounts.set(tile.owner, (cubicleCounts.get(tile.owner) || 0) + 1)
        }
      })
      
    const updatedPlayers = playerStore.players.map(p => ({
        ...p,
        controlledCubicles: cubicleCounts.get(p.id) || 0,
        income: cubicleCounts.get(p.id) || 0
      }))

    // Reset actions for next player's units
    unitStore.resetAllUnitActions(nextPlayer.id)

    // Add income to budget if starting new round
      if (nextPlayerIndex === 0) {
      const playersWithIncome = updatedPlayers.map((p) => ({ ...p, budget: p.budget + p.income }))
      playerStore.setPlayers(playersWithIncome)
    } else {
      playerStore.setPlayers(updatedPlayers)
    }

    // Update orchestrator state
    set({
      pendingCubicleCaptures: updatedPendingCaptures
    })

    // Move to next turn
    playerStore.nextTurn()

    // Clear selection and highlights
    unitStore.selectUnit(null)
    uiStore.clearHighlights()

      console.log('Turn ended, new state:', {
        nextPlayer: nextPlayer.id,
        pendingCapturesRemaining: updatedPendingCaptures.size,
        cubicleCounts: Array.from(cubicleCounts.entries())
      })

      // IMPORTANT: Trigger AI turn if next player is AI
      if (nextPlayer.id === 'player2') {
        setTimeout(() => {
          get().executeAITurn()
        }, 500) // Small delay for visual feedback
      }
  },

  // Add new function to execute AI turn
  executeAITurn: () => {
    const playerStore = usePlayerStore.getState()
    const unitStore = useUnitStore.getState()
    
    if (playerStore.currentPlayerId !== 'player2') return
    
    console.log('AI Turn starting...', {
      currentPlayer: playerStore.currentPlayerId,
      aiUnits: unitStore.getUnitsByPlayer('player2'),
      playerUnits: unitStore.getUnitsByPlayer('player1')
    })
    
    // Create AI controller instance
    const aiController = new AIController('normal')
    
    // Get current game state and let AI make decisions with action callbacks
    aiController.takeTurn({
      id: 'local-game',
      units: unitStore.units,
      board: useBoardStore.getState().board,
      players: playerStore.players,
      currentPlayerId: playerStore.currentPlayerId,
      turnNumber: playerStore.turnNumber,
      phase: playerStore.phase,
      selectedUnit: unitStore.selectedUnit,
      winner: playerStore.winner?.id
    }, {
      moveUnit: (unitId: string, to: Coordinate) => {
        console.log('AI moving unit', unitId, 'to', to)
        get().moveUnit(unitId, to)
        // Check victory conditions after each action
        get().checkVictoryConditions()
      },
      attackTarget: (attackerId: string, targetId: string) => {
        console.log('AI attacking', attackerId, '->', targetId)
        get().attackTarget(attackerId, targetId)
        // Check victory conditions after each action
        get().checkVictoryConditions()
      },
      captureCubicle: (unitId: string, coord: Coordinate) => {
        console.log('AI capturing cubicle', unitId, 'at', coord)
        get().captureCubicle(unitId, coord)
        // Check victory conditions after each action
        get().checkVictoryConditions()
      },
      useAbility: (unitId: string, abilityId: string, target?: Unit | Coordinate) => {
        console.log('AI using ability', unitId, abilityId, 'on', target)
        get().useAbility(unitId, abilityId, target)
        // Check victory conditions after each action
        get().checkVictoryConditions()
      },
      endTurn: () => {
        // Check victory conditions one final time before ending turn
        get().checkVictoryConditions()
        get().endTurn()
      },
    }, () => ({
      id: 'local-game',
      units: useUnitStore.getState().units,
      board: useBoardStore.getState().board,
      players: usePlayerStore.getState().players,
      currentPlayerId: usePlayerStore.getState().currentPlayerId,
      turnNumber: usePlayerStore.getState().turnNumber,
      phase: usePlayerStore.getState().phase,
      selectedUnit: useUnitStore.getState().selectedUnit,
      winner: usePlayerStore.getState().winner?.id
    })) // Pass a function that returns fresh state
  },

  // Debug function to log current board state
  logBoardState: () => {
    const boardStore = useBoardStore.getState()
    const cubicles = boardStore.getCubicleTiles()
    const ownedCubicles = cubicles.filter(t => t.owner)
    
    console.log('Current Board State:', {
      totalTiles: boardStore.board.length * boardStore.board[0].length,
      cubicles: cubicles.length,
      ownedCubicles: ownedCubicles.length,
      cubicleDetails: cubicles.map(t => ({
        position: { x: t.x, y: t.y },
        owner: t.owner,
        type: t.type
      })),
      pendingCaptures: get().pendingCubicleCaptures.size,
      pendingCaptureDetails: Array.from(get().pendingCubicleCaptures.entries())
    })
  },

  getUnitAt: (coord) => {
    return useUnitStore.getState().getUnitAt(coord)
  },

  getTileAt: (coord) => {
    return useBoardStore.getState().getTileAt(coord)
  },

  calculatePossibleMoves: (unit) => {
    if (unit.hasMoved || unit.actionsRemaining === 0) return []

    const boardStore = useBoardStore.getState()
    const unitStore = useUnitStore.getState()
    return getCachedPossibleMoves(unit, get().memoCache, () => {
      return calcMoves(unit, { board: boardStore.board, units: unitStore.units })
    })
  },

  calculatePossibleTargets: (unit) => {
    if (unit.hasAttacked || unit.actionsRemaining === 0) return []
    
    const unitStore = useUnitStore.getState()
    return getCachedPossibleTargets(unit, get().memoCache, () => {
      return calcTargets(unit, { units: unitStore.units })
    })
  },

  isValidMove: (unit, to) => {
    const boardStore = useBoardStore.getState()
    const unitStore = useUnitStore.getState()
    return isValidMoveUtil(unit, to, { board: boardStore.board, units: unitStore.units })
  },
  isValidAttack: (attacker, target) => {
    const unitStore = useUnitStore.getState()
    return isValidAttackUtil(attacker, target, { units: unitStore.units })
  },

  checkVictoryConditions: () => {
    const unitStore = useUnitStore.getState()
    const boardStore = useBoardStore.getState()
    const playerStore = usePlayerStore.getState()
    
    // Check if game is already over
    if (playerStore.phase === GamePhase.GAME_OVER) {
      console.log('Game is already over, skipping victory check')
      return
    }

    const victoryResult = checkVictory({
      units: unitStore.units,
      board: boardStore.board,
      players: playerStore.players,
      phase: playerStore.phase
    })

    if (victoryResult.hasWinner && victoryResult.winner) {
      console.log(victoryResult.reason)
      // Find the player by ID and set as winner
      const winnerPlayer = playerStore.players.find(p => p.id === victoryResult.winner)
      if (winnerPlayer) {
        playerStore.setWinner(winnerPlayer)
      }
    }
  },

  // Ability system methods (selectAbility moved to uiStore)

  useAbility: (unitId: string, abilityId: string, target?: Unit | Coordinate) => {
    const unitStore = useUnitStore.getState()

    const unit = unitStore.getUnitById(unitId)
    if (!unit) return

    const ability = getAbilityById(abilityId)
    if (!ability || !canUseAbility(unit, abilityId)) return

    // Execute the ability's effect function to get the result
    const result = ability.effect(unit, target)

    if (result.success) {
      // --- START OF CRITICAL FIX ---

      // 1. Apply Status Effects
      if (result.statusApplied && target && 'id' in target) {
        const targetUnit = unitStore.getUnitById(target.id)
        if (targetUnit) {
          // Look up the full status effect definition from the DataManager
          const statusKey = result.statusApplied[0].type // This will be 'increase_speed'
          const statusEffectData = dataManager.getStatusEffect(statusKey)

          if (statusEffectData) {
            // Map the status key to the appropriate StatusType enum value
            let statusType: StatusType
            switch (statusEffectData.key) {
              case 'increase_speed':
                statusType = StatusType.INSPIRED
                break
              case 'bleeding':
                statusType = StatusType.POISONED
                break
              case 'fire':
                statusType = StatusType.BURNING
                break
              default:
                statusType = StatusType.CONFUSED
            }
            
            const newStatus = {
              type: statusType,
              key: statusEffectData.key,
              name: statusEffectData.name,
              duration: statusEffectData.duration_in_turns,
            }
            // Note: A full implementation would also apply modifiers
            unitStore.updateUnit(targetUnit.id, {
              status: [...targetUnit.status, newStatus]
            })
            console.log(`Applied status '${newStatus.name}' to ${targetUnit.id}`)
          }
        }
      }

      // 2. Apply Damage
      if (result.damageDealt && target && 'id' in target) {
        const targetUnit = unitStore.getUnitById(target.id)
        if (targetUnit) {
          const newHp = Math.max(0, targetUnit.hp - result.damageDealt)
          if (newHp === 0) {
            unitStore.removeUnit(targetUnit.id)
          } else {
            unitStore.updateUnit(targetUnit.id, { hp: newHp })
          }
        }
      }

      // 3. Apply Healing
      if (result.healingDone && target && 'id' in target) {
        const targetUnit = unitStore.getUnitById(target.id)
        if (targetUnit) {
          unitStore.updateUnit(targetUnit.id, { 
            hp: Math.min(targetUnit.maxHp, targetUnit.hp + result.healingDone)
          })
        }
      }

      // 4. Apply Action Bonus to Caster
      if (result.actionBonus) {
        unitStore.updateUnit(unitId, {
          actionsRemaining: unit.actionsRemaining + result.actionBonus
        })
      }

      // --- END OF CRITICAL FIX ---

      // 5. Set Cooldown on Caster
      if (ability.cooldown > 0) {
        unitStore.updateUnit(unitId, { 
          abilityCooldowns: { 
            ...unit.abilityCooldowns, 
            [abilityId]: ability.cooldown 
          } 
        })
      }

      // 6. Consume Action Points from Caster
      unitStore.updateUnit(unitId, { 
        actionsRemaining: unit.actionsRemaining - (ability.cost || 1)
      })

      // --- START OF CRITICAL FIX ---
      const finalUnitState = useUnitStore.getState().getUnitById(unitId)
      if (finalUnitState && finalUnitState.actionsRemaining <= 0) {
        console.log(`Unit ${unitId} has no actions left. Deselecting.`)
        useUnitStore.getState().selectUnit(null)
      }
      // --- END OF CRITICAL FIX ---

      // Emit event and clean up UI
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('actionCompleted', {
          detail: { actionType: 'ability', unitId, abilityId }
        })
        window.dispatchEvent(event)
      }
      actionHandlers.cancelAction()
    }
  },

  getAbilityTargets: (unitId: string, abilityId: string) => {
    const unitStore = useUnitStore.getState()
    const boardStore = useBoardStore.getState()
    
    const unit = unitStore.getUnitById(unitId)
    if (!unit) return []
    
    const ability = getAbilityById(abilityId)
    if (!ability) return []
    return getValidTargets(unit, ability, boardStore.board, unitStore.units)
  },

  canUseAbility: (unitId: string, abilityId: string) => {
    const unitStore = useUnitStore.getState()
    const unit = unitStore.getUnitById(unitId)
    if (!unit) return false
    
    return canUseAbility(unit, abilityId)
  },

  // New helper functions for smart action availability
  canUnitMove: (unit: Unit) => {
    return unit.actionsRemaining > 0 && !unit.hasMoved;
  },

  canUnitAttack: (unit: Unit) => {
    return unit.actionsRemaining > 0 && !unit.hasAttacked;
  },

  getEnemiesInRange: (unit: Unit) => {
    const unitStore = useUnitStore.getState();
    return unitStore.getEnemyUnits(unit.playerId).filter(enemy => {
        const distance = Math.abs(enemy.position.x - unit.position.x) + Math.abs(enemy.position.y - unit.position.y);
      return distance <= unit.attackRange;
    });
  },

  getRemainingMovement: (unit: Unit) => {
    return unit.actionsRemaining;
  },

  // Helper function to check if a unit can be selected while another is active
  canSelectUnit: (unit: Unit, currentlySelected?: Unit) => {
    if (!unit) return false
    
    // If no unit is currently selected, any player unit can be selected
    if (!currentlySelected) {
      return unit.playerId === 'player1' && unit.actionsRemaining > 0
    }
    
    // If we're trying to select the same unit, allow it (for deselection)
    if (unit.id === currentlySelected.id) {
      return true
    }
    
    // If the currently selected unit is in action mode, don't allow switching
    // unless the new unit is a valid target for the current action
    if (currentlySelected.actionsRemaining > 0 && 
        currentlySelected.playerId === 'player1') {
      // Check if the new unit is a valid attack target
      const isEnemy = unit.playerId !== currentlySelected.playerId
      const inAttackRange = get().calculatePossibleTargets(currentlySelected)
        .some(target => target.x === unit.position.x && target.y === unit.position.y)
      
      if (isEnemy && inAttackRange) {
        // This is a valid attack target - allow selection to execute attack
        return true
      }
      
      // Don't allow switching units while in action mode
      return false
    }
    
    // If no action mode, allow selecting any player unit with actions
    return unit.playerId === 'player1' && unit.actionsRemaining > 0
  },

  // Helper function to check if clicking on a unit should execute an action instead of switching
  shouldExecuteActionInsteadOfSelect: (unit: Unit, currentlySelected?: Unit) => {
    if (!unit || !currentlySelected) return false
    
    // Check if the currently selected unit is in action mode
    const isCurrentUnitInActionMode = currentlySelected.actionsRemaining > 0 && 
                                    currentlySelected.playerId === 'player1'
    
    if (!isCurrentUnitInActionMode) return false
    
    // Check if the clicked unit is a valid target for the current action
    const isEnemy = unit.playerId !== currentlySelected.playerId
    const inAttackRange = get().calculatePossibleTargets(currentlySelected)
      .some(target => target.x === unit.position.x && target.y === unit.position.y)
    
    return isEnemy && inAttackRange
  },

  // Helper function to check if clicking on a unit should execute a move instead of switching
  shouldExecuteMoveInsteadOfSelect: (unit: Unit, currentlySelected?: Unit) => {
    if (!unit || !currentlySelected) return false
    
    // Check if the currently selected unit is in move mode
    const isCurrentUnitInMoveMode = currentlySelected.actionsRemaining > 0 && 
                                   currentlySelected.playerId === 'player1' &&
                                   !currentlySelected.hasMoved
    
    if (!isCurrentUnitInMoveMode) return false
    
    // Check if the clicked unit's position is a valid move target
    const inMoveRange = get().calculatePossibleMoves(currentlySelected)
      .some(move => move.x === unit.position.x && move.y === unit.position.y)
    
    return inMoveRange
  },

  // Helper function to check if a unit is a valid attack target
  isValidAttackTarget: (attacker: Unit, target: Unit) => {
    if (!attacker || !target) return false
    
    // Check if target is an enemy
    if (attacker.playerId === target.playerId) return false
    
    // Check if attacker can attack
    if (attacker.hasAttacked || attacker.actionsRemaining === 0) return false
    
    // Check if target is in attack range
    const distance = Math.abs(target.position.x - attacker.position.x) + 
                    Math.abs(target.position.y - attacker.position.y)
    
    return distance <= attacker.attackRange
  },
}})




// function isAdjacent(a: Coordinate, b: Coordinate): boolean {
//   const result = Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1
//   console.log('isAdjacent check:', { a, b, result, distance: Math.abs(a.x - b.x) + Math.abs(a.y - b.y) })
//   return result
// }






