# Static Object Architecture

This document describes the improved static object system with specialized subclasses.

## Overview

The static object system now uses a **class-per-sprite-type** architecture, providing better encapsulation, type-specific behaviors, and easier maintenance.

## Class Hierarchy

```
GameObject (base class)
└── StaticObject (base for all static environmental objects)
    ├── Tree (trees and tall plants)
    ├── Bush (bushes, shrubs, and low vegetation)
    └── Rock (rocks, boulders, and mineral formations)
```

## Classes

### StaticObject (Base Class)
**File:** `src/objects/StaticObject.js`

The base class for all non-moving environmental objects. Provides:
- Animation system (sway, pulse, rotate)
- Environmental effects (shade, sound)
- Basic interaction framework
- Collision and blocking behavior

**Default Properties:**
- `animationType`: 'none'
- `castsShadow`: inherited from GameObject (true by default, but overridden to false in ObjectManager)

---

### Tree
**File:** `src/objects/Tree.js`

Specialized class for tree sprites with tree-specific behaviors.

**Default Properties:**
- `type`: 'tree'
- `hasCollision`: true
- `blocksMovement`: true
- `castsShadow`: false
- `animationType`: 'sway' (gentle wind animation)
- `animationSpeed`: 0.0008
- `animationIntensity`: 2.5
- `providesShade`: true

**Special Features:**
- Responds to weather conditions (sways more in wind)
- Provides shade based on foliage density
- Can host wildlife (birds, squirrels)
- Seasonal color support for autumn/spring
- Different tree types: deciduous, conifer, palm, etc.

**Example Usage:**
```javascript
const tree = new Tree({
    id: 'oak_tree_1',
    x: 200,
    y: 150,
    spriteSrc: 'assets/objects/trees/oak.png',
    scale: 1.2,
    treeType: 'deciduous',
    height: 'tall',
    foliageDensity: 0.8
});
```

---

### Bush
**File:** `src/objects/Bush.js`

Specialized class for bush/shrub sprites with vegetation-specific behaviors.

**Default Properties:**
- `type`: 'bush'
- `hasCollision`: true
- `blocksMovement`: true
- `castsShadow`: false
- `animationType`: 'sway' (more vigorous than trees)
- `animationSpeed`: 0.0012
- `animationIntensity`: 3.5
- `providesShade`: false (too low)

**Special Features:**
- Player can hide in dense bushes (stealth bonus)
- Can have collectible berries that regenerate
- Searchable for hidden items
- Different densities: sparse, medium, dense
- Bush types: berry, flowering, thorny, generic

**Example Usage:**
```javascript
const bush = new Bush({
    id: 'berry_bush_1',
    x: 350,
    y: 280,
    spriteSrc: 'assets/objects/bushes/berry-bush.png',
    scale: 0.45,
    bushType: 'berry',
    density: 'dense',
    hasBerries: true,
    berryCount: 3,
    canHideIn: true
});
```

---

### Rock
**File:** `src/objects/Rock.js`

Specialized class for rocks, boulders, and mineral formations.

**Default Properties:**
- `type`: 'rock'
- `hasCollision`: true
- `blocksMovement`: true
- `castsShadow`: false
- `animationType`: 'none' (except crystal rocks pulse)
- `providesShade`: false

**Special Features:**
- Mineable for resources (ore, gems)
- Some rocks can be climbed
- Small rocks can be pushed
- Provides cover bonus for large rocks
- Crystal rocks have pulsing animation
- Rock types: boulder, pebble, cliff, crystal
- Materials: stone, granite, marble, crystal, obsidian

**Example Usage:**
```javascript
const rock = new Rock({
    id: 'iron_boulder_1',
    x: 500,
    y: 600,
    spriteSrc: 'assets/objects/rocks/boulder.png',
    scale: 0.8,
    rockType: 'boulder',
    size: 'large',
    material: 'granite',
    canBeMined: true,
    mineableResource: 'iron_ore',
    resourceAmount: 3
});
```

---

## ObjectManager Integration

The `ObjectManager.createStaticObject()` method automatically instantiates the correct class based on the `type` field:

```javascript
// Map definition with different object types
const mapObjects = [
    // Automatically creates Tree instance
    { 
        id: 'tree_01', 
        type: 'tree',
        x: 200, 
        y: 150, 
        spriteSrc: 'assets/objects/trees/tree-01.png',
        scale: 1.0 
    },
    
    // Automatically creates Bush instance
    { 
        id: 'bush_01', 
        type: 'bush',
        x: 350, 
        y: 280, 
        spriteSrc: 'assets/objects/bushes/bush-01.png',
        scale: 0.45,
        hasBerries: true 
    },
    
    // Automatically creates Rock instance
    { 
        id: 'rock_01', 
        type: 'rock',
        x: 500, 
        y: 400, 
        spriteSrc: 'assets/objects/rocks/boulder.png',
        canBeMined: true 
    },
    
    // Falls back to generic StaticObject
    { 
        id: 'decoration_01', 
        type: 'statue',
        x: 700, 
        y: 500, 
        spriteSrc: 'assets/objects/statue.png' 
    }
];
```

## Benefits of This Architecture

1. **Type Safety**: Each object type has its own class with type-specific properties
2. **Encapsulation**: Behavior is contained within the appropriate class
3. **Extensibility**: Easy to add new object types (Flower, Grass, Stone, etc.)
4. **Maintainability**: Changes to tree behavior only affect Tree class
5. **Discoverability**: Clear what properties and methods each type supports
6. **Default Behaviors**: Each class provides sensible defaults for its type
7. **State Management**: Each class can define what state needs saving/loading

## Adding New Static Object Types

To add a new static object type:

1. Create a new class file in `src/objects/` (e.g., `Flower.js`)
2. Extend `StaticObject` class
3. Define type-specific properties and defaults in constructor
4. Override methods for custom behavior (update, interact, etc.)
5. Add to ObjectManager switch statement in `createStaticObject()`
6. Add script loading to `src/main.js`

Example template:
```javascript
class Flower extends StaticObject {
    constructor(options = {}) {
        super({
            type: 'flower',
            name: options.name || 'Flower',
            scale: options.scale || 0.25,
            hasCollision: false,
            blocksMovement: false,
            castsShadow: false,
            animationType: 'sway',
            animationSpeed: 0.002,
            ...options
        });
        
        this.flowerType = options.flowerType || 'rose';
        this.color = options.color || 'red';
    }
}
```

## Shadow Behavior

All static objects have `castsShadow: false` by default to improve performance. Only actors (NPCs, Player) and special interactive objects (Chest) cast shadows.

This decision is made in `ObjectManager.createStaticObject()` where static objects explicitly set `castsShadow: false`.

## Future Enhancements

Potential additions to the system:
- **Grass**: Low vegetation with wind animation
- **Flower**: Decorative plants with color variants
- **Stone**: Smaller than rocks, can be thrown
- **Log**: Horizontal obstacles, can be sat on
- **Stump**: Cut tree remains, can be sat on
- **Vine**: Climbable vegetation on walls
- **Mushroom**: Collectible, may have effects
- **Crystal**: Glowing resources, puzzle elements
