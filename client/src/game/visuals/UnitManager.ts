import Phaser from 'phaser'
import { type Unit } from 'shared'
import { useGameStore } from '../../stores/gameStore'
import { useUnitStore } from '../../stores/unitStore'
import { useUIStore } from '../../stores/uiStore'

// Visual configuration for units
const UNIT_VISUAL_CONFIG = {
  COLORS: {
    PLAYER1: 0xf59e0b,       // Amber-500 (Corporate gold)
    PLAYER2: 0x57534e,       // Stone-600 (Corporate gray)
    HP_BAR_BG: 0x000000,     // Black (kept for contrast)
    HP_BAR_FILL: 0x16a34a,   // Green-600 (kept for healing)
    SELECTION_BORDER: 0xf59e0b, // Amber-500 (Corporate gold)
    HOVER_BORDER: 0x78716c,  // Stone-500 (Corporate gray)
  },
  UNIT: {
    CIRCLE_RADIUS: 20,
    FONT_SIZE: '14px',
    HP_BAR_WIDTH: 40,
    HP_BAR_HEIGHT: 6,
    HP_BAR_OFFSET_Y: -28,
    SELECTION_BORDER_WIDTH: 3,
    HOVER_BORDER_WIDTH: 2,
    HOVER_ALPHA: 0.9,
  },
  ANIMATION: {
    MOVEMENT_DURATION: 250,
    CLICK_SCALE_DURATION: 100,
    CLICK_SCALE_FACTOR: 0.9,
  }
}

export class UnitManager {
  private scene: Phaser.Scene
  private unitSprites: Map<string, Phaser.GameObjects.Container> = new Map()
  private tileSizePx: number
  private tileToWorld: (tx: number, ty: number) => { x: number, y: number }
  // private worldToTile: (px: number, py: number) => { x: number, y: number } // Not used in UnitManager

  constructor(scene: Phaser.Scene, tileSizePx: number, tileToWorld: (tx: number, ty: number) => { x: number, y: number }) {
    this.scene = scene
    this.tileSizePx = tileSizePx
    this.tileToWorld = tileToWorld
  }

  updateTileSize(newTileSize: number) {
    this.tileSizePx = newTileSize
    this.updateUnitSprites()
  }

  drawUnits(units: Unit[]) {
    try {
      // Remove containers that no longer exist
      this.unitSprites.forEach((container, id) => {
        if (!units.find((u) => u.id === id)) {
          container.destroy()
          this.unitSprites.delete(id)
        }
      })

      for (const unit of units) {
        const { x: wx, y: wy } = this.tileToWorld(unit.position.x, unit.position.y)
        const targetX = wx + this.tileSizePx / 2
        const targetY = wy + this.tileSizePx / 2
        const existing = this.unitSprites.get(unit.id)
        
        if (existing) {
          this.updateExistingUnit(existing, unit, targetX, targetY)
          continue
        }

        this.createNewUnit(unit, targetX, targetY)
      }
    } catch (error) {
      console.error('Error drawing units:', error)
    }
  }

  private updateExistingUnit(container: Phaser.GameObjects.Container, unit: Unit, targetX: number, targetY: number) {
    // Animate movement
    this.scene.tweens.add({ 
      targets: container, 
      x: targetX, 
      y: targetY, 
      duration: UNIT_VISUAL_CONFIG.ANIMATION.MOVEMENT_DURATION, 
      ease: 'Power2' 
    })
    
    // Update HP bar width
    const hpFill = container.getByName('hpFill') as Phaser.GameObjects.Rectangle
    if (hpFill) {
      hpFill.width = UNIT_VISUAL_CONFIG.UNIT.HP_BAR_WIDTH * (unit.hp / unit.maxHp)
    }
    
    // Update transparency for "done" state
    const circle = container.getByName('circle') as Phaser.GameObjects.Graphics
    const label = container.getByName('label') as Phaser.GameObjects.Text
    const hpBg = container.getByName('hpBg') as Phaser.GameObjects.Rectangle
    
    const alpha = unit.actionsRemaining === 0 ? 0.5 : 1.0
    if (circle) circle.setAlpha(alpha)
    if (label) label.setAlpha(alpha)
    if (hpBg) hpBg.setAlpha(alpha)
    if (hpFill) hpFill.setAlpha(alpha)
  }

  private createNewUnit(unit: Unit, targetX: number, targetY: number) {
    const container = this.scene.add.container(targetX, targetY).setDepth(50)
    const circleColor = unit.playerId === 'player1' ? UNIT_VISUAL_CONFIG.COLORS.PLAYER1 : UNIT_VISUAL_CONFIG.COLORS.PLAYER2
    
    // Create circle using add.circle() like the original code
    const circle = this.scene.add.circle(0, 0, UNIT_VISUAL_CONFIG.UNIT.CIRCLE_RADIUS, circleColor).setName('circle')
    
    const label = this.scene.add.text(0, 0, unit.type.charAt(0).toUpperCase(), { 
      color: '#fff', 
      fontSize: UNIT_VISUAL_CONFIG.UNIT.FONT_SIZE 
    }).setName('label')
    label.setOrigin(0.5)
    
    const hpBg = this.scene.add.rectangle(0, UNIT_VISUAL_CONFIG.UNIT.HP_BAR_OFFSET_Y, UNIT_VISUAL_CONFIG.UNIT.HP_BAR_WIDTH, UNIT_VISUAL_CONFIG.UNIT.HP_BAR_HEIGHT, UNIT_VISUAL_CONFIG.COLORS.HP_BAR_BG).setOrigin(0.5).setName('hpBg')
    const hpFill = this.scene.add.rectangle(-20, UNIT_VISUAL_CONFIG.UNIT.HP_BAR_OFFSET_Y, UNIT_VISUAL_CONFIG.UNIT.HP_BAR_WIDTH * (unit.hp / unit.maxHp), UNIT_VISUAL_CONFIG.UNIT.HP_BAR_HEIGHT, UNIT_VISUAL_CONFIG.COLORS.HP_BAR_FILL)
      .setOrigin(0, 0.5)
      .setName('hpFill')
    
    // Set transparency for units with no actions remaining (visual "done" state)
    if (unit.actionsRemaining === 0) {
      circle.setAlpha(0.5)
      label.setAlpha(0.5)
      hpBg.setAlpha(0.5)
      hpFill.setAlpha(0.5)
    } else {
      circle.setAlpha(1.0)
      label.setAlpha(1.0)
      hpBg.setAlpha(1.0)
      hpFill.setAlpha(1.0)
    }
    
    container.add([circle, label, hpBg, hpFill])
    
    // Make the container interactive with proper hit area
    container.setSize(this.tileSizePx, this.tileSizePx)
    container.setData('unitId', unit.id)
    
    // Enhanced interactivity for Safari compatibility
    container.setInteractive(new Phaser.Geom.Rectangle(-this.tileSizePx/2, -this.tileSizePx/2, this.tileSizePx, this.tileSizePx), Phaser.Geom.Rectangle.Contains)
    
    // Add multiple event listeners for better compatibility
    container.on('pointerdown', () => {
      // --- START OF CRITICAL FIX ---
      const uiState = useUIStore.getState()
      if (uiState.actionMode !== 'none') {
        // If we're already in an action mode (move, attack, ability),
        // let the GameScene's master handleClick handle it. Do nothing here.
        console.log('UnitManager: Click ignored, action mode is active.')
        return
      }
      // --- END OF CRITICAL FIX ---

      console.log('Unit clicked:', unit.id)
      const u = useUnitStore.getState().units.find((uu) => uu.id === unit.id)
      if (u) {
        useGameStore.getState().selectUnit(u)
      }

      // Add click feedback
      circle.setScale(UNIT_VISUAL_CONFIG.ANIMATION.CLICK_SCALE_FACTOR)
      this.scene.time.delayedCall(UNIT_VISUAL_CONFIG.ANIMATION.CLICK_SCALE_DURATION, () => {
        circle.setScale(1)
      })
    })
    
    // Add visual feedback for interactivity
    container.on('pointerover', () => {
      circle.setStrokeStyle(UNIT_VISUAL_CONFIG.UNIT.HOVER_BORDER_WIDTH, UNIT_VISUAL_CONFIG.COLORS.HOVER_BORDER, UNIT_VISUAL_CONFIG.UNIT.HOVER_ALPHA)
      circle.setAlpha(0.9)
    })
    
    container.on('pointerout', () => {
      circle.setStrokeStyle(0)
      circle.setAlpha(1)
    })
    
    this.unitSprites.set(unit.id, container)
  }

  private updateUnitSprites(): void {
    // Update all unit sprites with new tile size
    this.unitSprites.forEach((container, unitId) => {
      const unit = useUnitStore.getState().units.find((u) => u.id === unitId);
      if (unit) {
        // Update container size
        container.setSize(this.tileSizePx, this.tileSizePx);
        
        // Update interactive area
        container.setInteractive(new Phaser.Geom.Rectangle(
          -this.tileSizePx/2, 
          -this.tileSizePx/2, 
          this.tileSizePx, 
          this.tileSizePx
        ), Phaser.Geom.Rectangle.Contains);
        
        // Update position
        const { x: wx, y: wy } = this.tileToWorld(unit.position.x, unit.position.y);
        container.setPosition(wx + this.tileSizePx / 2, wy + this.tileSizePx / 2);
        
        // Update unit circle radius proportionally
        const unitCircle = container.getByName('circle') as Phaser.GameObjects.Arc; // Circle object from add.circle()
        if (unitCircle && unitCircle.setRadius) {
          const newRadius = Math.max(12, this.tileSizePx * 0.4); // Proportional radius with minimum
          unitCircle.setRadius(newRadius);
        } else {
          console.warn(`UnitManager: unitCircle not found or invalid for unit ${unitId}`);
        }
        
        // Update HP bar positioning
        const hpBar = container.getByName('hpBg') as Phaser.GameObjects.Rectangle;
        if (hpBar) {
          const hpBarWidth = Math.max(30, this.tileSizePx * 0.8);
          const hpBarHeight = Math.max(4, this.tileSizePx * 0.1);
          const hpBarOffsetY = -this.tileSizePx / 2 - 8;
          
          // HP bar will be redrawn when needed, just update positioning
          container.setData('hpBarConfig', { width: hpBarWidth, height: hpBarHeight, offsetY: hpBarOffsetY });
        }
      }
    });
  }

  getUnitSprites(): Map<string, Phaser.GameObjects.Container> {
    return this.unitSprites
  }

  destroy() {
    this.unitSprites.forEach(container => {
      if (container && container.destroy) {
        container.destroy()
      }
    })
    this.unitSprites.clear()
  }
}
