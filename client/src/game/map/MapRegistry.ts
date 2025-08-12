import type { MapSpec, StartingPosition } from "./types"

export type MapStartingPositions = {
  goldTeam: StartingPosition[]
  navyTeam: StartingPosition[]
}

export class MapRegistry {
  private static instance: MapRegistry
  private maps: Map<string, MapSpec> = new Map()
  private startingPositions: Map<string, MapStartingPositions> = new Map()
  private isLoaded = false

  static getInstance(): MapRegistry {
    if (!MapRegistry.instance) {
      MapRegistry.instance = new MapRegistry()
    }
    return MapRegistry.instance
  }

  // Register a map specification
  registerMap(spec: MapSpec): void {
    this.maps.set(spec.id, spec)
  }

  // Get a map specification
  getMap(id: string): MapSpec | undefined {
    return this.maps.get(id)
  }

  // Set starting positions for a map
  setStartingPositions(mapId: string, positions: MapStartingPositions): void {
    this.startingPositions.set(mapId, positions)
  }

  // Get starting positions for a map
  getStartingPositions(mapId: string): MapStartingPositions | undefined {
    return this.startingPositions.get(mapId)
  }

  // Check if all maps are loaded
  isFullyLoaded(): boolean {
    return this.isLoaded
  }

  // Mark as fully loaded
  setLoaded(loaded: boolean): void {
    this.isLoaded = loaded
  }

  // Get all registered map IDs
  getMapIds(): string[] {
    return Array.from(this.maps.keys())
  }
}

// Global instance
export const mapRegistry = MapRegistry.getInstance()
