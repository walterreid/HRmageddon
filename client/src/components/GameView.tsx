import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { GameScene } from '../game/scenes/GameScene'

export function GameView() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const width = 8 * 64 + 200
    const height = 10 * 64 + 160

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#0f172a',
      scale: { width, height, mode: Phaser.Scale.NONE },
      scene: [GameScene],
      physics: { default: 'arcade' },
    })

    gameRef.current = game
    return () => {
      game.destroy(true)
      gameRef.current = null
    }
  }, [])

  return (
    <div className="rounded-md border border-slate-800 p-2 bg-slate-950 relative">
      <div ref={containerRef} />
    </div>
  )
}


