/**
 * Tree01 - Specific tree sprite subclass
 * Hardcoded sprite and sensible defaults for tree-01.png
 */
class Tree01 extends Tree {
    constructor(options = {}) {
        super({
            spriteSrc: 'assets/objects/trees/tree-01.png',
            collisionExpandTop: -45,
            ...options
        });
    }
}
