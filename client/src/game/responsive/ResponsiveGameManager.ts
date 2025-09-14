import Phaser from 'phaser';
import { useGameStore } from '../../stores/gameStore';
import { MAPS } from '../map/registry';

export interface ResponsiveMapConfig {
  minTileSize: number;    // 28px - mobile minimum (touch-friendly)
  maxTileSize: number;    // 64px - desktop maximum
  targetBoardScale: number; // 0.9 - use 90% of available space
  tileSizeSteps: number[]; // Discrete sizes for visual consistency
}

export const DEFAULT_CONFIG: ResponsiveMapConfig = {
  minTileSize: 28,
  maxTileSize: 64,
  targetBoardScale: 0.95, // Increased from 0.9 to 0.95 for better space utilization
  tileSizeSteps: [28, 32, 40, 48, 56, 64]
};

export function calculateOptimalTileSize(
  viewportWidth: number,
  viewportHeight: number,
  mapWidth: number = MAPS['OfficeLayout'].width, // Use config dimensions
  mapHeight: number = MAPS['OfficeLayout'].height,
  config: ResponsiveMapConfig = DEFAULT_CONFIG
): number {
  // Calculate available space for board (more aggressive space usage)
  const availableWidth = viewportWidth * config.targetBoardScale;
  const availableHeight = viewportHeight * config.targetBoardScale;
  
  // Calculate tile sizes that would fit
  const widthBasedTileSize = availableWidth / mapWidth;
  const heightBasedTileSize = availableHeight / mapHeight;
  
  // Use the smaller to ensure full board visibility
  let optimalTileSize = Math.min(widthBasedTileSize, heightBasedTileSize);
  
  // Add a small buffer to ensure the board fits comfortably
  optimalTileSize = optimalTileSize * 0.98; // 2% buffer for safety
  
  // Clamp to reasonable bounds
  optimalTileSize = Math.max(config.minTileSize, 
                            Math.min(config.maxTileSize, optimalTileSize));
  
  // Snap to nearest discrete tile size for visual consistency
  optimalTileSize = getClosestTileSize(optimalTileSize, config.tileSizeSteps);
  
  return Math.floor(optimalTileSize);
}

function getClosestTileSize(calculated: number, steps: number[]): number {
  return steps.reduce((prev, curr) => 
    Math.abs(curr - calculated) < Math.abs(prev - calculated) ? curr : prev
  );
}

export class ResponsiveGameManager {
  private game: Phaser.Game;
  private currentTileSize: number = 48;
  private config: ResponsiveMapConfig;
  private resizeTimeout?: NodeJS.Timeout;
  
  constructor(game: Phaser.Game, config: ResponsiveMapConfig = DEFAULT_CONFIG) {
    this.game = game;
    this.config = config;
    console.log('ResponsiveGameManager: Constructor called, setting up responsive handling');
    
    // Delay setup to ensure game is fully initialized
    // Increased delay to prevent timing issues with GameScene
    setTimeout(() => {
      this.setupResponsiveHandling();
    }, 1000);
  }
  
  private setupResponsiveHandling(): void {
    try {
      console.log('ResponsiveGameManager: Setting up responsive handling');
      
      // Debounced resize handler
      const handleResize = () => {
        if (this.resizeTimeout) {
          clearTimeout(this.resizeTimeout);
        }
        this.resizeTimeout = setTimeout(() => this.updateGameScale(), 100);
      };
      
      window.addEventListener('resize', handleResize);
      
      // Initial scale
      this.updateGameScale();
      
      console.log('ResponsiveGameManager: Responsive handling setup complete');
    } catch (error) {
      console.error('ResponsiveGameManager: Error setting up responsive handling:', error);
    }
  }

  private calculateOptimalTileSize(): number {
    const availableWidth = window.innerWidth - 320; // Account for control panel
    const availableHeight = window.innerHeight - 100; // Account for header
    
    // Get actual board dimensions from game state or use config fallback
    const gameState = useGameStore.getState()
    const mapWidth = gameState.board?.[0]?.length || MAPS['OfficeLayout'].width
    const mapHeight = gameState.board?.length || MAPS['OfficeLayout'].height
    
    // Calculate tile size that would fit the map in available space
    const maxTileSizeForWidth = Math.floor(availableWidth / mapWidth);
    const maxTileSizeForHeight = Math.floor(availableHeight / mapHeight);
    
    // Use the smaller of the two to ensure map fits
    let optimalTileSize = Math.min(maxTileSizeForWidth, maxTileSizeForHeight);
    
    // Apply target board scale (want to use most of available space)
    optimalTileSize = Math.floor(optimalTileSize * this.config.targetBoardScale);
    
    // Clamp to min/max bounds
    optimalTileSize = Math.max(this.config.minTileSize, Math.min(this.config.maxTileSize, optimalTileSize));
    
    // Snap to nearest step for visual consistency
    const snappedTileSize = this.getClosestTileSize(optimalTileSize);
    
    console.log(`ResponsiveGameManager: Calculation details:`);
    console.log(`  - Available space: ${availableWidth}x${availableHeight}`);
    console.log(`  - Max tile size for width: ${maxTileSizeForWidth}px`);
    console.log(`  - Max tile size for height: ${maxTileSizeForHeight}px`);
    console.log(`  - Raw optimal: ${optimalTileSize}px`);
    console.log(`  - Snapped to: ${snappedTileSize}px`);
    
    return snappedTileSize;
  }

  private getClosestTileSize(targetSize: number): number {
    let closest = this.config.tileSizeSteps[0];
    let minDifference = Math.abs(targetSize - closest);
    
    for (const step of this.config.tileSizeSteps) {
      const difference = Math.abs(targetSize - step);
      if (difference < minDifference) {
        minDifference = difference;
        closest = step;
      }
    }
    
    return closest;
  }
  
  private updateGameScale(): void {
    // Don't update if the game isn't fully initialized yet
    if (!this.game.scene.isActive('GameScene')) {
      console.log('ResponsiveGameManager: GameScene not active yet, skipping update');
      return;
    }
    
    console.log(`ResponsiveGameManager: updateGameScale called - viewport: ${window.innerWidth}x${window.innerHeight}`);
    
    const newTileSize = this.calculateOptimalTileSize();
    console.log(`ResponsiveGameManager: Calculated new tile size: ${newTileSize}px (current: ${this.currentTileSize}px)`);
    
    // Debug: Show calculation details
    const availableWidth = window.innerWidth - 320; // Account for control panel
    const availableHeight = window.innerHeight - 100; // Account for header
    const maxTilesWidth = Math.floor(availableWidth / this.config.minTileSize);
    const maxTilesHeight = Math.floor(availableHeight / this.config.minTileSize);
    console.log(`ResponsiveGameManager: Available space - Width: ${availableWidth}px, Height: ${availableHeight}px`);
    console.log(`ResponsiveGameManager: Max tiles that could fit - Width: ${maxTilesWidth}, Height: ${maxTilesHeight}`);
    console.log(`ResponsiveGameManager: Target board scale: ${this.config.targetBoardScale}`);
    
    if (newTileSize !== this.currentTileSize) {
      console.log(`ResponsiveGameManager: Tile size changed from ${this.currentTileSize}px to ${newTileSize}px, updating game`);
      this.currentTileSize = newTileSize;
      this.resizeGameBoard();
    } else {
      console.log(`ResponsiveGameManager: Tile size unchanged, no update needed`);
    }
  }
  
  private resizeGameBoard(): void {
    // Get actual board dimensions for canvas sizing
    const gameState = useGameStore.getState()
    const boardWidth = gameState.board?.[0]?.length || MAPS['OfficeLayout'].width
    const boardHeight = gameState.board?.length || MAPS['OfficeLayout'].height
    const newWidth = boardWidth * this.currentTileSize;
    const newHeight = boardHeight * this.currentTileSize;
    
    console.log(`ResponsiveGameManager: Resizing game board from ${this.game.scale.width}x${this.game.scale.height} to ${newWidth}x${newHeight}`);
    

    // Don't call Phaser scale methods when using Scale.NONE - just update the canvas directly
    // This avoids the snapTo.x error that occurs when the scale manager isn't properly initialized
    try {
      const canvas = this.game.canvas;
      if (canvas) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        canvas.style.width = `${newWidth}px`;
        canvas.style.height = `${newHeight}px`;
      }
    } catch (error) {
      console.warn('ResponsiveGameManager: Could not update canvas directly, skipping resize');
    }
    
    // Update tile sprites and positioning
    this.updateTileSprites();
    
    // Emit resize event for UI components
    window.dispatchEvent(new CustomEvent('gameBoardResized', {
      detail: { tileSize: this.currentTileSize, width: newWidth, height: newHeight }
    }));
  }
  
  private updateTileSprites(): void {
    // Get the current scene
    const scene = this.game.scene.getScene('GameScene');
    if (scene && (scene as any).updateTileSprites) {
      try {
        // Add a small delay to ensure the scene is fully ready
        setTimeout(() => {
          if (scene && (scene as any).updateTileSprites) {
            (scene as any).updateTileSprites(this.currentTileSize);
          }
        }, 100);
      } catch (error) {
        console.warn('ResponsiveGameManager: Error updating tile sprites:', error);
      }
    }
  }
  
  public getCurrentTileSize(): number {
    return this.currentTileSize;
  }
  
  public getBoardDimensions(): { width: number, height: number } {
    // Get actual board dimensions from game state
    const gameState = useGameStore.getState()
    const boardWidth = gameState.board?.[0]?.length || MAPS['OfficeLayout'].width
    const boardHeight = gameState.board?.length || MAPS['OfficeLayout'].height
    return {
      width: boardWidth * this.currentTileSize,
      height: boardHeight * this.currentTileSize
    };
  }
  
  public destroy(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    window.removeEventListener('resize', this.handleResize);
  }
  
  private handleResize = () => {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.resizeTimeout = setTimeout(() => this.updateGameScale(), 100);
  };
}
