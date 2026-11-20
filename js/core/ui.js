// Shared UI pieces ported from tilegame/background/*, tilemap/FramePopUp.java,
// graphics/PauseAnimation.java and util/Save.java / HighScoreManager.java.
import { Anim } from './anim.js';

export const FADE = { IN: 0, NORMAL: 1, OUT: 2 };

// Full-screen image that scrolls horizontally with a wrap-around copy
// (Parallax.java). Positions are screen positions (scrollFactor 0).
export class Parallax {
    constructor(scene, key, speed, frameWidth, depth) {
        this.speed = speed;
        this.frameWidth = frameWidth;
        this.x = 0;
        this.imgW = scene.textures.get(key).getSourceImage().width;
        this.a = scene.add.image(0, 0, key).setOrigin(0, 0).setScrollFactor(0).setDepth(depth);
        this.b = scene.add.image(0, 0, key).setOrigin(0, 0).setScrollFactor(0).setDepth(depth).setVisible(false);
    }

    // Stage: offset is the camera offset (negative when the camera moves right).
    updateFromOffset(offsetX) {
        this.x = this.speed * offsetX;
        this.x %= this.frameWidth;
        this.place();
    }

    // Menus: moves with elapsed time.
    updateFromTime(dt) {
        this.x += this.speed * dt;
        this.x %= this.frameWidth;
        this.place();
    }

    place() {
        this.a.setPosition(this.x, 0).setVisible(true);
        if (this.x > 0) {
            this.b.setPosition(this.x - this.imgW, 0).setVisible(true);
        } else if (this.x < 0) {
            this.b.setPosition(this.x + this.imgW, 0).setVisible(true);
        } else {
            this.b.setVisible(false);
        }
    }

    destroy() {
        this.a.destroy();
        this.b.destroy();
    }
}

// Tutorial / story pop-up that fades in and out (FramePopUp.java).
export class FramePopUp {
    constructor(scene, key, x, y, depth, onSound) {
        const fades = (from, to) => {
            const frames = [];
            let acc = from;
            for (let i = 0; i <= 10; i++) {
                frames.push({ key, alpha: acc, duration: 50 });
                acc = Math.min(1, Math.max(0, acc + (to > from ? 0.1 : -0.1)));
            }
            return frames;
        };
        this.fadeIn = new Anim(fades(0, 1), false);
        this.fadeOut = new Anim(fades(1, 0), false);
        this.normal = new Anim([{ key, alpha: 1, duration: 100 }], false);
        this.anim = this.fadeIn;
        this.state = FADE.IN;
        this.fadeIn.start();
        this.onSound = onSound;
        this.view = scene.add.image(x, y, key).setOrigin(0, 0).setDepth(depth);
        this.view.setScrollFactor(0);
        this.view.setVisible(false);
        this.scene = scene;
    }

    update(dt) {
        let next = this.anim;
        if (this.state === FADE.IN) {
            next = this.fadeIn;
            if (this.fadeIn.finished()) {
                this.fadeIn.start();
                this.state = FADE.NORMAL;
            }
        } else if (this.state === FADE.OUT) {
            next = this.fadeOut;
            if (this.fadeOut.finished()) {
                this.fadeOut.start();
                this.state = FADE.NORMAL;
            }
        } else {
            next = this.normal;
        }
        if (this.anim !== next) {
            this.anim = next;
            this.anim.start();
        } else {
            this.anim.update(dt);
        }
        this.render();
    }

    render() {
        const f = this.anim.frame();
        this.view.setVisible(true).setAlpha(f.alpha);
    }

    isFinish() { return this.anim.finished(); }

    fadeInStart() {
        this.state = FADE.IN;
        this.fadeIn.start();
        this.scene.sound.play(this.onSound);
    }

    fadeOutStart() {
        this.state = FADE.OUT;
        this.fadeOut.start();
        this.scene.sound.play(this.onSound);
    }

    destroy() { this.view.destroy(); }
}

// Black overlay that fades to 50% while paused (PauseAnimation.java).
export class PauseFade {
    constructor(scene, depth) {
        const fadeIn = [];
        for (let t = 0; t <= 0.5001; t += 0.1) fadeIn.push({ alpha: t, duration: 50 });
        const fadeOut = [];
        for (let t = 1; t >= 0.4999; t -= 0.1) fadeOut.push({ alpha: t, duration: 50 });
        this.inAnim = new Anim(fadeIn, false);
        this.outAnim = new Anim(fadeOut, false);
        this.anim = this.inAnim;
        this.view = scene.add.rectangle(0, 0, 1024, 768, 0x000000, 1)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(depth).setVisible(false);
    }

    startFadeIn() { this.anim = this.inAnim; this.anim.start(); }
    startFadeOut() { this.anim = this.outAnim; this.anim.start(); }
    update(dt) { this.anim.update(dt); this.view.setAlpha(this.anim.frame().alpha); }
    isFinish() { return this.anim.finished(); }
    show(v) { this.view.setVisible(v); }
    destroy() { this.view.destroy(); }
}
