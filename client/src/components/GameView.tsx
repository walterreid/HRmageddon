import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { GameScene } from '../game/scenes/GameScene'
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


