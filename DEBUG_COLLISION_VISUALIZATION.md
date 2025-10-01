# Debug Collision Box Visualization

## Overview
Added visual debugging for collision boxes to help you tune collision detection for all game objects (trees, NPCs, player, interactive objects, etc.).

## How to Use

### Toggle Debug Mode
Press **F1** to enable/disable debug mode.

### What You'll See

When debug mode is **enabled**, you'll see:

1. **Red Collision Boxes**
   - Red outline (solid stroke)
   - Semi-transparent red fill
   - Shows the actual collision area used for blocking movement
   - Only visible for objects with `hasCollision: true`

2. **Yellow Center Dots**
   - Small yellow circle at each object's center point (x, y)
   - Helps visualize the object's actual position

3. **Debug Info Panel** (bottom-left)
   ```
   FPS: 144
   Min: 120  Max: 144
   State: PLAYING
   Map: 0-0
   ■ Collision boxes visible    ← New indicator
   Press F1 to toggle debug info
   ```

## Understanding Collision Boxes

### Box Size Formula
```javascript
Collision Width = Sprite Width × scale × collisionPercent
Collision Height = Sprite Height × scale × collisionPercent
```

### Box Position
```javascript
Box Y Position = Object Y + collisionOffsetY
```

### Example: Tree Collision
For a tree with:
- Sprite: 400×600 pixels
- Scale: 0.3
- collisionPercent: 0.15
- collisionOffsetY: 15

**Rendered Size**: 120×180 pixels (400×0.3, 600×0.3)
**Collision Size**: 18×27 pixels (120×0.15, 180×0.15)
**Collision Offset**: +15 pixels down (at base of trunk)

The red box shows only the tiny trunk area that blocks movement!

## Tuning Collision

### Too Small (Walking Through Objects)
Increase `collisionPercent`:
```javascript
collisionPercent: 0.15  →  0.25  // 66% larger
```

### Too Large (Can't Get Close Enough)
Decrease `collisionPercent`:
```javascript
collisionPercent: 0.3  →  0.15  // 50% smaller
```

### Collision Too High (Floating)
Increase `collisionOffsetY`:
```javascript
collisionOffsetY: 10  →  20  // Moves down
```

### Collision Too Low (In Ground)
Decrease `collisionOffsetY`:
```javascript
collisionOffsetY: 20  →  10  // Moves up
```

## Object Types & Typical Collision

### Player
```javascript
collisionPercent: 0.25   // Just feet (25%)
collisionOffsetY: 15     // Very bottom
```
**Why**: Player should squeeze through gaps, collision at feet only.

### Trees (StaticObject)
```javascript
collisionPercent: 0.15   // Small trunk base (15%)
collisionOffsetY: 15     // Bottom of trunk
```
**Why**: Only the trunk blocks movement, can walk under branches.

### NPCs (Actor)
```javascript
collisionPercent: 0.4    // Lower body (40%)
collisionOffsetY: 10     // Bottom half
```
**Why**: NPCs need bigger collision than player for AI pathfinding.

### Spirits (floating creatures)
```javascript
collisionPercent: 0.3    // Small area (30%)
blocksMovement: false    // Don't block!
canBeBlocked: false      // Phase through walls
```
**Why**: Ethereal creatures don't block and can fly through objects.

### Rocks/Large Obstacles
```javascript
collisionPercent: 0.9    // Almost entire sprite (90%)
collisionOffsetY: 5      // Slight offset
```
**Why**: Solid objects should block most of their visual area.

### Interactive Objects (Chests, Signs)
```javascript
collisionPercent: 0.5-0.7    // Medium area
blocksMovement: false         // Optional
```
**Why**: Should be accessible from most angles but have presence.

## Visual Debug Checklist

Use debug mode to verify:

- ✅ **Player collision** is only at feet, not entire body
- ✅ **Tree collision** is only at trunk base, not entire tree
- ✅ **NPC collision** matches their body width
- ✅ **Yellow dots** are at the center of each object
- ✅ **Red boxes** don't overlap unintentionally
- ✅ **Player can walk** close to objects without getting stuck
- ✅ **Gaps between objects** are passable if intended

## Performance

Debug rendering has minimal impact:
- ~50 extra draw calls per frame (for typical map)
- Only renders visible objects (camera culling)
- No performance impact when debug mode is OFF

## Files Modified

### src/systems/RenderSystem.js
- Added `renderDebugCollisionBoxes()` method
- Draws red collision boxes and yellow center dots
- Only runs when `game.settings.showDebugInfo` is true

### src/systems/PerformanceMonitor.js
- Increased debug panel height (110 → 128)
- Added "■ Collision boxes visible" indicator in red

## Troubleshooting

### Collision boxes not showing
1. Press F1 to enable debug mode
2. Check console for errors
3. Ensure objects have `hasCollision: true`

### Wrong collision box size
- Verify `collisionPercent` value (0.0 to 1.0)
- Check if object is being scaled by map or object scale
- Remember: `actualSize = spriteSize × objectScale × mapScale`

### Objects don't block despite red box
- Check `blocksMovement: true` on the object
- Check `canBeBlocked: true` on the moving actor
- Verify object is in the correct map's object list

## Tips

1. **Start large, tune down**: Begin with larger collision boxes and reduce them until they feel right
2. **Test corners**: Walk around objects at different angles
3. **Check depth sorting**: Objects should render behind/in-front correctly based on Y position
4. **Use yellow dots**: Make sure object centers are where you expect
5. **Group similar objects**: Trees should have similar collision configs for consistency

## Next Steps

1. ✅ Press F1 to see collision boxes
2. 🎯 Adjust tree collision in `StaticObjectManager.js`
3. 🎯 Test walking around all objects
4. 🎯 Fine-tune `collisionPercent` and `collisionOffsetY` values
5. 🎯 Add more objects and verify collision feels natural
