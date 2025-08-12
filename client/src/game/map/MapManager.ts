import Phaser from "phaser";
import type { MapSpec, BoardDim } from "./types";
import { mapRegistry } from "./MapRegistry";


export class MapManager {
  private scene: Phaser.Scene;
  private spec: MapSpec;

  constructor(scene: Phaser.Scene, spec: MapSpec) {
    this.scene = scene;
    this.spec = spec;
  }

  preload() {
    const s = this.spec;
    this.scene.load.tilemapTiledJSON(s.jsonKey, s.jsonUrl);
    this.scene.load.image(s.tilesetKey, s.tilesetUrl);
  }

  create() {
    const s = this.spec;
    const map = this.scene.make.tilemap({ key: s.jsonKey });
    const tiles = map.addTilesetImage(s.tilesetName, s.tilesetKey, 16, 16, 0, 0);
    if (!tiles) throw new Error(`Tileset '${s.tilesetName}' not found in map.`);

    const background = map.createLayer(s.backgroundLayerName, tiles, 0, 0)!;
    const foreground = map.createLayer(s.foregroundLayerName, tiles, 0, 0)!;
    const capturePoints = map.createLayer(s.capturePointsLayerName, tiles, 0, 0)!;
    const startingPositions = map.createLayer(s.startingPositionsLayerName, tiles, 0, 0)!;

    const scale = s.targetTileSizePx / map.tileWidth;
    background.setScale(scale);
    foreground.setScale(scale);
    capturePoints.setScale(scale);
    startingPositions.setScale(scale);

    background.setDepth(0);
    foreground.setDepth(1);
    capturePoints.setDepth(2);
    startingPositions.setDepth(3);

    const w = map.width * s.targetTileSizePx;
    const h = map.height * s.targetTileSizePx;
    this.scene.cameras.main.setBounds(0, 0, w, h);
    this.scene.cameras.main.centerOn(w / 2, h / 2);

    // Parse blocked tiles from foreground layer
    const blockedSet = new Set(
      foreground.layer.data.flatMap((row, y) =>
        row.filter(t => t && t.index > 0).map(t => `${t.x},${y}`)
      )
    );
    const isBlocked = (tx: number, ty: number) => foreground.hasTileAt(tx, ty);

    // Parse capture points from capture points layer
    const capturePointsData = capturePoints.layer.data.flatMap((row, y) =>
      row.filter(t => t && t.index > 0).map(t => ({ x: t.x, y: y, gid: t.index }))
    );
    
    // Parse starting positions from starting positions layer
    const startingPositionsData = startingPositions.layer.data.flatMap((row, y) =>
      row.filter(t => t && t.index > 0).map(t => ({ x: t.x, y: y, gid: t.index }))
    );

    const goldTeamPositions = startingPositionsData.filter(pos => pos.gid === 595);
    const navyTeamPositions = startingPositionsData.filter(pos => pos.gid === 563);

    // CRITICAL: Populate the MapRegistry with starting positions
    mapRegistry.setStartingPositions(s.id, {
      goldTeam: goldTeamPositions,
      navyTeam: navyTeamPositions
    });
    
    console.log('MapManager: Populated MapRegistry for', s.id, {
      goldTeam: goldTeamPositions.length,
      navyTeam: navyTeamPositions.length
    });

    // CRITICAL: Store blocked tiles in MapRegistry for movement validation
    const blockedTiles = Array.from(blockedSet).map(coordStr => {
      const [x, y] = coordStr.split(',').map(Number);
      return { x, y };
    });
    mapRegistry.setBlockedTiles(s.id, blockedTiles);
    
    console.log('MapManager: Stored blocked tiles for movement validation:', {
      blockedTiles: blockedTiles.length,
      blockedSet: blockedSet.size
    });

    const blockedMatrix: number[][] = Array.from({ length: map.height }, (_, y) =>
      Array.from({ length: map.width }, (_, x) => (foreground.hasTileAt(x, y) ? 1 : 0))
    );

    const tileToWorld = (tx: number, ty: number) =>
      ({ x: tx * s.targetTileSizePx, y: ty * s.targetTileSizePx });
    const worldToTile = (px: number, py: number) =>
      ({ x: Math.floor(px / s.targetTileSizePx), y: Math.floor(py / s.targetTileSizePx) });

    return {
      map,
      background,
      foreground,
      capturePoints,
      startingPositions,
      board: { cols: map.width, rows: map.height } as BoardDim,
      targetTileSizePx: s.targetTileSizePx,
      tileToWorld,
      worldToTile,
      blocked: blockedSet,
      isBlocked,
      blockedMatrix,
      capturePointsData,
      startingPositionsData,
      goldTeamPositions,
      navyTeamPositions,
      scale
    };
  }
}
