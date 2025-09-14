import { useState } from 'react'
import { TileSizeTestGame } from './TileSizeTestGame'
import { useGameStore } from '../../stores/gameStore'
import { MAPS } from '../../game/map/registry'

export function TileSizeTestPage() {
  const [selectedTileSize, setSelectedTileSize] = useState<48 | 32 | 24>(48)
  const [showTileGraphics, setShowTileGraphics] = useState(false)
  // Actions don't need selectors as they don't cause re-renders
  const returnToMenu = useGameStore(state => state.returnToMenu)

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={returnToMenu}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            ← Back to Menu
          </button>
          <h1 className="text-3xl font-bold">
            🧪 Tile Size Test Page
          </h1>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>
        
        {/* Game Board and Controls - Moved up for easier screenshot sharing */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-200">Test Game Board</h2>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showTileGraphics}
                onChange={(e) => setShowTileGraphics(e.target.checked)}
                className="w-5 h-5 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-slate-300 font-medium">
                Show Tile Graphics (Office Layout)
              </span>
            </label>
          </div>
          <TileSizeTestGame tileSize={selectedTileSize} showTileGraphics={showTileGraphics} />
        </div>
        
        <div className="text-center mb-6">
          <p className="text-lg text-slate-300 mb-4">
            Testing different tile sizes to debug responsive system
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setSelectedTileSize(48)}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                selectedTileSize === 48
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              48px Tiles
            </button>
            <button
              onClick={() => setSelectedTileSize(32)}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                selectedTileSize === 32
                  ? 'bg-green-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              32px Tiles
            </button>
            <button
              onClick={() => setSelectedTileSize(24)}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                selectedTileSize === 24
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              24px Tiles
            </button>
          </div>
          

        </div>

        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-center">
            Current Test: {selectedTileSize}px Tiles
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Board Info</h3>
              <p>Size: {MAPS['OfficeLayout'].width}×{MAPS['OfficeLayout'].height} tiles</p>
              <p>Tile Size: {selectedTileSize}px</p>
              <p>Canvas: {MAPS['OfficeLayout'].width * selectedTileSize}×{MAPS['OfficeLayout'].height * selectedTileSize}px</p>
            </div>
            
            <div className="bg-slate-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Expected Behavior</h3>
              <p>• Full board visible</p>
              <p>• Units properly sized</p>
              <p>• No clipping or overflow</p>
            </div>
            
            <div className="bg-slate-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Debug Info</h3>
              <p>• Check console logs</p>
              <p>• Verify tile rendering</p>
              <p>• Compare with responsive</p>
              <p>• Toggle tile graphics</p>
            </div>
          </div>
        </div>


        
        {/* Tile Graphics Legend */}
        {showTileGraphics && (
          <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
            <h4 className="font-semibold text-slate-200 mb-3 text-center">Tile Graphics Legend</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-300 rounded opacity-30"></div>
                <span className="text-slate-300">Cubicles</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-600 rounded opacity-60"></div>
                <span className="text-slate-300">Obstacles</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-600 rounded opacity-40"></div>
                <span className="text-slate-300">Conference Rooms</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-300 rounded opacity-20"></div>
                <span className="text-slate-300">Hallways</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
