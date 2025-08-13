import { useState } from 'react'
import { useGameStore } from '../stores/gameStore'
import Hero from "./layout/Hero"
import { HowItWorksModal } from './HowItWorksModal'

export function MainMenu() {
  const { initializeDraft, setGameMode, initializeGame } = useGameStore()
  const [showHowItWorks, setShowHowItWorks] = useState(false)

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
        <div className="text-center space-y-8 sm:space-y-12 max-w-4xl mx-auto">
          {/* Game Title */}
          <div className="space-y-4 sm:space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-blue-400 hero-title leading-tight px-4">
              HRmageddon
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-slate-200 max-w-2xl mx-auto leading-relaxed px-4">
              Wage cubicle warfare for control of the office floor in this tactical strategy game
            </p>
          </div>

          {/* Game Mode Selection */}
          <div className="space-y-4 sm:space-y-6 px-4">
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-200">Select Game Mode</h2>
            
            <div className="flex flex-col gap-4 sm:gap-6 justify-center">
              {/* Quick Start (for testing) */}
              <button
                onClick={handleQuickStart}
                className="px-6 sm:px-10 py-4 sm:py-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-green-500/30 min-h-[60px] sm:min-h-[80px]"
              >
                <div className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2">Quick Start</div>
                <div className="text-xs sm:text-sm opacity-90">Skip Draft & Test Game</div>
              </button>

              {/* Player vs AI */}
              <button
                onClick={() => handleStartGame('ai')}
                className="px-6 sm:px-10 py-4 sm:py-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-blue-500/30 min-h-[60px] sm:min-h-[80px]"
              >
                <div className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2">Player vs AI</div>
                <div className="text-xs sm:text-sm opacity-90">Single Player Experience</div>
              </button>

              {/* Player vs Player (Disabled) */}
              <button
                disabled
                className="px-6 sm:px-10 py-4 sm:py-6 bg-slate-600 text-slate-400 font-semibold rounded-xl cursor-not-allowed opacity-50 border-2 border-slate-500/30 min-h-[60px] sm:min-h-[80px]"
              >
                <div className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2">Player vs Player</div>
                <div className="text-xs sm:text-sm">Multiplayer (Coming Soon)</div>
              </button>
            </div>
          </div>

          {/* Game Info & How It Works */}
          <div className="space-y-4 px-4">
            <div className="text-sm text-slate-400 space-y-3 bg-slate-800/50 backdrop-blur-modern rounded-xl p-4 border border-slate-700/30">
              <p className="font-medium">Phase 1 Prototype - Core Game Engine</p>
              <p>Turn-based tactical combat with office-themed units</p>
            </div>

            {/* How It Works Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowHowItWorks(true)}
                className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl border-2 border-slate-600/30 min-h-[56px]"
              >
                <div className="text-lg font-semibold">📖 How It Works</div>
                <div className="text-sm opacity-90">Learn the game rules & controls</div>
              </button>
            </div>
          </div>
        </div>
      </Hero>
      
      {/* How It Works Modal */}
      <HowItWorksModal 
        isOpen={showHowItWorks} 
        onClose={() => setShowHowItWorks(false)} 
      />
    </div>
  )
}
