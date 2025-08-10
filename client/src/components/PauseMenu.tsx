import { useState } from 'react'

interface PauseMenuProps {
  isPaused: boolean
  onResume: () => void
  onQuit: () => void
}

export function PauseMenu({ isPaused, onResume, onQuit }: PauseMenuProps) {
  const [showInstructions, setShowInstructions] = useState(false)

  if (!isPaused) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-2xl mx-4">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">
          ⏸️ Game Paused
        </h2>
        
        <div className="flex flex-col gap-4">
          <button
            onClick={onResume}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            ▶️ Resume Game
          </button>
          
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            📖 {showInstructions ? 'Hide' : 'Show'} Instructions
          </button>
          
          <button
            onClick={onQuit}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            🚪 Quit to Menu
          </button>
        </div>

        {showInstructions && (
          <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-slate-600">
            <h3 className="text-xl font-semibold text-white mb-4">🎮 How to Play HRmageddon</h3>
            
            <div className="space-y-4 text-slate-300">
              <div>
                <h4 className="font-semibold text-white">🎯 Objective</h4>
                <p>Capture cubicles and eliminate enemy units to control the office floor!</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-white">🎲 Turn System</h4>
                <p>Each turn you have action points to move units and attack enemies. Units can move and attack once per turn.</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-white">👥 Your Units</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><span className="text-blue-400">🔵 Blue Units</span> - These are YOUR units</li>
                  <li><span className="text-red-400">🔴 Red Units</span> - These are ENEMY units</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-white">🎮 Controls</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Click a unit</strong> to select it (highlighted in yellow)</li>
                  <li><strong>Click a tile</strong> to move the selected unit there</li>
                  <li><strong>Click an enemy</strong> to attack (if in range)</li>
                  <li><strong>Press ESC</strong> to pause/unpause</li>
                  <li><strong>Press SPACE</strong> to end your turn</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-white">💰 Resources</h4>
                <p>Capture cubicles (gray tiles) to earn income each turn. Use this to buy new units!</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-white">🏆 Victory</h4>
                <p>Win by eliminating all enemy units or capturing their headquarters (HQ tile).</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-white">💡 Tips</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Use cover and obstacles to your advantage</li>
                  <li>Capture cubicles early to build income</li>
                  <li>Focus fire on weak enemy units</li>
                  <li>Don't forget to end your turn when done!</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-4 text-center text-slate-400 text-sm">
          Press <kbd className="bg-slate-700 px-2 py-1 rounded">ESC</kbd> to resume
        </div>
      </div>
    </div>
  )
}
