// Save data in localStorage (per browser). Replaces save.dat and highscore.dat.
// Port of util/Save.java and util/HighScoreManager.java + HighScore.java.
const SAVE_KEY = 'gatotkaca.save';
const HIGH_KEY = 'gatotkaca.highscore';
const HIGH_COUNT = 5;

function read(key) {
    try {
        return JSON.parse(window.localStorage.getItem(key));
    } catch (e) {
        return null;
    }
}

function write(key, value) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        // storage unavailable (private mode etc.): game still works, just not saved
    }
}

// Highest section index the player has reached (Save.getStage).
export function loadMaxLevel() {
    const v = read(SAVE_KEY);
    return v && Number.isInteger(v.stage) && v.stage >= 0 ? v.stage : 0;
}

export function saveStage(stage) {
    write(SAVE_KEY, { stage });
}

function blankScores() {
    return Array.from({ length: HIGH_COUNT }, () => ({ name: 'BLANK', score: 0 }));
}

export function loadHighScores() {
    const v = read(HIGH_KEY);
    if (Array.isArray(v) && v.length === HIGH_COUNT) return v;
    return blankScores();
}

// Same insertion as HighScore.addScore(): the entry bubbles down past lower scores.
export function addHighScore(name, score) {
    const list = loadHighScores();
    let cur = { name, score };
    for (let i = 0; i < list.length; i++) {
        if (cur.score > list[i].score) {
            const tmp = cur;
            cur = list[i];
            list[i] = tmp;
        }
    }
    write(HIGH_KEY, list);
    return list;
}
