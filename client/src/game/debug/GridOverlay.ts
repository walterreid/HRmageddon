import Phaser from "phaser";

export class GridOverlay {
  private layerLines: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private visible = false;
  private scene: Phaser.Scene;
  private cols: number;
  private rows: number;
  private tile: number;

  constructor(
    scene: Phaser.Scene,
    cols: number,
    rows: number,
    tile: number
  ) {
    this.scene = scene;
    this.cols = cols;
    this.rows = rows;
    this.tile = tile;
    this.layerLines = scene.add.graphics().setDepth(200);
    scene.input.keyboard?.on("keydown-G", () => this.toggle());
  }

  toggle() {
    this.visible = !this.visible;
    this.layerLines.clear();
    this.labels.forEach(t => t.destroy());
    this.labels.length = 0;

    if (!this.visible) return;

    this.layerLines.lineStyle(1, 0xffffff, 0.17);
    for (let x = 0; x <= this.cols; x++) {
      const px = x * this.tile;
      this.layerLines.lineBetween(px, 0, px, this.rows * this.tile);
    }
    for (let y = 0; y <= this.rows; y++) {
      const py = y * this.tile;
      this.layerLines.lineBetween(0, py, this.cols * this.tile, py);
    }

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tx = x * this.tile + 4;
        const ty = y * this.tile + 2;
        const t = this.scene.add.text(tx, ty, `${x},${y}`, { fontSize: "10px", color: "#ffffffaa" })
          .setDepth(201);
        this.labels.push(t);
      }
    }
  }
}
