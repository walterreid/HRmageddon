import './index.css'
import { useState, useEffect } from 'react'
import { GameView } from './components/GameView'
import { GameHUD } from './components/GameHUD'
import { MainMenu } from './components/MainMenu'
import { DraftScreen } from './components/DraftScreen'
import { LoadingScreen } from './components/LoadingScreen'
import { useGameStore } from './stores/gameStore'
import { GamePhase } from 'shared'

export default function App() {
  const { gameMode, phase, winner, returnToMenu } = useGameStore()
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-semibold">HRmageddon</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm opacity-75">
            {gameMode === 'ai' ? 'Player vs AI' : 'Multiplayer'}
          </div>
          <button
            onClick={returnToMenu}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
          >
            Main Menu
          </button>
        </div>
      </header>
      <main className="p-4 flex justify-center">
        {phase === GamePhase.DRAFT ? (
          <DraftScreen />
        ) : phase === GamePhase.GAME_OVER ? (
          <div className="w-full max-w-2xl mx-auto text-center">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
              <h2 className="text-3xl font-bold mb-4">
                Game Over!
              </h2>
              <div className="text-xl mb-6">
                {winner === 'player1' ? (
                  <span className="text-blue-400">Blue Team Wins! 🎉</span>
                ) : winner === 'player2' ? (
                  <span className="text-red-400">Red Team Wins! 🎉</span>
                ) : (
                  <span>Unknown Winner</span>
                )}
              </div>
              <button
                onClick={returnToMenu}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold transition-colors"
              >
                Return to Main Menu
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-8xl">
            <div className="flex flex-col lg:flex-row gap-8 justify-center items-center lg:items-start">
              {/* Left side - Game Board */}
              <div className="flex-shrink-0 order-2 lg:order-1">
                <GameView />
              </div>
              
              {/* Right side - Game Information Panel */}
              <div className="w-full lg:w-96 bg-slate-800 rounded-lg border border-slate-700 p-6 flex-shrink-0 order-1 lg:order-2">
                <GameHUD />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
