import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { GameScene } from '../game/scenes/GameScene'
import { PauseMenu } from './PauseMenu'
import { ResponsiveGameManager } from '../game/responsive/ResponsiveGameManager'

// Type definitions for Phaser extensions
interface ExtendedGameScene extends Phaser.Scene {
  key: string
}

interface ExtendedWindow extends Window {
  gameScene?: ExtendedGameScene
}

declare const window: ExtendedWindow

export function GameView() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const responsiveManagerRef = useRef<ResponsiveGameManager | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTileSize, setCurrentTileSize] = useState(48)



  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    // Simple initial dimensions - ResponsiveGameManager will handle the rest
    const initialWidth = 640  // 16 * 40px tiles
    const initialHeight = 480 // 12 * 40px tiles

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#0f172a',
      scale: {
        mode: Phaser.Scale.RESIZE, // Better for responsive resizing
        autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game in the container
        width: initialWidth,
        height: initialHeight,
        min: {
          width: 400,
          height: 300
        },
        max: {
          width: 1600,
          height: 1200
        }
      },
      scene: [GameScene],
      physics: { default: 'arcade' },
    })

    gameRef.current = game

    // Initialize ResponsiveGameManager after game is ready
    game.events.once('ready', () => {
      console.log('Game ready, initializing ResponsiveGameManager')
      responsiveManagerRef.current = new ResponsiveGameManager(game)
      
      // Also try to attach GameScene when game is ready
      const readyScene = game.scene.getScene('GameScene') as ExtendedGameScene
      if (readyScene && !window.gameScene) {
        attachGameScene(readyScene, 'game ready event')
      }
    })

    // Multiple ways to detect when GameScene is ready
    const attachGameScene = (scene: ExtendedGameScene, method: string) => {
      if (scene && scene.key === 'GameScene') {
        console.log(`GameScene ready via ${method}, attaching to window.gameScene`)
        window.gameScene = scene
        return true
      }
      return false
    }

    // Method 1: Listen for scene start
    game.events.once('scene-start', (scene: Phaser.Scene) => {
      attachGameScene(scene as ExtendedGameScene, 'scene-start event')
    })

    // Method 2: Listen for scene wake
    game.events.once('scene-wake', (scene: Phaser.Scene) => {
      attachGameScene(scene as ExtendedGameScene, 'scene-wake event')
    })

    // Method 3: Try immediate access
    const immediateScene = game.scene.getScene('GameScene') as ExtendedGameScene
    if (immediateScene) {
      attachGameScene(immediateScene, 'immediate access')
    }

    // Method 4: Fallback timer - check every 100ms for up to 5 seconds
    let attempts = 0
    const maxAttempts = 50
    const checkScene = () => {
      attempts++
      const scene = game.scene.getScene('GameScene') as ExtendedGameScene
      if (scene && !window.gameScene) {
        if (attachGameScene(scene, `fallback timer (attempt ${attempts})`)) {
          return // Success!
        }
      }
      
      if (attempts < maxAttempts) {
        setTimeout(checkScene, 100)
      } else {
        console.warn('GameScene not available after 5 seconds - action menu may not work')
        // Try one more time with a different approach
        const finalScene = game.scene.getScene('GameScene') as ExtendedGameScene
        if (finalScene) {
          console.log('Final attempt: Found GameScene, forcing attachment')
          window.gameScene = finalScene
        }
      }
    }
    
    // Start the fallback check
    setTimeout(checkScene, 100)



    // NOTE: ResponsiveGameManager now handles all game resizing
    // The old resize handler has been removed to prevent conflicts
    
    // Handle keyboard events for pause
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPaused(prev => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    // Add event listener for ResponsiveGameManager
    const handleGameBoardResized = (event: CustomEvent) => {
      const { tileSize: newTileSize, width, height } = event.detail
      console.log(`GameView: Game board resized to ${width}x${height}, tile size: ${newTileSize}px`)
      setCurrentTileSize(newTileSize)
    }

    window.addEventListener('gameBoardResized', handleGameBoardResized as EventListener)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('gameBoardResized', handleGameBoardResized as EventListener)
      
      // Clean up ResponsiveGameManager
      responsiveManagerRef.current?.destroy()
      responsiveManagerRef.current = null
      
      game.destroy(true)
      gameRef.current = null
    }
  }, [])

  const handleResume = () => {
    setIsPaused(false)
  }

  const handleQuit = () => {
    // For now, just unpause. Later this could navigate to main menu
    setIsPaused(false)
  }

  return (
    <div className="flex justify-center items-center rounded-md border border-slate-800 p-2 bg-slate-950 w-full h-full">
      <div 
        ref={containerRef} 
        className="relative flex justify-center items-center"
        style={{ 
          width: '100%',
          height: '100%',
          minHeight: '400px'
        }}
      />
      
      {/* Debug info for responsive testing */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 bg-slate-800 text-slate-200 text-xs p-2 rounded border border-slate-600">
          <div>Tile Size: {currentTileSize}px</div>
          <div>Board: {gameRef.current?.scale.width || 0}×{gameRef.current?.scale.height || 0}</div>
          <div>Screen: {window.innerWidth}×{window.innerHeight}</div>
          <div>Map: 16×12 tiles</div>
          <div>Expected: {16 * currentTileSize}×{12 * currentTileSize}px</div>
          <button 
            onClick={() => {
              if (responsiveManagerRef.current) {
                console.log('GameView: Manually testing ResponsiveGameManager');
                const tileSize = responsiveManagerRef.current.getCurrentTileSize();
                console.log(`GameView: Current tile size: ${tileSize}px`);
                console.log(`GameView: Expected board size: ${16 * tileSize}×${12 * tileSize}px`);
                console.log(`GameView: Actual board size: ${gameRef.current?.scale.width}×${gameRef.current?.scale.height}px`);
              } else {
                console.log('GameView: ResponsiveGameManager not initialized');
              }
            }}
            className="mt-2 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            Test Responsive
          </button>
        </div>
      )}
      
      <PauseMenu 
        isPaused={isPaused}
        onResume={handleResume}
        onQuit={handleQuit}
      />
    </div>
  )
}


