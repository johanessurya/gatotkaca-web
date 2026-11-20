// Port of tilemap/MainMenu.java (main menu, level select, high score) and the
// farewell screen shown where the Java game ends.
import { Parallax } from '../core/ui.js';
import { finishScene } from '../flow.js';
import { loadHighScores } from '../core/persist.js';

const W = 1024;
const H = 768;
const INK = '#24100d'; // (36,16,13) from the Java code

export class MenuScene extends Phaser.Scene {
    constructor() {
        super('Menu');
    }

    init(data) {
        this.titles = data.titles;
        this.maxLevel = data.maxLevel;
        this.state = 'main';    // main | level | high
        this.choose = 0;        // 0 new game, 1 level select, 2 high score, 3 exit
        this.indexLevel = 0;
        this.done = false;
    }

    create() {
        this.parallax = new Parallax(this, 'images/bg/layer0.jpg', 0.6, W, -10);
        this.add.image(0, 0, 'images/bg/gatotkaca.png').setOrigin(0, 0);
        this.title = this.add.image(676, 247, 'images/bg/title.png').setOrigin(0, 0);

        // Dark overlay used by the level and score panels (alpha 0.9).
        this.overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.9).setOrigin(0, 0).setVisible(false);

        this.items = [
            'images/bg/newgame.png',
            'images/bg/selectlevel.png',
            'images/bg/highscore.png',
            'images/bg/exit.png',
        ].map((key, i) => {
            const w = this.textures.get(key).getSourceImage().width;
            return { img: this.add.image(300 + (W - w) / 2, i * 40 + 350, key).setOrigin(0, 0), key };
        });
        this.cursor = this.add.image(0, 0, 'images/bg/cursor.png').setOrigin(0, 0);

        // Level select panel
        const panel = (key) => this.add.image(0, 0, key).setOrigin(0, 0);
        this.levelPanel = panel('images/bg/levelselect.png');
        this.levelPanel.setPosition((W - this.levelPanel.width) / 2, (H - this.levelPanel.height) / 2);
        this.arrowUp = this.add.image(0, 300, 'images/bg/arrowup.png').setOrigin(0, 0);
        this.arrowUp.x = (W - this.arrowUp.width) / 2;
        this.arrowDown = this.add.image(0, 400, 'images/bg/arrowdown.png').setOrigin(0, 0);
        this.arrowDown.x = (W - this.arrowDown.width) / 2;
        this.levelTitle = this.add.text(W / 2, 390, '', {
            fontFamily: 'Taileb', fontSize: '30px', color: INK,
        }).setOrigin(0.5, 0);
        this.levelHint = this.add.text(565, 452, 'Backspace to back', {
            fontFamily: 'Taileb', fontSize: '14px', color: INK,
        }).setOrigin(0, 0);

        // High score panel
        this.scroll = this.add.image(270, 40, 'images/bg/scroll.png').setOrigin(0, 0);
        this.scoreTitle = this.add.text(W / 2, 150, 'HIGH SCORE', {
            fontFamily: 'Taileb', fontSize: '30px', color: INK,
        }).setOrigin(0.5, 0);
        this.scoreRows = [];
        for (let i = 0; i < 5; i++) {
            this.scoreRows.push({
                name: this.add.text(308, 265 + i * 50, '', { fontFamily: 'Taileb', fontSize: '30px', color: INK }),
                score: this.add.text(608, 265 + i * 50, '', { fontFamily: 'Taileb', fontSize: '30px', color: INK }),
            });
        }

        this.keys = this.input.keyboard.addKeys({
            up: 'UP', down: 'DOWN', enter: 'ENTER', back: 'BACKSPACE', exit: 'ESC',
        });

        // Main menu music (bgMainMenuMusic in ResourceManager). Browsers start it
        // after the first key press, Phaser handles that unlock.
        this.music = this.sound.add('mainmenubg', { loop: true, volume: 0.6 });
        this.music.play();
        this.events.once('shutdown', () => this.music && this.music.stop());
        this.render();
    }

    update(time, delta) {
        if (this.done) return;
        this.parallax.updateFromTime(delta);
        this.handleInput();
        this.render();
    }

    handleInput() {
        const k = this.keys;
        const jd = (key) => Phaser.Input.Keyboard.JustDown(key);

        if (jd(k.exit)) {
            // Esc returns to the main menu (the Java loop restarts the menu).
            this.state = 'main';
        }

        if (this.state === 'main') {
            if (jd(k.up)) this.choose -= 1;
            else if (jd(k.down)) this.choose += 1;
            else if (jd(k.enter)) {
                switch (this.choose) {
                    case 0: return this.finish({ type: 'new' });
                    case 1: this.state = 'level'; break;
                    case 2: this.state = 'high'; break;
                    case 3: return this.finish({ type: 'exit' });
                    default: break;
                }
            }
            this.choose = Math.max(0, Math.min(this.choose, 3));
        } else if (this.state === 'high') {
            if (jd(k.enter)) this.state = 'main';
        } else if (this.state === 'level') {
            if (jd(k.up)) this.indexLevel -= 1;
            else if (jd(k.down)) this.indexLevel += 1;
            else if (jd(k.back)) this.state = 'main';
            else if (jd(k.enter)) {
                this.indexLevel = Math.max(0, Math.min(this.indexLevel, this.maxLevel));
                return this.finish({ type: 'level', index: this.indexLevel });
            }
            this.indexLevel = Math.max(0, Math.min(this.indexLevel, this.maxLevel));
        }
    }

    finish(result) {
        if (this.done) return;
        this.done = true;
        finishScene(result);
    }

    render() {
        const main = this.state === 'main';
        const level = this.state === 'level';
        const high = this.state === 'high';

        this.title.setVisible(main);
        this.items.forEach((it) => it.img.setVisible(main));
        this.cursor.setVisible(main);
        if (main) {
            const it = this.items[this.choose];
            this.cursor.setPosition(it.img.x - this.cursor.width - 10, it.img.y);
        }

        this.overlay.setVisible(level || high);

        this.levelPanel.setVisible(level);
        this.arrowUp.setVisible(level);
        this.arrowDown.setVisible(level);
        this.levelTitle.setVisible(level);
        this.levelHint.setVisible(level);
        if (level) {
            this.levelTitle.setText(this.titles[this.indexLevel] || '');
        }

        this.scroll.setVisible(high);
        this.scoreTitle.setVisible(high);
        const scores = high ? loadHighScores() : [];
        this.scoreRows.forEach((row, i) => {
            const show = high;
            row.name.setVisible(show);
            row.score.setVisible(show);
            if (show) {
                row.name.setText(`${i + 1}. ${scores[i].name}`);
                row.score.setText(String(scores[i].score));
            }
        });
    }
}

export class FarewellScene extends Phaser.Scene {
    constructor() {
        super('Farewell');
    }

    create() {
        this.cameras.main.setBackgroundColor('#000000');
        this.add.text(W / 2, H / 2 - 20, 'Terima kasih sudah bermain', {
            fontFamily: 'Taileb', fontSize: '36px', color: '#ffffff',
        }).setOrigin(0.5);
        this.add.text(W / 2, H / 2 + 30, 'Muat ulang halaman untuk bermain lagi', {
            fontFamily: 'Taileb', fontSize: '20px', color: '#cccccc',
        }).setOrigin(0.5);
    }
}
