# Light Dispels Darkness System

## Overview
Lights now properly "dispel" darkness from the day/night cycle shader. When you place a light source, it brightens the area around it, cutting through nighttime darkness and weather effects.

## Implementation

### Render Order Change
**OLD ORDER:**
1. Game objects
2. Lights (additive blending)
3. Day/night darkness overlay

**NEW ORDER:**
1. Game objects
2. Day/night darkness overlay (applied first)
3. Lights (screen blending - dispels darkness)

### Key Changes

#### 1. RenderSystem.js
```javascript
// Render darkness FIRST
if (game?.currentMap?.dayNightCycle && game?.dayNightCycle) {
    game.dayNightCycle.render(this.ctx, canvasWidth, canvasHeight, weatherState);
}

// Render lights AFTER (using screen blend to dispel darkness)
if (game?.lightManager) {
    game.lightManager.render(this.ctx, this.camera.x, this.camera.y);
}
```

#### 2. LightManager.js - Blend Mode
```javascript
// Changed from 'lighter' to 'screen'
ctx.globalCompositeOperation = 'screen';
```

**Why 'screen' blend mode?**
- Formula: `1 - (1 - backdrop) * (1 - source)`
- Dark pixels become brighter when light is applied
- Like projecting light onto a dark screen
- Perfect for dispelling darkness overlays

#### 3. LightManager.js - Brightness Enhancement
```javascript
// Brighten colors by 50% for better darkness dispelling
const brightR = Math.min(255, light.color.r * 1.5);
const brightG = Math.min(255, light.color.g * 1.5);
const brightB = Math.min(255, light.color.b * 1.5);
```

**Why brighten?**
- Screen blend works best with bright colors (closer to 255)
- Brighter source = more darkness dispelled
- Creates realistic "pools of light" in darkness

#### 4. Improved Gradient Falloff
```javascript
gradient.addColorStop(0, rgba(..., alpha));      // Center: 100%
gradient.addColorStop(0.4, rgba(..., alpha*0.7)); // Mid: 70%
gradient.addColorStop(0.7, rgba(..., alpha*0.3)); // Outer: 30%
gradient.addColorStop(1, rgba(..., 0));           // Edge: 0%
```

Smoother falloff creates more natural light dispersion.

## Visual Effect

### Before
- Lights rendered UNDER darkness
- Additive blending just made things brighter
- No interaction with darkness overlay
- Lights barely visible at night

### After
- Lights rendered OVER darkness
- Screen blending actively dispels darkness
- Creates "pools of light" in dark areas
- Realistic torchlight/lamppost effect at night

## Usage

1. **Enable Day/Night Cycle** on map
2. **Place lights** using the editor
3. **Set time to night** (20:00 - 05:00)
4. **See lights dispel darkness** around them

### Light Properties
- **Radius**: Area of darkness dispelled (in pixels)
- **Color**: Tint of the light (orange = torch, white = lamp)
- **Alpha**: Strength of darkness dispelling (0-1)
- **Flicker**: Optional intensity variation

## Technical Notes

### Blend Mode Comparison
- **'lighter'** (old): Simple additive, no darkness interaction
- **'screen'** (new): Brightens dark pixels, dispels darkness
- **'overlay'**: Too harsh, creates weird artifacts
- **'lighten'**: Only replaces darker pixels, not smooth

### Performance
- No performance impact - same number of draw calls
- Screen blend is GPU-accelerated on all browsers
- Works identically with WebGL shader system

## Examples

```javascript
// Torch (warm, flickering)
{
    radius: 150,
    color: { r: 255, g: 180, b: 100, a: 0.8 },
    flicker: { enabled: true, speed: 3, intensity: 0.15 }
}

// Lamp (bright, steady)
{
    radius: 200,
    color: { r: 255, g: 240, b: 200, a: 0.9 },
    flicker: { enabled: false }
}

// Magical (colored, gentle flicker)
{
    radius: 180,
    color: { r: 150, g: 200, b: 255, a: 0.7 },
    flicker: { enabled: true, speed: 1.5, intensity: 0.1 }
}
```

## Future Enhancements
- [ ] Light occlusion/shadows (blocked by walls)
- [ ] Dynamic lights on moving objects
- [ ] Light intensity based on time of day (brighter at night)
- [ ] Colored ambient light from multiple sources
