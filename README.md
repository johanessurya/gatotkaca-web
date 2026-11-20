# gatotkaca-web

Web port of *Gatotkaca - Otot Kawat Tulang Besi* (Java, 2011) using Phaser 4.
See `plan.md` for the port notes.

## Run

```bash
npm install                    # installs phaser (node_modules/)
node tools/prepare-assets.js   # builds assets/ from gatotkaca-java/ (needs ffmpeg)
php -S localhost:8000          # then open http://localhost:8000/index.php
```

`assets/` is generated and committed, so the game runs without `gatotkaca-java/`
and without ffmpeg. Re-run the script only if the Java assets change.

## Controls

| Key | Action |
|---|---|
| Arrow keys | Move, up/down in menus |
| Space | Jump |
| A | Punch |
| S | Aura punch (Gatotkaca) |
| D | Bite (Gatotkaca) |
| W | Toggle shield (Gatotkaca) |
| P | Pause |
| Enter | Confirm / skip comic / close pop-up |
| Backspace | Back (level select) |
| Esc | In a stage: ends it as a win (as in the original). In menus: back to the main menu |
| R | End the stage as a loss (debug key from the original game) |

## Credits

Original game and story by Johanes Surya Kusuma. Educational use only, not for
commercial use (from the original README).
