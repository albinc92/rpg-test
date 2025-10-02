/**
 * Tree class - extends StaticObject for tree sprites
 */
class Tree extends StaticObject {
    constructor(options = {}) {
        super({
            type: 'tree',
            hasCollision: true,
            blocksMovement: true,
            castsShadow: false,
            animationType: 'sway',
            animationSpeed: 0.0008,
            animationIntensity: 2.5,
            ...options
        });
    }
}
