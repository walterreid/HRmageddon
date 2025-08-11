import { create } from 'zustand'
import {
  GamePhase,
  type GameState as SharedGameState,
  type Unit,
  type Coordinate,
  type Player,
  type Tile,
  TileType,
  UnitType,
  UNIT_STATS,
  UNIT_COSTS,
  type DraftState,
} from 'shared'
import { AIController } from '../game/systems/ai.ts'
import { generateAIDraft } from '../game/systems/aiDraft.ts'
import { ABILITIES, canUseAbility, getValidTargets } from '../game/systems/abilities.ts'

type GameMode = 'menu' | 'ai' | 'multiplayer'

type GameStore = SharedGameState & {
  gameMode: GameMode
  possibleMoves: Coordinate[]
  possibleTargets: Coordinate[]
  highlightedTiles: Map<string, string>
  draftState: DraftState
  
  // Ability targeting state
  selectedAbility?: string
  targetingMode: boolean
  validTargets: (Unit | Coordinate)[]
  
  // Track units that landed on cubicles for end-of-turn capture
  pendingCubicleCaptures: Map<string, { unitId: string; coord: Coordinate; playerId: string }>
  


  setGameMode: (mode: GameMode) => void
  setCurrentPlayerId: (playerId: string) => void
  setUnits: (units: Unit[]) => void
  initializeGame: () => void
  initializeDraft: () => void
  addUnitToDraft: (unitType: UnitType) => void
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

  getUnitAt: (coord: Coordinate) => Unit | undefined
  getTileAt: (coord: Coordinate) => Tile | undefined
  calculatePossibleMoves: (unit: Unit) => Coordinate[]
  calculatePossibleTargets: (unit: Unit) => Coordinate[]
  isValidMove: (unit: Unit, to: Coordinate) => boolean
  isValidAttack: (attacker: Unit, target: Unit) => boolean
  checkVictoryConditions: () => void
  
  // Ability system methods
  selectAbility: (abilityId: string) => void
  useAbility: (unitId: string, abilityId: string, target?: Unit | Coordinate) => void
  getAbilityTargets: (unitId: string, abilityId: string) => (Unit | Coordinate)[]
  canUseAbility: (unitId: string, abilityId: string) => boolean
  
  // New helper functions for smart action availability
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
  // Initial shared state
  id: 'local-game',
  board: [],
  units: [],
  players: [],
  currentPlayerId: '',
  turnNumber: 1,
  phase: GamePhase.SETUP,
  selectedUnit: undefined,
  winner: undefined,

  // Local UI state
  gameMode: 'menu',
  possibleMoves: [],
  possibleTargets: [],
  highlightedTiles: new Map<string, string>(),
  
  // Ability targeting state
  selectedAbility: undefined,
  targetingMode: false,
  validTargets: [],
  
  // Track units that landed on cubicles for end-of-turn capture
  pendingCubicleCaptures: new Map(),

  draftState: {
    playerBudget: 200,
    maxHeadcount: 6,
    selectedUnits: [],
    aiUnits: [],
  },

  setGameMode: (mode) => {
    set({ gameMode: mode })
  },

  setCurrentPlayerId: (playerId) => {
    set({ currentPlayerId: playerId })
  },

  setUnits: (units) => {
    set({ units })
  },

  returnToMenu: () => {
    set({
      gameMode: 'menu',
      board: [],
      units: [],
      players: [],
      currentPlayerId: '',
      turnNumber: 1,
      phase: GamePhase.SETUP,
      selectedUnit: undefined,
      winner: undefined,
      possibleMoves: [],
      possibleTargets: [],
      highlightedTiles: new Map(),
      pendingCubicleCaptures: new Map(),
      draftState: {
        playerBudget: 200,
        maxHeadcount: 6,
        selectedUnits: [],
        aiUnits: [],
      },
    })
  },

  initializeGame: () => {
    const board = createBoard()
    const players = createPlayers()
    const units = createInitialUnits()

    // Debug: Log initial board state
    const cubicleCount = board.flat().filter(t => t.type === TileType.CUBICLE).length
    console.log('Initializing game with board:', {
      width: board[0].length,
      height: board.length,
      totalCubicles: cubicleCount,
      cubiclePositions: board.flat()
        .filter(t => t.type === TileType.CUBICLE)
        .map(t => ({ x: t.x, y: t.y }))
    })

    set({
      board,
      players,
      units,
      currentPlayerId: 'player1', // Always start with player1 (blue team)
      phase: GamePhase.PLAYING,
      turnNumber: 1,
      selectedUnit: undefined,
      possibleMoves: [],
      possibleTargets: [],
      highlightedTiles: new Map(),
      pendingCubicleCaptures: new Map(),
      winner: undefined,
      draftState: {
        playerBudget: 200,
        maxHeadcount: 6,
        selectedUnits: [],
        aiUnits: [],
      },
    })
  },

  initializeDraft: () => {
    const aiUnits = generateAIDraft(200, 6)
    set((state) => ({
      phase: GamePhase.DRAFT,
      draftState: {
        ...state.draftState,
        aiUnits,
      }
    }))
  },

  addUnitToDraft: (unitType) => {
    const state = get()
    const cost = UNIT_COSTS[unitType]
    const currentCost = state.draftState.selectedUnits.reduce((sum, unit) => 
      sum + UNIT_COSTS[unit.type], 0
    )
    
    if (state.draftState.selectedUnits.length >= state.draftState.maxHeadcount) return
    if (currentCost + cost > state.draftState.playerBudget) return
    
    set((state) => ({
      draftState: {
        ...state.draftState,
        selectedUnits: [...state.draftState.selectedUnits, { type: unitType }]
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
    
    // Define starting positions for each team
    const getPlayerStartPositions = (teamId: string): Coordinate[] => {
      if (teamId === 'player1') {
        // Blue team starts in top-left area
        return [
          { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
          { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
        ]
      } else {
        // Red team starts in bottom-right area
        const boardWidth = 8
        const boardHeight = 10
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
    const playerPositions = getPlayerStartPositions('player1')
    const aiPositions = getPlayerStartPositions('player2')
    
    const playerUnits: Unit[] = state.draftState.selectedUnits.map((draftUnit, index) => {
      const stats = UNIT_STATS[draftUnit.type]
      return {
        id: `player1-${draftUnit.type}-${index}`,
        playerId: 'player1',
        type: draftUnit.type,
        position: playerPositions[index] || { x: 0, y: 0 },
        hp: stats.hp,
        maxHp: stats.maxHp,
        moveRange: stats.moveRange,
        attackRange: stats.attackRange,
        attackDamage: stats.attackDamage,
        actionsRemaining: stats.maxActions,
        maxActions: stats.maxActions,
        status: [],
        hasMoved: false,
        hasAttacked: false,
        cost: stats.cost,
        abilities: stats.abilities,
        abilityCooldowns: {},
        movementUsed: 0,
        remainingMovement: stats.moveRange,
      }
    })
    
    const aiUnits: Unit[] = state.draftState.aiUnits.map((draftUnit, index) => {
      const stats = UNIT_STATS[draftUnit.type]
      return {
        id: `player2-${draftUnit.type}-${index}`,
        playerId: 'player2',
        type: draftUnit.type,
        position: aiPositions[index] || { x: 7, y: 9 },
        hp: stats.hp,
        maxHp: stats.maxHp,
        moveRange: stats.moveRange,
        attackRange: stats.attackRange,
        attackDamage: stats.attackDamage,
        actionsRemaining: stats.maxActions, // AI units start with full actions
        maxActions: stats.maxActions,
        status: [],
        hasMoved: false,
        hasAttacked: false,
        cost: stats.cost,
        abilities: stats.abilities,
        abilityCooldowns: {},
        movementUsed: 0,
        remainingMovement: stats.moveRange,
      }
    })
    
    // Initialize the game with drafted units
    const board = createBoard()
    const players = createPlayers()
    
    // Debug: Log board state after draft
    const cubicleCount = board.flat().filter(t => t.type === TileType.CUBICLE).length
    console.log('Draft confirmed, board state:', {
      width: board[0].length,
      height: board.length,
      totalCubicles: cubicleCount,
      cubiclePositions: board.flat()
        .filter(t => t.type === TileType.CUBICLE)
        .map(t => ({ x: t.x, y: t.y }))
    })
    
    // Debug: Log units being created
    console.log('Creating player units:', playerUnits.map(u => ({
      id: u.id,
      type: u.type,
      position: u.position,
      actionsRemaining: u.actionsRemaining,
      maxActions: u.maxActions
    })))
    
    console.log('Creating AI units:', aiUnits.map(u => ({
      id: u.id,
      type: u.type,
      position: u.position,
      actionsRemaining: u.actionsRemaining,
      maxActions: u.maxActions
    })))
    
    set({
      gameMode: 'ai', // Set game mode to 'ai' after draft confirmation
      board,
      players,
      units: [...playerUnits, ...aiUnits],
      currentPlayerId: 'player1',
      phase: GamePhase.PLAYING,
      turnNumber: 1,
      selectedUnit: undefined,
      possibleMoves: [],
      possibleTargets: [],
      highlightedTiles: new Map(),
      winner: undefined,
      draftState: {
        playerBudget: 200,
        maxHeadcount: 6,
        selectedUnits: [],
        aiUnits: [],
      },
    })
    
    // Debug: Log final game state
    const finalState = get()
    console.log('Final game state after draft:', {
      currentPlayerId: finalState.currentPlayerId,
      phase: finalState.phase,
      units: finalState.units.map(u => ({
        id: u.id,
        playerId: u.playerId,
        type: u.type,
        position: u.position,
        actionsRemaining: u.actionsRemaining,
        maxActions: u.maxActions
      })),
      boardCubicles: finalState.board.flat().filter(t => t.type === TileType.CUBICLE).length
    })
  },

  selectUnit: (unit) => {
    if (!unit) {
      set({
        selectedUnit: undefined,
        selectedAbility: undefined, // Clear ability when deselecting
        possibleMoves: [],
        possibleTargets: [],
        highlightedTiles: new Map(),
        targetingMode: false
      })
      return
    }

    const state = get()
    
    // BEFORE selecting new unit, check if we're in ability mode
    if (state.selectedAbility && unit) {
      // Preserve ability mode if re-selecting same unit
      if (state.selectedUnit?.id === unit.id) {
        console.log('Re-selecting same unit in ability mode, preserving state')
        return // Don't reset state
      }
    }
    
    // Check if we're trying to select a different unit while one is already selected
    if (state.selectedUnit && state.selectedUnit.id !== unit.id) {
      // Check if the currently selected unit is in action mode
      const currentUnit = state.selectedUnit
      const isCurrentUnitInActionMode = currentUnit.actionsRemaining > 0 && 
                                      currentUnit.playerId === state.currentPlayerId
      
      if (isCurrentUnitInActionMode) {
        // Check if the new unit is a valid target for the current action
        const isEnemy = unit.playerId !== currentUnit.playerId
        const inAttackRange = state.calculatePossibleTargets(currentUnit)
          .some(target => target.x === unit.position.x && target.y === unit.position.y)
        
        if (isEnemy && inAttackRange) {
          // This is a valid attack target - execute the attack instead of switching units
          state.attackTarget(currentUnit.id, unit.id)
          state.checkVictoryConditions()
          return
        } else {
          // Not a valid target and current unit is in action mode - don't allow switching
          console.log('Cannot switch units while current unit is in action mode')
          
          // Emit event to notify UI that unit selection is blocked
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('unitSelectionBlocked')
            window.dispatchEvent(event)
          }
          
          return
        }
      }
    }
    
    // Clear ability state when selecting different unit
    if (state.selectedAbility) {
      set({ selectedAbility: undefined, targetingMode: false })
    }
    
    // Don't automatically show movement highlights - wait for user to choose an action
    const canControl = unit.playerId === state.currentPlayerId && 
                      state.currentPlayerId === 'player1' && 
                      unit.actionsRemaining > 0
    
    if (canControl) {
      // Calculate possible moves/targets but DON'T show highlights yet
      const moves = state.calculatePossibleMoves(unit)
      const targets = state.calculatePossibleTargets(unit)
      
      console.log('selectUnit called:', {
        unitId: unit.id,
        currentAbility: state.selectedAbility,
        moveCount: moves.length,
        targetCount: targets.length,
        note: 'Highlights will appear when user chooses an action'
      })

      // Set unit selection WITHOUT showing highlights
      set({
        selectedUnit: unit,
        possibleMoves: moves,
        possibleTargets: targets,
        highlightedTiles: new Map(), // No highlights until action is chosen
      })
    } else {
      set({
        selectedUnit: unit,
        possibleMoves: [],
        possibleTargets: [],
        highlightedTiles: new Map(),
      })
    }
  },

  selectTile: (coord) => {
    const state = get()
    const { selectedUnit, possibleMoves, possibleTargets } = state

    // If no unit is selected, check if we clicked on a unit to select it
    if (!selectedUnit) {
      const unit = state.getUnitAt(coord)
      if (unit) {
        state.selectUnit(unit)
      }
      return
    }

    // Check if this unit can be controlled (has actions remaining)
    const canControl = selectedUnit.playerId === state.currentPlayerId && 
                      state.currentPlayerId === 'player1' && 
                      selectedUnit.actionsRemaining > 0
    
    if (!canControl) {
      // If unit can't be controlled, allow selecting a different unit
      const newUnit = state.getUnitAt(coord)
      if (newUnit) {
        state.selectUnit(newUnit)
      }
      return
    }

    // PRIORITY: Check if this is a valid move for the currently selected unit
    if (possibleMoves.some((m) => m.x === coord.x && m.y === coord.y)) {
      state.moveUnit(selectedUnit.id, coord)
      state.checkVictoryConditions()
      return
    }

    // PRIORITY: Check if this is a valid attack target for the currently selected unit
    const targetUnit = state.getUnitAt(coord)
    if (targetUnit && possibleTargets.some((t) => t.x === coord.x && t.y === coord.y)) {
      // Ensure we're not trying to attack our own unit
      if (targetUnit.playerId !== selectedUnit.playerId) {
        state.attackTarget(selectedUnit.id, targetUnit.id)
        state.checkVictoryConditions()
        return
      }
    }

    // PRIORITY: Check if this is a valid cubicle capture for the currently selected unit
    const tile = state.getTileAt(coord)
    if (tile?.type === TileType.CUBICLE && tile.owner !== selectedUnit.playerId) {
      state.captureCubicle(selectedUnit.id, coord)
      return
    }

    // If we clicked on a different unit while one is already selected and in action mode,
    // prioritize the current action over unit selection
    const clickedUnit = state.getUnitAt(coord)
    if (clickedUnit && clickedUnit.id !== selectedUnit.id) {
      // Check if the clicked unit is an enemy that could be a valid attack target
      if (clickedUnit.playerId !== selectedUnit.playerId && 
          possibleTargets.some((t) => t.x === coord.x && t.y === coord.y)) {
        // This is a valid attack target - execute the attack
        state.attackTarget(selectedUnit.id, clickedUnit.id)
        state.checkVictoryConditions()
        return
      }
      
      // If we're not in a specific action mode and clicked on a different unit,
      // allow switching selection (but only if the new unit can be controlled)
      if (clickedUnit.playerId === state.currentPlayerId && 
          clickedUnit.actionsRemaining > 0) {
        state.selectUnit(clickedUnit)
        return
      }
    }

    // If none of the above conditions were met, deselect the current unit
    // This allows the player to click elsewhere to cancel actions
    state.selectUnit(undefined)
  },

  moveUnit: (unitId, to) => {
    set((state) => {
      const unit = state.units.find((u) => u.id === unitId)
      if (!unit || !state.isValidMove(unit, to)) return state

      // Calculate movement distance used
      const movementUsed = Math.abs(to.x - unit.position.x) + Math.abs(to.y - unit.position.y)
      const remainingMovement = Math.max(0, unit.moveRange - movementUsed)

      const updatedUnits = state.units.map((u) =>
        u.id === unitId
          ? { 
              ...u, 
              position: to, 
              actionsRemaining: u.actionsRemaining - 1, 
              hasMoved: true,
              movementUsed: movementUsed,
              remainingMovement: remainingMovement
            }
          : u
      )

      // Check if the unit landed on a cubicle tile
      const tile = state.board[to.y]?.[to.x]
      let updatedPendingCaptures = new Map(state.pendingCubicleCaptures)
      
      if (tile?.type === TileType.CUBICLE && tile.owner !== unit.playerId) {
        // Add to pending captures - will be processed at end of turn
        const captureKey = `${to.x},${to.y}`
        updatedPendingCaptures.set(captureKey, {
          unitId,
          coord: to,
          playerId: unit.playerId
        })
        console.log('Unit landed on cubicle, added to pending captures:', {
          unitId,
          coord: to,
          playerId: unit.playerId,
          captureKey
        })
      }

      // Get the updated unit to recalculate moves and targets
      const updatedUnit = updatedUnits.find(u => u.id === unitId)!
      
      // Recalculate possible moves and targets for the updated unit
      const moves = state.calculatePossibleMoves(updatedUnit)
      const targets = state.calculatePossibleTargets(updatedUnit)
      
      const highlights = new Map<string, string>()
      moves.forEach((m) => highlights.set(`${m.x},${m.y}`, 'movement'))
      targets.forEach((t) => highlights.set(`${t.x},${t.y}`, 'attack'))

      // Emit action completed event
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('actionCompleted', {
          detail: { actionType: 'move', unitId, remainingActions: updatedUnit.actionsRemaining }
        })
        window.dispatchEvent(event)
      }

      return {
        ...state,
        units: updatedUnits,
        pendingCubicleCaptures: updatedPendingCaptures,
        selectedUnit: updatedUnit,
        possibleMoves: moves,
        possibleTargets: targets,
        highlightedTiles: highlights,
      }
    })
  },

  attackTarget: (attackerId, targetId) => {
    set((state) => {
      const attacker = state.units.find((u) => u.id === attackerId)
      const target = state.units.find((u) => u.id === targetId)
      if (!attacker || !target || !state.isValidAttack(attacker, target)) return state

      const damage = calculateDamage(attacker, target)

      const updatedUnits = state.units
        .map((u) => {
          if (u.id === attackerId) {
            return { ...u, actionsRemaining: u.actionsRemaining - 1, hasAttacked: true }
          }
          if (u.id === targetId) {
            const newHp = Math.max(0, u.hp - damage)
            return newHp > 0 ? { ...u, hp: newHp } : null
          }
          return u
        })
        .filter(Boolean) as Unit[]

      // Get the updated attacker to recalculate moves and targets
      const updatedAttacker = updatedUnits.find(u => u.id === attackerId)!
      
      // Recalculate possible moves and targets for the updated attacker
      const moves = state.calculatePossibleMoves(updatedAttacker)
      const targets = state.calculatePossibleTargets(updatedAttacker)
      
      const highlights = new Map<string, string>()
      moves.forEach((m) => highlights.set(`${m.x},${m.y}`, 'movement'))
      targets.forEach((t) => highlights.set(`${t.x},${t.y}`, 'attack'))

      // Emit action completed event
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('actionCompleted', {
          detail: { actionType: 'attack', unitId: attackerId, remainingActions: updatedAttacker.actionsRemaining }
        })
        window.dispatchEvent(event)
      }

      return {
        ...state,
        units: updatedUnits,
        selectedUnit: updatedAttacker,
        possibleMoves: moves,
        possibleTargets: targets,
        highlightedTiles: highlights,
      }
    })
  },

  captureCubicle: (unitId, coord) => {
    console.log('captureCubicle called with:', { unitId, coord })
    
    set((state) => {
      const unit = state.units.find((u) => u.id === unitId)
      if (!unit || unit.actionsRemaining === 0) {
        console.log('Cannot capture: unit not found or no actions remaining', { unit, actionsRemaining: unit?.actionsRemaining })
        return state
      }

      const tile = state.board[coord.y]?.[coord.x]
      if (!tile || tile.type !== TileType.CUBICLE) {
        console.log('Cannot capture: not a cubicle tile', { tile, coord })
        return state
      }

      if (tile.owner === unit.playerId) {
        console.log('Cannot capture: already owned by this player', { tileOwner: tile.owner, unitPlayer: unit.playerId })
        return state
      }

      console.log('Capturing cubicle:', {
        unitId,
        unitPlayer: unit.playerId,
        coord,
        currentOwner: tile.owner,
        tileType: tile.type
      })

      const updatedBoard = state.board.map((row) =>
        row.map((tile) => (tile.x === coord.x && tile.y === coord.y ? { ...tile, owner: unit.playerId } : tile))
      )

      const updatedUnits = state.units.map((u) =>
        u.id === unitId ? { ...u, actionsRemaining: u.actionsRemaining - 1 } : u
      )

      const cubicleCount = updatedBoard
        .flat()
        .filter((t) => t.type === TileType.CUBICLE && t.owner === unit.playerId).length

      console.log('Updated cubicle count for player', unit.playerId, ':', cubicleCount)

      const updatedPlayers = state.players.map((p) =>
        p.id === unit.playerId ? { ...p, controlledCubicles: cubicleCount, income: cubicleCount } : p
      )

      const newState = {
        ...state,
        board: updatedBoard,
        units: updatedUnits,
        players: updatedPlayers,
        selectedUnit: undefined,
        possibleMoves: [],
        possibleTargets: [],
        highlightedTiles: new Map(),
      }

      console.log('New state after capture:', {
        boardUpdated: newState.board !== state.board,
        unitsUpdated: newState.units !== state.units,
        playersUpdated: newState.players !== state.players,
        capturedTile: newState.board[coord.y]?.[coord.x]
      })

      return newState
    })
  },

  endTurn: () => {
    set((state) => {
      const currentPlayerIndex = state.players.findIndex((p) => p.id === state.currentPlayerId)
      const nextPlayerIndex = (currentPlayerIndex + 1) % state.players.length
      const nextPlayer = state.players[nextPlayerIndex]

      // Process pending cubicle captures before ending turn
      let updatedBoard = state.board
      let updatedPlayers = state.players
      let updatedPendingCaptures = new Map(state.pendingCubicleCaptures)
      
      console.log('Processing pending cubicle captures:', {
        count: state.pendingCubicleCaptures.size,
        captures: Array.from(state.pendingCubicleCaptures.entries())
      })
      
      // Process each pending capture
      for (const [captureKey, capture] of state.pendingCubicleCaptures) {
        const { unitId, coord, playerId } = capture
        
        // Verify the unit is still at the capture location
        const unit = state.units.find(u => u.id === unitId)
        if (unit && unit.position.x === coord.x && unit.position.y === coord.y) {
          // Execute the capture
          const tile = updatedBoard[coord.y]?.[coord.x]
          if (tile && tile.type === TileType.CUBICLE && tile.owner !== playerId) {
            console.log('Executing pending capture:', { unitId, coord, playerId })
            
            // Update the board
            updatedBoard = updatedBoard.map((row) =>
              row.map((tile) => (tile.x === coord.x && tile.y === coord.y ? { ...tile, owner: playerId } : tile))
            )
            
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
      updatedBoard.flat().forEach(tile => {
        if (tile.type === TileType.CUBICLE && tile.owner) {
          cubicleCounts.set(tile.owner, (cubicleCounts.get(tile.owner) || 0) + 1)
        }
      })
      
      updatedPlayers = updatedPlayers.map(p => ({
        ...p,
        controlledCubicles: cubicleCounts.get(p.id) || 0,
        income: cubicleCounts.get(p.id) || 0
      }))

      const updatedUnits = state.units.map((u) =>
        u.playerId === nextPlayer.id
          ? { 
              ...u, 
              actionsRemaining: u.maxActions, 
              hasMoved: false, 
              hasAttacked: false,
              movementUsed: 0,
              remainingMovement: u.moveRange
            }
          : u
      )

      if (nextPlayerIndex === 0) {
        updatedPlayers = updatedPlayers.map((p) => ({ ...p, budget: p.budget + p.income }))
      }

      const newState = {
        ...state,
        board: updatedBoard,
        currentPlayerId: nextPlayer.id,
        turnNumber: nextPlayerIndex === 0 ? state.turnNumber + 1 : state.turnNumber,
        units: updatedUnits,
        players: updatedPlayers,
        pendingCubicleCaptures: updatedPendingCaptures,
        selectedUnit: undefined,
        possibleMoves: [],
        possibleTargets: [],
        highlightedTiles: new Map(),
      }

      console.log('Turn ended, new state:', {
        nextPlayer: nextPlayer.id,
        boardUpdated: newState.board !== state.board,
        pendingCapturesRemaining: updatedPendingCaptures.size,
        cubicleCounts: Array.from(cubicleCounts.entries())
      })

      // IMPORTANT: Trigger AI turn if next player is AI
      if (nextPlayer.id === 'player2') {
        setTimeout(() => {
          get().executeAITurn()
        }, 500) // Small delay for visual feedback
      }

      return newState
    })
  },

  // Add new function to execute AI turn
  executeAITurn: () => {
    const state = get()
    if (state.currentPlayerId !== 'player2') return
    
    console.log('AI Turn starting...', {
      currentPlayer: state.currentPlayerId,
      aiUnits: state.units.filter(u => u.playerId === 'player2'),
      playerUnits: state.units.filter(u => u.playerId === 'player1')
    })
    
    // Create AI controller instance
    const aiController = new AIController('normal')
    
    // Get current game state and let AI make decisions with action callbacks
    aiController.takeTurn(state, {
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
    }, get) // Pass the get function so AI can fetch fresh state
  },

  getUnitAt: (coord) => get().units.find((u) => u.position.x === coord.x && u.position.y === coord.y),

  getTileAt: (coord) => {
    const { board } = get()
    return board[coord.y]?.[coord.x]
  },

  calculatePossibleMoves: (unit) => {
    if (unit.hasMoved || unit.actionsRemaining === 0) return []

    const { board, units } = get()
    const moves: Coordinate[] = []
    const visited = new Set<string>()
    const queue: { coord: Coordinate; distance: number }[] = [{ coord: unit.position, distance: 0 }]

    while (queue.length > 0) {
      const { coord, distance } = queue.shift()!
      const key = `${coord.x},${coord.y}`
      if (visited.has(key)) continue
      visited.add(key)

      if (distance > 0 && distance <= unit.moveRange) {
        const tile = board[coord.y]?.[coord.x]
        const occupant = units.find((u) => u.position.x === coord.x && u.position.y === coord.y)
        if (tile && tile.type !== TileType.OBSTACLE && !occupant) {
          moves.push(coord)
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
          if (
            neighbor.x >= 0 &&
            neighbor.x < board[0].length &&
            neighbor.y >= 0 &&
            neighbor.y < board.length
          ) {
            queue.push({ coord: neighbor, distance: distance + 1 })
          }
        }
      }
    }
    return moves
  },

  calculatePossibleTargets: (unit) => {
    if (unit.hasAttacked || unit.actionsRemaining === 0) return []
    const { units } = get()
    const targets: Coordinate[] = []
    
    for (const enemy of units) {
      if (enemy.playerId === unit.playerId) continue
      const distance = Math.abs(enemy.position.x - unit.position.x) + Math.abs(enemy.position.y - unit.position.y)
      if (distance <= unit.attackRange) {
        targets.push(enemy.position)
        console.log('Valid attack target found:', {
          targetId: enemy.id,
          targetType: enemy.type,
          distance,
          attackRange: unit.attackRange,
          targetPosition: enemy.position
        })
      }
    }
    
    console.log('Calculated possible targets for unit:', {
      unitId: unit.id,
      unitType: unit.type,
      attackRange: unit.attackRange,
      targetCount: targets.length,
      targets
    })
    
    return targets
  },

  isValidMove: (unit, to) => get().calculatePossibleMoves(unit).some((m) => m.x === to.x && m.y === to.y),
  isValidAttack: (attacker, target) =>
    get()
      .calculatePossibleTargets(attacker)
      .some((t) => t.x === target.position.x && t.y === target.position.y),

  checkVictoryConditions: () => {
    const state = get()
    const p1Units = state.units.filter((u) => u.playerId === 'player1' && u.hp > 0)
    const p2Units = state.units.filter((u) => u.playerId === 'player2' && u.hp > 0)
    
    console.log('Checking victory conditions:', {
      p1Units: p1Units.length,
      p2Units: p2Units.length,
      p1ControlledCubicles: state.players.find(p => p.id === 'player1')?.controlledCubicles,
      p2ControlledCubicles: state.players.find(p => p.id === 'player2')?.controlledCubicles,
      totalCubicles: state.board.flat().filter(t => t.type === TileType.CUBICLE).length,
      currentPhase: state.phase,
      winner: state.winner
    })
    
    // Check if game is already over
    if (state.phase === GamePhase.GAME_OVER) {
      console.log('Game is already over, skipping victory check')
      return
    }
    
    if (p1Units.length === 0) {
      console.log('Player 1 has no units left - Player 2 wins!')
      set({ winner: 'player2', phase: GamePhase.GAME_OVER })
      return
    }
    if (p2Units.length === 0) {
      console.log('Player 2 has no units left - Player 1 wins!')
      set({ winner: 'player1', phase: GamePhase.GAME_OVER })
      return
    }

    const VICTORY_THRESHOLD = 7
    for (const p of state.players) {
      if (p.controlledCubicles >= VICTORY_THRESHOLD) {
        console.log(`Player ${p.id} has ${p.controlledCubicles} cubicles (>= ${VICTORY_THRESHOLD}) - ${p.id} wins!`)
        set({ winner: p.id, phase: GamePhase.GAME_OVER })
        return
      }
    }
  },

  // Ability system methods
  selectAbility: (abilityId: string) => {
    const state = get()
    if (!state.selectedUnit) return
    
    console.log('selectAbility called:', {
      abilityId,
      unitId: state.selectedUnit.id,
      currentAbility: state.selectedAbility
    })
    
    // CRITICAL: Clear ALL movement state first
    set({ 
      possibleMoves: [],
      possibleTargets: [],
      highlightedTiles: new Map(),
      selectedAbility: abilityId,
      targetingMode: !!abilityId
    })
    
    // Then calculate and set ONLY ability highlights
    if (abilityId) {
      const ability = ABILITIES[abilityId]
      if (ability) {
        const validTargets = getValidTargets(state.selectedUnit, ability, state.board)
        const abilityHighlights = new Map<string, string>()
        
        validTargets.forEach(target => {
          if ('x' in target) {
            abilityHighlights.set(`${target.x},${target.y}`, 'ability')
          } else {
            abilityHighlights.set(`${target.position.x},${target.position.y}`, 'ability')
          }
        })
        
        console.log('selectAbility called:', {
          abilityId,
          validTargets: validTargets.length,
          highlightCount: abilityHighlights.size
        })
        
        // Update ONLY with ability highlights
        set({ highlightedTiles: abilityHighlights })
      }
    }
  },

  useAbility: (unitId: string, abilityId: string, target?: Unit | Coordinate) => {
    const state = get()
    const unit = state.units.find(u => u.id === unitId)
    if (!unit) return

    // Import ability system
    const ability = ABILITIES[abilityId]
    
    if (!ability || !canUseAbility(unit, abilityId)) return
    
    // Execute ability effect
    const result = ability.effect(unit, target)
    if (result.success) {
      // Apply ability effects
      if (result.statusApplied) {
        // Apply status effects to target
        if (target && 'id' in target) {
          const targetUnit = target as Unit
          const updatedUnits = state.units.map(u => 
            u.id === targetUnit.id 
              ? { ...u, status: [...u.status, ...result.statusApplied!] }
              : u
          )
          set({ units: updatedUnits })
        }
      }
      
      if (result.damageDealt && target && 'id' in target) {
        // Apply damage to target
        const targetUnit = target as Unit
        const updatedUnits = state.units.map(u => 
          u.id === targetUnit.id 
            ? { ...u, hp: Math.max(0, u.hp - result.damageDealt!) }
            : u
        )
        set({ units: updatedUnits })
      }
      
      if (result.healingDone && target && 'id' in target) {
        // Apply healing to target
        const targetUnit = target as Unit
        const updatedUnits = state.units.map(u => 
          u.id === targetUnit.id 
            ? { ...u, hp: Math.min(u.maxHp, u.hp + result.healingDone!) }
            : u
        )
        set({ units: updatedUnits })
      }
      
      if (result.actionBonus) {
        // Grant bonus actions
        const updatedUnits = state.units.map(u => 
          u.id === unitId 
            ? { ...u, actionsRemaining: u.actionsRemaining + result.actionBonus! }
            : u
        )
        set({ units: updatedUnits })
      }
      
      // Set cooldown
      if (ability.cooldown > 0) {
        const updatedUnits = state.units.map(u => 
          u.id === unitId 
            ? { 
                ...u, 
                abilityCooldowns: { 
                  ...u.abilityCooldowns, 
                  [abilityId]: ability.cooldown 
                } 
              }
            : u
        )
        set({ units: updatedUnits })
      }
      
      // Consume action points
      const updatedUnits = state.units.map(u => 
        u.id === unitId 
          ? { ...u, actionsRemaining: u.actionsRemaining - ability.cost }
          : u
      )
      
      // Get the updated unit to recalculate moves and targets
      const updatedUnit = updatedUnits.find(u => u.id === unitId)!
      
      // Recalculate possible moves and targets for the updated unit
      const moves = state.calculatePossibleMoves(updatedUnit)
      const targets = state.calculatePossibleTargets(updatedUnit)
      
      const highlights = new Map<string, string>()
      moves.forEach((m) => highlights.set(`${m.x},${m.y}`, 'movement'))
      targets.forEach((t) => highlights.set(`${t.x},${t.y}`, 'attack'))

      // Emit action completed event
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('actionCompleted', {
          detail: { actionType: 'ability', unitId, abilityId, remainingActions: updatedUnit.actionsRemaining }
        })
        window.dispatchEvent(event)
      }

      set({ 
        units: updatedUnits,
        selectedUnit: updatedUnit,
        possibleMoves: moves,
        possibleTargets: targets,
        highlightedTiles: highlights,
        selectedAbility: undefined,
        targetingMode: false
      })
    }
  },

  getAbilityTargets: (unitId: string, abilityId: string) => {
    const state = get()
    const unit = state.units.find(u => u.id === unitId)
    if (!unit) return []
    
    return getValidTargets(unit, ABILITIES[abilityId], state.board)
  },

  canUseAbility: (unitId: string, abilityId: string) => {
    const state = get()
    const unit = state.units.find(u => u.id === unitId)
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
    const state = get();
    const enemies: Unit[] = [];
    for (const enemy of state.units) {
      if (enemy.playerId !== unit.playerId) {
        const distance = Math.abs(enemy.position.x - unit.position.x) + Math.abs(enemy.position.y - unit.position.y);
        if (distance <= unit.attackRange) {
          enemies.push(enemy);
        }
      }
    }
    return enemies;
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

function createBoard(): Tile[][] {
  const width = 8
  const height = 10
  const board: Tile[][] = []
  for (let y = 0; y < height; y++) {
    const row: Tile[] = []
    for (let x = 0; x < width; x++) {
      let type: TileType = TileType.NORMAL
      if (y === 0 && x <= 1) type = TileType.HQ_BLUE
      if (y === height - 1 && x >= width - 2) type = TileType.HQ_RED
      if (y >= 2 && y <= height - 3 && x >= 2 && x <= width - 3) {
        if ((x + y) % 2 === 0) type = TileType.CUBICLE
      }
      if ((x === 3 && y === 5) || (x === 4 && y === 4)) type = TileType.OBSTACLE
      
      const tile = { x, y, type }
      if (type === TileType.CUBICLE) {
        console.log('Created cubicle tile at:', { x, y, type })
      }
      row.push(tile)
    }
    board.push(row)
  }
  
  // Log all cubicle positions
  const cubicles = board.flat().filter(t => t.type === TileType.CUBICLE)
  console.log('Board created with cubicles at:', cubicles.map(t => ({ x: t.x, y: t.y, owner: t.owner })))
  
  return board
}

function createPlayers(): Player[] {
  return [
    { id: 'player1', name: 'Blue Team', team: 'blue' as any, budget: 10, income: 0, controlledCubicles: 0 },
    { id: 'player2', name: 'Red Team', team: 'red' as any, budget: 10, income: 0, controlledCubicles: 0 },
  ]
}

function createInitialUnits(): Unit[] {
  return [
    { 
      id: 'blue-intern-1', 
      playerId: 'player1', 
      position: { x: 0, y: 1 }, 
      ...UNIT_STATS[UnitType.INTERN], 
      actionsRemaining: 2, 
      status: [], 
      hasMoved: false, 
      hasAttacked: false,
      abilities: UNIT_STATS[UnitType.INTERN].abilities,
      abilityCooldowns: {}
    },
    { 
      id: 'blue-secretary-1', 
      playerId: 'player1', 
      position: { x: 1, y: 1 }, 
      ...UNIT_STATS[UnitType.SECRETARY], 
      actionsRemaining: 2, 
      status: [], 
      hasMoved: false, 
      hasAttacked: false,
      abilities: UNIT_STATS[UnitType.SECRETARY].abilities,
      abilityCooldowns: {}
    },
    { 
      id: 'red-intern-1', 
      playerId: 'player2', 
      position: { x: 7, y: 8 }, 
      ...UNIT_STATS[UnitType.INTERN], 
      actionsRemaining: 2, 
      status: [], 
      hasMoved: false, 
      hasAttacked: false,
      abilities: UNIT_STATS[UnitType.INTERN].abilities,
      abilityCooldowns: {}
    },
    { 
      id: 'red-secretary-1', 
      playerId: 'player2', 
      position: { x: 6, y: 8 }, 
      ...UNIT_STATS[UnitType.SECRETARY], 
      actionsRemaining: 2, 
      status: [], 
      hasMoved: false, 
      hasAttacked: false,
      abilities: UNIT_STATS[UnitType.SECRETARY].abilities,
      abilityCooldowns: {}
    },
  ]
}

// function isAdjacent(a: Coordinate, b: Coordinate): boolean {
//   const result = Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1
//   console.log('isAdjacent check:', { a, b, result, distance: Math.abs(a.x - b.x) + Math.abs(a.y - b.y) })
//   return result
// }

function calculateDamage(attacker: Unit, _target: Unit): number {
  // Base damage is the attacker's attack damage
  const baseDamage = attacker.attackDamage
  
  // Simple damage calculation - can be enhanced later
  // For now, just return the base damage, ensuring it's at least 1
  return Math.max(1, baseDamage)
}

// Test helper function to create a new game store instance
export function createGameStore() {
  // Reset the store to initial state
  useGameStore.getState().returnToMenu()
  
  // Return the store methods for testing
  return {
    // Get current state
    get gameMode() { return useGameStore.getState().gameMode },
    get units() { return useGameStore.getState().units },
    get board() { return useGameStore.getState().board },
    get players() { return useGameStore.getState().players },
    get currentPlayerId() { return useGameStore.getState().currentPlayerId },
    get turnNumber() { return useGameStore.getState().turnNumber },
    get phase() { return useGameStore.getState().phase },
    get selectedUnit() { return useGameStore.getState().selectedUnit },
    get winner() { return useGameStore.getState().winner },
    get selectedAbility() { return useGameStore.getState().selectedAbility },
    get targetingMode() { return useGameStore.getState().targetingMode },
    get draftState() { return useGameStore.getState().draftState },

    
    // Settable properties for testing
    set currentPlayerId(value: string) { 
      useGameStore.setState({ currentPlayerId: value })
    },
    set units(value: Unit[]) { 
      useGameStore.setState({ units: value })
    },
    set winner(value: string | undefined) { 
      useGameStore.setState({ winner: value })
    },
    
    // Store methods
    initializeGame: useGameStore.getState().initializeGame,
    setGameMode: useGameStore.getState().setGameMode,
    setCurrentPlayerId: useGameStore.getState().setCurrentPlayerId,
    setUnits: useGameStore.getState().setUnits,
    selectUnit: useGameStore.getState().selectUnit,
    getUnitAt: useGameStore.getState().getUnitAt,
    getTileAt: useGameStore.getState().getTileAt,
    calculatePossibleMoves: useGameStore.getState().calculatePossibleMoves,
    isValidMove: useGameStore.getState().isValidMove,
    moveUnit: useGameStore.getState().moveUnit,
    calculatePossibleTargets: useGameStore.getState().calculatePossibleTargets,
    isValidAttack: useGameStore.getState().isValidAttack,
    attackTarget: useGameStore.getState().attackTarget,
    selectAbility: useGameStore.getState().selectAbility,
    getAbilityTargets: useGameStore.getState().getAbilityTargets,
    canUseAbility: useGameStore.getState().canUseAbility,
    useAbility: useGameStore.getState().useAbility,
    captureCubicle: useGameStore.getState().captureCubicle,
    endTurn: useGameStore.getState().endTurn,
    executeAITurn: useGameStore.getState().executeAITurn,
    checkVictoryConditions: useGameStore.getState().checkVictoryConditions,
    initializeDraft: useGameStore.getState().initializeDraft,
    addUnitToDraft: useGameStore.getState().addUnitToDraft,
    removeUnitFromDraft: useGameStore.getState().removeUnitFromDraft,
    confirmDraft: useGameStore.getState().confirmDraft,
    returnToMenu: useGameStore.getState().returnToMenu
  } as any // Use 'as any' to bypass strict typing for test helper
}




