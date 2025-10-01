# Collision Box Configuration - Visual Guide

## Understanding Collision Box Positioning

```
┌─────────────────────────────────────┐
│         Sprite Visual Area          │  ← Full sprite (100%)
│                                     │
│    ┌───────────────────────┐       │
│    │                       │       │
│    │   Collision Box       │       │  ← Sized by collisionPercent
│    │   (collisionPercent)  │       │     or collisionWidth/HeightPercent
│    │                       │       │
│    └───────────────────────┘       │
│             + (center)              │  ← Object position (x, y)
│                                     │
└─────────────────────────────────────┘
```

## Collision Percent Examples

### collisionPercent: 1.0 (100% - Full Sprite)
```
┌─────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░│  ← Sprite
│░░░░░░░COLLISION░░░░░│  ← Collision = Full sprite
│░░░░░░░░░░░░░░░░░░░░░│
└─────────────────────┘
```

### collisionPercent: 0.5 (50% - Half Size)
```
┌─────────────────────┐
│                     │  ← Sprite
│     ┌─────────┐     │
│     │COLLISION│     │  ← Collision = 50% of sprite
│     └─────────┘     │
│                     │
└─────────────────────┘
```

### collisionPercent: 0.25 (25% - Quarter Size)
```
┌─────────────────────┐
│                     │  ← Sprite
│                     │
│       ┌───┐         │  ← Collision = 25% of sprite
│       └───┘         │     (Good for character feet)
│                     │
└─────────────────────┘
```

## Offset Examples (Y-Axis)

### collisionOffsetY: 0 (Centered)
```
┌─────────────────────┐
│      Sprite         │
│   ┌───────────┐     │
│   │ Collision │     │  ← Centered vertically
│   └───────────┘     │
│                     │
└─────────────────────┘
        + (center)
```

### collisionOffsetY: +15 (Moved Down)
```
┌─────────────────────┐
│      Sprite         │
│                     │
│   ┌───────────┐     │  ← Moved DOWN (+Y)
│   │ Collision │     │     (Good for tree trunks)
└───┴───────────┴─────┘
        + (center)
          ↓ +15px
```

### collisionOffsetY: -10 (Moved Up)
```
        + (center)
          ↑ -10px
┌─────────────────────┐
│   ┌───────────┐     │  ← Moved UP (-Y)
│   │ Collision │     │     (Good for floating objects)
│   └───────────┘     │
│      Sprite         │
└─────────────────────┘
```

## Offset Examples (X-Axis)

### collisionOffsetX: 0 (Centered)
```
        + (center)
        │
┌───────┼───────────┐
│   ┌───────────┐   │  ← Centered horizontally
│   │ Collision │   │
│   └───────────┘   │
└───────────────────┘
```

### collisionOffsetX: +10 (Moved Right)
```
        + (center)
        │
        │→ +10px
┌───────────────────┐
│     ┌───────────┐ │  ← Moved RIGHT (+X)
│     │ Collision │ │
│     └───────────┘ │
└───────────────────┘
```

### collisionOffsetX: -10 (Moved Left)
```
      + (center)
      │
-10px←│
┌───────────────────┐
│ ┌───────────┐     │  ← Moved LEFT (-X)
│ │ Collision │     │
│ └───────────┘     │
└───────────────────┘
```

## Real-World Examples

### Example 1: Tree (Tall sprite, narrow trunk)
```
        🌳 ← Full sprite (tall with leaves)
       ┌┼┐
       │││
       │││
       │││ ← Trunk (narrow)
       └┼┘
        +
        
collisionWidthPercent: 0.1   (10% - just the trunk width)
collisionHeightPercent: 0.2  (20% - base of trunk)
collisionOffsetY: 20         (pushed to bottom)

Result: Player can walk close to tree, only trunk blocks
```

### Example 2: Character (Sprite with head and body)
```
        👤 ← Full sprite
       ┌─┐ Head
       │ │ Body
       │ │
       ├─┤ Waist
       │ │
       └┼┘ Feet  ← Collision here
        +

collisionPercent: 0.25       (25% - feet area only)
collisionOffsetY: 15         (pushed to bottom)

Result: Collision at feet, natural depth sorting
```

### Example 3: Chest (Symmetric, solid object)
```
    ┌──────┐
    │      │ ← Full sprite
    │ GOLD │
    │      │
    └──────┘
       +

collisionPercent: 0.7        (70% - most of sprite)
collisionOffsetY: 5          (slightly down from center)

Result: Solid collision, player can't walk through
```

### Example 4: Portal (Trigger zone)
```
      ╔════╗ ← Trigger zone (larger than visual)
      ║    ║
    ┌─║─┐  ║
    │ ║░│  ║ ← Visual portal
    └─║─┘  ║
      ║    ║
      ╚════╝
        +

collisionPercent: 1.2        (120% - BIGGER than sprite)
collisionOffsetY: 0          (centered)

Result: Player triggers portal before reaching it (easier to use)
```

## Width vs Height Examples

### Symmetric Object (Square)
```
┌───────────┐
│           │
│  ░░░░░░░  │  ← collisionPercent: 0.5
│  ░░░░░░░  │     (same width and height)
│  ░░░░░░░  │
│           │
└───────────┘
```

### Asymmetric Object (Tall & Narrow)
```
┌───────────┐
│           │
│     ░     │  ← collisionWidthPercent: 0.15 (narrow)
│     ░     │     collisionHeightPercent: 0.5 (tall)
│     ░     │
│     ░     │
│           │
└───────────┘
```

### Asymmetric Object (Wide & Short)
```
┌───────────┐
│           │
│           │
│ ░░░░░░░░░ │  ← collisionWidthPercent: 0.8 (wide)
│           │     collisionHeightPercent: 0.2 (short)
│           │
└───────────┘
```

## Coordinate System

```
        -Y (Up)
         ↑
         │
-X ←─────+─────→ +X (Right)
(Left)   │
         ↓
        +Y (Down)

X: Horizontal (left/right)
Y: Vertical (up/down)
+ : Object center position
```

## Tips for Tuning Collision

1. **Start with collisionPercent**
   - Use 0.25 for characters (feet)
   - Use 0.15 for trees (trunk base)
   - Use 0.7 for solid objects (chests, barrels)
   - Use 1.0+ for triggers (portals, zones)

2. **Use width/height percents for asymmetry**
   - Tall narrow objects: Low width %, higher height %
   - Wide flat objects: High width %, low height %

3. **Use offsetY for vertical positioning**
   - Trees: Positive offset (push down to base)
   - Characters: Positive offset (push to feet)
   - Floating: Negative offset (push up)

4. **Use offsetX sparingly**
   - Only for off-center or asymmetric sprites
   - Most objects should use offsetX: 0

5. **Enable debug mode (F3) to visualize**
   - Red boxes show collision
   - Adjust until red box matches your intent

## Common Collision Patterns

| Object Type    | Percent | Width % | Height % | OffsetY | Reason                    |
|----------------|---------|---------|----------|---------|---------------------------|
| Player         | 0.25    | -       | -        | 15      | Feet collision            |
| NPC            | 0.25    | -       | -        | 15      | Feet collision            |
| Tree           | 0.15    | -       | -        | 15      | Trunk base only           |
| Tall Tree      | -       | 0.1     | 0.25     | 20      | Narrow trunk, some height |
| Chest          | 0.7     | -       | -        | 5       | Solid, most of sprite     |
| Bush           | -       | 0.6     | 0.3      | 8       | Wide but short            |
| Portal         | 1.2     | -       | -        | 0       | Large trigger zone        |
| Rock           | 0.8     | -       | -        | 10      | Solid obstacle            |
| Sign           | 0.6     | -       | -        | 12      | Post at bottom            |
| Spirit/Ghost   | 0.3     | -       | -        | 0       | Small, ethereal           |

## Scale Awareness

**Important:** All collision calculations automatically account for:

```javascript
actualSize = spriteSize × objectScale × resolutionScale × mapScale

// Example: Tree on 1920×1080
spriteSize: 400px (width)
objectScale: 0.3 (tree scale)
resolutionScale: 1.0 (1920/1920)
mapScale: 1.0 (default)
= 120px actual width

collisionWidthPercent: 0.15
= 18px collision width (just the trunk!)
```

The same tree on 4K (3840×2160):
```javascript
spriteSize: 400px
objectScale: 0.3
resolutionScale: 2.0 (3840/1920)  ← Automatically larger!
mapScale: 1.0
= 240px actual width

collisionWidthPercent: 0.15
= 36px collision width (still proportional!)
```

**This is automatic!** You only set percents and offsets once.
