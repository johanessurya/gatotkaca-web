// Port of graphics/Animation.java and the image helpers in ImageMan.java.
// Frames are plain objects: { key, w, h, rect:{x,y,w,h}, duration, alpha }.

export class Anim {
    constructor(frames, loop = true) {
        this.frames = frames;
        this.loop = loop;
        this.ends = [];
        let t = 0;
        for (const f of frames) {
            t += f.duration;
            this.ends.push(t);
        }
        this.total = t;
        this.start();
    }

    clone() {
        return new Anim(this.frames, this.loop);
    }

    start() {
        this.animTime = 0;
        this.idx = 0;
        this.reachEnd = false;
    }

    update(dt) {
        if (this.frames.length === 0) return;
        this.animTime += dt;
        if (this.animTime >= this.total) {
            this.reachEnd = true;
            this.animTime = this.animTime % this.total;
            if (this.loop) this.idx = 0;
        }
        while (this.idx < this.frames.length - 1 && this.animTime > this.ends[this.idx]) {
            this.idx++;
        }
    }

    frame() {
        return this.frames[this.idx];
    }

    finished() {
        return this.reachEnd;
    }
}

// --- Texture helpers -------------------------------------------------------

const frameCache = new Map();

// Returns the (cached) frame description for a texture key.
// `scene` is any scene; textures are global to the game.
export function frameOf(scene, key, extra = {}) {
    const base = textureInfo(scene, key);
    return { key, w: base.w, h: base.h, rect: base.rect, ...extra };
}

function textureInfo(scene, key) {
    if (frameCache.has(key)) return frameCache.get(key);
    const tex = scene.textures.get(key);
    const src = tex.getSourceImage();
    const info = { w: src.width, h: src.height, rect: null };
    info.rect = fitRect(src);
    frameCache.set(key, info);
    return info;
}

// Makes (once) a horizontally mirrored copy of a texture and returns its key.
// Equivalent to ImageMan.getMirrorImage(); used for all "left" animations.
export function mirrorKey(scene, key) {
    const mkey = key + '~L';
    if (!scene.textures.exists(mkey)) {
        const src = scene.textures.get(key).getSourceImage();
        const canvas = document.createElement('canvas');
        canvas.width = src.width;
        canvas.height = src.height;
        const ctx = canvas.getContext('2d');
        ctx.translate(src.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(src, 0, 0);
        scene.textures.addCanvas(mkey, canvas);
        frameCache.set(mkey, { w: src.width, h: src.height, rect: fitRect(canvas) });
    }
    return mkey;
}

// Bounding box of non-transparent pixels (ImageMan.getFitRectangle).
function fitRect(image) {
    const w = image.width;
    const h = image.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] !== 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < 0) return { x: 0, y: 0, w: 0, h: 0 };
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// Builds right and left frame lists for a numbered image sequence, like
// ResourceManager.loadAnimation(filename, n, delay): images base1..baseN.
// `delays` may be a number (same for all) or an array with one per frame.
// Returns { right: frames[], left: frames[] }.
export function sequenceFrames(scene, base, n, delays, { first = 1 } = {}) {
    const right = [];
    const left = [];
    for (let i = 0; i < n; i++) {
        const key = `images/${base}${first + i}.png`;
        const duration = Array.isArray(delays) ? delays[i] : delays;
        right.push(frameOf(scene, key, { duration }));
        const lk = mirrorKey(scene, key);
        left.push(frameOf(scene, lk, { duration }));
    }
    return { right, left };
}

// Same, from explicit file names (used for frame lists that do not follow base+n).
export function namedFrames(scene, names, delays) {
    const right = [];
    const left = [];
    names.forEach((name, i) => {
        const key = `images/${name}`;
        const duration = Array.isArray(delays) ? delays[i] : delays;
        right.push(frameOf(scene, key, { duration }));
        left.push(frameOf(scene, mirrorKey(scene, key), { duration }));
    });
    return { right, left };
}

// Plain single-direction frames (no mirroring), e.g. items and UI.
export function plainFrames(scene, names, delays) {
    return names.map((name, i) => frameOf(scene, `images/${name}`, {
        duration: Array.isArray(delays) ? delays[i] : delays,
    }));
}
