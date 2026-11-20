// Port of tilegame/sprites/JabangTetuka.java and Gatotkaca.java.
// Method names follow the Java code. Where Java had a field and a method with
// the same name, the field is renamed (protoAura, shieldSprite, shieldOn).
import { Nature, STATE } from './base.js';
import { world } from '../core/world.js';

const INVISIBLE_TIME = 1000;
const BLINK_TIME = 50;

export class JabangTetuka extends Nature {
    // opts: { left,right } animations are passed as a map of pairs:
    //   run, dead, jump, idle, attack, hurt  -> { left, right }
    //   aura: AuraShot prototype
    //   sfx: { hurt, die, punch } sound keys
    constructor(opts) {
        const { run, dead, jump, idle, attack, hurt } = opts.anims;
        super(run.left, run.right, dead.left, dead.right, hurt.left, hurt.right,
            { hurt: opts.sfx.hurt, die: opts.sfx.die });
        this.jumpLeft = jump.left;
        this.jumpRight = jump.right;
        this.idleLeft = idle.left;
        this.idleRight = idle.right;
        this.attackLeft = attack.left;
        this.attackRight = attack.right;
        this.hurtLeft = hurt.left;
        this.hurtRight = hurt.right;
        this.anim = this.idleRight;
        this.protoAura = opts.aura;
        this.punchSfx = opts.sfx.punch || null;
        this.onGround = false;
        this.shotReady = true;
        this.inviTimeElapsed = 0;
        this.blinkTimeElapsed = 0;
        this.score = 0;
        this.live = 2;
        this.jumpSpeed = -0.6;
        this.setHp(1);
        this.setAttackDamage(0.1);
        this.setMaxSpeed(0.2);
    }

    // The player is never added to the sprite list; it is kept by the stage.
    get isPlayer() { return true; }

    setHp(hp) { super.setHp(Math.min(1, hp)); }

    setY(y) {
        if (Math.round(y) > Math.round(this.y)) {
            this.onGround = false;
        }
        this.y = y;
    }

    collideHorizontal() { this.setVelocityX(0); }

    collideVertical() {
        if (this.dy > 0) this.onGround = true;
        this.setVelocityY(0);
    }

    wakeUp() {}

    rebirth() {
        this.setHp(1);
        this.live -= 1;
        this.immune = true;
        this.setState(STATE.NORMAL);
        if (this.live < 0) this.setState(STATE.DEAD);
    }

    jump(forceJump) {
        if (this.onGround || forceJump) {
            this.onGround = false;
            this.setVelocityY(this.jumpSpeed);
        }
    }

    attack() {
        if (this.onGround) {
            world.playSfx(this.punchSfx);
            this.setState(STATE.ATTACK);
        }
    }

    attackAura() {}
    attackBite() {}
    shield() {}

    // JabangTetuka.update (player animation and invincibility blink).
    update(dt) {
        if (this.immune) {
            this.inviTimeElapsed += dt;
            this.blinkTimeElapsed += dt;
            if (this.inviTimeElapsed > INVISIBLE_TIME) {
                this.inviTimeElapsed = 0;
                this.immune = false;
            }
        }

        let newAnim = this.anim;
        if (this.state === STATE.ATTACK) {
            this.setVelocityX(0);
            if (this.isFacingRight()) {
                newAnim = this.attackRight;
                if (this.shotReady && newAnim.idx === 1) this.auraShot();
                if (this.attackRight.finished()) {
                    this.shotReady = true;
                    this.attackRight.start();
                    newAnim = this.idleRight;
                    this.setState(STATE.NORMAL);
                }
            } else {
                newAnim = this.attackLeft;
                if (this.shotReady && newAnim.idx === 1) this.auraShot();
                if (this.attackLeft.finished()) {
                    this.shotReady = true;
                    this.attackLeft.start();
                    newAnim = this.idleLeft;
                    this.setState(STATE.NORMAL);
                }
            }
        } else if (this.state === STATE.HURT) {
            this.setVelocityX(0);
            if (this.isFacingRight()) {
                newAnim = this.hurtRight;
                if (this.hurtRight.finished()) {
                    this.hurtRight.start();
                    newAnim = this.idleRight;
                    this.setState(STATE.NORMAL);
                }
            } else {
                newAnim = this.hurtLeft;
                if (this.hurtLeft.finished()) {
                    this.hurtLeft.start();
                    newAnim = this.idleLeft;
                    this.setState(STATE.NORMAL);
                }
            }
        } else if (!this.onGround) {
            newAnim = this.isFacingRight() ? this.jumpRight : this.jumpLeft;
        } else {
            if (this.dx === 0) {
                newAnim = this.isFacingRight() ? this.idleRight : this.idleLeft;
            }
            if (this.dx < 0) newAnim = this.left;
            else if (this.dx > 0) newAnim = this.right;
        }

        if (this.state === STATE.DYING) {
            newAnim = this.isFacingRight() ? this.deadRight : this.deadLeft;
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

    isAttackState() { return this.state === STATE.ATTACK; }

    isValidKill(badguy) {
        if (badguy.isImmune()) return false;
        if (this.isFacingRight()) return this.x <= badguy.x;
        return this.x > badguy.x;
    }

    // JabangTetuka.notifyObjectCollision: the player touched `s`.
    notifyObjectCollision(s) {
        if (this.state === STATE.HURT) return;

        if (s.isPowerUp) {
            s.removed = true;
            s.acquire();
            if (s.kind === 'live') {
                this.setLive(this.getLive() + s.getEffect());
            } else if (s.kind === 'kendi') {
                this.setHp(this.getHp() + s.getEffect());
            } else if (s.kind === 'star') {
                this.setMp(this.getMp() + s.getEffect());
            }
            this.setScore(this.getScore() + s.getScore());
        } else if (s.isFlame) {
            s.notifyObjectCollision(this);
        } else if (s.isNature) {
            const badguy = s;
            if (this.isAttackState() && !badguy.isImmune() && this.isValidKill(badguy)) {
                badguy.setHp(badguy.getHp() - this.getAttackDamage());
                badguy.damaged();
                if (badguy.isDied()) this.setScore(this.getScore() + badguy.getScore());
            } else if (badguy.state !== STATE.HURT && !this.isAttackState() && !this.isImmune()) {
                badguy.notifyObjectCollision(this);
            }
        }
    }

    getLive() { return this.live; }
    setLive(live) { this.live = live; }
    getScore() { return this.score; }
    setScore(score) { this.score = score; }

    setJumpSpeed(v) { this.jumpSpeed = v; }
    canShot() { return this.shotReady; }
    setCanShot(v) { this.shotReady = v; }

    // Small aura shot fired at the start of the attack animation.
    auraShot() {
        this.setCanShot(false);
        const a = this.protoAura.clone();
        a.setX(this.getX());
        a.setY(this.getY() + 32);
        if (this.isFacingRight()) a.shotRight();
        else a.shotLeft();
        world.map.addSprite(a);
    }

    isOnGround() { return this.onGround; }

    // Blink flag: true on frames where the player should be drawn faded.
    isBlink() {
        let blink = false;
        if (this.blinkTimeElapsed > BLINK_TIME) {
            this.blinkTimeElapsed %= BLINK_TIME;
            blink = true;
        }
        return blink;
    }

    drawAlpha() { return this.isBlink() ? 0.5 : 1; }

    // JabangTetuka.isImmune is inherited from Nature.
}

export class Gatotkaca extends JabangTetuka {
    // opts: as JabangTetuka plus
    //   bite: { left, right } (charging bite animation, 7 frames)
    //   auraPunch: { left, right }
    //   auraBig: GKAuraShot prototype
    //   biteShot: BiteShot prototype
    //   shieldSprite: Sprite with the shield animation
    //   sfx: also punch, auraPunch, bite, shield
    constructor(opts) {
        super(opts);
        this.biteLeft = opts.bite.left;
        this.biteRight = opts.bite.right;
        this.auraPunchLeft = opts.auraPunch.left;
        this.auraPunchRight = opts.auraPunch.right;
        this.protoAuraBig = opts.auraBig;
        this.protoBite = opts.biteShot;
        this.shieldSprite = opts.shieldSprite;
        this.shieldOn = false;
        this.punchSfx = opts.sfx.punch;
        this.auraPunchSfx = opts.sfx.auraPunch;
        this.biteSfx = opts.sfx.bite;
        this.shieldSfx = opts.sfx.shield;
        this.setJumpSpeed(-0.9);
        this.setHp(1);
        this.setAttackDamage(0.1);
        this.setMaxSpeed(0.5);
        this.setMp(1);
    }

    get isGatotkaca() { return true; }

    isShieldOn() {
        if (this.mp > 0) return this.shieldOn;
        this.shieldOn = false;
        return false;
    }

    isImmune() {
        return this.isShieldOn() || this.immune;
    }

    isAttackState() {
        return this.state === STATE.ATTACK || this.state === STATE.AURA || this.isShieldOn();
    }

    isValidKill(badguy) {
        if (badguy.isImmune()) return false;
        if (this.isShieldOn()) return true;
        return super.isValidKill(badguy);
    }

    getAttackDamage() {
        let damage = super.getAttackDamage();
        if (this.state === STATE.AURA) damage *= 2;
        return damage;
    }

    attackAura() {
        const temp = this.getMp() - 0.1;
        if (temp >= 0) {
            world.playSfx(this.auraPunchSfx);
            this.setState(STATE.AURA);
            this.setMp(this.getMp() - 0.1);
        }
    }

    attackBite() {
        const temp = this.getMp() - 0.2;
        if (temp >= 0) {
            this.setState(STATE.BITE);
            this.setMp(this.getMp() - 0.2);
        }
    }

    shield() {
        this.shieldOn = !this.shieldOn;
        if (this.shieldOn && this.getMp() > 0) {
            world.playSfx(this.shieldSfx);
        }
    }

    rebirth() {
        this.setMp(1);
        super.rebirth();
    }

    // Collision box is the shield while it is up (Gatotkaca.getFitRectangle).
    fitRect() {
        if (!this.isShieldOn()) return super.fitRect();
        const s = this.shieldSprite;
        return { x: s.x, y: s.y, w: s.w, h: s.h };
    }

    // Gatotkaca.update
    update(dt) {
        if (this.isShieldOn()) this.setMp(this.getMp() - 0.001);
        this.shieldSprite.update(dt);

        if (this.immune) {
            this.inviTimeElapsed += dt;
            this.blinkTimeElapsed += dt;
            if (this.inviTimeElapsed > INVISIBLE_TIME) {
                this.inviTimeElapsed = 0;
                this.immune = false;
            }
        }

        let newAnim = this.anim;
        if (this.state === STATE.ATTACK) {
            this.setVelocityX(0);
            if (this.isFacingRight()) {
                newAnim = this.attackRight;
                if (this.canShot() && newAnim.idx === 1) this.auraShot();
                if (this.attackRight.finished()) {
                    this.setCanShot(true);
                    this.attackRight.start();
                    newAnim = this.idleRight;
                    this.setState(STATE.NORMAL);
                }
            } else {
                newAnim = this.attackLeft;
                if (this.canShot() && newAnim.idx === 1) this.auraShot();
                if (this.attackLeft.finished()) {
                    this.setCanShot(true);
                    this.attackLeft.start();
                    newAnim = this.idleLeft;
                    this.setState(STATE.NORMAL);
                }
            }
        } else if (this.state === STATE.HURT) {
            this.setVelocityX(0);
            if (this.isFacingRight()) {
                newAnim = this.hurtRight;
                if (this.hurtRight.finished()) {
                    this.hurtRight.start();
                    newAnim = this.idleRight;
                    this.setState(STATE.NORMAL);
                }
            } else {
                newAnim = this.hurtLeft;
                if (this.hurtLeft.finished()) {
                    this.hurtLeft.start();
                    newAnim = this.idleLeft;
                    this.setState(STATE.NORMAL);
                }
            }
        } else if (this.state === STATE.AURA) {
            const speed = this.getMaxSpeed() * 2;
            if (this.isFacingRight()) {
                this.setVelocityX(speed);
                newAnim = this.auraPunchRight;
                if (this.canShot() && newAnim.idx === 1) this.auraBigShot();
                if (this.auraPunchRight.finished()) {
                    this.setCanShot(true);
                    this.auraPunchRight.start();
                    newAnim = this.idleRight;
                    this.setState(STATE.NORMAL);
                }
            } else {
                this.setVelocityX(-speed);
                newAnim = this.auraPunchLeft;
                if (this.canShot() && newAnim.idx === 1) this.auraBigShot();
                if (this.auraPunchLeft.finished()) {
                    this.setCanShot(true);
                    this.auraPunchLeft.start();
                    newAnim = this.idleRight; // as in the original code
                    this.setState(STATE.NORMAL);
                }
            }
        } else if (this.state === STATE.BITE) {
            this.setVelocityX(0);
            if (this.isFacingRight()) {
                newAnim = this.biteRight;
                if (this.canShot() && this.biteRight.idx === 6) this.biteShot();
                if (this.biteRight.finished()) {
                    this.setCanShot(true);
                    this.biteRight.start();
                    newAnim = this.idleRight;
                    this.setState(STATE.NORMAL);
                }
            } else {
                newAnim = this.biteLeft;
                if (this.canShot() && this.biteLeft.idx === 6) this.biteShot();
                if (this.biteLeft.finished()) {
                    this.setCanShot(true);
                    this.biteLeft.start();
                    newAnim = this.idleLeft;
                    this.setState(STATE.NORMAL);
                }
            }
        } else if (!this.onGround) {
            newAnim = this.isFacingRight() ? this.jumpRight : this.jumpLeft;
        } else {
            if (this.dx === 0) {
                newAnim = this.isFacingRight() ? this.idleRight : this.idleLeft;
            }
            if (this.dx < 0) newAnim = this.left;
            else if (this.dx > 0) newAnim = this.right;
        }

        if (this.state === STATE.DYING) {
            newAnim = this.isFacingRight() ? this.deadRight : this.deadLeft;
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

    // Big aura punch projectile.
    auraBigShot() {
        this.setCanShot(false);
        const a = this.protoAuraBig.clone();
        a.setMaxSpeed(this.getMaxSpeed() * 2);
        a.setX(this.getX());
        a.setY(this.getY() + 32);
        if (this.isFacingRight()) a.shotRight();
        else a.shotLeft();
        world.map.addSprite(a);
    }

    // Bite projectile.
    biteShot() {
        world.playSfx(this.biteSfx);
        this.setCanShot(false);
        const b = this.protoBite.clone();
        b.setMaxSpeed(this.getMaxSpeed());
        b.setX(this.getX());
        b.setY(this.getY() - 32);
        if (this.isFacingRight()) b.shotRight();
        else b.shotLeft();
        world.map.addSprite(b);
    }

    // Small aura for the normal attack (overrides JabangTetuka.auraShot).
    auraShot() {
        this.setCanShot(false);
        const a = this.protoAura.clone();
        a.setY(this.getY() + 55);
        if (this.isFacingRight()) {
            a.setX(this.getX() + 90);
            a.shotRight();
        } else {
            a.setX(this.getX() - 3);
            a.shotLeft();
        }
        world.map.addSprite(a);
    }

    // Get the player's blink flag and the shield state for drawing.
    drawAlpha() { return this.isBlink() ? 0.5 : 1; }
}
