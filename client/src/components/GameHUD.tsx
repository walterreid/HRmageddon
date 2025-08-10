import { useGameStore } from '../stores/gameStore'

export function GameHUD() {
  const { currentPlayerId, players, turnNumber, selectedUnit, endTurn } = useGameStore()
  const isPlayerTurn = currentPlayerId === 'player1'
  const player1 = players.find((p) => p.id === 'player1')
  const player2 = players.find((p) => p.id === 'player2')

  return (
    <div className="space-y-6">
      {/* Game Status */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-center">Game Status</h2>
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Turn {turnNumber}</div>
          <div className={`px-4 py-2 rounded-lg text-white font-semibold ${isPlayerTurn ? 'bg-blue-600' : 'bg-red-600'}`}>
            {isPlayerTurn ? 'Your Turn (Blue)' : 'AI Turn (Red)'}
          </div>
        </div>
      </div>

      {/* Player Resources */}
      <div className="space-y-3">
        <h3 className="text-md font-semibold text-center">Resources</h3>
        
        {/* Player 1 (Blue) */}
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
          <div className="text-blue-300 font-semibold text-sm">Blue Team (You)</div>
          <div className="text-xs space-y-1 mt-2">
            <div>Budget: ${player1?.budget || 0}</div>
            <div>Income: +${player1?.income || 0}/turn</div>
            <div>Cubicles: {player1?.controlledCubicles || 0}</div>
          </div>
        </div>

        {/* Player 2 (Red) */}
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
          <div className="text-red-300 font-semibold text-sm">Red Team (AI)</div>
          <div className="text-xs space-y-1 mt-2">
            <div>Budget: ${player2?.budget || 0}</div>
            <div>Income: +${player2?.income || 0}/turn</div>
            <div>Cubicles: {player2?.controlledCubicles || 0}</div>
          </div>
        </div>
      </div>

      {/* End Turn Button */}
      {isPlayerTurn && (
        <div className="text-center">
          <button
            onClick={endTurn}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            End Turn
          </button>
          <p className="text-xs text-slate-400 mt-2">
            Pass control to the AI opponent
          </p>
        </div>
      )}

      {/* Selected Unit Info */}
      {selectedUnit && (
        <div className="space-y-3">
          <h3 className="text-md font-semibold text-center">Selected Unit</h3>
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="font-semibold capitalize">{selectedUnit.type.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span>HP:</span>
                <span className="font-semibold">{selectedUnit.hp}/{selectedUnit.maxHp}</span>
              </div>
              <div className="flex justify-between">
                <span>Actions:</span>
                <span className="font-semibold">{selectedUnit.actionsRemaining}/{selectedUnit.maxActions}</span>
              </div>
              <div className="flex justify-between">
                <span>Move Range:</span>
                <span className="font-semibold">{selectedUnit.moveRange}</span>
              </div>
              <div className="flex justify-between">
                <span>Attack Range:</span>
                <span className="font-semibold">{selectedUnit.attackRange}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-slate-400 space-y-2">
        <div className="bg-slate-700 rounded-lg p-3">
          <h4 className="font-semibold mb-2 text-slate-300">Controls</h4>
          <ul className="space-y-1">
            <li>• Click units to select them</li>
            <li>• Click highlighted tiles to move/attack</li>
            <li>• Capture cubicles to increase income</li>
            <li>• End turn when you're done</li>
          </ul>
        </div>
      </div>
    </div>
  )
}


