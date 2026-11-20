// Port of tilemap/CreditScreen.java.
import { finishScene } from '../flow.js';

const W = 1024;
const H = 768;

export class CreditScene extends Phaser.Scene {
    constructor() {
        super('Credit');
    }

    init() {
        this.done = false;
    }

    create() {
        this.add.image(0, 0, 'images/loading/credit.jpg').setOrigin(0, 0);
        this.add.rectangle(600, 0, W - 600, H, 0x000000, 0.75).setOrigin(0, 0);

        // Text is centered in the right-hand panel (x offset 300 in the Java code).
        const cx = W / 2 + 300;
        const line = (text, y, size) => this.add.text(cx, y, text, {
            fontFamily: 'GameArial', fontSize: `${size}px`, fontStyle: 'bold', color: '#ffffff',
        }).setOrigin(0.5, 0);
        line('Created By', 200, 40);
        line('Yohanes Surya Kusuma', 250, 20);
        line('Special Thanks To', 400, 40);
        line('Benny Swatan Susanto', 450, 20);

        this.music = this.sound.add('credit', { loop: true, volume: 0.6 });
        this.music.play();
        this.events.once('shutdown', () => this.music && this.music.stop());

        this.keys = this.input.keyboard.addKeys({ enter: 'ENTER', exit: 'ESC' });
    }

    update() {
        if (this.done) return;
        const jd = (key) => Phaser.Input.Keyboard.JustDown(key);
        if (jd(this.keys.enter) || jd(this.keys.exit)) {
            this.done = true;
            finishScene(null);
        }
    }
}
