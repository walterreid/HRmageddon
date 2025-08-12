export type MapId = "OfficeLayout";

export type MapSpec = {
  id: MapId;
  jsonKey: string;          // loader key for the json
  jsonUrl: string;          // /assets/tilemaps/OfficeLayout16x12.json
  tilesetKey: string;       // loader key for the image
  tilesetUrl: string;       // /assets/tilesets/inside.png
  tilesetName: string;      // MUST equal the tileset 'name' in Tiled/TSX
  backgroundLayerName: string; // walkable floor tiles
  foregroundLayerName: string; // blocking walls/objects
  capturePointsLayerName: string; // strategic locations
  startingPositionsLayerName: string; // team spawn points
  targetTileSizePx: number; // 48 (game logic grid)
};

export type BoardDim = { cols: number; rows: number };

export type StartingPosition = { x: number; y: number; gid: number };
