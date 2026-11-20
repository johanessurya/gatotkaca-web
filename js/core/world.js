// Shared runtime context for the running stage: the active map, the audio
// helper and the Phaser scene. Entities use this instead of receiving the
// stage in every call (the Java code reaches the same objects through fields).
export const world = {
    scene: null,      // Phaser scene of the running stage
    map: null,        // TileMap of the running stage
    playSfx(key) {
        if (!key || !this.scene) return;
        this.scene.sound.play(key, { volume: 0.8 });
    },
};
