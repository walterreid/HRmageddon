import { useGameStore } from '../stores/gameStore'
import Hero from "./layout/Hero";

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
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Hero bgSrc="/img/home-hero-01.jpg" overlay={28} contentPosition="center">
        <div className="text-center space-y-12 max-w-4xl mx-auto">
          {/* Game Title */}
          <div className="space-y-6">
            <h1 className="text-7xl font-bold text-blue-400 hero-title leading-tight">
              HRmageddon
            </h1>
            <p className="text-2xl text-slate-200 max-w-2xl mx-auto leading-relaxed">
              Wage cubicle warfare for control of the office floor in this tactical strategy game
            </p>
          </div>

          {/* Game Mode Selection */}
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold text-slate-200">Select Game Mode</h2>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              {/* Quick Start (for testing) */}
              <button
                onClick={handleQuickStart}
                className="px-10 py-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-green-500/30"
              >
                <div className="text-2xl font-bold mb-2">Quick Start</div>
                <div className="text-sm opacity-90">Skip Draft & Test Game</div>
              </button>

              {/* Player vs AI */}
              <button
                onClick={() => handleStartGame('ai')}
                className="px-10 py-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-blue-500/30"
              >
                <div className="text-2xl font-bold mb-2">Player vs AI</div>
                <div className="text-sm opacity-90">Single Player Experience</div>
              </button>

              {/* Player vs Player (Disabled) */}
              <button
                disabled
                className="px-10 py-6 bg-slate-600 text-slate-400 font-semibold rounded-xl cursor-not-allowed opacity-50 border-2 border-slate-500/30"
              >
                <div className="text-2xl font-bold mb-2">Player vs Player</div>
                <div className="text-sm">Multiplayer (Coming Soon)</div>
              </button>
            </div>
          </div>

          {/* Game Info */}
          <div className="text-sm text-slate-400 space-y-3 bg-slate-800/50 backdrop-blur-modern rounded-xl p-4 border border-slate-700/30">
            <p className="font-medium">Phase 1 Prototype - Core Game Engine</p>
            <p>Turn-based tactical combat with office-themed units</p>
          </div>

          {/* Instructions */}
          <div className="bg-slate-800/80 backdrop-blur-modern rounded-xl p-8 max-w-2xl mx-auto border border-slate-700/50 shadow-2xl">
            <h3 className="text-xl font-semibold mb-6 text-blue-300 text-shadow-enhanced">How to Play</h3>
            <ul className="text-sm text-slate-300 space-y-3 text-left">
              <li className="flex items-start">
                <span className="text-blue-400 mr-3 mt-1">•</span>
                <span><strong>Blue Team:</strong> You control the blue units</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-400 mr-3 mt-1">•</span>
                <span><strong>Red Team:</strong> AI controls the red units</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-3 mt-1">•</span>
                <span><strong>Objective:</strong> Capture cubicles and eliminate enemy units</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-400 mr-3 mt-1">•</span>
                <span><strong>Controls:</strong> Click units to select, click tiles to move/attack</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-400 mr-3 mt-1">•</span>
                <span><strong>End Turn:</strong> Click "End Turn" when you're done</span>
              </li>
              <li className="flex items-start">
                <span className="text-pink-400 mr-3 mt-1">•</span>
                <span><strong>Abilities:</strong> Select units to see their special abilities</span>
              </li>
            </ul>
          </div>
        </div>
      </Hero>
    </div>
  )
}
