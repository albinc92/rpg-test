# WebGL Day/Night Cycle with Light Mask Integration

## Overview
Updated the day/night cycle system to use **WebGL-only rendering** with proper light source integration. Light sources now completely offset the darkening effect from the shader based on the light mask alpha values.

## Key Changes

### 1. Removed 2D Fallback
- **Before**: System had fallback to 2D canvas rendering if WebGL unavailable
- **After**: WebGL is now **required** - system throws error if WebGL not available
- No more `useShader` checks or `renderOverlay()` methods

### 2. Light Mask Integration in Shader
The WebGL fragment shader now:
- Accepts a light mask texture (grayscale: white = lit, black = dark)
- Accepts a darkness color multiplier (based on time of day)
- **Properly blends darkness with lights**: where light intensity = 1.0 (white), darkness is NOT applied
- Where light intensity = 0.0 (black), full darkness is applied
- Smooth interpolation in between

### 3. Simplified Rendering Pipeline

**Old Flow (2D):**
```
1. Render game content
2. Calculate darkness color (RGB)
3. Create temp canvas with darkness
4. Cut out holes using light mask (destination-out)
5. Apply to main canvas with multiply blend
6. Repeat for tint layer
```

**New Flow (WebGL):**
```
1. Render game content
2. Calculate darkness multiplier [r, g, b] (0-1 range)
3. Pass to shader with light mask
4. Shader applies darkness * lightMask in single pass
5. Copy back to 2D canvas
```

## Shader Implementation

### Fragment Shader Logic
```glsl
// Sample the light mask (white = lit, black = dark)
vec4 lightMaskColor = texture2D(u_lightMask, v_texCoord);
float lightIntensity = lightMaskColor.r; // Grayscale

// Apply darkness only where there's no light
vec3 darkenedColor = color * u_darknessColor;
color = mix(darkenedColor, color, lightIntensity);
```

### Darkness Color Calculation
The `calculateDarknessColor()` method returns RGB values in 0-1 range:
- **Night (0-5, 20-24)**: `[0.47, 0.51, 0.63]` - dark blue tint
- **Dawn (5-8)**: Smooth transition from night to day
- **Day (8-17)**: `[1.0, 1.0, 1.0]` - no darkening (unless weather)
- **Dusk (17-20)**: Smooth transition from day to night
- **Weather**: Additional darkening applied based on precipitation intensity

## API Changes

### DayNightCycle.render()
```javascript
// Before (multiple render paths)
render(ctx, width, height, weatherState, lightMask) {
    if (this.useShader) {
        this.renderWithFilters(...);
    } else {
        this.renderOverlay(...);
    }
}

// After (WebGL only)
render(ctx, width, height, weatherState, lightMask) {
    this.shader.updateFromTimeOfDay(this.timeOfDay, weatherState);
    const darknessColor = this.calculateDarknessColor(weatherState);
    this.shader.apply(ctx, lightMask, darknessColor);
}
```

### DayNightShader.apply()
```javascript
// Before
apply(sourceCtx) {
    // No light mask support
}

// After
apply(sourceCtx, lightMask = null, darknessColor = [1, 1, 1]) {
    // Upload light mask to texture unit 1
    // Pass darkness color uniform to shader
    // Shader blends darkness with light mask
}
```

## Benefits

1. **Performance**: Single-pass WebGL rendering is faster than multi-pass 2D operations
2. **Consistency**: WebGL shader provides uniform rendering across all browsers
3. **Quality**: Proper GPU-accelerated blending with light sources
4. **Simplicity**: Removed fallback code paths and legacy 2D rendering

## Requirements

- **WebGL 1.0 or WebGL 2.0** support required
- No fallback for browsers without WebGL
- System will throw error on initialization if WebGL unavailable

## Testing

To test the system:
1. Start the game
2. Add light sources using the light editor
3. Change time of day to night (press T key or use debug menu)
4. Observe that light sources create lit areas that completely dispel darkness
5. Move camera to see light mask properly following the scene
6. Test with different weather conditions (rain/snow) to verify darkening still works

## Files Modified

- `src/systems/DayNightShader.js` - Added light mask integration
- `src/systems/DayNightCycle.js` - Removed 2D fallback, simplified to WebGL-only
- `WEBGL_DAYNIGHT_LIGHTMASK.md` - This documentation

## Related Systems

- **LightManager**: Generates the light mask (grayscale canvas)
- **RenderSystem**: Passes light mask to day/night cycle
- **Weather System**: Provides darkening multiplier for precipitation
