import type { MapSpec } from "./types"
import { mapRegistry } from "./MapRegistry"

export const MAPS: Record<string, MapSpec> = {
  OfficeLayout: {
    id: "OfficeLayout",
    jsonKey: "office-map",
    jsonUrl: "/assets/tilemaps/OfficeLayout16x12.json",
    tilesetKey: "office-tiles",
    tilesetUrl: "/assets/tilesets/inside.png",
    tilesetName: "OfficeLayout",   // <-- set to the exact TSX tileset name
    backgroundLayerName: "Background",
    foregroundLayerName: "Foreground",
    capturePointsLayerName: "CapturePoints",
    startingPositionsLayerName: "StartingPoints", // Fixed from "StartingPositions"
    targetTileSizePx: 48,
  }
}

// Initialize all maps in the registry
export function initializeMapRegistry(): void {
  Object.values(MAPS).forEach(spec => {
    mapRegistry.registerMap(spec)
  })
  console.log('MapRegistry: Registered maps:', mapRegistry.getMapIds())
}
