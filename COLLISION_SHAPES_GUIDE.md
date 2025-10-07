# Collision Shapes Guide

## Overview
The collision system now supports both **rectangular** and **circular/elliptical** collision shapes. This allows for more natural collision detection, especially for NPCs (circular bodies) and trees (oval trunks).

## Collision Shape Types

### 1. Rectangle (Default)
- **Use for:** Buildings, walls, square objects, player character
- **Detection:** AABB (Axis-Aligned Bounding Box) collision
- **Fast and precise** for rectangular objects

### 2. Circle/Ellipse
- **Use for:** NPCs, trees, bushes, round objects
- **Detection:** Circular/elliptical collision with proper radius calculation
- **Creates ovals** when collision expand percentages differ (width ≠ height)

## How to Use in Map Editor

### Setting Collision Shape
1. Select an object in the map editor
2. Open the **Collision** section in the property panel
3. Choose the collision shape:
   - **⬜ Square** - Rectangular collision (default)
   - **⚫ Round** - Circular/elliptical collision

### Creating Oval Collision Boxes
To create an **oval** (ellipse) collision shape:
1. Set collision shape to **⚫ Round**
2. Adjust the **expand percentages** to create different widths and heights:
   - **Top %** and **Bottom %** - Expands vertically (affects radiusY)
   - **Left %** and **Right %** - Expands horizontally (affects radiusX)
3. Example for vertical tree trunk:
   - Top %: -0.2
   - Bottom %: 0.1
   - Left %: -0.3
   - Right %: -0.3
   - This creates a tall, narrow oval

## Collision Detection Algorithms

### Rectangle-Rectangle
- Standard AABB overlap test
- Checks if bounding boxes intersect

### Circle-Circle
- Perfect circle collision: `distance ≤ radius1 + radius2`
- Ellipse approximation: Uses average radii for ellipses

### Circle-Rectangle (Mixed)
- Finds closest point on rectangle to circle center
- Normalizes distance by ellipse radii
- Collision when normalized distance ≤ 1.0

## Visual Debugging

When collision boxes are visible (F1 debug mode or editor collision view):
- **Rectangular collision:** Red rectangle outline
- **Circular collision:** Red circle/ellipse outline
- **Center point:** Yellow dot shows object position

## Technical Details

### GameObject Properties
```javascript
obj.collisionShape = 'rectangle' | 'circle'; // Default: 'rectangle'
```

### Collision Circle/Ellipse Data
```javascript
const circle = obj.getCollisionCircle(game);
// Returns:
// {
//   centerX: number,
//   centerY: number,
//   radiusX: number,  // Half of collision width
//   radiusY: number,  // Half of collision height
//   radius: number    // Max of radiusX and radiusY
// }
```

### Collision Methods
- `CollisionSystem.checkCollision(objA, objB, game)` - Detects shape combination and uses appropriate algorithm
- `CollisionSystem.checkCircleRectangleCollision(circle, rect)` - Circle vs rectangle
- `CollisionSystem.checkEllipseEllipseCollision(circleA, circleB)` - Circle vs circle (supports ellipses)
- `CollisionSystem.pointInCollisionBounds(x, y, obj, game)` - Point-in-shape test (supports circles)

## Examples

### NPC with Circular Collision
```javascript
const npc = new NPC({
    x: 100,
    y: 100,
    collisionShape: 'circle',
    collisionPercent: 0.8  // Slightly smaller than sprite
});
```

### Tree with Oval Collision (Trunk)
```javascript
const tree = new StaticObject({
    x: 200,
    y: 200,
    collisionShape: 'circle',
    collisionPercent: 0.5,
    collisionExpandTopPercent: -0.2,    // Shrink top
    collisionExpandBottomPercent: 0.1,   // Expand bottom
    collisionExpandLeftPercent: -0.3,    // Shrink left
    collisionExpandRightPercent: -0.3    // Shrink right
});
// Results in a tall, narrow oval matching tree trunk
```

### Bush with Circular Collision
```javascript
const bush = new StaticObject({
    x: 300,
    y: 300,
    collisionShape: 'circle',
    collisionPercent: 0.7,  // Round collision slightly smaller than sprite
    collisionExpandTopPercent: 0.0,
    collisionExpandBottomPercent: 0.0,
    collisionExpandLeftPercent: 0.0,
    collisionExpandRightPercent: 0.0
});
// Results in a perfect circle
```

## Benefits

1. **More Natural Collision:** NPCs can slide around each other smoothly instead of corner-catching
2. **Better Tree Collision:** Trees have oval collision matching their trunk, not the full foliage
3. **Flexible Shapes:** Create ovals by adjusting expand percentages without needing separate oval type
4. **Backward Compatible:** Existing objects default to rectangle collision
5. **Mixed Collision:** Objects with different shapes can collide correctly (circle vs rectangle)

## Performance Notes

- Circle-circle collision is **very fast** (simple distance calculation)
- Circle-rectangle collision is **slightly slower** (closest point calculation)
- Ellipse-ellipse uses **approximation** for performance (average radii)
- No significant performance impact for typical game scenarios
