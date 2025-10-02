/**
 * Bush class - extends StaticObject for bush/shrub sprites
 */
class Bush extends StaticObject {
    constructor(options = {}) {
        super({
            type: 'bush',
            hasCollision: true,
            blocksMovement: true,
            castsShadow: false,
            animationType: 'sway',
            animationSpeed: 0.0012,
            animationIntensity: 3.5,
            ...options
        });
    }
}
