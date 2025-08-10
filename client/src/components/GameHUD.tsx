import { useGameStore } from '../stores/gameStore'

export function GameHUD() {
  const { currentPlayerId, players, turnNumber, selectedUnit, endTurn } = useGameStore()
  const currentPlayer = players.find((p) => p.id === currentPlayerId)
  const isPlayerTurn = currentPlayerId === 'player1'

  return (
    <div className="absolute top-0 left-0 right-0 bg-slate-900/80 text-white p-3">
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="text-lg font-bold">Turn {turnNumber}</div>
          <div className={`px-3 py-1 rounded ${isPlayerTurn ? 'bg-blue-600' : 'bg-red-600'}`}>
            {currentPlayer?.name}'s Turn
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2"><span>💰</span><span>{currentPlayer?.budget ?? 0}</span></div>
          <div className="flex items-center gap-2"><span>📈</span><span>+{currentPlayer?.income ?? 0}/turn</span></div>
          <div className="flex items-center gap-2"><span>🏢</span><span>{currentPlayer?.controlledCubicles ?? 0}</span></div>
        </div>
        <div>
          {isPlayerTurn && (
            <button onClick={endTurn} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded">
              End Turn
            </button>
          )}
        </div>
      </div>
      {selectedUnit && (
        <div className="mt-3 max-w-6xl mx-auto text-sm">
          <div className="flex items-center gap-4">
            <div className="font-semibold">{selectedUnit.type.toUpperCase()}</div>
            <div className="flex items-center gap-2">
              <span>HP:</span>
              <div className="flex gap-1">
                {Array.from({ length: selectedUnit.maxHp }).map((_, i) => (
                  <div key={i} className={`w-4 h-4 border ${i < selectedUnit.hp ? 'bg-red-500' : 'bg-gray-600'}`} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span>Actions:</span>
              <div className="flex gap-1">
                {Array.from({ length: selectedUnit.maxActions }).map((_, i) => (
                  <div key={i} className={`w-4 h-4 rounded-full ${i < selectedUnit.actionsRemaining ? 'bg-yellow-400' : 'bg-gray-600'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


