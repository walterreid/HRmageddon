import './index.css'
import { useState, useEffect } from 'react'
import { GameView } from './components/GameView'
import { GameHUD } from './components/GameHUD'
import { MainMenu } from './components/MainMenu'
import { DraftScreen } from './components/DraftScreen'
import { LoadingScreen } from './components/LoadingScreen'
import { TileSizeTestPage } from './components/test/TileSizeTestPage'
import { useGameStore } from './stores/gameStore'
import { usePlayerStore } from './stores/playerStore'
import { GamePhase } from 'shared'

export default function App() {
  const { gameMode, returnToMenu } = useGameStore()
  const { phase, winner } = usePlayerStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate initial loading time
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleLoadingComplete = () => {
    setIsLoading(false)
  }

  // Show loading screen first
  if (isLoading) {
    return <LoadingScreen onLoadingComplete={handleLoadingComplete} minDisplayTime={2000} />
  }

  // Show main menu if not in a game
  if (gameMode === 'menu') {
    return <MainMenu />
  }

  // Show test page if in test mode
  if (gameMode === 'test') {
    return <TileSizeTestPage />
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header - Responsive with mobile optimizations */}
      <header className="px-4 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-semibold text-center sm:text-left">HRmageddon</h1>
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <div className="text-sm opacity-75 text-center sm:text-left">
            {gameMode === 'ai' ? 'Player vs AI' : 'Multiplayer'}
          </div>
          <button
            onClick={returnToMenu}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors w-full sm:w-auto"
          >
            Main Menu
          </button>
        </div>
      </header>

      <main className="p-2 sm:p-4">
        {phase === GamePhase.DRAFT ? (
          <DraftScreen />
        ) : phase === GamePhase.GAME_OVER ? (
          <div className="w-full max-w-2xl mx-auto text-center">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                Game Over!
              </h2>
              <div className="text-lg sm:text-xl mb-6">
                {winner?.id === 'player1' ? (
                  <span className="text-blue-400">Blue Team Wins! 🎉</span>
                ) : winner?.id === 'player2' ? (
                  <span className="text-red-400">Red Team Wins! 🎉</span>
                ) : (
                  <span>Unknown Winner</span>
                )}
              </div>
              <button
                onClick={returnToMenu}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold transition-colors w-full sm:w-auto"
              >
                Return to Main Menu
              </button>
            </div>
          </div>
        ) : (
          /* Game Layout - Mobile-first responsive design */
          <div className="w-full">
            {/* Mobile Layout: Stacked (Game Board on top, UI below) */}
            <div className="flex flex-col lg:hidden gap-4">
              {/* Game Board - Full width on mobile */}
              <div className="w-full flex justify-center">
                <GameView />
              </div>
              
              {/* Mobile GameHUD - Will be converted to bottom sheet */}
              <div className="w-full bg-slate-800 rounded-lg border border-slate-700 p-4">
                <GameHUD />
              </div>
            </div>
            
            {/* Desktop Layout: Flash Game Style (Game Board prioritized, integrated control panel) */}
            <div className="hidden lg:flex h-[calc(100vh-120px)] bg-slate-900 rounded-lg border-2 border-slate-700 overflow-hidden">
              {/* Left: Expanded Game Board - Scales with available space */}
              <div className="flex-1 p-4 flex items-center justify-center min-w-0">
                <GameView />
              </div>
              
              {/* Right: Unified Control Panel - Flash Game Style */}
              <div className="w-80 xl:w-96 bg-slate-800 border-l-2 border-slate-700 flex flex-col">
                <GameHUD />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
