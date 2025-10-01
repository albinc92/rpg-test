# Collision System Documentation

## Overview

The collision system provides **pixel-perfect collision detection** that automatically matches sprite rendering on any screen resolution. Collision boxes account for all scaling factors: sprite size, object scale, resolution scale, and map scale.

## How It Works

### Collision Calculation Formula

```javascript
// Step 1: Calculate actual rendered size (what player sees)
actualWidth = spriteWidth × objectScale × resolutionScale × mapScale
actualHeight = spriteHeight × objectScale × resolutionScale × mapScale

// Step 2: Apply collision sizing
collisionWidth = actualWidth × collisionWidthPercent
collisionHeight = actualHeight × collisionHeightPercent

// Step 3: Apply position offsets
collisionX = objectX - collisionWidth/2 + collisionOffsetX
collisionY = objectY - collisionHeight/2 + collisionOffsetY
```

**Result**: Collision boxes are pixel-perfect with rendered sprites on any screen resolution.

## Configuration Properties

### Basic Properties

```javascript
new GameObject({
    hasCollision: true,        // Enable collision (default: true)
    blocksMovement: true,      // Blocks other objects (default: true)
    canBeBlocked: true,        // Can be blocked by others (default: true)
    
    // Sizing
    collisionPercent: 0.8,     // Both width & height = 80% of sprite
    
    // Positioning
    collisionOffsetX: 0,       // Horizontal shift in pixels
    collisionOffsetY: 10,      // Vertical shift in pixels
})
```

### Advanced Properties

```javascript
new GameObject({
    // Asymmetric collision (overrides collisionPercent)
    collisionWidthPercent: 0.3,   // Width = 30% of sprite
    collisionHeightPercent: 0.15, // Height = 15% of sprite
})
```

## Common Patterns

### Player/NPC (Feet Collision)
```javascript
new Player({
    scale: 0.07,
    collisionPercent: 0.25,    // 25% of sprite (feet area)
    collisionOffsetY: 15,      // Push to bottom
})
```
**Use case**: Natural depth sorting, walk "behind" objects

### Tree (Narrow Trunk)
```javascript
new StaticObject({
    scale: 0.3,
    collisionPercent: 0.15,    // 15% of sprite (trunk base)
    collisionOffsetY: 15,      // Push to bottom
})
```
**Use case**: Walk close to tree, canopy doesn't block

### Tall Tree (Asymmetric)
```javascript
new StaticObject({
    scale: 0.4,
    collisionWidthPercent: 0.1,    // 10% width (narrow trunk)
    collisionHeightPercent: 0.25,  // 25% height (includes lower branches)
    collisionOffsetY: 20,
})
```
**Use case**: Narrow base, some vertical obstruction

### Bush/Rock (Wide & Short)
```javascript
new StaticObject({
    scale: 0.25,
    collisionWidthPercent: 0.6,   // 60% width
    collisionHeightPercent: 0.3,  // 30% height
    collisionOffsetY: 8,
})
```
**Use case**: Wide obstacle, can walk "over" visually

### Chest (Solid Object)
```javascript
new Chest({
    scale: 0.5,
    collisionPercent: 0.7,    // 70% of sprite
    collisionOffsetY: 5,      // Slightly down from center
})
```
**Use case**: Solid, blocks movement

### Portal (Large Trigger)
```javascript
new Portal({
    scale: 0.8,
    collisionPercent: 1.2,    // 120% of sprite (larger than visual!)
    collisionOffsetY: 0,
})
```
**Use case**: Trigger before reaching visual sprite (easier to use)

## Offset Guidelines

### Vertical Offset (collisionOffsetY)
- **Positive**: Move collision DOWN
- **Negative**: Move collision UP

```javascript
collisionOffsetY: 15   // Trees, characters (feet at bottom)
collisionOffsetY: 0    // Centered objects (chests, barrels)
collisionOffsetY: -10  // Floating objects (spirits, flying enemies)
```

### Horizontal Offset (collisionOffsetX)
- **Positive**: Move collision RIGHT
- **Negative**: Move collision LEFT

```javascript
collisionOffsetX: 0    // Most objects (centered)
collisionOffsetX: 10   // Objects leaning right
collisionOffsetX: -10  // Objects leaning left
```

## Visual Guide

### Collision Percent Examples

```
collisionPercent: 1.0 (100%)    collisionPercent: 0.5 (50%)
┌─────────────────┐              ┌─────────────────┐
│░░░░░░░░░░░░░░░░░│              │                 │
│░░░COLLISION░░░░░│              │   ┌─────────┐   │
│░░░░░░░░░░░░░░░░░│              │   │COLLISION│   │
└─────────────────┘              │   └─────────┘   │
                                 └─────────────────┘
```

### Offset Examples

```
offsetY: 0 (centered)         offsetY: +15 (down)           offsetY: -10 (up)
┌─────────────────┐            ┌─────────────────┐            + (center)
│   ┌─────────┐   │            │                 │              ↑ -10px
│   │Collision│   │            │   ┌─────────┐   │          ┌─────────────────┐
│   └─────────┘   │            │   │Collision│   │          │   ┌─────────┐   │
└─────────────────┘            └───┴─────────┴───┘          │   │Collision│   │
    + (center)                     + (center)                │   └─────────┘   │
                                     ↓ +15px                 └─────────────────┘
```

### Real-World Examples

```
Tree (tall sprite, narrow trunk)      Character (feet collision)
        🌳                                     👤
       ┌┼┐                                   ┌─┐ Head
       │││ ← Trunk (narrow)                  │ │ Body
       └┼┘                                   ├─┤
        +                                    └┼┘ ← Collision
widthPercent: 0.1                             +
heightPercent: 0.2                       percent: 0.25
offsetY: 20                              offsetY: 15
```

## Debugging

### Enable Debug Visualization
Press **F3** in-game to toggle collision visualization:
- **Red boxes**: Collision bounds
- **Yellow dots**: Object center points

### Testing Workflow
1. Press F3 to enable debug mode
2. Walk around objects
3. Verify red boxes match your expectations
4. Adjust `collisionPercent`, `collisionWidthPercent`, `collisionHeightPercent`, or offsets
5. Test on different screen sizes (mobile, desktop, 4K)

## API Reference

### GameObject Methods

```javascript
// Get actual rendered dimensions (includes all scales)
object.getActualWidth(game)    // Returns final rendered width
object.getActualHeight(game)   // Returns final rendered height

// Get collision bounds
object.getCollisionBounds(game)  // Returns: { x, y, width, height, left, right, top, bottom }
object.getBounds(game)           // Returns full sprite bounds

// Collision checking
object.collidesWith(other, game)           // Check collision with another object
object.wouldCollideAt(x, y, other, game)  // Test collision at specific position
```

### CollisionSystem Methods

```javascript
// AABB collision detection
collisionSystem.checkCollision(objA, objB, game)

// Portal collisions
collisionSystem.checkPortalCollisions(player, portals, deltaTime, game)

// Point-in-box test
collisionSystem.pointInCollisionBounds(x, y, obj, game)

// Distance between objects
collisionSystem.getDistance(objA, objB)
```

### GameEngine Integration

```javascript
// Check actor collisions (handles map boundaries and objects)
game.checkActorCollisions(newX, newY, actor, game)

// Check portal collisions
game.checkPortalCollisions()
```

## Quick Reference Table

| Object Type    | Percent | Width % | Height % | OffsetY | Use Case                  |
|----------------|---------|---------|----------|---------|---------------------------|
| Player         | 0.25    | -       | -        | 15      | Feet collision            |
| NPC            | 0.25    | -       | -        | 15      | Feet collision            |
| Tree           | 0.15    | -       | -        | 15      | Trunk base only           |
| Tall Tree      | -       | 0.1     | 0.25     | 20      | Narrow trunk + branches   |
| Chest          | 0.7     | -       | -        | 5       | Solid obstacle            |
| Bush/Rock      | -       | 0.6     | 0.3      | 8       | Wide but short            |
| Portal         | 1.2     | -       | -        | 0       | Large trigger zone        |
| Spirit         | 0.3     | -       | -        | 0       | Small, ethereal           |

## Best Practices

1. **Start simple** - Use `collisionPercent` first
2. **Use asymmetric for tall/wide objects** - `collisionWidthPercent` and `collisionHeightPercent`
3. **Adjust with offsets** - Fine-tune position after setting size
4. **Always test with F3** - Verify collision boxes visually
5. **Test on multiple resolutions** - Ensure it works on mobile and desktop

## Performance

- **Zero performance impact** - Same calculations as before
- **Resolution-independent** - Works on mobile (844×390) to 4K (3840×2160)
- **Automatic scaling** - No manual adjustments needed

## Summary

✅ Collision boxes match rendered sprites exactly (pixel-perfect)  
✅ Works on all screen sizes automatically  
✅ Easy to configure with percents and offsets  
✅ Easy to debug with visual collision boxes (F3)  
✅ No migration needed - existing objects work automatically

Configure once, works everywhere! 🎮✨
