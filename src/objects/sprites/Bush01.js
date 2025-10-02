/**
 * Bush01 - Specific bush sprite subclass
 * Hardcoded sprite and sensible defaults for bush-01.png
 */
class Bush01 extends Bush {
    constructor(options = {}) {
        super({
            spriteSrc: 'assets/objects/bushes/bush-01.png',
            collisionExpandTopPercent: -0.65,
            collisionExpandRightPercent: -0.05,
            collisionExpandLeftPercent: -0.05,
            ...options
        });
    }
}
