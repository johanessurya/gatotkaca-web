// Port of tilemap/SubmitHighScoreScreen.java. Name is typed on the keyboard
// (letters only, up to 10 characters), Enter saves the score.
import { Parallax } from '../core/ui.js';
import { addHighScore } from '../core/persist.js';
import { finishScene } from '../flow.js';

const W = 1024;
const H = 768;
const INK = '#24100d';
const MAX_NAME = 10;
const PLACEHOLDER = 'YourName';

export class SubmitScene extends Phaser.Scene {
    constructor() {
        super('Submit');
    }

    init(data) {
        this.score = data.score;
        this.name = PLACEHOLDER;
        this.fresh = true;   // first key replaces the placeholder (selectAll in Java)
        this.done = false;
    }

    create() {
        this.cameras.main.setBackgroundColor('#000000');
        this.parallax = new Parallax(this, 'images/bg/layer0.jpg', 0.6, W, -10);
        const scroll = this.add.image(0, 0, 'images/highscore_submit.png').setOrigin(0, 0);
        scroll.setPosition((W - scroll.width) / 2, (H - scroll.height) / 2);

        // Same place as the Java text field and score label.
        this.fieldX = (W - 260) / 2 - 100;
        this.fieldY = (H - 30) / 2 + 25;
        this.nameText = this.add.text(this.fieldX + 6, this.fieldY + 2, '', {
            fontFamily: 'Taileb', fontSize: '30px', fontStyle: 'bold', color: INK,
        });
        this.add.text(this.fieldX + 250, this.fieldY + 30, String(this.score), {
            fontFamily: 'Taileb', fontSize: '30px', fontStyle: 'bold', color: INK,
        }).setOrigin(0, 1);
        this.caret = this.add.rectangle(0, 0, 2, 26, 0x24100d).setOrigin(0, 0);

        this.onKey = (e) => this.handleKey(e);
        this.input.keyboard.on('keydown', this.onKey);
        this.events.once('shutdown', () => this.input.keyboard.off('keydown', this.onKey));
        this.render();
    }

    update(time, delta) {
        this.parallax.updateFromTime(delta);
        this.caret.setVisible(Math.floor(time / 500) % 2 === 0);
    }

    handleKey(e) {
        if (this.done) return;
        if (e.key === 'Enter') {
            this.submit();
        } else if (e.key === 'Backspace') {
            this.name = this.fresh ? '' : this.name.slice(0, -1);
            this.fresh = false;
        } else if (/^[A-Za-z]$/.test(e.key)) {
            if (this.fresh) this.name = '';
            this.fresh = false;
            if (this.name.length < MAX_NAME) this.name += e.key;
        }
        this.render();
    }

    submit() {
        // Java filters the typed text to letters; the placeholder stays if untouched.
        const name = this.name.replace(/[^A-Za-z]/g, '') || PLACEHOLDER;
        addHighScore(name, this.score);
        this.done = true;
        finishScene(null);
    }

    render() {
        this.nameText.setText(this.name);
        this.nameText.setColor(this.fresh ? '#8a7f7d' : INK);
        this.caret.setPosition(this.fieldX + 8 + this.nameText.width, this.fieldY + 6);
    }
}
