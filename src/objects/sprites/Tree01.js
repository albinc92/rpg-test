/**
 * Tree01 - Specific tree sprite subclass
 * Hardcoded sprite and sensible defaults for tree-01.png
 */
class Tree01 extends Tree {
    constructor(options = {}) {
        super({
            spriteSrc: 'assets/objects/trees/tree-01.png',
            name: 'Oak Tree',
            scale: options.scale || 1.0,
            treeType: 'deciduous',
            height: 'tall',
            foliageDensity: 0.8,
            x: options.x,
            y: options.y,
            ...options
        });
    }
}
