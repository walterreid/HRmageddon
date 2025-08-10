import './index.css'
import { GameView } from './components/GameView'
import { GameHUD } from './components/GameHUD'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-semibold">HRmageddon</h1>
        <div className="text-sm opacity-75">Phase 1 Prototype</div>
      </header>
      <main className="p-4 relative">
        <GameHUD />
        <GameView />
      </main>
    </div>
  )
}
