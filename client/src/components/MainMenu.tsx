import { useGameStore } from '../stores/gameStore'

export function MainMenu() {
  const { initializeDraft, setGameMode, initializeGame } = useGameStore()

  const handleStartGame = (mode: 'ai' | 'multiplayer') => {
    setGameMode(mode)
    initializeDraft()
  }

  const handleQuickStart = () => {
    setGameMode('ai')
    initializeGame()
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
      <div className="text-center space-y-8">
        {/* Game Title */}
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-blue-400">HRmageddon</h1>
          <p className="text-xl text-slate-300 max-w-md mx-auto">
            Wage cubicle warfare for control of the office floor in this tactical strategy game
          </p>
        </div>

        {/* Game Mode Selection */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-200">Select Game Mode</h2>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* Quick Start (for testing) */}
            <button
              onClick={handleQuickStart}
              className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <div className="text-xl font-bold">Quick Start</div>
              <div className="text-sm opacity-90">Skip Draft & Test Game</div>
            </button>

            {/* Player vs AI */}
            <button
              onClick={() => handleStartGame('ai')}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <div className="text-xl font-bold">Player vs AI</div>
              <div className="text-sm opacity-90">Single Player Experience</div>
            </button>

            {/* Player vs Player (Disabled) */}
            <button
              disabled
              className="px-8 py-4 bg-slate-600 text-slate-400 font-semibold rounded-lg cursor-not-allowed opacity-50"
            >
              <div className="text-xl font-bold">Player vs Player</div>
              <div className="text-sm">Multiplayer (Coming Soon)</div>
            </button>
          </div>
        </div>

        {/* Game Info */}
        <div className="text-sm text-slate-400 space-y-2">
          <p>Phase 1 Prototype - Core Game Engine</p>
          <p>Turn-based tactical combat with office-themed units</p>
        </div>

        {/* Instructions */}
        <div className="bg-slate-800 rounded-lg p-6 max-w-lg mx-auto">
          <h3 className="text-lg font-semibold mb-3 text-blue-300">How to Play</h3>
          <ul className="text-sm text-slate-300 space-y-2 text-left">
            <li>• <strong>Blue Team:</strong> You control the blue units</li>
            <li>• <strong>Red Team:</strong> AI controls the red units</li>
            <li>• <strong>Objective:</strong> Capture cubicles and eliminate enemy units</li>
            <li>• <strong>Controls:</strong> Click units to select, click tiles to move/attack</li>
            <li>• <strong>End Turn:</strong> Click "End Turn" when you're done</li>
            <li>• <strong>Abilities:</strong> Select units to see their special abilities</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
