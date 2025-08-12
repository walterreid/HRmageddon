import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { GameScene } from '../game/scenes/GameScene.ts'
import { PauseMenu } from './PauseMenu'

export function GameView() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    // Mobile-first responsive game dimensions
    const getGameDimensions = () => {
      const isMobile = window.innerWidth < 768 // md breakpoint
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024 // lg breakpoint
      
      if (isMobile) {
        // Mobile: Use 90% of screen width, maintain 16:12 aspect ratio
        const width = Math.min(window.innerWidth * 0.9, 400) // Cap at 400px for very small screens
        const height = width * (12 / 16) // Maintain 16:12 aspect ratio
        return { width, height }
      } else if (isTablet) {
        // Tablet: Use 70% of screen width, maintain aspect ratio
        const width = Math.min(window.innerWidth * 0.7, 600)
        const height = width * (12 / 16)
        return { width, height }
      } else {
        // Desktop: Use 50% of screen width, 70% of screen height (preserve current experience)
        const width = Math.min(window.innerWidth * 0.5, 800)
        const height = Math.min(window.innerHeight * 0.7, 600)
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
        // Mobile-specific scale settings
        min: {
          width: 320,  // Minimum width for very small screens
          height: 240  // Minimum height for very small screens
        },
        max: {
          width: 1200, // Maximum width for very large screens
          height: 900  // Maximum height for very large screens
        }
      },
      scene: [GameScene],
      physics: { default: 'arcade' },
    })

    gameRef.current = game

    // Multiple ways to detect when GameScene is ready
    const attachGameScene = (scene: any, method: string) => {
      if (scene && scene.key === 'GameScene') {
        console.log(`GameScene ready via ${method}, attaching to window.gameScene`)
        ;(window as any).gameScene = scene
        return true
      }
      return false
    }

    // Method 1: Listen for scene start
    game.events.once('scene-start', (scene: Phaser.Scene) => {
      attachGameScene(scene, 'scene-start event')
    })

    // Method 2: Listen for scene wake
    game.events.once('scene-wake', (scene: Phaser.Scene) => {
      attachGameScene(scene, 'scene-wake event')
    })

    // Method 3: Try immediate access
    const immediateScene = game.scene.getScene('GameScene') as any
    if (immediateScene) {
      attachGameScene(immediateScene, 'immediate access')
    }

    // Method 4: Fallback timer - check every 100ms for up to 5 seconds
    let attempts = 0
    const maxAttempts = 50
    const checkScene = () => {
      attempts++
      const scene = game.scene.getScene('GameScene') as any
      if (scene && !(window as any).gameScene) {
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
    <div className="flex justify-center items-center rounded-md border border-slate-800 p-2 bg-slate-950 w-full">
      {/* Mobile-first responsive container */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{
          // Ensure minimum height for mobile
          minHeight: '300px',
          // Responsive max dimensions
          maxWidth: '100%',
          maxHeight: '100vh'
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


