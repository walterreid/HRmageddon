import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { GameScene } from '../game/scenes/GameScene'
import { PauseMenu } from './PauseMenu'
import { ResponsiveGameManager, DEFAULT_CONFIG } from '../game/responsive/ResponsiveGameManager'

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

  // Initialize ResponsiveGameManager after game is created
  const initResponsiveManager = () => {
    if (gameRef.current && !responsiveManagerRef.current) {
      console.log('GameView: Initializing ResponsiveGameManager');
      try {
        responsiveManagerRef.current = new ResponsiveGameManager(gameRef.current, DEFAULT_CONFIG);
        console.log('GameView: ResponsiveGameManager initialized successfully');
        
        // Listen for tile size changes
        window.addEventListener('gameBoardResized', ((event: CustomEvent) => {
          const { tileSize } = event.detail;
          setCurrentTileSize(tileSize);
          console.log(`GameView: Tile size updated to ${tileSize}px`);
        }) as EventListener);
      } catch (error) {
        console.error('GameView: Failed to initialize ResponsiveGameManager:', error);
      }
    } else {
      console.log('GameView: ResponsiveGameManager already exists or game not ready');
    }
  };

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    // Mobile-first responsive game dimensions
    const getGameDimensions = () => {
      const isMobile = window.innerWidth < 1024 // lg breakpoint
      
      if (isMobile) {
        // Mobile: Keep existing mobile logic
        const width = Math.min(window.innerWidth * 0.9, 400)
        const height = width * (12 / 16)
        return { width, height }
      } else {
        // Desktop: Use available space more effectively for Flash game aesthetic
        const panelWidth = window.innerWidth >= 1280 ? 384 : 320 // xl:w-96 vs w-80
        const availableWidth = window.innerWidth - panelWidth - 64 // Account for padding and borders
        const availableHeight = window.innerHeight - 120 // Account for header and padding
        
        // Target aspect ratio for the office grid (16:12 ratio works well)
        const targetAspectRatio = 16 / 12
        
        // Calculate optimal size maintaining aspect ratio
        let optimalWidth = availableWidth * 0.95 // Use 95% of available space
        let optimalHeight = optimalWidth / targetAspectRatio
        
        // If height exceeds available space, scale down
        if (optimalHeight > availableHeight * 0.95) {
          optimalHeight = availableHeight * 0.95
          optimalWidth = optimalHeight * targetAspectRatio
        }
        
        // Set reasonable bounds for Flash game aesthetic
        const width = Math.max(600, Math.min(optimalWidth, 1400)) // Min 600px, Max 1400px
        const height = Math.max(450, Math.min(optimalHeight, 1050)) // Min 450px, Max 450px
        
        return { width, height }
      }
    }

    const { width, height } = getGameDimensions()

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#0f172a',
      scale: {
        mode: Phaser.Scale.NONE, // Let ResponsiveGameManager control sizing
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width,
        height,
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

    // Multiple ways to detect when GameScene is ready
    const attachGameScene = (scene: ExtendedGameScene, method: string) => {
      if (scene && scene.key === 'GameScene') {
        console.log(`GameScene ready via ${method}, attaching to window.gameScene`)
        window.gameScene = scene
        
        // Initialize responsive manager after scene is ready
        setTimeout(initResponsiveManager, 100);
        
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
        // Even if GameScene attachment fails, try to initialize ResponsiveGameManager
        console.log('GameView: Attempting to initialize ResponsiveGameManager despite GameScene attachment failure')
        setTimeout(initResponsiveManager, 100);
      }
    }
    
    // Start the fallback check
    setTimeout(checkScene, 100)

    // Method 5: Direct ResponsiveGameManager initialization after a delay
    // This ensures ResponsiveGameManager gets initialized even if GameScene attachment fails
    setTimeout(() => {
      if (!responsiveManagerRef.current) {
        console.log('GameView: Fallback ResponsiveGameManager initialization')
        initResponsiveManager();
      }
    }, 2000); // Wait 2 seconds as a last resort

    // NOTE: ResponsiveGameManager now handles all game resizing
    // The old resize handler has been removed to prevent conflicts
    
    // Handle keyboard events for pause
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPaused(prev => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('gameBoardResized', ((event: CustomEvent) => {
        const { tileSize } = event.detail;
        setCurrentTileSize(tileSize);
        console.log(`GameView: Tile size updated to ${tileSize}px`);
      }) as EventListener)
      
      // Clean up ResponsiveGameManager
      if (responsiveManagerRef.current) {
        responsiveManagerRef.current.destroy();
        responsiveManagerRef.current = null;
      }
      
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
        className="w-full h-full"
        style={{
          minHeight: '300px',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      />
      
      {/* Debug info for responsive testing */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 bg-slate-800 text-slate-200 text-xs p-2 rounded border border-slate-600">
          <div>Tile Size: {currentTileSize}px</div>
          <div>Board: {16 * currentTileSize}×{12 * currentTileSize}</div>
          <div>Screen: {window.innerWidth}×{window.innerHeight}</div>
          <button 
            onClick={() => {
              if (responsiveManagerRef.current) {
                console.log('GameView: Manually testing ResponsiveGameManager');
                const tileSize = responsiveManagerRef.current.getCurrentTileSize();
                console.log(`GameView: Current tile size: ${tileSize}px`);
              } else {
                console.log('GameView: ResponsiveGameManager not initialized, attempting manual initialization');
                initResponsiveManager();
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


