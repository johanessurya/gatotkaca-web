// Port of tilemap/ComicScreen.java: story pages with an optional tutorial pop-up.
import { FramePopUp, FADE } from '../core/ui.js';
import { finishScene } from '../flow.js';

const W = 1024;
const H = 768;

export class ComicScene extends Phaser.Scene {
    constructor() {
        super('Comic');
    }

    init(data) {
        this.pages = data.pages || [];
        this.showTutorial = !!data.tutorial;
        this.index = 0;
        this.posY = 0;
        this.state = 'play';
        this.stateTime = 0;
        this.hasShowed = false;
        this.done = false;
    }

    create() {
        this.cameras.main.setBackgroundColor('#000000');
        this.pageView = this.add.image(0, 0, this.pages[0] || 'images/bg/cursor.png')
            .setOrigin(0, 0).setVisible(this.pages.length > 0);
        this.music = this.sound.add('comicbg', { loop: true, volume: 0.6 });
        this.music.play();
        this.events.once('shutdown', () => this.music && this.music.stop());

        const popKey = 'images/comic.png';
        const pw = this.textures.get(popKey).getSourceImage().width;
        const ph = this.textures.get(popKey).getSourceImage().height;
        this.popup = new FramePopUp(this, popKey, (W - pw) / 2, (H - ph) / 2, 10, 'popup');

        this.keys = this.input.keyboard.addKeys({
            left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN', enter: 'ENTER', exit: 'ESC',
        });
    }

    update(time, delta) {
        if (this.done) return;
        if (this.state === 'play') {
            if (!this.hasShowed && this.showTutorial) {
                this.stateTime += delta;
                if (this.stateTime > 1000) {
                    this.state = 'popup';
                    this.hasShowed = true;
                    this.popup.fadeInStart();
                }
            }
            this.checkInput();
        } else if (this.state === 'popup') {
            this.checkInput();
            this.popup.update(delta);
            if (this.popup.state === FADE.OUT && this.popup.isFinish()) {
                this.state = 'play';
            }
        }
        this.render();
    }

    checkInput() {
        const k = this.keys;
        const jd = (key) => Phaser.Input.Keyboard.JustDown(key);

        if (jd(k.exit)) return this.stop();

        if (this.state === 'play') {
            if (jd(k.left)) {
                this.index--;
                if (this.index >= 0 && this.index < this.pages.length) {
                    this.sound.play('comicback');
                    this.posY = 0;
                }
            } else if (jd(k.right)) {
                this.index++;
                if (this.index >= 0 && this.index < this.pages.length) {
                    this.sound.play('comicnext');
                    this.posY = 0;
                }
            } else if (k.up.isDown) {
                this.posY += 10;
            } else if (k.down.isDown) {
                this.posY -= 10;
            } else if (jd(k.enter)) {
                return this.stop();
            }
            if (this.pages.length > 0) {
                this.index = Math.max(0, Math.min(this.index, this.pages.length - 1));
                const h = this.textures.get(this.pages[this.index]).getSourceImage().height;
                this.posY = Math.max(H - h, Math.min(this.posY, 0));
            }
        } else if (this.state === 'popup') {
            if (jd(k.enter)) this.popup.fadeOutStart();
        }
    }

    render() {
        if (this.pages.length > 0) {
            this.pageView.setTexture(this.pages[this.index]).setPosition(0, this.posY);
        }
    }

    stop() {
        if (this.done) return;
        this.done = true;
        finishScene(null);
    }
}
