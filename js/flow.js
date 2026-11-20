// Game flow: port of Main.play() and SectionManager/Section.
// Scenes report their result with finishScene(); runGame() waits for it.
import { makeJabangTetuka, makeGatotkaca } from './entities/factory.js';
import { loadMaxLevel, saveStage } from './core/persist.js';

export const RESULT = { WIN: 'win', LOSE: 'lose', EXIT: 'exit' };

let pending = null;

export function finishScene(value) {
    const resolve = pending;
    pending = null;
    if (resolve) resolve(value);
}

// Scene.start() does not stop the other scenes, so stop the game scenes first
// (otherwise old menus and comics keep updating and taking key presses).
const GAME_SCENES = ['Boot', 'Menu', 'Comic', 'Stage', 'Credit', 'Submit', 'Farewell'];

function showScene(game, key, data) {
    return new Promise((resolve) => {
        pending = resolve;
        for (const other of GAME_SCENES) {
            if (other !== key && game.scene.isActive(other)) game.scene.stop(other);
        }
        game.scene.start(key, data);
    });
}

// Main loop: menu -> sections -> score -> credits, then back to the menu.
export async function runGame(game, sections) {
    for (;;) {
        const choice = await showScene(game, 'Menu', {
            titles: sections.map((s) => s.title),
            maxLevel: loadMaxLevel(),
        });
        if (choice.type === 'exit') {
            await showScene(game, 'Farewell');
            return;
        }
        await playSections(game, sections, choice);
    }
}

async function playSections(game, sections, choice) {
    const isNew = choice.type === 'new';
    let i = isNew ? 0 : choice.index;
    let comicTutorial = isNew;   // SectionManager.newGame()
    let playTutorial = isNew;
    let growUp = true;
    let player = sections[i].isJT ? makeJabangTetuka() : makeGatotkaca();
    if (!sections[i].isJT) growUp = false;

    let state;
    do {
        // Jabang Tetuka grows into Gatotkaca at the first Gatotkaca section.
        if (!sections[i].isJT && growUp) {
            const gk = makeGatotkaca();
            gk.setHp(player.getHp());
            gk.setMp(player.getHp());   // same as the original code
            gk.setScore(player.getScore());
            gk.setLive(player.getLive());
            player = gk;
            growUp = false;
        }

        state = await runSection(game, sections[i], player, comicTutorial, playTutorial);

        comicTutorial = false;
        if (i !== sections.length - 1) {
            playTutorial = sections[i].isJT && !sections[i + 1].isJT;
        }
        i++;
    } while (i < sections.length && state === RESULT.WIN);

    if (state === RESULT.LOSE || state === RESULT.WIN) {
        await showScene(game, 'Submit', { score: player.getScore() });
        saveStage(i - 1);
        if (state === RESULT.WIN) {
            await showScene(game, 'Credit');
        }
    }
}

// Section.run(): opening comic, stages in order, ending comic on win.
async function runSection(game, section, player, comicTutorial, playTutorial) {
    await showScene(game, 'Comic', { pages: section.opening, tutorial: comicTutorial });

    let flag = playTutorial;
    let state;
    let k = 0;
    do {
        state = await showScene(game, 'Stage', { mapName: section.maps[k], player, tutorial: flag });
        flag = false;
        k++;
    } while (state !== RESULT.LOSE && state !== RESULT.EXIT && k < section.maps.length);

    if (state === RESULT.WIN) {
        await showScene(game, 'Comic', { pages: section.ending, tutorial: false });
    }
    return state;
}
