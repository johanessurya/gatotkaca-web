// Port of tilemap/Stage.java: one playable map.
import { parseMap, tileCollision, TileLayer, tilesToPixels } from '../core/tilemap.js';
import { world } from '../core/world.js';
import { Parallax, FramePopUp, PauseFade, FADE } from '../core/ui.js';
import { makeForLetter } from '../entities/factory.js';
import { STATE, Creature } from '../entities/base.js';
import { Nagapecona } from '../entities/monsters.js';
import { JabangTetuka } from '../entities/player.js';
import { finishScene, RESULT } from '../flow.js';

const W = 1024;
const H = 768;
const GRAVITY = 0.002;        // px/ms^2
const PLAY_TIME = 60000;      // ms per life
const TUTORIAL_SHOW = 1000;   // ms before the tutorial pop-up
const WINNING_DURATION = 2000;
const PLAYER_DRAW_OFFSET = 38; // TileMapRenderer.setOffsetYplus(38)

const ST = { PLAY: 0, WIN: 1, LOSE: 2, PAUSE: 3, EXIT: 4, POPUP: 5 };

const TILE_KEYS = 'ABCDEFGHIJKLM'.split('').map((c) => `images/tile_${c}.png`);

function rectsIntersect(a, b) {
    if (a.w <= 0 || a.h <= 0 || b.w <= 0 || b.h <= 0) return false;
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export class StageScene extends Phaser.Scene {
    constructor() {
        super('Stage');
    }

    init(cfg) {
        this.cfg = cfg;
        this.done = false;
    }

    create() {
        const text = this.cache.text.get('map:' + this.cfg.mapName);
        this.map = parseMap(text, makeForLetter);
        this.player = this.cfg.player;

        world.scene = this;
        world.map = this.map;

        // Backgrounds: layer0 behind the tiles, layer3 in front of the sprites.
        this.bgParallax = new Parallax(this, 'images/bg/layer0.jpg', 0.5, W, -20);
        this.fgParallax = new Parallax(this, 'images/bg/layer3.png', 0.4, W, 30);
        this.tileLayer = new TileLayer(this, this.map, TILE_KEYS, 0);

        // Player starts above the left side and falls to the ground.
        this.player.setX(tilesToPixels(3));
        this.player.setY(-400);
        this.map.setPlayer(this.player);
        this.player.map = this.map;
        this.player.view = null; // the previous stage's view was destroyed on shutdown
        this.attach(this.player, 24);
        if (this.player.shieldSprite) {
            this.player.shieldSprite.view = this.add.image(0, 0, this.player.shieldSprite.imageKey())
                .setOrigin(0, 0).setDepth(24.5).setVisible(false);
        }

        this.map.onAdd = (s) => this.attach(s, 25);
        for (const s of this.map.sprites) this.attach(s, 25);

        this.bossSprite = this.map.sprites.find((s) => s instanceof Nagapecona) || null;
        this.bossStage = this.bossSprite !== null;

        this.music = this.sound.add(this.bossStage ? 'boss' : 'stage', { loop: true, volume: 0.6 });
        this.music.play();
        this.events.once('shutdown', () => this.music && this.music.stop());

        this.timeLeft = PLAY_TIME;
        this.stateTime = 0;
        this.hasShowed = false;
        this.durationElapsed = 0;
        this.state = ST.PLAY;
        this.pauseChoose = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        // Tutorial pop-up: Gatotkaca pop-up for Gatotkaca, Jabang Tetuka otherwise.
        const popKey = this.player.isGatotkaca ? 'images/gk.png' : 'images/jt.png';
        const popW = this.textures.get(popKey).getSourceImage().width;
        const popH = this.textures.get(popKey).getSourceImage().height;
        this.popup = new FramePopUp(this, popKey, (W - popW) / 2, (H - popH) / 2, 45, 'popup');

        this.pauseFade = new PauseFade(this, 50);
        this.buildPauseMenu();
        this.buildHud();

        this.keys = this.input.keyboard.addKeys({
            left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN',
            jump: 'SPACE', exit: 'ESC', atk: 'A', aura: 'S', bite: 'D',
            shield: 'W', pause: 'P', enter: 'ENTER', lose: 'R',
        });
    }

    // --- Setup helpers ------------------------------------------------------

    attach(sprite, depth) {
        if (sprite.view) return;
        sprite.view = this.add.image(0, 0, sprite.imageKey()).setOrigin(0, 0).setDepth(depth);
    }

    buildPauseMenu() {
        const make = (key, y) => {
            const w = this.textures.get(key).getSourceImage().width;
            return this.add.image((W - w) / 2, y, key).setOrigin(0, 0).setScrollFactor(0)
                .setDepth(51).setVisible(false);
        };
        this.pauseImages = [
            make('images/bg/pause.png', 200),
            make('images/bg/resume.png', 260),
            make('images/bg/exit.png', 290),
        ];
        this.pauseCursor = this.add.image(0, 0, 'images/bg/cursor.png').setOrigin(0, 0)
            .setScrollFactor(0).setDepth(52).setVisible(false);
    }

    buildHud() {
        const p = this.player;
        const img = (key) => this.add.image(0, 0, key).setOrigin(0, 0);
        this.hpBlank = this.add.graphics();
        this.mpBlank = this.add.graphics();
        const children = [];
        if (p.isGatotkaca) {
            children.push(img('images/statusbar/mp.png'), this.mpBlank,
                img('images/statusbar/mpBar.png'));
        }
        children.push(img('images/statusbar/hp.png'), this.hpBlank,
            img('images/statusbar/hpBar.png'), img('images/statusbar/circle.png'));
        this.liveText = this.add.text(0, 0, '', {
            fontFamily: 'ComicBD', fontSize: '20px', fontStyle: 'bold', color: '#cc9900',
        }).setOrigin(0, 1);
        children.push(this.liveText, img('images/statusbar/bubble.png'));
        this.scoreText = this.add.text(0, 0, '', {
            fontFamily: 'AvgardD', fontSize: '14px', fontStyle: 'bold', color: '#2a2a2a',
        }).setOrigin(0, 1);
        children.push(this.scoreText);
        this.statusBar = this.add.container(5, 10, children).setScrollFactor(0).setDepth(40);
        this.scoreY = p.isGatotkaca ? 63 : 45;

        this.timeText = this.add.text(600, 50, '', {
            fontFamily: 'ComicBD', fontSize: '40px', fontStyle: 'bold', color: '#2a2a2a',
        }).setOrigin(0, 1).setScrollFactor(0).setDepth(40);

        // Boss health bar (Nagapecona.draw): bottom right, 512x64.
        this.bossBarGfx = this.add.graphics();
        this.bossBar = this.add.container(W - 512, H - 64, [
            img('images/nagapecona/statusbar/fill.png'),
            this.bossBarGfx,
            img('images/nagapecona/statusbar/frame.png'),
        ]).setScrollFactor(0).setDepth(40).setVisible(this.bossStage);
    }

    // --- Main loop ----------------------------------------------------------

    update(time, delta) {
        if (this.done) return;
        this.handleInput();
        if (this.done) return;

        switch (this.state) {
            case ST.PLAY: this.statePlay(delta); break;
            case ST.PAUSE: this.pauseFade.update(delta); break;
            case ST.WIN: this.stateWin(delta); break;
            case ST.POPUP: this.statePopup(delta); break;
            default: break;
        }

        this.updateCamera();
        this.syncViews();
        this.updateHud();
        this.removeDead();
    }

    handleInput() {
        const k = this.keys;
        const jd = (key) => Phaser.Input.Keyboard.JustDown(key);
        const p = this.player;

        if (jd(k.exit)) {
            this.state = ST.WIN;
            this.stop();
        } else if (jd(k.lose)) {
            this.state = ST.LOSE;
            this.stop();
        }

        if (this.state === ST.PLAY) {
            if (p.isAlive() && p.state === STATE.NORMAL) {
                let vx = 0;
                if (k.left.isDown) vx -= p.getMaxSpeed();
                else if (k.right.isDown) vx += p.getMaxSpeed();

                if (jd(k.jump)) p.jump(false);
                if (jd(k.atk)) p.attack();
                else if (jd(k.aura)) p.attackAura();
                else if (jd(k.bite)) p.attackBite();
                else if (jd(k.shield)) p.shield();
                else if (jd(k.pause)) {
                    this.state = ST.PAUSE;
                    this.pauseFade.startFadeIn();
                }
                p.setVelocityX(vx);
            }
        } else if (this.state === ST.PAUSE) {
            if (jd(k.pause)) {
                this.state = ST.PLAY;
                this.pauseFade.startFadeOut();
            } else if (jd(k.up)) {
                this.pauseChoose -= 1;
            } else if (jd(k.down)) {
                this.pauseChoose += 1;
            } else if (jd(k.enter)) {
                if (this.pauseChoose === 1) {
                    this.state = ST.PLAY;
                    this.pauseFade.startFadeOut();
                } else if (this.pauseChoose === 2) {
                    this.state = ST.EXIT;
                    this.stop();
                }
            }
            this.pauseChoose = Math.max(1, Math.min(this.pauseChoose, 2));
        } else if (this.state === ST.WIN) {
            p.setVelocityX(0);
        } else if (this.state === ST.POPUP) {
            if (jd(k.enter)) this.popup.fadeOutStart();
        }
    }

    statePlay(dt) {
        const p = this.player;

        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = PLAY_TIME;
            p.rebirth();
            p.setY(0);
            p.setX(p.getX());
            if (p.state === STATE.DEAD) this.state = ST.LOSE;
        }

        if (!this.hasShowed && this.cfg.tutorial) {
            this.stateTime += dt;
            if (this.stateTime > TUTORIAL_SHOW) {
                this.state = ST.POPUP;
                this.hasShowed = true;
                this.popup.fadeInStart();
            }
        }

        this.updateCreature(p, dt);
        p.update(dt);

        if (p.state === STATE.DEAD) {
            p.rebirth();
            p.setY(0);
            p.setX(100);
            if (p.state === STATE.DEAD) this.state = ST.LOSE;
            if (this.bossStage) this.bossSprite.setHp(1);
        }

        const longRange = [];
        for (const s of this.map.sprites.slice()) {
            if (s.removed) continue;
            if (s.isCreature) {
                if (s.state === STATE.DEAD) {
                    s.removed = true;
                    p.setScore(p.getScore() + s.getScore());
                } else {
                    const lr = this.checkLongRangeAttack(s);
                    if (lr) longRange.push(lr);
                    this.updateCreature(s, dt);
                }
            }
            s.update(dt);
        }
        for (const lr of longRange) {
            lr.update(dt);
            this.map.addSprite(lr);
        }

        this.checkStatus();
    }

    stateWin(dt) {
        const p = this.player;
        this.updateCreature(p, dt);
        p.update(dt);
        for (const s of this.map.sprites.slice()) {
            if (s.removed) continue;
            if (s.isCreature) {
                if (s.isAura) this.updateCreature(s, dt);
                if (s.state === STATE.DEAD) s.removed = true;
            }
            s.update(dt);
        }
        this.durationElapsed += dt;
        this.checkStatus();
    }

    statePopup(dt) {
        this.popup.update(dt);
        if (this.popup.state === FADE.OUT && this.popup.isFinish()) {
            this.state = ST.PLAY;
        }
    }

    checkStatus() {
        if (this.state === ST.PLAY) {
            if (this.bossStage) {
                if (this.bossSprite.state === STATE.DEAD) {
                    this.player.setScore(this.bossSprite.getScore());
                    this.state = ST.WIN;
                }
            } else {
                const finishLine = tilesToPixels(this.map.width) - W / 2;
                if (this.player.getX() >= finishLine) this.state = ST.WIN;
            }
        } else if (this.state === ST.WIN) {
            if (this.durationElapsed > WINNING_DURATION) this.stop();
        } else if (this.state === ST.LOSE) {
            this.stop();
        }
    }

    // Stage.updateCreature: gravity, movement, tile collision and hit checks.
    updateCreature(c, dt) {
        const map = this.map;
        if (!c.isFlying()) {
            c.setVelocityY(c.dy + GRAVITY * dt);
        }

        // Horizontal
        const dx = c.dx;
        const newX = c.x + dx * dt;
        let tile = tileCollision(map, c, newX, c.y);
        if (tile === null) {
            c.setX(newX);
        } else if (!c.isFlame) {
            if (dx > 0) c.setX(tilesToPixels(tile.x) - c.w);
            else if (dx < 0) c.setX(tilesToPixels(tile.x + 1));
            c.collideHorizontal();
        }

        // Vertical
        const dy = c.dy;
        const newY = c.y + dy * dt;
        tile = tileCollision(map, c, c.x, newY);
        if (tile === null) {
            c.setY(newY);
        } else if (!c.isFlame) {
            if (dy > 0) c.setY(tilesToPixels(tile.y) - c.h);
            else if (dy < 0) c.setY(tilesToPixels(tile.y + 1));
            c.collideVertical();
        }

        if (c.isPlayer && c.y >= tilesToPixels(map.height)) {
            c.setState(STATE.DYING);
        }

        if (c.isPlayer || c.isAura || c.isBite) {
            this.checkCollisionFor(c);
        }
    }

    checkCollisionFor(c) {
        if (c.isDied()) return;
        const other = this.getSpriteCollision(c);
        if (other) c.notifyObjectCollision(other);
    }

    getSpriteCollision(sprite) {
        for (const other of this.map.sprites) {
            if (other.removed) continue;
            if (this.isCollision(sprite, other)) return other;
        }
        return null;
    }

    isCollision(s1, s2) {
        if (s1 === s2) return false;
        if (!s1.isPlayer) {
            if (s1.isCreature && !s1.isAlive()) return false;
            if (s2.isCreature && !s2.isAlive()) return false;
        } else if (!s1.isAlive()) {
            return false;
        }

        const s1x = Math.round(s1.x);
        const s1y = Math.round(s1.y);
        const s2x = Math.round(s2.x);
        const s2y = Math.round(s2.y);
        if (s1x < s2x + s2.w && s2x < s1x + s1.w &&
            s1y < s2y + s2.h && s2y < s1y + s1.h) {
            return rectsIntersect(s1.fitRect(), s2.fitRect());
        }
        return false;
    }

    checkLongRangeAttack(creature) {
        if (creature.isAbang && creature.state === STATE.ATTACK && creature.canShot()) {
            return creature.auraShot();
        }
        return null;
    }

    // Removes sprites flagged as removed (after the frame, like the Java iterator).
    removeDead() {
        this.map.sprites = this.map.sprites.filter((s) => {
            if (!s.removed) return true;
            if (s.view) {
                s.view.destroy();
                s.view = null;
            }
            return false;
        });
    }

    // --- Rendering ----------------------------------------------------------

    // TileMapRenderer.draw: camera offset from the player position.
    updateCamera() {
        const p = this.player;
        const mapW = tilesToPixels(this.map.width);
        const mapH = tilesToPixels(this.map.height);

        let offsetX = W / 2 - Math.round(p.x) - 64;
        offsetX = Math.min(offsetX, 0);
        offsetX = Math.max(offsetX, W - mapW);

        let offsetY = H / 2 - Math.round(p.y) - 64;
        offsetY = Math.min(offsetY, 0);
        offsetY = Math.max(offsetY, H - mapH);

        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.cameras.main.setScroll(-offsetX, -offsetY);
        this.tileLayer.update(offsetX, offsetY, W);
        this.bgParallax.updateFromOffset(offsetX);
        this.fgParallax.updateFromOffset(offsetX);
    }

    syncViews() {
        const p = this.player;
        const lift = p.isOnGround() ? PLAYER_DRAW_OFFSET : 0;
        p.view.setTexture(p.imageKey())
            .setPosition(p.x, p.y + lift)
            .setAlpha(p.drawAlpha());

        if (p.isGatotkaca && p.shieldSprite.view) {
            const on = p.isShieldOn();
            const sv = p.shieldSprite.view;
            sv.setVisible(on);
            if (on) {
                sv.setTexture(p.shieldSprite.imageKey())
                    .setPosition(p.x - 60, p.y - 42 + lift);
            }
        }

        for (const s of this.map.sprites) {
            if (!s.view) this.attach(s, 25);
            s.view.setTexture(s.imageKey())
                .setPosition(s.x, s.y + PLAYER_DRAW_OFFSET)
                .setAlpha(s.drawAlpha());
            // Creatures start walking once they are on screen (TileMapRenderer.draw).
            if (s.isCreature) {
                const screenX = Math.round(s.x) + this.offsetX;
                if (screenX >= 0 && screenX < W) s.wakeUp();
            }
        }
    }

    updateHud() {
        const p = this.player;

        // Java: one digit uses size 20 at (169,31), longer text uses size 15 at (166,29).
        const liveStr = String(p.getLive());
        const single = liveStr.length <= 1;
        this.liveText.setText(liveStr);
        this.liveText.setFontSize(single ? 20 : 15);
        this.liveText.setPosition(single ? 169 : 166, single ? 31 : 29);
        this.scoreText.setText('Score: ' + p.getScore());
        this.scoreText.setPosition(5, this.scoreY);

        const hp = p.getHp();
        this.hpBlank.clear();
        const hpX = 190 * hp;
        if (hpX !== 190) {
            this.hpBlank.fillStyle(0x2a2a2a, 1).fillRect(hpX, 2, 190 - hpX, 27);
        }
        if (p.isGatotkaca) {
            const mp = p.getMp();
            const mpX = 180 * mp;
            this.mpBlank.clear();
            if (mpX !== 180) {
                this.mpBlank.fillStyle(0x2a2a2a, 1).fillRect(mpX, 27, 180 - mpX, 20);
            }
        }

        this.timeText.setText('Time: ' + Math.ceil(this.timeLeft / 1000));

        if (this.bossStage) {
            const w = 468 * (1 - this.bossSprite.getHp());
            this.bossBarGfx.clear();
            if (w <= 468) this.bossBarGfx.fillStyle(0x2a2a2a, 1).fillRect(10, 12, w, 41);
        }

        // Pause menu and tutorial pop-up visibility.
        const paused = this.state === ST.PAUSE;
        this.pauseFade.show(paused);
        const menuVisible = paused && this.pauseFade.isFinish();
        this.pauseImages.forEach((img) => img.setVisible(menuVisible));
        this.pauseCursor.setVisible(menuVisible);
        if (menuVisible) {
            const entry = this.pauseImages[this.pauseChoose];
            this.pauseCursor.setPosition(entry.x - this.pauseCursor.width - 10, entry.y);
        }
        this.popup.view.setVisible(this.state === ST.POPUP);
    }

    // --- End of stage -------------------------------------------------------

    stop() {
        if (this.done) return;
        this.done = true;
        const result = this.state === ST.WIN ? RESULT.WIN
            : this.state === ST.LOSE ? RESULT.LOSE : RESULT.EXIT;
        finishScene(result);
    }
}
