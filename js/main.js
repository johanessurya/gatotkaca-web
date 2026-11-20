// Entry point. Phaser is loaded as a global by index.php.
import { BootScene } from './scenes/boot.js';
import { MenuScene, FarewellScene } from './scenes/menu.js';
import { ComicScene } from './scenes/comic.js';
import { StageScene } from './scenes/stage.js';
import { CreditScene } from './scenes/credit.js';
import { SubmitScene } from './scenes/submit.js';

const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, MenuScene, ComicScene, StageScene, CreditScene, SubmitScene, FarewellScene],
});

// Handy for debugging in the browser console: window.__game.scene.getScene('Stage').
window.__game = game;
