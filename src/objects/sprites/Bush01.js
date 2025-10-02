/**
 * Bush01 - Specific bush sprite subclass
 * Hardcoded sprite and sensible defaults for bush-01.png
 */
class Bush01 extends Bush {
    constructor(options = {}) {
        super({
            spriteSrc: 'assets/objects/bushes/bush-01.png',
            name: 'Green Bush',
            scale: options.scale || 0.45,
            bushType: 'generic',
            density: 'medium',
            x: options.x,
            y: options.y,
            ...options
        });
    }
}
