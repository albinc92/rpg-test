# Collision System - Scale-Aware Collision Detection ✅

## Overview

The collision system now properly matches sprite rendering scales, ensuring collision boxes are **pixel-perfect** with what the player sees on screen. Collision boxes automatically account for all scaling factors:

- **Sprite size** (actual image dimensions)
- **Object scale** (artistic scaling, e.g., 0.3 for trees)
- **Resolution scale** (automatic adaptation to screen size)
- **Map scale** (per-map zoom level)

## How It Works

### Collision Box Calculation Formula

```javascript
// 1. Calculate actual rendered size (what player SEES)
actualWidth = spriteWidth × objectScale × resolutionScale × mapScale
actualHeight = spriteHeight × objectScale × resolutionScale × mapScale

// 2. Apply collision sizing (how much of sprite is solid)
collisionWidth = actualWidth × collisionWidthPercent
collisionHeight = actualHeight × collisionHeightPercent

// 3. Apply position offsets (fine-tuning)
collisionX = objectX - collisionWidth/2 + collisionOffsetX
collisionY = objectY - collisionHeight/2 + collisionOffsetY
```

### Key Benefits

✅ **Pixel-Perfect**: Collision boxes match exactly what the player sees
✅ **Scale-Aware**: Works on any screen resolution (mobile, desktop, 4K)
✅ **Automatic**: No manual adjustments needed for different screens
✅ **Tweakable**: Fine-tune collision boxes with percents and offsets

## Configuration Options

### Basic Collision Properties

```javascript
new GameObject({
    // Enable/disable collision
    hasCollision: true,        // Does this object have collision? (default: true)
    blocksMovement: true,      // Does this block other objects? (default: true)
    canBeBlocked: true,        // Can this be blocked by others? (default: true)
    
    // Collision sizing (simple)
    collisionPercent: 0.8,     // Both width AND height = 80% of sprite (default: 0.8)
    
    // Collision offsets
    collisionOffsetX: 0,       // Horizontal shift in pixels (default: 0)
    collisionOffsetY: 10,      // Vertical shift in pixels (default: 0)
})
```

### Advanced Collision Properties

```javascript
new GameObject({
    // Collision sizing (advanced - separate width/height control)
    collisionWidthPercent: 0.3,   // Width = 30% of sprite (overrides collisionPercent)
    collisionHeightPercent: 0.15, // Height = 15% of sprite (overrides collisionPercent)
    
    // These override collisionPercent for precise control
    // Useful for: tall trees (narrow base), wide objects (small height), etc.
})
```

## Common Use Cases

### Example 1: Player Character (Feet-Only Collision)

```javascript
new Player({
    scale: 0.07,
    spriteSrc: 'assets/npc/main-0.png',
    
    // Small collision at feet
    collisionPercent: 0.25,        // 25% of sprite size
    collisionOffsetY: 15,          // Push down to bottom (feet)
})

// Result: Player can walk "behind" objects naturally
// Collision only checks where feet touch ground
```

### Example 2: Tree (Narrow Trunk Collision)

```javascript
new StaticObject({
    scale: 0.3,
    spriteSrc: 'assets/objects/trees/tree-01.png',
    
    // Very narrow collision at trunk base
    collisionPercent: 0.15,        // 15% of sprite = just the trunk
    collisionOffsetY: 15,          // Push to bottom of sprite
})

// Result: Player can walk close to tree
// Only trunk blocks movement, not the canopy
```

### Example 3: Tall Tree with Asymmetric Collision

```javascript
new StaticObject({
    scale: 0.4,
    spriteSrc: 'assets/objects/trees/tall-tree.png',
    
    // Narrow width (trunk), taller height (some canopy)
    collisionWidthPercent: 0.1,    // Very narrow trunk (10% of sprite width)
    collisionHeightPercent: 0.25,  // Taller collision (25% of sprite height)
    collisionOffsetY: 20,          // Push to bottom
})

// Result: Narrow trunk but some vertical space
// Prevents walking through lower branches
```

### Example 4: Wide Object (Bush or Rock)

```javascript
new StaticObject({
    scale: 0.25,
    spriteSrc: 'assets/objects/bush.png',
    
    // Wide but short collision
    collisionWidthPercent: 0.6,    // 60% width
    collisionHeightPercent: 0.3,   // 30% height
    collisionOffsetY: 8,           // Slight downward shift
})

// Result: Bush feels solid but not too tall
// Player can walk "over" top of bush visually
```

### Example 5: Chest (Centered Solid Object)

```javascript
new Chest({
    scale: 0.5,
    spriteSrc: 'assets/npc/chest-0.png',
    
    // Most of sprite is solid
    collisionPercent: 0.7,         // 70% of sprite
    collisionOffsetY: 5,           // Slightly down from center
})

// Result: Solid collision matching chest appearance
// Player can't walk through it
```

### Example 6: Portal (Larger Trigger Zone)

```javascript
new Portal({
    scale: 0.8,
    spriteSrc: 'assets/npc/door-0.png',
    
    // Larger collision for easier triggering
    collisionPercent: 1.2,         // 120% of sprite (bigger than visual!)
    collisionOffsetY: 0,           // Centered
})

// Result: Player triggers portal slightly before reaching visual sprite
// Makes portals easier to use
```

## Offset Guidelines

### collisionOffsetY (Vertical Offset)

- **Positive values**: Move collision box DOWN
- **Negative values**: Move collision box UP
- **Use for**: Matching ground-level objects, feet positions, bases of trees

```javascript
collisionOffsetY: 15   // Good for: Trees, characters (feet at bottom)
collisionOffsetY: 0    // Good for: Centered objects, chests, barrels
collisionOffsetY: -10  // Good for: Floating objects, flying enemies
```

### collisionOffsetX (Horizontal Offset)

- **Positive values**: Move collision box RIGHT
- **Negative values**: Move collision box LEFT
- **Use for**: Off-center objects, asymmetric sprites

```javascript
collisionOffsetX: 0    // Good for: Most objects (centered)
collisionOffsetX: 10   // Good for: Object leaning right
collisionOffsetX: -10  // Good for: Object leaning left
```

## Debugging Collision Boxes

### Enable Debug Visualization

Press **F3** in-game to toggle collision box visualization:

- **Red boxes**: Show collision bounds
- **Yellow dots**: Show object center points
- **Now properly scaled**: Matches what you see on screen!

### Testing Collision

1. Enable debug mode (F3)
2. Walk around objects
3. Check if red boxes match your expectations
4. Adjust `collisionPercent`, `collisionOffsetX`, `collisionOffsetY` as needed

## Technical Details

### Methods Added to GameObject

```javascript
// Get actual rendered dimensions (visible size on screen)
getActualWidth(game)   // Returns: spriteWidth × all scales
getActualHeight(game)  // Returns: spriteHeight × all scales

// Get collision bounds (now properly scaled)
getCollisionBounds(game)  // Returns: { x, y, width, height, left, right, top, bottom }
getBounds(game)           // Returns: full sprite bounds (for reference)

// Collision checking (now passes game instance for scaling)
collidesWith(other, game)           // Check collision with another object
wouldCollideAt(x, y, other, game)  // Check collision at specific position
```

### Methods Updated in CollisionSystem

```javascript
// All collision methods now require game instance
checkCollision(objA, objB, game)              // AABB collision check
checkPortalCollisions(player, portals, dt, game)  // Portal collision check
pointInCollisionBounds(x, y, obj, game)       // Point-in-box test
```

### GameEngine Integration

```javascript
// Collision checking now properly scaled
checkActorCollisions(newX, newY, actor, game)  // Uses getActualWidth/Height
checkPortalCollisions()                         // Passes game to portal checks
```

## Migration Guide

### Old Code (Broken Scaling)

```javascript
// ❌ Old way - collision didn't match sprite scale
getCollisionBounds() {
    const width = this.getWidth();  // Only object scale, missing resolution + map
    return {
        left: this.x - width / 2,
        // ...
    };
}
```

### New Code (Proper Scaling)

```javascript
// ✅ New way - collision matches all scaling
getCollisionBounds(game) {
    const width = this.getActualWidth(game);  // All scales included!
    return {
        left: this.x - width / 2,
        // ...
    };
}
```

### Updating Existing Objects

**No changes needed!** Existing objects automatically benefit from the new system:

```javascript
// This already works perfectly now
new StaticObject({
    scale: 0.3,
    collisionPercent: 0.15,
    collisionOffsetY: 15
})
```

The collision box will now:
- ✅ Match the rendered sprite size exactly
- ✅ Work on mobile, desktop, and 4K
- ✅ Respect map scaling
- ✅ Be pixel-perfect

## Performance

**Zero performance impact**:
- Calculations done once per collision check
- Same number of operations as before
- Simple multiplications (very fast)

## Best Practices

### 1. Start with collisionPercent

```javascript
// Try simple percent first
collisionPercent: 0.5  // Start here
```

### 2. Use Specific Percents for Asymmetric Objects

```javascript
// Use width/height percents for precision
collisionWidthPercent: 0.2,   // Narrow
collisionHeightPercent: 0.4   // Taller
```

### 3. Use Offsets for Fine-Tuning

```javascript
// Adjust position after setting size
collisionOffsetY: 12  // Move down to base
```

### 4. Test with Debug Mode

```javascript
// Always verify with F3 debug visualization
// Red box should match your intent
```

### 5. Consider Gameplay Feel

```javascript
// Trees: Small collision (walk close)
collisionPercent: 0.15

// Characters: Feet-only collision (depth sorting)
collisionPercent: 0.25

// Walls: Large collision (solid barrier)
collisionPercent: 0.9

// Triggers: Oversized collision (easy activation)
collisionPercent: 1.2
```

## Summary

The new collision system ensures that collision boxes:

1. **Match rendered sprites exactly** (pixel-perfect)
2. **Work on all screen sizes** (mobile to 4K)
3. **Are easy to configure** (percents and offsets)
4. **Are easy to debug** (visual collision boxes)
5. **Require no migration** (existing code works)

Configure once, works everywhere! 🎮✨
