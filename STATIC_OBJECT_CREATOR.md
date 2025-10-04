# Static Object Creator - Map Editor Feature

## Overview
Added a "New Static Object" creator to the map editor that allows you to create custom static objects on the fly with full control over sprite, scale, collision, and shadow settings.

## How to Use

### Opening the Creator

1. Press `F2` to open the Map Editor
2. Click **"Data"** menu → **"Objects"** → **"➕ New Static Object"**

### Creating an Object

The creator modal provides the following options:

#### 1. **Sprite Path**
- Enter the path to your sprite image
- Example: `assets/objects/trees/tree-01.png`
- Preview updates automatically
- Red border indicates invalid/missing sprite

#### 2. **Sprite Preview**
- Live preview of your selected sprite
- Shows on a checkerboard background
- Helps verify the sprite loads correctly
- Uses pixelated rendering for pixel art

#### 3. **Scale**
- Adjust object size
- Range: 0.1 to 5.0
- Step: 0.1
- Default: 1.0 (100%)

#### 4. **Collision Box Adjustments**
Fine-tune the collision box for precise hit detection:

- **Top Offset %**: Shrink/expand top edge
- **Bottom Offset %**: Shrink/expand bottom edge  
- **Left Offset %**: Shrink/expand left edge
- **Right Offset %**: Shrink/expand right edge

**Range**: -1.0 to 1.0
**Step**: 0.05

**Negative values shrink** the collision box:
- `-0.90` = 90% smaller (common for trees - remove leafy top)
- `-0.70` = 70% smaller (common for bushes)
- `-0.25` = 25% smaller (common for narrower objects)

**Positive values expand** the collision box:
- `0.25` = 25% larger
- Useful for objects that should block more space

#### 5. **Casts Shadow**
- Checkbox to enable/disable shadow rendering
- **Checked** (default): Object casts a ground shadow
- **Unchecked**: No shadow (good for flat objects, signs, etc.)

### Placing the Object

1. Fill in all the settings
2. Click **"➕ Create & Place"**
3. Your cursor becomes a placement tool
4. Click on the map to place the object
5. Press `ESC` to cancel placement

## Common Object Types

### Trees
```
Sprite: assets/objects/trees/tree-01.png
Scale: 1.0
Top Offset: -0.90 (remove leafy top)
Left/Right Offset: -0.25 (trunk width)
Casts Shadow: false/true
```

### Bushes
```
Sprite: assets/objects/bushes/bush-01.png
Scale: 0.5
Top Offset: -0.70 (remove top foliage)
Left/Right Offset: -0.05 (slight trim)
Casts Shadow: false
```

### Rocks
```
Sprite: assets/objects/rocks/rock-01.png
Scale: 0.3
Offsets: 0 (use full sprite)
Casts Shadow: false
```

### Signs/Flat Objects
```
Sprite: assets/objects/signs/sign-01.png
Scale: 0.8
Offsets: 0 (use full sprite)
Casts Shadow: false (flat on ground)
```

## Tips & Best Practices

### Collision Box Tuning
1. Start with default (0 for all offsets)
2. Place object in editor
3. Toggle collision boxes: Press `C` key
4. See red collision rectangle
5. Adjust offsets if needed
6. Re-create object with new settings

### Sprite Path Tips
- Use forward slashes `/` (works on all platforms)
- Path is relative to game root
- Common locations:
  - `assets/objects/trees/`
  - `assets/objects/bushes/`
  - `assets/objects/rocks/`
  - `assets/objects/signs/`

### Scale Guidelines
- **Large objects** (trees): 0.8 - 1.5
- **Medium objects** (bushes, signs): 0.3 - 0.7
- **Small objects** (rocks, items): 0.2 - 0.4
- Test in-game to ensure proper size relative to player

### Shadow Settings
**Cast Shadow = true** when:
- Object is 3D/volumetric (trees, characters, buildings)
- Object is tall and should have ground presence
- Adds depth to the scene

**Cast Shadow = false** when:
- Object is flat on ground (rugs, floor decals)
- Object already has baked shadow in sprite
- Performance optimization for many objects

## Technical Details

### Object Structure
Created objects use this data structure:
```javascript
{
    category: 'StaticObject',
    spriteSrc: 'path/to/sprite.png',
    scale: 1.0,
    collisionExpandTopPercent: 0,
    collisionExpandBottomPercent: 0,
    collisionExpandLeftPercent: 0,
    collisionExpandRightPercent: 0,
    castsShadow: true
}
```

### Collision Calculation
- Base collision box = sprite dimensions
- Offsets are **percentages** of sprite dimensions
- Applied during rendering/physics calculations
- Negative values shrink, positive expand

### Integration
- Works with all editor tools (move, copy, delete)
- Saves to map data via editor save function
- Undo/redo support
- Grid snapping support

## Workflow Example

### Creating a Custom Tree
1. Open editor (`F2`)
2. Data → Objects → New Static Object
3. Set sprite: `assets/objects/trees/oak-tree.png`
4. Set scale: `1.2` (slightly larger)
5. Set top offset: `-0.85` (remove leafy crown)
6. Set left/right offset: `-0.30` (narrow trunk)
7. Check "Casts Shadow"
8. Click "Create & Place"
9. Click on map to place
10. Press `C` to verify collision box
11. Adjust and re-create if needed

## Future Enhancements
Possible improvements:
- Save custom objects as reusable templates
- Object library/browser
- Visual collision editor (drag handles)
- Multiple sprite support (animations)
- Preset templates (tree, bush, rock, etc.)
- Batch creation for similar objects
