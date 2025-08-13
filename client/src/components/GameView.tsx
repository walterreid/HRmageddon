import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { GameScene } from '../game/scenes/GameScene'
import { PauseMenu } from './PauseMenu'

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
  const [isPaused, setIsPaused] = useState(false)

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
        const height = Math.max(450, Math.min(optimalHeight, 1050)) // Min 450px, Max 1050px
        
        return { width, height }
      }
    }

    const { width, height } = getGameDimensions()

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#0f172a',
      scale: {
        mode: Phaser.Scale.FIT,
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
      }
    }
    
    // Start the fallback check
    setTimeout(checkScene, 100)

    // Enhanced responsive resize handler
    const handleResize = () => {
      if (game && game.scale) {
        const { width: newWidth, height: newHeight } = getGameDimensions()
        
        // Only resize if dimensions actually changed significantly
        const currentWidth = game.scale.width
        const currentHeight = game.scale.height
        const widthDiff = Math.abs(newWidth - currentWidth)
        const heightDiff = Math.abs(newHeight - currentHeight)
        
        if (widthDiff > 10 || heightDiff > 10) {
          console.log('Resizing game:', { 
            from: { width: currentWidth, height: currentHeight }, 
            to: { width: newWidth, height: newHeight },
            screen: { width: window.innerWidth, height: window.innerHeight }
          })
          game.scale.resize(newWidth, newHeight)
        }
      }
    }

    // Debounced resize handler for better performance
    let resizeTimeout: NodeJS.Timeout
    const debouncedResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(handleResize, 100)
    }

    window.addEventListener('resize', debouncedResize)

    // Handle keyboard events for pause
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPaused(prev => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', debouncedResize)
      clearTimeout(resizeTimeout)
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
      <PauseMenu 
        isPaused={isPaused}
        onResume={handleResume}
        onQuit={handleQuit}
      />
    </div>
  )
}


