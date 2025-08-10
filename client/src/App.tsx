import './index.css'
import { GameView } from './components/GameView'
import { GameHUD } from './components/GameHUD'
import { MainMenu } from './components/MainMenu'
import { useGameStore } from './stores/gameStore'

export default function App() {
  const { gameMode, returnToMenu } = useGameStore()

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
      <main className="p-4">
        <div className="flex gap-6 max-w-7xl mx-auto">
          {/* Left side - Game Board */}
          <div className="flex-1">
            <GameView />
          </div>
          
          {/* Right side - Game Information Panel */}
          <div className="w-80 bg-slate-800 rounded-lg border border-slate-700 p-4">
            <GameHUD />
          </div>
        </div>
      </main>
    </div>
  )
}
