// Port of graphics/Sprite.java, tilegame/sprites/Creature.java and Nature.java.
// Units match the Java code: positions in pixels, velocities in pixels per ms.

import { world } from '../core/world.js';

export const STATE = {
    NORMAL: 0,
    DYING: 1,
    DEAD: 2,
    HURT: 3,
    ATTACK: 4,   // JabangTetuka / ButoAbang attack
    AURA: 5,     // Gatotkaca aura punch
    BITE: 6,     // Gatotkaca bite
};

export class Sprite {
    constructor(anim) {
        this.anim = anim;
        this.x = 0;
        this.y = 0;
        this.dx = 0;
        this.dy = 0;
        this.facing = true;   // isFacingRight()
        this.removed = false; // set when taken out of the stage
        this.view = null;     // Phaser image, attached by the stage
        this.alpha = 1;
    }

    get w() { return this.anim.frame().w; }
    get h() { return this.anim.frame().h; }

    getX() { return this.x; }
    getY() { return this.y; }
    setX(x) { this.x = x; }
    setY(y) { this.y = y; }

    setVelocityX(dx) {
        this.dx = dx;
        if (dx !== 0) this.facing = dx > 0;
    }

    setVelocityY(dy) { this.dy = dy; }

    isFacingRight() { return this.facing; }

    // Collision rectangle in world pixels (Sprite.getFitRectangle).
    fitRect() {
        const r = this.anim.frame().rect;
        return { x: r.x + this.x, y: r.y + this.y, w: r.w, h: r.h };
    }

    update(dt) {
        this.x += this.dx * dt;
        this.y += this.dy * dt;
        this.anim.update(dt);
    }

    // Texture key of the current frame.
    imageKey() { return this.anim.frame().key; }

    // Called by the stage before drawing (blink effects etc.).
    drawAlpha() { return 1; }
}

export class Creature extends Sprite {
    constructor(left, right, deadLeft, deadRight) {
        super(right);
        this.left = left;
        this.right = right;
        this.deadLeft = deadLeft;
        this.deadRight = deadRight;
        this.state = STATE.NORMAL;
        this.hp = 0;
        this.mp = 0;
        this.damage = 0;
        this.speed = 0;
    }

    wakeUp() {
        if (this.state === STATE.NORMAL && this.dx === 0) {
            this.setVelocityX(-this.getMaxSpeed());
        }
    }

    setState(state) {
        if (this.state !== state) {
            this.state = state;
            if (state === STATE.DYING) {
                this.setVelocityX(0);
                this.setVelocityY(0);
            }
        }
    }

    isAlive() { return this.state === STATE.NORMAL; }
    isFlying() { return false; }

    collideHorizontal() { this.setVelocityX(-this.dx); }
    collideVertical() { this.setVelocityY(0); }

    update(dt) {
        let newAnim = this.anim;
        if (this.dx < 0) newAnim = this.left;
        else if (this.dx > 0) newAnim = this.right;

        if (this.state === STATE.DYING && newAnim === this.left) newAnim = this.deadLeft;
        else if (this.state === STATE.DYING && newAnim === this.right) newAnim = this.deadRight;

        if (this.anim !== newAnim) {
            this.anim = newAnim;
            this.anim.start();
        } else {
            this.anim.update(dt);
        }

        if (this.state === STATE.DYING && this.anim.finished()) {
            this.setState(STATE.DEAD);
        }
    }

    getHp() { return this.hp; }
    getMp() { return this.mp; }
    setHp(hp) { this.hp = Math.max(hp, 0); }
    setMp(mp) { this.mp = Math.min(1, Math.max(mp, 0)); }
    setAttackDamage(d) { this.damage = d; }
    getAttackDamage() { return this.damage; }
    getMaxSpeed() { return this.speed; }
    setMaxSpeed(s) { this.speed = s; }
    isDied() { return this.hp <= 0; }
    getScore() { return 0; }
    shotLeft() { this.setVelocityX(-this.getMaxSpeed()); }
    shotRight() { this.setVelocityX(this.getMaxSpeed()); }

    // Overridden by subclasses (Collision interface).
    notifyObjectCollision() {}
}

export class Nature extends Creature {
    constructor(left, right, deadLeft, deadRight, hurtLeft, hurtRight, sfx) {
        super(left, right, deadLeft, deadRight);
        this.hurtLeft = hurtLeft;
        this.hurtRight = hurtRight;
        this.sfx = sfx;            // { hurt: key|null, die: key|null }
        this.immune = false;
    }

    isAlive() {
        return this.state !== STATE.DYING && this.state !== STATE.DEAD;
    }

    isImmune() { return this.immune; }

    // Nature.update
    update(dt) {
        let newAnim = this.anim;
        if (this.state === STATE.NORMAL) {
            newAnim = this.isFacingRight() ? this.right : this.left;
        } else if (this.state === STATE.DYING) {
            newAnim = this.isFacingRight() ? this.deadRight : this.deadLeft;
        } else if (this.state === STATE.HURT) {
            this.setVelocityX(0);
            this.immune = true;
            if (this.isFacingRight()) {
                newAnim = this.hurtRight;
                if (this.hurtRight.finished()) {
                    this.immune = false;
                    this.hurtRight.start();
                    newAnim = this.right;
                    this.setVelocityX(this.getMaxSpeed());
                    this.setState(STATE.NORMAL);
                }
            } else {
                newAnim = this.hurtLeft;
                if (this.hurtLeft.finished()) {
                    this.immune = false;
                    this.hurtLeft.start();
                    newAnim = this.left;
                    this.setVelocityX(-this.getMaxSpeed());
                    this.setState(STATE.NORMAL);
                }
            }
        }

        if (this.anim !== newAnim) {
            this.anim = newAnim;
            this.anim.start();
        } else {
            this.anim.update(dt);
        }

        if (this.state === STATE.DYING && this.anim.finished()) {
            this.setState(STATE.DEAD);
        }
    }

    // Nature.damaged: play sound and switch to hurt or dying.
    damaged() {
        this.immune = true;
        if (this.getHp() <= 0) {
            world.playSfx(this.sfx.die);
            this.setState(STATE.DYING);
        } else {
            world.playSfx(this.sfx.hurt);
            this.setState(STATE.HURT);
        }
    }
}

// Instances of Nature are the enemies and the player (Java: instanceof Nature).
Nature.prototype.isNature = true;

// Java: instanceof Creature
Creature.prototype.isCreature = true;
