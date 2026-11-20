#!/usr/bin/env node
/*
 * Prepares web assets from the original Java project.
 *
 *   node tools/prepare-assets.js
 *
 * - copies images, fonts, maps and story.xml into ./assets
 * - converts every WAV to OGG (Vorbis) and MP3 with ffmpeg (skipped when up to date)
 * - writes ./assets/manifest.json, which the game reads at boot
 *
 * Requires ffmpeg on PATH.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'gatotkaca-java', 'src', 'gatotkaca');
const OUT = path.join(ROOT, 'assets');

function walk(dir) {
    const out = [];
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) out.push(...walk(full));
        else out.push(full);
    }
    return out;
}

function copyFile(from, to) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
}

function isNewer(target, source) {
    return fs.existsSync(target) && fs.statSync(target).mtimeMs >= fs.statSync(source).mtimeMs;
}

function main() {
    const manifest = { images: [], fonts: [], maps: [], sounds: [], text: {} };

    // Images (keep relative path as the Phaser key, e.g. "gatotkaca/run1.png")
    const imgDir = path.join(SRC, 'images');
    for (const file of walk(imgDir)) {
        if (!/\.(png|jpe?g)$/i.test(file)) continue;
        const rel = path.relative(imgDir, file).split(path.sep).join('/');
        copyFile(file, path.join(OUT, 'images', rel));
        manifest.images.push(rel);
    }

    // Fonts
    for (const file of walk(path.join(SRC, 'font'))) {
        if (!/\.ttf$/i.test(file)) continue;
        const name = path.basename(file);
        copyFile(file, path.join(OUT, 'fonts', name));
        manifest.fonts.push(name);
    }

    // Maps
    for (const file of walk(path.join(SRC, 'maps'))) {
        if (!/\.map$/i.test(file)) continue;
        const name = path.basename(file, '.map');
        copyFile(file, path.join(OUT, 'maps', name + '.map'));
        manifest.maps.push(name);
    }

    // Story
    copyFile(path.join(SRC, 'story.xml'), path.join(OUT, 'story.xml'));

    // Sounds: WAV -> OGG + MP3
    const sndDir = path.join(SRC, 'sounds');
    for (const file of walk(sndDir)) {
        if (!/\.wav$/i.test(file)) continue;
        const name = path.basename(file, '.wav');
        const ogg = path.join(OUT, 'sounds', name + '.ogg');
        const mp3 = path.join(OUT, 'sounds', name + '.mp3');
        fs.mkdirSync(path.dirname(ogg), { recursive: true });
        if (!isNewer(ogg, file)) {
            execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file,
                '-c:a', 'libvorbis', '-q:a', '4', ogg], { stdio: 'inherit' });
        }
        if (!isNewer(mp3, file)) {
            execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file,
                '-c:a', 'libmp3lame', '-q:a', '4', mp3], { stdio: 'inherit' });
        }
        manifest.sounds.push({
            key: name,
            urls: [`assets/sounds/${name}.ogg`, `assets/sounds/${name}.mp3`],
        });
    }

    manifest.images.sort();
    manifest.maps.sort();
    manifest.sounds.sort((a, b) => a.key.localeCompare(b.key));
    fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

    console.log(`images: ${manifest.images.length}, fonts: ${manifest.fonts.length}, ` +
        `maps: ${manifest.maps.length}, sounds: ${manifest.sounds.length}`);
}

main();
