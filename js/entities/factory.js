// Creates game objects and their animations.
// Frame timings and sprite file names are taken from tilemap/ResourceManager.java.
import { Anim, sequenceFrames, namedFrames, plainFrames, frameOf } from '../core/anim.js';
import { Sprite } from './base.js';
import { AuraShot, GKAuraShot, Flame, ClawShot, BiteShot, ButoIjo, ButoAbang, Nagapecona } from './monsters.js';
import { JabangTetuka, Gatotkaca } from './player.js';
import { PowerUp } from './powerup.js';

let defs = null;

// Frame lists for the animations used by the game. Built once after assets load.
function build(scene) {
    const seq = (base, n, delays) => sequenceFrames(scene, base, n, delays);
    // Reorders frames and sets per-frame durations (used for idle, aura, bite patterns).
    const remap = (set, order, durations) => ({
        left: order.map((i, k) => ({ ...set.left[i], duration: durations[k] })),
        right: order.map((i, k) => ({ ...set.right[i], duration: durations[k] })),
    });
    const names = (list, delays) => namedFrames(scene, list, delays);

    const flameOrder = [0, 1, 0, 1, 0, 1, 0, 1];
    const flameSet = names(['butoabang/flame1.png', 'butoabang/flame2.png'], 300);
    const clawOrder = [0, 1, 2, 3, 2, 1, 0];
    const clawSet = names(['nagapecona/longshot1.png', 'nagapecona/longshot2.png',
        'nagapecona/longshot3.png', 'nagapecona/longshot4.png'], 100);

    return {
        // Jabang Tetuka
        jtRun: seq('jabangtetuka/run', 4, 100),
        jtHurt: seq('jabangtetuka/hurt', 1, 100),
        jtJump: seq('jabangtetuka/jump', 1, 100),
        jtIdle: remap(seq('jabangtetuka/idle', 2, 0), [0, 1, 0, 1, 0, 1], [200, 200, 800, 200, 200, 200]),
        jtAttack: seq('jabangtetuka/attack', 2, [100, 800]),
        jtAura: seq('jabangtetuka/aurashot', 4, 200),

        // Gatotkaca
        gkRun: seq('gatotkaca/run', 10, 100),
        gkHurt: seq('gatotkaca/hurt', 1, 100),
        gkJump: seq('gatotkaca/jump', 1, 100),
        gkIdle: seq('gatotkaca/idle', 3, 300),
        gkAttack: seq('gatotkaca/attack', 3, 100),
        gkAuraPunch: seq('gatotkaca/aurapunch', 2, [500, 200]),
        gkBite: seq('gatotkaca/biteaction', 7, [100, 100, 100, 100, 100, 100, 300]),
        gkBall: seq('gatotkaca/ball/ball', 40, 35),
        gkAuraSmall: seq('gatotkaca/smallaurashot', 1, 400),
        gkSmallBroken: seq('gatotkaca/smallbroken', 1, 100),
        gkAuraBig: seq('gatotkaca/aurashot', 1, 500),
        gkBroken: seq('gatotkaca/broken', 1, 100),
        gkBiteShot: seq('gatotkaca/bite', 2, 200),
        gkBiteDie: seq('gatotkaca/bite', 1, 10),

        // Buto Ijo / Buto Abang
        bijRun: seq('butoijo/run', 4, 300),
        bijDie: seq('butoijo/die', 1, 100),
        bijHurt: seq('butoijo/hurt', 1, 1000),
        babRun: seq('butoabang/run', 1, 100),
        babHurt: seq('butoabang/hurt', 1, 100),
        babAttack: seq('butoabang/attack', 1, 2400),
        babHurtHit: seq('butoabang/hurt', 1, 300),
        flame: remap(flameSet, flameOrder, [300, 300, 300, 300, 300, 300, 300, 300]),

        // Nagapecona
        ngpFly: seq('nagapecona/fly', 9, 100),
        ngpHurt: seq('nagapecona/fly', 1, 300),
        ngpAttack: seq('nagapecona/long', 1, 1000),
        claw: remap(clawSet, clawOrder, [100, 100, 100, 100, 100, 100, 100]),

        // Items
        live: plainFrames(scene, ['item/nyawa1.png', 'item/nyawa2.png'], 1500),
        kendi: plainFrames(scene, ['item/kendi.png'], 1000),
        star: plainFrames(scene, ['item/waskita1.png', 'item/waskita2.png',
            'item/waskita3.png', 'item/waskita4.png'], 200),
    };
}

export function initDefs(scene) {
    if (!defs) defs = build(scene);
    return defs;
}

// A new pair of animations (right and left) from cached frame lists.
const pair = (d) => ({ left: new Anim(d.left), right: new Anim(d.right) });

function makeAuraSmallJT() {
    const d = defs.jtAura;
    return new AuraShot(new Anim(d.left), new Anim(d.right),
        new Anim(d.left), new Anim(d.right), 1, 0.1, 0.1);
}

export function makeJabangTetuka() {
    return new JabangTetuka({
        anims: {
            run: pair(defs.jtRun),
            dead: pair(defs.jtHurt),
            jump: pair(defs.jtJump),
            idle: pair(defs.jtIdle),
            attack: pair(defs.jtAttack),
            hurt: pair(defs.jtHurt),
        },
        aura: makeAuraSmallJT(),
        sfx: { hurt: 'jthurt', die: null, punch: null },
    });
}

export function makeGatotkaca() {
    const d = defs;
    const auraSmall = new AuraShot(new Anim(d.gkAuraSmall.left), new Anim(d.gkAuraSmall.right),
        new Anim(d.gkSmallBroken.left), new Anim(d.gkSmallBroken.right));
    const auraBig = new GKAuraShot(new Anim(d.gkAuraBig.left), new Anim(d.gkAuraBig.right),
        new Anim(d.gkBroken.left), new Anim(d.gkBroken.right));
    const biteShot = new BiteShot(new Anim(d.gkBiteShot.left), new Anim(d.gkBiteShot.right),
        new Anim(d.gkBiteDie.left), new Anim(d.gkBiteDie.right));
    return new Gatotkaca({
        anims: {
            run: pair(d.gkRun),
            dead: pair(d.gkHurt),
            jump: pair(d.gkJump),
            idle: pair(d.gkIdle),
            attack: pair(d.gkAttack),
            hurt: pair(d.gkHurt),
        },
        aura: auraSmall,
        auraBig,
        biteShot,
        bite: pair(d.gkBite),
        auraPunch: pair(d.gkAuraPunch),
        shieldSprite: new Sprite(new Anim(d.gkBall.right)),
        sfx: {
            hurt: 'gkhurt', die: 'gkdie', punch: 'gkpunch',
            auraPunch: 'gkaurapunch', bite: 'gkbite', shield: 'gkshield',
        },
    });
}

function makeFlame() {
    const f = pair(defs.flame);
    return new Flame(f.left, f.right, new Anim(defs.flame.left), new Anim(defs.flame.right), 1, 0.05, 0.0001);
}

function makeClaw() {
    const c = pair(defs.claw);
    return new ClawShot(c.left, c.right, 1, 0.05, 0.0001);
}

export function makeButoIjo() {
    const r = pair(defs.bijRun);
    const dead = pair(defs.bijDie);
    const hurt = pair(defs.bijHurt);
    return new ButoIjo(r.left, r.right, dead.left, dead.right, hurt.left, hurt.right,
        { hurt: 'bihurt', die: 'bidie' });
}

export function makeButoAbang() {
    const r = pair(defs.babRun);
    const dead = pair(defs.babHurt);
    const attack = pair(defs.babAttack);
    const hurt = pair(defs.babHurtHit);
    return new ButoAbang(r.left, r.right, dead.left, dead.right, attack.left, attack.right,
        hurt.left, hurt.right, makeFlame(), { hurt: 'bahurt', die: 'badie' });
}

export function makeNagapecona() {
    const fly = pair(defs.ngpFly);
    const deadFly = pair(defs.ngpFly);
    const hurt = pair(defs.ngpHurt);
    const attack = pair(defs.ngpAttack);
    return new Nagapecona(fly.left, fly.right, deadFly.left, deadFly.right,
        hurt.left, hurt.right, attack.left, attack.right, makeClaw(),
        { hurt: 'nphurt1', die: 'npdie' });
}

export function makePowerUp(kind) {
    const frames = kind === 'live' ? defs.live : kind === 'kendi' ? defs.kendi : defs.star;
    return new PowerUp(new Anim(frames), kind);
}

// Entity for a map letter (see tilemap.js). Returns null for unknown letters.
export function makeForLetter(ch) {
    switch (ch) {
        case 'l': return makePowerUp('live');
        case 's': return makePowerUp('star');
        case 'k': return makePowerUp('kendi');
        case '1': return makeButoIjo();
        case '2': return makeButoAbang();
        case '3': return makeNagapecona();
        default: return null;
    }
}

export { frameOf };
