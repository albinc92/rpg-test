# Dynamic Shadow System

## Overview

The dynamic shadow system creates **pixel-perfect sprite-based shadows** that automatically adjust direction, length, and opacity based on the time of day and sun position. Shadows use the actual sprite silhouette and move realistically as the sun travels across the sky from east to west.

## How It Works

### Sun Movement
- **Dawn (6:00)**: Sun rises in the **east** (right side of screen)
- **Noon (12:00)**: Sun directly **overhead**
- **Dusk (18:00)**: Sun sets in the **west** (left side of screen)
- **Night**: No visible sun

### Shadow Behavior

#### Direction
- **Dawn (6:00)**: Shadows cast to the **west** (left/negative X) 🌅
- **Morning (9:00)**: Shadows cast to the **northwest**
- **Noon (12:00)**: Shadows minimal, almost directly under objects ☀️
- **Afternoon (15:00)**: Shadows cast to the **northeast**
- **Dusk (18:00)**: Shadows cast to the **east** (right/positive X) 🌇
- **Night**: Shadows very faint or invisible 🌙

#### Length
- **Low sun (dawn/dusk)**: Long shadows (up to 60 pixels)
- **High sun (noon)**: Short shadows (minimum 10 pixels)
- Formula: `length = minLength + (maxLength - minLength) × (1 - sunHeight)`

#### Opacity
- **Daytime (5:00-19:00)**: Strong shadows (opacity up to 0.35)
- **Sun height affects strength**: Higher sun = darker shadow
- **Nighttime**: Very faint shadows (opacity 0.05)
- **Altitude**: Higher objects have fainter shadows

### Technical Implementation

#### `getShadowProperties()`
Returns shadow properties for current time:
```javascript
{
    offsetX: number,     // Horizontal shadow offset
    offsetY: number,     // Vertical shadow offset (compressed for ground)
    length: number,      // Shadow length in pixels
    opacity: number,     // Shadow transparency (0-1)
    sunHeight: number    // Sun elevation (0-1)
}
```

#### Shadow Calculation
1. **Sun Angle**: Calculated from time of day (0-24 hours)
2. **Sun Height**: Sine wave peaking at noon, minimum at midnight
3. **Shadow Angle**: Opposite direction to sun position
4. **Shadow Length**: Inversely proportional to sun height
5. **Shadow Stretch**: Shadows stretch more when sun is low

### Visual Effects

#### Pixel-Perfect Shadows
- **Sprite Silhouette**: Shadows use the actual shape of the sprite (not simple ellipses)
- **Alpha Preservation**: Transparent parts of sprite don't cast shadow
- **Detail Accuracy**: Every detail of the sprite shape is visible in the shadow
- Trees cast tree-shaped shadows, rocks cast rock-shaped shadows, etc.

### Shadow Stretching
- Shadows stretch horizontally when sun is low (stretch factor up to 2.5x)
- Creates realistic elongated shadows during golden hour
- Shadows compressed vertically for ground projection (0.5x height)

#### Ground Projection
- Y-axis offset is compressed (× 0.5) for realistic ground projection
- Shadows appear flat against the ground plane
- Maintains proper perspective

## Examples

### Dawn (6:00 AM)
```
         ☀️ (sun rising in east)
          |
[🌳]←----shadow
Objects cast long shadows to the west (left)
```

### Noon (12:00 PM)
```
        ☀️
         |
        [🌳]
         ·shadow
Almost no shadow, sun directly overhead
```

### Dusk (6:00 PM)
```
☀️ (sun setting in west)
 |
 shadow----→[🌳]
Objects cast long shadows to the east (right)
```

## Configuration

### Shadow Settings
- **Max Shadow Length**: 60 pixels (adjustable in `getShadowProperties()`)
- **Min Shadow Length**: 10 pixels (minimum at noon)
- **Max Opacity**: 0.35 during peak sunlight
- **Night Opacity**: 0.05 (barely visible)
- **Altitude Fade**: Shadows fade for objects at higher altitudes

### Time Ranges
- **Full Daylight**: 7:00 - 17:00 (strong shadows)
- **Dawn/Dusk**: 5:00-7:00 and 17:00-19:00 (transitional)
- **Night**: 19:00 - 5:00 (minimal shadows)

## Object Support

### Automatic Shadow Casting
All objects with `castsShadow: true` (default) automatically use dynamic shadows **on maps with day/night cycle enabled**:
- ✅ Player
- ✅ NPCs
- ✅ Spirits
- ✅ Static Objects (trees, rocks, chests, etc.)
- ✅ Dynamic Objects
- ✅ Interactive Objects

### Map Configuration
Shadows only render on maps where `dayNightCycle: true` is set in `maps.json`:
```json
{
  "0-0": {
    "name": "Starting Village",
    "dayNightCycle": true  // ← Enables dynamic shadows
  }
}
```

Maps without day/night cycles (like indoor/shop maps) won't render shadows, improving performance.

### Altitude Support
Objects at different altitudes (flying/floating) have:
- Offset shadows from their position
- Fainter shadows (fade based on height)
- Same directional behavior

## Testing

### Quick Time Changes
Use debug controls to test shadow movement:
- Press `]` to speed up time
- Press `[` to slow down time
- Watch shadows rotate and change length as time progresses

### Visual Verification
1. Place objects in the world
2. Advance time from dawn to dusk
3. Observe:
   - ✅ Shadows start on the left (west) at dawn
   - ✅ Shadows shrink and move under objects at noon
   - ✅ Shadows extend to the right (east) at dusk
   - ✅ Shadows fade during night

## Performance

- Shadow calculations are lightweight (simple trigonometry)
- No impact on rendering performance
- Shadows automatically disabled when `castsShadow: false`
- Works seamlessly with existing day/night cycle

## Future Enhancements

Possible additions:
- 🌙 Moon shadows at night (opposite direction, very faint)
- 🏔️ Multiple light sources (torches, campfires)
- 🌲 Shadow occlusion (objects blocking other shadows)
- 🎨 Colored shadows during dawn/dusk (blue/orange tints)
- ⚙️ Per-object shadow customization in editor

## Code Reference

### Main Implementation
- `GameEngine.js` → `getShadowProperties()`: Shadow calculation
- `GameEngine.js` → `drawShadow()`: Shadow rendering
- `DayNightCycle.js` → `timeOfDay`: Time source

### Usage Example
```javascript
// Automatic for all GameObjects with castsShadow: true
if (this.castsShadow) {
    // Pass sprite for pixel-perfect shadow projection
    game.drawShadow(scaledX, scaledY, scaledWidth, scaledHeight, altitudeOffset, this.sprite);
}
```

### Technical Implementation
The shadow system:
1. Creates a temporary canvas from the sprite
2. Extracts sprite silhouette (preserves alpha channel)
3. Converts RGB to black (keeps transparency)
4. Projects silhouette with rotation and stretch based on sun position
5. Applies opacity based on time of day
6. Compresses vertically for realistic ground projection

## Summary

The dynamic shadow system creates realistic, time-based shadows that:
- ✅ Move from west to east as day progresses
- ✅ Stretch during dawn/dusk (long shadows)
- ✅ Shrink at noon (short shadows)
- ✅ Fade during night
- ✅ Adjust for object altitude
- ✅ Work automatically with all game objects

This adds significant visual depth and realism to the game world! 🌅🌄🌇
