// Port of tilemap/TileMap.java, TileMapRenderer.java and the map parser in
// ResourceManager.loadMap(). Map legend (from the .map files):
//   A..M  tile images tile_A.png .. tile_M.png (solid)
//   l     Live-up pickup     s  Star (MP)     k  Kendi (HP)
//   1     Buto Ijo           2  Buto Abang     3  Nagapecona (boss)

export const TILE = 64;
export const TILE_BITS = 6;

export function pixelsToTiles(pixels) {
    return Math.round(pixels) >> TILE_BITS;
}

export function tilesToPixels(tiles) {
    return tiles << TILE_BITS;
}

export class TileMap {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        // tiles[y][x] = tile index (0..12) or -1 for empty
        this.tiles = [];
        for (let y = 0; y < height; y++) {
            this.tiles.push(new Array(width).fill(-1));
        }
        this.sprites = [];
        this.player = null;
    }

    setPlayer(p) { this.player = p; }

    addSprite(s) {
        this.sprites.push(s);
        if (this.onAdd) this.onAdd(s);
    }

    removeSprite(s) {
        s.removed = true;
    }

    // Solid check used by collision (Stage.getTileCollision).
    // Outside the map horizontally counts as solid; below/above does not.
    isSolid(x, y) {
        if (x < 0 || x >= this.width) return true;
        if (y < 0 || y >= this.height) return false;
        return this.tiles[y][x] >= 0;
    }

    // Tile index at (x, y) or -1.
    tileAt(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return -1;
        return this.tiles[y][x];
    }
}

// Parses map text. `makeEntity(ch)` returns a new sprite for a spawn letter
// or null. `entityWidth(entity)` gives the sprite width used for centering.
export function parseMap(text, makeEntity) {
    let lines = text.split(/\r?\n/);
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    lines = lines.filter((l) => !l.startsWith('#'));

    let width = 0;
    for (const l of lines) width = Math.max(width, l.length);
    const map = new TileMap(width, lines.length);
    const spawns = [];

    for (let y = 0; y < lines.length; y++) {
        const line = lines[y];
        for (let x = 0; x < line.length; x++) {
            const ch = line.charAt(x);
            const tile = ch.charCodeAt(0) - 'A'.charCodeAt(0);
            if (tile >= 0 && tile < 13) {
                map.tiles[y][x] = tile;
            } else if ('lsk123'.includes(ch)) {
                spawns.push({ ch, x, y });
            }
        }
    }

    for (const sp of spawns) {
        const e = makeEntity(sp.ch);
        if (!e) continue;
        // Center horizontally in the tile and bottom-justify (ResourceManager.addSprite).
        e.setX(tilesToPixels(sp.x) + (TILE - e.w) / 2);
        e.setY(tilesToPixels(sp.y + 1) - e.h);
        map.addSprite(e);
    }
    return map;
}

// Stage collision: returns the blocking tile position or null.
// Port of Stage.getTileCollision().
export function tileCollision(map, sprite, newX, newY) {
    const fromX = Math.min(sprite.x, newX);
    const fromY = Math.min(sprite.y, newY);
    const toX = Math.max(sprite.x, newX);
    const toY = Math.max(sprite.y, newY);
    const fromTileX = pixelsToTiles(fromX);
    const fromTileY = pixelsToTiles(fromY);
    const toTileX = pixelsToTiles(toX + sprite.w - 1);
    const toTileY = pixelsToTiles(toY + sprite.h - 1);
    for (let x = fromTileX; x <= toTileX; x++) {
        for (let y = fromTileY; y <= toTileY; y++) {
            if (map.isSolid(x, y)) return { x, y };
        }
    }
    return null;
}

// Draws only the visible part of the map through a pool of images.
// Port of TileMapRenderer.draw for the tile loop.
export class TileLayer {
    constructor(scene, map, keys, depth) {
        this.scene = scene;
        this.map = map;
        this.keys = keys;   // texture key per tile index
        this.depth = depth;
        this.pool = [];
    }

    update(offsetX, offsetY, screenW) {
        const first = pixelsToTiles(-offsetX);
        const last = first + pixelsToTiles(screenW) + 1;
        let used = 0;
        for (let y = 0; y < this.map.height; y++) {
            const row = this.map.tiles[y];
            for (let x = Math.max(first, 0); x <= last && x < this.map.width; x++) {
                const t = row[x];
                if (t < 0) continue;
                let img = this.pool[used];
                if (!img) {
                    img = this.scene.add.image(0, 0, this.keys[t]).setOrigin(0, 0).setDepth(this.depth);
                    this.pool.push(img);
                }
                img.setTexture(this.keys[t]);
                img.setPosition(tilesToPixels(x), tilesToPixels(y));
                img.setVisible(true);
                used++;
            }
        }
        for (let i = used; i < this.pool.length; i++) {
            this.pool[i].setVisible(false);
        }
    }
}
