// Loads every asset listed in assets/manifest.json, then starts the game flow.
import { initDefs } from '../entities/factory.js';
import { parseStory } from '../core/story.js';
import { runGame } from '../flow.js';

const FONTS = ['ComicBD', 'AvgardD', 'Taileb', 'GameArial'];

export class BootScene extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        this.load.json('manifest', 'assets/manifest.json');
        this.load.text('story', 'assets/story.xml');

        const w = 400;
        const bg = this.add.rectangle(512, 384, w, 12, 0x222222);
        const bar = this.add.rectangle(512 - w / 2, 384, 1, 12, 0xffd166).setOrigin(0, 0.5);
        this.load.on('progress', (p) => bar.setSize(w * p, 12));
        this.bgBar = bg;
    }

    create() {
        const m = this.cache.json.get('manifest');
        m.images.forEach((p) => this.load.image('images/' + p, 'assets/images/' + p));
        m.maps.forEach((n) => this.load.text('map:' + n, `assets/maps/${n}.map`));
        m.sounds.forEach((s) => this.load.audio(s.key, s.urls));
        m.fonts.forEach(() => {}); // fonts are loaded through CSS @font-face in index.php

        this.load.once('complete', () => this.afterLoad());
        this.load.start();
    }

    async afterLoad() {
        await Promise.all(FONTS.map((f) => document.fonts.load(`20px "${f}"`)));
        initDefs(this);
        const sections = parseStory(this.cache.text.get('story'));
        runGame(this.game, sections).catch((err) => console.error(err));
    }
}
