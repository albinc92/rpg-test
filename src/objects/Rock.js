/**
 * Rock class - extends StaticObject for rock/boulder sprites
 */
class Rock extends StaticObject {
    constructor(options = {}) {
        super({
            type: 'rock',
            hasCollision: true,
            blocksMovement: true,
            castsShadow: false,
            animationType: 'none',
            ...options
        });
    }
}
