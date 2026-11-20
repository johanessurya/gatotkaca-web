// Port of tilegame/sprites/PowerUp.java (Live, Kendi, Star).
// Effects and scores match the Java values.
import { Sprite } from './base.js';
import { world } from '../core/world.js';

const SFX = { live: 'lifeup', kendi: 'kendi', star: 'waskita' };
const EFFECT = { live: 1, kendi: 0.2, star: 0.1 };
const SCORE = { live: 1000, kendi: 100, star: 100 };

export class PowerUp extends Sprite {
    constructor(anim, kind) {
        super(anim);
        this.kind = kind;
    }

    get isPowerUp() { return true; }
    getEffect() { return EFFECT[this.kind]; }
    getScore() { return SCORE[this.kind]; }
    acquire() { world.playSfx(SFX[this.kind]); }

    clone() {
        return new PowerUp(this.anim.clone(), this.kind);
    }
}
