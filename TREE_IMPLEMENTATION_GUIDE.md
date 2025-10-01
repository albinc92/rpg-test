# 🌳 Creating Your First Tree Object - Implementation Guide

## Summary

I've successfully integrated a **StaticObjectManager** into your game and created **3 trees** on map 0-0 using the `tree-01.png` sprite!

## What Was Done

### 1. Created StaticObjectManager (`src/systems/StaticObjectManager.js`)
A new manager to handle all environmental objects like trees, rocks, bushes, etc.

**Features**:
- Per-map object storage
- Animated objects (sway, pulse, rotate)
- Collision detection integration
- State management for saving/loading
- Spatial queries (get objects near position)

### 2. Integrated into GameEngine
- ✅ Added `staticObjectManager` instance
- ✅ Initialize static objects on startup
- ✅ Update objects in game loop (for animations)
- ✅ Render objects with NPCs and interactive objects
- ✅ Include in collision detection system

### 3. Added 3 Trees to Map 0-0
**Tree Locations**:
1. **Tree #1** - Position (500, 400) - Scale 1.0 - Sway speed 0.001
2. **Tree #2** - Position (800, 600) - Scale 1.2 (larger) - Sway speed 0.0012
3. **Tree #3** - Position (1200, 300) - Scale 0.9 (smaller) - Sway speed 0.0009

**Tree Configuration**:
```javascript
{
    type: 'obstacle',           // Blocks movement
    hasCollision: true,         // Solid object
    blocksMovement: true,       // Player can't walk through
    collisionPercent: 0.3,      // Only trunk (30%) is solid
    collisionOffsetY: 30,       // Collision at base
    castsShadow: true,          // Renders shadow
    animationType: 'sway',      // Gentle swaying animation
    animationSpeed: 0.001,      // Slow sway
    animationIntensity: 3,      // 3 pixels of sway
    providesShade: true         // Could provide environmental effects
}
```

### 4. Fixed GameObject References
- Fixed `StaticObject.js` to use `getWidth()` and `getHeight()` instead of `this.width/height`
- Fixed `Spirit.js` for consistency

## How to Test

### 1. Start the Game
```powershell
npm run dev
```

### 2. Navigate to Map 0-0
- Start a new game or load an existing save
- The default spawn point is at (400, 300) on map 0-0

### 3. Look for Trees
The trees should be visible at:
- **Near spawn** - Tree at (500, 400) - slightly to the right and down
- **Middle-bottom** - Tree at (800, 600) - larger tree
- **Top-right area** - Tree at (1200, 300) - smaller tree

### 4. Test Collision
- Walk towards a tree
- You should **NOT** be able to walk through the trunk
- The collision is only on the bottom 30% of the sprite (the trunk)
- You can walk "behind" the tree (higher Y position)

### 5. Watch the Animation
- Trees should gently sway side-to-side
- Each tree has a slightly different sway speed
- This creates a natural, organic feel

## Adding More Objects

### Create a New Tree
Edit `src/systems/StaticObjectManager.js` in the `initializeAllObjects()` method:

```javascript
this.staticObjects['0-0'] = [
    // ... existing trees ...
    
    // Add your new tree
    new StaticObject({
        id: 'tree_04',
        name: 'Oak Tree',
        type: 'obstacle',
        x: 1500,           // X position on map
        y: 700,            // Y position on map
        spriteSrc: 'assets/objects/trees/tree-01.png',
        scale: 1.0,
        hasCollision: true,
        blocksMovement: true,
        collisionPercent: 0.3,
        collisionOffsetY: 30,
        castsShadow: true,
        animationType: 'sway',
        animationSpeed: 0.001,
        animationIntensity: 3
    })
];
```

### Create a Decorative Bush (No Collision)
```javascript
new StaticObject({
    id: 'bush_01',
    name: 'Bush',
    type: 'decoration',
    x: 600,
    y: 500,
    spriteSrc: 'assets/objects/plants/bush-01.png',
    scale: 0.8,
    hasCollision: false,      // Walk through it
    blocksMovement: false,
    castsShadow: true,
    animationType: 'sway',
    animationSpeed: 0.002,    // Faster sway
    animationIntensity: 5     // More movement
})
```

### Create a Rock (Solid Obstacle)
```javascript
new StaticObject({
    id: 'rock_01',
    name: 'Large Rock',
    type: 'obstacle',
    x: 1000,
    y: 800,
    spriteSrc: 'assets/objects/rocks/rock-01.png',
    scale: 1.0,
    hasCollision: true,
    blocksMovement: true,
    collisionPercent: 0.9,     // Most of rock is solid
    collisionOffsetY: 10,
    castsShadow: true,
    animationType: 'none'      // Rocks don't move
})
```

## Animation Types

### Sway (Trees, Plants)
```javascript
animationType: 'sway',
animationSpeed: 0.001,    // Lower = slower
animationIntensity: 3     // Pixels of movement
```

### Pulse (Magical Objects)
```javascript
animationType: 'pulse',
animationSpeed: 0.002,
animationIntensity: 1.0   // Scale multiplier (0.1 = 10% size change)
```

### Rotate (Spinning Objects)
```javascript
animationType: 'rotate',
animationSpeed: 0.001,
animationIntensity: 1.0
```

### None (Static Objects)
```javascript
animationType: 'none'
```

## Understanding Collision Configuration

### Player vs Object Collision

**Player Configuration** (Player.js):
```javascript
collisionPercent: 0.25   // Only feet (bottom 25%)
collisionOffsetY: 15     // Collision box at very bottom
```

**Tree Configuration** (StaticObjectManager.js):
```javascript
collisionPercent: 0.3    // Trunk area (bottom 30%)
collisionOffsetY: 30     // Collision at base of trunk
```

### How Collision Works

1. **Full Sprite Bounds** (`getBounds()`):
   - Used for rendering and visibility
   - Full width × height of sprite

2. **Collision Bounds** (`getCollisionBounds()`):
   - Used for movement blocking
   - Reduced by `collisionPercent`
   - Offset by `collisionOffsetY`

3. **Collision Check**:
   ```
   Collision Box Width = Sprite Width × collisionPercent
   Collision Box Height = Sprite Height × collisionPercent
   Collision Y Position = Object Y + collisionOffsetY
   ```

### Example: Tree Collision

For a tree sprite that's 128×256 pixels:
- **Full bounds**: 128×256 (entire tree sprite)
- **Collision bounds** (30%): 38×77 (just the trunk)
- **Offset Y** (+30): Moved down to base of trunk

This allows the player to:
- ✅ Walk "behind" the tree (higher Y = behind)
- ✅ Walk in front of tree foliage
- ❌ Walk through the solid trunk

## Architecture Diagram

```
GameEngine
├── StaticObjectManager
│   └── Map '0-0'
│       ├── Tree #1 (500, 400)
│       ├── Tree #2 (800, 600)
│       └── Tree #3 (1200, 300)
├── NPCManager
├── InteractiveObjectManager
└── RenderSystem
    └── renderWorld()
        ├── Render Map Background
        ├── Sort ALL Objects by Y (depth)
        ├── Render: Static + Interactive + NPCs + Player
        └── Render UI
```

## Common Patterns

### Forest Area (Dense Trees)
```javascript
// Create tree cluster
for (let i = 0; i < 5; i++) {
    const randomX = 800 + Math.random() * 400;
    const randomY = 400 + Math.random() * 400;
    const randomScale = 0.8 + Math.random() * 0.6;
    
    new StaticObject({
        id: `forest_tree_${i}`,
        name: 'Tree',
        type: 'obstacle',
        x: randomX,
        y: randomY,
        scale: randomScale,
        spriteSrc: 'assets/objects/trees/tree-01.png',
        hasCollision: true,
        blocksMovement: true,
        collisionPercent: 0.3,
        collisionOffsetY: 30,
        castsShadow: true,
        animationType: 'sway',
        animationSpeed: 0.0008 + Math.random() * 0.0004,
        animationIntensity: 2 + Math.random() * 2
    })
}
```

### Path Markers (Non-blocking)
```javascript
new StaticObject({
    id: 'sign_01',
    name: 'Wooden Sign',
    type: 'decoration',
    x: 400,
    y: 200,
    spriteSrc: 'assets/objects/signs/sign-01.png',
    hasCollision: false,       // Don't block movement
    blocksMovement: false,
    castsShadow: true
})
```

## Next Steps

1. ✅ **Test the Trees** - Run the game and find the trees on map 0-0
2. ✅ **Test Collision** - Try walking through trees
3. ✅ **Observe Animation** - Watch the swaying effect
4. 📝 **Add More Objects** - Create rocks, bushes, signs
5. 🎨 **Add to Other Maps** - Populate map 0-1 with objects
6. 🔧 **Create Object Presets** - Make helper functions for common objects

## Troubleshooting

### Trees Not Visible
- Check console for sprite loading errors
- Verify sprite path: `assets/objects/trees/tree-01.png`
- Make sure tree Y position is > 0 and < map height (1080)

### Can Walk Through Trees
- Verify `hasCollision: true`
- Verify `blocksMovement: true`
- Check `collisionPercent` isn't too small
- Ensure `staticObjectManager` is in `getAllGameObjectsOnMap()`

### No Animation
- Check `animationType` is set
- Verify `animationSpeed` is > 0
- Make sure `updateObjects()` is called in game loop

### Performance Issues
- Limit number of objects per map (< 100)
- Use spatial culling for off-screen objects
- Disable shadows on distant objects

## File Changes Summary

✅ **Created**:
- `src/systems/StaticObjectManager.js` (222 lines)
- `OBJECT_ARCHITECTURE.md` (documentation)

✅ **Modified**:
- `src/main.js` - Added StaticObjectManager script loading
- `src/GameEngine.js` - Integrated StaticObjectManager
  - Initialize in constructor
  - Update in game loop
  - Render with other objects
  - Include in collision detection
- `src/objects/StaticObject.js` - Fixed width/height references
- `src/entities/Spirit.js` - Fixed width/height references

## Your Trees Are Ready! 🌳

Start the game and head to position (500, 400) on map 0-0 to see your first tree!
