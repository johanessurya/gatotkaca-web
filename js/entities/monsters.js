// Port of the projectile and enemy classes:
// AuraShot, GKAuraShot, Flame, ClawShot, BiteShot (shots.java) and
// ButoIjo, ButoAbang, Nagapecona.
//
// Java uses instanceof for collision rules. Here objects carry flags instead:
//   isEnemy  - ButoIjo and its subclasses (ButoAbang, Nagapecona)
//   isPlayer - JabangTetuka and Gatotkaca
//   isGatotkaca - Gatotkaca only
import { Creature, Nature, STATE } from './base.js';

// --- Shots ------------------------------------------------------------------

export class AuraShot extends Creature {
    constructor(left, right, deadLeft, deadRight, hp = 0.1, damage = 0.1, speed = 0.4) {
        super(left, right, deadLeft, deadRight);
        this.setHp(hp);
        this.setAttackDamage(damage);
        this.setMaxSpeed(speed);
    }

    isFlying() { return true; }

    collideHorizontal() { this.setState(STATE.DYING); }

    clone() {
        return new AuraShot(this.left.clone(), this.right.clone(),
            this.deadLeft.clone(), this.deadRight.clone(),
            this.hp, this.damage, this.speed);
    }

    update(dt) {
        super.update(dt);
        if (this.anim.finished() && this.state === STATE.NORMAL) {
            this.setState(STATE.DYING);
        }
    }

    notifyObjectCollision(other) {
        if (other.isEnemy && !other.isImmune()) {
            other.setHp(other.getHp() - this.getAttackDamage());
            other.damaged();
            this.setState(STATE.DEAD);
        }
    }
}

// Gatotkaca's big aura punch projectile. Hits enemies without dying itself.
export class GKAuraShot extends AuraShot {
    constructor(left, right, deadLeft, deadRight) {
        super(left, right, deadLeft, deadRight, 0.1, 0.1, 0.5);
    }

    clone() {
        return new GKAuraShot(this.left.clone(), this.right.clone(),
            this.deadLeft.clone(), this.deadRight.clone());
    }

    notifyObjectCollision(other) {
        if (other.isEnemy) {
            other.setHp(other.getHp() - this.getAttackDamage());
            other.damaged();
        }
    }
}

// Flame from Buto Abang. Not clipped by tiles (see Stage.updateCreature).
export class Flame extends AuraShot {
    constructor(left, right, deadLeft, deadRight, hp, damage, speed) {
        super(left, right, deadLeft, deadRight, hp, damage, speed);
    }

    notifyObjectCollision(other) {
        if (other.isGatotkaca) {
            if (!other.isShieldOn()) {
                other.setHp(other.getHp() - this.getAttackDamage());
                other.damaged();
            }
        } else if (other.isPlayer) {
            other.setHp(other.getHp() - this.getAttackDamage());
            other.damaged();
        }
    }

    clone() {
        return new Flame(this.left.clone(), this.right.clone(),
            this.deadLeft.clone(), this.deadRight.clone(),
            this.hp, this.damage, this.speed);
    }
}

// Long hand shot from Nagapecona. Only hurts the player.
export class ClawShot extends Flame {
    constructor(left, right, hp, damage, speed) {
        super(left, right, left.clone(), right.clone(), hp, damage, speed);
    }

    // ClawShot.update: picks the animation by facing, no start() on switch.
    update(dt) {
        const newAnim = this.isFacingRight() ? this.right : this.left;
        if (this.anim !== newAnim) {
            this.anim = newAnim;
        } else {
            this.anim.update(dt);
        }
        if (this.anim.finished()) {
            this.setState(STATE.DEAD);
        }
    }

    notifyObjectCollision(other) {
        if (other.isPlayer && !other.isImmune()) {
            other.setHp(other.getHp() - this.getAttackDamage());
            other.damaged();
            this.setState(STATE.DEAD);
        }
    }

    clone() {
        return new ClawShot(this.left.clone(), this.right.clone(),
            this.hp, this.damage, this.speed);
    }
}

// Bite projectile from Gatotkaca.
export class BiteShot extends Creature {
    constructor(left, right, deadLeft, deadRight) {
        super(left, right, deadLeft, deadRight);
        this.setHp(0.2);
        this.setAttackDamage(0.1);
        this.setMaxSpeed(0.1);
    }

    isFlying() { return true; }

    collideHorizontal() { this.setState(STATE.DYING); }

    clone() {
        return new BiteShot(this.left.clone(), this.right.clone(),
            this.deadLeft.clone(), this.deadRight.clone());
    }

    notifyObjectCollision(other) {
        if (other.isEnemy) {
            other.setHp(other.getHp() - this.getAttackDamage());
            other.damaged();
            this.setHp(this.getHp() - other.getAttackDamage());
            if (this.isDied()) {
                this.setState(STATE.DYING);
            }
        }
    }
}

// --- Enemies ----------------------------------------------------------------

export class ButoIjo extends Nature {
    constructor(left, right, deadLeft, deadRight, hurtLeft, hurtRight, sfx) {
        super(left, right, deadLeft, deadRight, hurtLeft, hurtRight, sfx);
        this.setHp(0.25);
        this.setMaxSpeed(0.05);
        this.setAttackDamage(0.05);
    }

    // Touching the player hurts the player (ButoIjo.notifyObjectCollision).
    notifyObjectCollision(other) {
        other.setHp(other.getHp() - this.getAttackDamage());
        other.damaged();
    }

    getScore() { return 200; }
}
ButoIjo.prototype.isEnemy = true;

export class ButoAbang extends ButoIjo {
    constructor(left, right, deadLeft, deadRight, attackLeft, attackRight,
        hurtLeft, hurtRight, flame, sfx) {
        super(left, right, deadLeft, deadRight, hurtLeft, hurtRight, sfx);
        this.attackLeft = attackLeft;
        this.attackRight = attackRight;
        this.flame = flame;
        this.tempFlame = flame.clone();
        this.shotReady = true;
        this.attackTimeElapsed = 0;
        this.setHp(0.3);
        this.setAttackDamage(0.1);
        this.setMaxSpeed(0.1);
    }

    static get ATTACK_TIME() { return 2000; }

    isAttackTime() {
        let attack = false;
        if (this.attackTimeElapsed > ButoAbang.ATTACK_TIME) {
            this.attackTimeElapsed %= ButoAbang.ATTACK_TIME;
            attack = true;
        }
        return attack;
    }

    update(dt) {
        if (!this.isAttackTime()) this.attackTimeElapsed += dt;

        let newAnim = this.anim;
        if (this.state === STATE.NORMAL) {
            newAnim = this.isFacingRight() ? this.right : this.left;
            if (this.isAttackTime()) this.setState(STATE.ATTACK);
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
            this.tempFlame.setState(STATE.DEAD);
        } else if (this.state === STATE.ATTACK) {
            this.setVelocityX(0);
            if (!this.isFacingRight()) {
                newAnim = this.attackLeft;
                if (this.attackLeft.finished()) {
                    this.shotReady = true;
                    this.attackLeft.start();
                    this.attackTimeElapsed = 0;
                    newAnim = this.left;
                    this.setVelocityX(-this.getMaxSpeed());
                    this.setState(STATE.NORMAL);
                    this.tempFlame.setState(STATE.DEAD);
                }
            } else {
                newAnim = this.attackRight;
                if (this.attackRight.finished()) {
                    this.shotReady = true;
                    this.attackRight.start();
                    this.attackTimeElapsed = 0;
                    newAnim = this.right;
                    this.setVelocityX(this.getMaxSpeed());
                    this.setState(STATE.NORMAL);
                    this.tempFlame.setState(STATE.DEAD);
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

    canShot() { return this.shotReady; }
    setCanShot(v) { this.shotReady = v; }

    // Spawns the flame in front of the monster and returns it.
    auraShot() {
        this.setCanShot(false);
        const f = this.flame.clone();
        f.setY(this.getY() + 40);
        if (this.isFacingRight()) {
            f.setX(this.getX() + 181);
            f.shotRight();
        } else {
            f.setX(this.getX() - 290);
            f.shotLeft();
        }
        this.tempFlame = f;
        return f;
    }

    getScore() { return 400; }
}
ButoAbang.prototype.isEnemy = true;

// Final boss (stage "bossjt" and "bossgk"). Uses the ButoAbang logic with its own timers.
export class Nagapecona extends ButoAbang {
    constructor(flyLeft, flyRight, deadLeft, deadRight, hurtLeft, hurtRight,
        attackLeft, attackRight, longShot, sfx) {
        super(flyLeft, flyRight, deadLeft, deadRight, attackLeft, attackRight,
            hurtLeft, hurtRight, longShot, sfx);
        this.attackLeft = attackLeft;
        this.attackRight = attackRight;
        this.longShot = longShot;
        this.anim = this.left;
        this.setHp(1);
        this.setAttackDamage(0.1);
        this.setMaxSpeed(0.2);
        this.inviTimeElapsed = 0;
        this.blinkTimeElapsed = 0;
        this.attackTimeElapsed = 0;
    }

    static get INVISIBLE_TIME() { return 5000; }
    static get BLINK_TIME() { return 50; }
    static get ATTACK_TIME() { return 2000; }

    isAttackTime() {
        let attack = false;
        if (this.attackTimeElapsed > Nagapecona.ATTACK_TIME) {
            this.attackTimeElapsed %= Nagapecona.ATTACK_TIME;
            attack = true;
        }
        return attack;
    }

    isBlink() {
        let blink = false;
        if (this.blinkTimeElapsed >= Nagapecona.BLINK_TIME) {
            this.blinkTimeElapsed %= Nagapecona.BLINK_TIME;
            blink = true;
        }
        return blink;
    }

    drawAlpha() { return this.isBlink() ? 0.5 : 1; }

    getAttackDamage() { return 0.1; }

    update(dt) {
        if (this.immune) {
            this.inviTimeElapsed += dt;
            this.blinkTimeElapsed += dt;
            if (this.inviTimeElapsed >= Nagapecona.INVISIBLE_TIME) {
                this.inviTimeElapsed = 0;
                this.immune = false;
            }
        }
        if (!this.isAttackTime()) this.attackTimeElapsed += dt;

        let newAnim = this.anim;
        if (this.state === STATE.NORMAL) {
            newAnim = this.isFacingRight() ? this.right : this.left;
            if (this.isAttackTime()) this.setState(STATE.ATTACK);
        } else if (this.state === STATE.DYING) {
            newAnim = this.isFacingRight() ? this.deadRight : this.deadLeft;
        } else if (this.state === STATE.HURT) {
            this.setVelocityX(0);
            this.immune = true;
            if (this.isFacingRight()) {
                newAnim = this.hurtRight;
                if (this.hurtRight.finished()) {
                    this.hurtRight.start();
                    newAnim = this.right;
                    this.setVelocityX(this.getMaxSpeed());
                    this.setState(STATE.NORMAL);
                }
            } else {
                newAnim = this.hurtLeft;
                if (this.hurtLeft.finished()) {
                    this.hurtLeft.start();
                    newAnim = this.left;
                    this.setVelocityX(-this.getMaxSpeed());
                    this.setState(STATE.NORMAL);
                }
            }
        } else if (this.state === STATE.ATTACK) {
            this.setVelocityX(0);
            if (!this.isFacingRight()) {
                newAnim = this.attackLeft;
                if (newAnim.finished()) {
                    this.setCanShot(true);
                    this.attackLeft.start();
                    this.attackTimeElapsed = 0;
                    newAnim = this.left;
                    this.setVelocityX(-this.getMaxSpeed());
                    this.setState(STATE.NORMAL);
                }
            } else {
                newAnim = this.attackRight;
                if (newAnim.finished()) {
                    this.setCanShot(true);
                    this.attackRight.start();
                    this.attackTimeElapsed = 0;
                    newAnim = this.right;
                    this.setVelocityX(this.getMaxSpeed());
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

    // Long hand claw projectile (overrides the flame of ButoAbang).
    auraShot() {
        this.setCanShot(false);
        const c = this.longShot.clone();
        c.setY(this.getY() + 18);
        if (this.isFacingRight()) {
            c.setX(this.getX() + 84);
            c.shotRight();
        } else {
            c.setX(this.getX() - 211);
            c.shotLeft();
        }
        return c;
    }

    getScore() { return 1000; }
}
Nagapecona.prototype.isEnemy = true;
Nagapecona.prototype.isBoss = true;

// Flame and ClawShot (Java: instanceof Flame).
Flame.prototype.isFlame = true;

// Java: instanceof AuraShot (includes Flame, ClawShot, GKAuraShot) and BiteShot,
// and instanceof ButoAbang (includes Nagapecona).
AuraShot.prototype.isAura = true;
BiteShot.prototype.isBite = true;
ButoAbang.prototype.isAbang = true;
