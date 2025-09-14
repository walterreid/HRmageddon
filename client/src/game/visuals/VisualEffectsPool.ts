import Phaser from 'phaser'
import { type Unit, type Coordinate } from 'shared'

export interface PooledGraphics {
  graphics: Phaser.GameObjects.Graphics
  isActive: boolean
  effectType: string
  tween?: Phaser.Tweens.Tween
}

export class VisualEffectsPool {
  private pools: Map<string, PooledGraphics[]> = new Map()
  private scene: Phaser.Scene
  private maxPoolSize: number = 20

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.initializePools()
  }

  private initializePools() {
    // Initialize pools for different effect types
    const effectTypes = [
      'coffee_steam',
      'pink_slip_flash', 
      'paper_flying',
      'harass_aura',
      'overtime_glow',
      'paperclip_rain',
      'peace_aura',
      'hack_glitch',
      'tech_repair',
      'audit_glow',
      'money_sparkle',
      'legal_document',
      'shield_aura',
      'executive_aura',
      'restructure_blast'
    ]

    effectTypes.forEach(type => {
      this.pools.set(type, [])
    })
  }

  private createGraphicsForEffect(effectType: string): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics()
    
    // Configure graphics based on effect type
    switch (effectType) {
      case 'coffee_steam':
        graphics.fillStyle(0x8B4513, 0.6)
        graphics.fillCircle(0, 0, 3)
        break
      case 'pink_slip_flash':
        graphics.fillStyle(0xff0000, 0.8)
        graphics.fillRect(-20, -20, 40, 40)
        break
      case 'paper_flying':
        graphics.fillStyle(0xffffff, 0.8)
        graphics.fillRect(-5, -8, 10, 16)
        break
      case 'harass_aura':
        graphics.lineStyle(2, 0xff6b6b, 0.8)
        graphics.strokeCircle(0, 0, 20)
        break
      case 'overtime_glow':
        graphics.fillStyle(0xffa500, 0.6)
        graphics.fillCircle(0, 0, 15)
        break
      case 'paperclip_rain':
        graphics.fillStyle(0xc0c0c0, 0.8)
        graphics.fillRect(-2, -6, 4, 12)
        break
      case 'peace_aura':
        graphics.fillStyle(0x90EE90, 0.6)
        graphics.fillCircle(0, 0, 18)
        break
      case 'hack_glitch':
        graphics.fillStyle(0x00ff00, 0.7)
        graphics.fillRect(-10, -10, 20, 20)
        break
      case 'tech_repair':
        graphics.fillStyle(0x4169E1, 0.6)
        graphics.fillCircle(0, 0, 12)
        break
      case 'audit_glow':
        graphics.fillStyle(0xffff00, 0.6)
        graphics.fillCircle(0, 0, 16)
        break
      case 'money_sparkle':
        graphics.fillStyle(0xffd700, 0.8)
        graphics.fillCircle(0, 0, 4)
        break
      case 'legal_document':
        graphics.fillStyle(0xffffff, 0.9)
        graphics.fillRect(-8, -12, 16, 24)
        break
      case 'shield_aura':
        graphics.lineStyle(3, 0x87CEEB, 0.8)
        graphics.strokeCircle(0, 0, 25)
        break
      case 'executive_aura':
        graphics.fillStyle(0xffd700, 0.7)
        graphics.fillCircle(0, 0, 30)
        break
      case 'restructure_blast':
        graphics.fillStyle(0xff4500, 0.8)
        graphics.fillCircle(0, 0, 35)
        break
    }

    return graphics
  }

  getEffect(effectType: string): PooledGraphics | null {
    const pool = this.pools.get(effectType)
    if (!pool) return null

    // Find an inactive effect
    let pooledEffect = pool.find(effect => !effect.isActive)
    
    if (!pooledEffect) {
      // Create new effect if pool is not full
      if (pool.length < this.maxPoolSize) {
        const graphics = this.createGraphicsForEffect(effectType)
        pooledEffect = {
          graphics,
          isActive: false,
          effectType
        }
        pool.push(pooledEffect)
      } else {
        // Reuse the oldest effect if pool is full
        pooledEffect = pool[0]
        this.returnEffect(pooledEffect)
      }
    }

    pooledEffect.isActive = true
    pooledEffect.graphics.setVisible(true)
    pooledEffect.graphics.setAlpha(1)
    pooledEffect.graphics.setScale(1)
    
    return pooledEffect
  }

  returnEffect(effect: PooledGraphics) {
    if (!effect.isActive) return

    effect.isActive = false
    effect.graphics.setVisible(false)
    
    // Stop any running tweens
    if (effect.tween) {
      effect.tween.stop()
      effect.tween = undefined
    }

    // Reset position and properties
    effect.graphics.setPosition(0, 0)
    effect.graphics.setAlpha(1)
    effect.graphics.setScale(1)
  }

  createCoffeeParticles(__target: Unit | Coordinate, position: { x: number, y: number }) {
    for (let i = 0; i < 8; i++) {
      const effect = this.getEffect('coffee_steam')
      if (!effect) continue

      effect.graphics.setPosition(position.x, position.y)
      
      effect.tween = this.scene.tweens.add({
        targets: effect.graphics,
        x: position.x + (Math.random() - 0.5) * 60,
        y: position.y - Math.random() * 80,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 1500,
        onComplete: () => this.returnEffect(effect)
      })
    }
  }

  createPinkSlipEffect(__target: Unit | Coordinate, position: { x: number, y: number }) {
    const effect = this.getEffect('pink_slip_flash')
    if (!effect) return

    effect.graphics.setPosition(position.x, position.y)
    
    effect.tween = this.scene.tweens.add({
      targets: effect.graphics,
      alpha: 0,
      duration: 500,
      onComplete: () => this.returnEffect(effect)
    })
  }

  createPaperEffect(__target: Unit | Coordinate, position: { x: number, y: number }) {
    for (let i = 0; i < 5; i++) {
      const effect = this.getEffect('paper_flying')
      if (!effect) continue

      effect.graphics.setPosition(position.x, position.y)
      
      effect.tween = this.scene.tweens.add({
        targets: effect.graphics,
        x: position.x + (Math.random() - 0.5) * 100,
        y: position.y + (Math.random() - 0.5) * 100,
        rotation: Math.random() * Math.PI * 2,
        alpha: 0,
        duration: 2000,
        onComplete: () => this.returnEffect(effect)
      })
    }
  }

  createHarassEffect(__target: Unit | Coordinate, position: { x: number, y: number }) {
    const effect = this.getEffect('harass_aura')
    if (!effect) return

    effect.graphics.setPosition(position.x, position.y)
    
    effect.tween = this.scene.tweens.add({
      targets: effect.graphics,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 1000,
      onComplete: () => this.returnEffect(effect)
    })
  }

  createOvertimeGlow(_target: Unit | Coordinate, position: { x: number, y: number }) {
    const effect = this.getEffect('overtime_glow')
    if (!effect) return

    effect.graphics.setPosition(position.x, position.y)
    
    effect.tween = this.scene.tweens.add({
      targets: effect.graphics,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 1200,
      onComplete: () => this.returnEffect(effect)
    })
  }

  createPaperclipRain(_target: Unit | Coordinate, position: { x: number, y: number }) {
    for (let i = 0; i < 10; i++) {
      const effect = this.getEffect('paperclip_rain')
      if (!effect) continue

      effect.graphics.setPosition(position.x, position.y)
      
      effect.tween = this.scene.tweens.add({
        targets: effect.graphics,
        x: position.x + (Math.random() - 0.5) * 120,
        y: position.y + Math.random() * 100,
        rotation: Math.random() * Math.PI * 2,
        alpha: 0,
        duration: 1500,
        onComplete: () => this.returnEffect(effect)
      })
    }
  }

  createPeaceAura(_target: Unit | Coordinate, position: { x: number, y: number }) {
    const effect = this.getEffect('peace_aura')
    if (!effect) return

    effect.graphics.setPosition(position.x, position.y)
    
    effect.tween = this.scene.tweens.add({
      targets: effect.graphics,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0,
      duration: 1500,
      onComplete: () => this.returnEffect(effect)
    })
  }

  createHackGlitch(_target: Unit | Coordinate, position: { x: number, y: number }) {
    const effect = this.getEffect('hack_glitch')
    if (!effect) return

    effect.graphics.setPosition(position.x, position.y)
    
    effect.tween = this.scene.tweens.add({
      targets: effect.graphics,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 800,
      onComplete: () => this.returnEffect(effect)
    })
  }

  createTechRepair(_target: Unit | Coordinate, position: { x: number, y: number }) {
    const effect = this.getEffect('tech_repair')
    if (!effect) return

    effect.graphics.setPosition(position.x, position.y)
    
    effect.tween = this.scene.tweens.add({
      targets: effect.graphics,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0,
      duration: 1000,
      onComplete: () => this.returnEffect(effect)
    })
  }

  createAuditGlow(_target: Unit | Coordinate, position: { x: number, y: number }) {
    const effect = this.getEffect('audit_glow')
    if (!effect) return

    effect.graphics.setPosition(position.x, position.y)
    
    effect.tween = this.scene.tweens.add({
      targets: effect.graphics,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 1200,
      onComplete: () => this.returnEffect(effect)
    })
  }

  createMoneySparkle(_target: Unit | Coordinate, position: { x: number, y: number }) {
    for (let i = 0; i < 6; i++) {
      const effect = this.getEffect('money_sparkle')
      if (!effect) continue

      effect.graphics.setPosition(position.x, position.y)
      
      effect.tween = this.scene.tweens.add({
        targets: effect.graphics,
        x: position.x + (Math.random() - 0.5) * 80,
        y: position.y + (Math.random() - 0.5) * 80,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 1000,
        onComplete: () => this.returnEffect(effect)
      })
    }
  }

  createLegalDocument(_target: Unit | Coordinate, position: { x: number, y: number }) {
    const effect = this.getEffect('legal_document')
    if (!effect) return

    effect.graphics.setPosition(position.x, position.y)
    
    effect.tween = this.scene.tweens.add({
      targets: effect.graphics,
      y: position.y - 50,
      alpha: 0,
      rotation: Math.PI * 0.1,
      duration: 1500,
      onComplete: () => this.returnEffect(effect)
    })
  }

  createShieldAura(_target: Unit | Coordinate, position: { x: number, y: number }) {
    const effect = this.getEffect('shield_aura')
    if (!effect) return

    effect.graphics.setPosition(position.x, position.y)
    
    effect.tween = this.scene.tweens.add({
      targets: effect.graphics,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0,
      duration: 1200,
      onComplete: () => this.returnEffect(effect)
    })
  }

  createExecutiveAura(_target: Unit | Coordinate, position: { x: number, y: number }) {
    const effect = this.getEffect('executive_aura')
    if (!effect) return

    effect.graphics.setPosition(position.x, position.y)
    
    effect.tween = this.scene.tweens.add({
      targets: effect.graphics,
      scaleX: 1.1,
      scaleY: 1.1,
      alpha: 0,
      duration: 2000,
      onComplete: () => this.returnEffect(effect)
    })
  }

  createRestructureBlast(_target: Unit | Coordinate, position: { x: number, y: number }) {
    const effect = this.getEffect('restructure_blast')
    if (!effect) return

    effect.graphics.setPosition(position.x, position.y)
    
    effect.tween = this.scene.tweens.add({
      targets: effect.graphics,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 1000,
      onComplete: () => this.returnEffect(effect)
    })
  }

  destroy() {
    // Clean up all pooled graphics
    this.pools.forEach(pool => {
      pool.forEach(effect => {
        if (effect.tween) {
          effect.tween.stop()
        }
        effect.graphics.destroy()
      })
    })
    this.pools.clear()
  }
}
