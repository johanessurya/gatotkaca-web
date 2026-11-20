<?php
// Gatotkaca - Otot Kawat Tulang Besi (web port).
// Phaser 4 is loaded from the local npm install (node_modules/phaser).
// Game assets are generated with: node tools/prepare-assets.js
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" href="data:,">
    <title>Gatotkaca - Otot Kawat Tulang Besi</title>
    <style>
        @font-face { font-family: 'ComicBD'; src: url('assets/fonts/comicbd.ttf') format('truetype'); }
        @font-face { font-family: 'AvgardD'; src: url('assets/fonts/avgardd.ttf') format('truetype'); }
        @font-face { font-family: 'Taileb'; src: url('assets/fonts/taileb.ttf') format('truetype'); }
        @font-face { font-family: 'GameArial'; src: url('assets/fonts/arial.ttf') format('truetype'); }

        html, body {
            margin: 0;
            height: 100%;
            background: #000;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }
    </style>
</head>
<body>
    <script src="node_modules/phaser/dist/phaser.min.js"></script>
    <script type="module" src="js/main.js"></script>
</body>
</html>
