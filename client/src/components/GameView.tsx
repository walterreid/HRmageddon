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

    // Use more balanced dimensions - 50% of screen width, 70% of screen height
    // This gives more space for the game info panel
    const getGameDimensions = () => {
      const width = Math.min(window.innerWidth * 0.5, 800) // Cap at 800px for very large screens
      const height = Math.min(window.innerHeight * 0.7, 600) // Cap at 600px for very large screens
      return { width, height }
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
        height
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

    // Handle window resize for responsive canvas
    const handleResize = () => {
      if (game && game.scale) {
        const { width: newWidth, height: newHeight } = getGameDimensions()
        game.scale.resize(newWidth, newHeight)
      }
    }

    window.addEventListener('resize', handleResize)

    // Handle keyboard events for pause
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPaused(prev => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleResize)
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
    <div className="flex justify-center items-center rounded-md border border-slate-800 p-2 bg-slate-950 min-h-[500px] max-w-full">
      <div ref={containerRef} className="w-full h-full" />
      <PauseMenu 
        isPaused={isPaused}
        onResume={handleResume}
        onQuit={handleQuit}
      />
    </div>
  )
}


