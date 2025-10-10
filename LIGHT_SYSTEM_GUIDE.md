# Light Source System Implementation Guide

## Overview
Dynamic light source system that allows placing, editing, and animating lights in the game world through the map editor.

## Features

### Core Features
- ✅ **Light Templates** - Predefined light types (Torch, Campfire, Lantern, etc.)
- ✅ **Custom Lights** - Create, edit, and delete light templates
- ✅ **Place Lights** - Drag and place lights in the world
- ✅ **Edit Properties** - Radius, color (RGBA), flicker settings
- ✅ **Flicker Animation** - Realistic flickering with intensity and speed controls
- ✅ **Editor Preview** - Visual sprite representation in editor mode
- ✅ **Toggle Preview** - Show/hide preview sprites via View menu
- ✅ **Copy/Paste** - Duplicate lights easily
- ✅ **Move/Delete** - Full object manipulation

### Light Properties

Each light has the following properties:

```javascript
{
    id: "light_unique_id",
    templateName: "Torch",
    x: 100,
    y: 200,
    radius: 150,              // Outer edge where light dissipates
    color: {
        r: 255,               // Red (0-255)
        g: 200,               // Green (0-255)
        b: 100,               // Blue (0-255)
        a: 0.8                // Alpha (0-1)
    },
    flicker: {
        enabled: true,
        intensity: 0.3,       // 0-1, brightness variation
        speed: 0.1            // Speed of flicker animation
    }
}
```

## Default Light Templates

### 1. **Torch**
- Radius: 150
- Color: Warm orange (255, 200, 100)
- Flicker: Medium intensity, slow speed
- Use: Indoor/dungeon lighting

### 2. **Campfire**
- Radius: 200
- Color: Deep orange (255, 150, 50)
- Flicker: High intensity, medium speed
- Use: Outdoor camps, gathering areas

### 3. **Lantern**
- Radius: 120
- Color: Warm white (255, 240, 200)
- Flicker: Low intensity, very slow
- Use: Portable light sources

### 4. **Magic Crystal**
- Radius: 180
- Color: Cool blue (100, 150, 255)
- Flicker: Medium-low intensity
- Use: Magical locations, shrines

### 5. **Candle**
- Radius: 80
- Color: Yellow-white (255, 220, 150)
- Flicker: High intensity, medium speed
- Use: Small indoor lighting

### 6. **Street Lamp**
- Radius: 250
- Color: Cool white (255, 255, 230)
- Flicker: None (steady)
- Use: Urban areas, pathways

### 7. **Moonlight**
- Radius: 300
- Color: Blue-white (200, 220, 255)
- Flicker: None (steady)
- Use: Ambient outdoor lighting

### 8. **Fire Pit**
- Radius: 220
- Color: Bright orange (255, 120, 30)
- Flicker: Very high intensity, fast speed
- Use: Large fire sources

## Editor Integration

### Accessing Light Editor

1. **Open Editor**: Press F12 or Ctrl+E
2. **Data Menu**: Click "Data" in the top toolbar
3. **Select "Lights"**: Opens light template editor

### Light Template Editor

```
┌─────────────────────────────────┐
│  Light Templates                │
├─────────────────────────────────┤
│  [Dropdown: Select Template ▼]  │
│                                  │
│  Template Name: [________]       │
│  Radius: [___] px                │
│                                  │
│  Color:                          │
│    R: [___] (0-255)              │
│    G: [___] (0-255)              │
│    B: [___] (0-255)              │
│    A: [___] (0-1)                │
│                                  │
│  Flicker:                        │
│    [✓] Enabled                   │
│    Intensity: [___] (0-1)        │
│    Speed: [___]                  │
│                                  │
│  [Save] [New] [Delete]           │
└─────────────────────────────────┘
```

### Placing Lights

1. Select light template from dropdown
2. Click "Place Light" button
3. Click on map to place light instance
4. Light appears with preview sprite (💡 icon)

### Editing Placed Lights

1. Click on a placed light (preview sprite) to select it
2. Properties panel shows light settings
3. Modify radius, color, flicker settings
4. Changes apply immediately

### Moving Lights

1. Select a light
2. Drag to new position
3. Or use arrow keys for precise positioning

### Copy/Paste

1. Select a light
2. Press Ctrl+C to copy
3. Press Ctrl+V to paste
4. Click to place the copied light

### Delete

1. Select a light
2. Press Delete key or click Delete button

### View Menu - Toggle Preview

```
View Menu:
  [✓] Show Light Previews
  [ ] Show Collision Boxes
  [ ] Show Spawn Zones
```

- **Checked**: Preview sprites visible in editor
- **Unchecked**: Only see actual light rendering (how it looks in-game)

## Rendering

### Light Rendering Order

1. **Base game layer** (map, objects, player)
2. **Light layer** (rendered with additive blending)
3. **Day/Night overlay** (darkens scene)
4. **Editor UI** (if in editor mode)

### Additive Blending

Lights use `globalCompositeOperation = 'lighter'` for realistic light accumulation:
- Multiple lights blend together naturally
- Overlapping lights create brighter areas
- More realistic than simple overlays

### Radial Gradient

Each light uses a radial gradient:
- **Center (0.0)**: Full color and alpha
- **Middle (0.5)**: Half alpha
- **Edge (1.0)**: Transparent (smooth falloff)

### Flicker Algorithm

```javascript
// Combine sine waves for natural flicker
flickerWave = sin(time * speed + offset)
flickerNoise = sin(time * speed * 3.7 + offset * 2) * 0.3
flicker = (flickerWave + flickerNoise) * intensity
intensity = 1.0 ± flicker
```

## Data Storage

### Map Data Structure

```json
{
  "id": "0-0",
  "lights": [
    {
      "id": "light_123_abc",
      "templateName": "Torch",
      "x": 500,
      "y": 300,
      "radius": 150,
      "color": { "r": 255, "g": 200, "b": 100, "a": 0.8 },
      "flicker": {
        "enabled": true,
        "intensity": 0.3,
        "speed": 0.1
      }
    }
  ]
}
```

### Template Storage

Light templates are stored in `LightRegistry` and can be saved to localStorage or file.

## Performance Considerations

### Optimization Tips

1. **Limit Light Count**: Use ~5-15 lights per visible screen
2. **Cull Off-Screen**: Only render lights in camera view (TODO)
3. **Radius Management**: Larger radius = more GPU work
4. **Flicker Throttling**: Update flicker at 30fps instead of 60fps (optional)

### Best Practices

- Use larger, fewer lights rather than many small lights
- Disable flicker for lights that don't need it
- Group static lights into baked lightmaps for large scenes (future enhancement)

## Integration Checklist

- [ ] Load `LightRegistry.js` in main.js
- [ ] Load `LightManager.js` in main.js
- [ ] Initialize LightManager in GameEngine
- [ ] Add light rendering in game loop
- [ ] Add light update in game loop
- [ ] Integrate with EditorUI (Data menu)
- [ ] Add light editor panel
- [ ] Add light placement mode
- [ ] Add light selection/editing
- [ ] Add View menu toggle for previews
- [ ] Save/load lights with map data
- [ ] Create preview sprite asset

## API Reference

### LightRegistry

```javascript
// Get all templates
lightRegistry.getAllTemplates()

// Get specific template
lightRegistry.getTemplate('Torch')

// Add/update template
lightRegistry.addTemplate({
    name: 'My Light',
    radius: 100,
    color: { r: 255, g: 0, b: 0, a: 0.8 },
    flicker: { enabled: true, intensity: 0.3, speed: 0.1 }
})

// Remove template
lightRegistry.removeTemplate('My Light')

// Create instance from template
lightRegistry.createLightFromTemplate('Torch', x, y)
```

### LightManager

```javascript
// Load lights for map
lightManager.loadLightsForMap(mapId, lightsData)

// Add light instance
lightManager.addLight(light)

// Remove light
lightManager.removeLight(lightId)

// Update light properties
lightManager.updateLight(lightId, { radius: 200 })

// Find light at position (for selection)
lightManager.findLightAtPosition(x, y)

// Update (in game loop)
lightManager.update(deltaTime)

// Render lights
lightManager.render(ctx, cameraX, cameraY)

// Render editor previews
lightManager.renderEditorPreviews(ctx, cameraX, cameraY, showPreviews)

// Export for saving
lightManager.exportLights()
```

## Future Enhancements

- [ ] Light occlusion/shadows (blocked by walls)
- [ ] Colored shadows
- [ ] Light animations (pulsing, rotating)
- [ ] Day/night light intensity multiplier
- [ ] Weather-based light intensity (rain dampens)
- [ ] Dynamic lights (attach to player, NPCs)
- [ ] Light layers (background, foreground)
- [ ] Baked lightmaps for static lights
- [ ] Point light vs spotlight types
- [ ] Light groups (control multiple lights together)

## Troubleshooting

**Lights not visible**
- Check if lights array is populated
- Verify rendering order (before day/night overlay)
- Check blend mode is set to 'lighter'

**Preview sprites not showing in editor**
- Verify `assets/editor/light.png` exists
- Check editor mode is enabled
- Check "Show Light Previews" is enabled in View menu

**Flicker too fast/slow**
- Adjust `speed` property (0.05-0.3 is typical range)
- Check deltaTime is being passed correctly

**Performance issues**
- Reduce number of lights
- Decrease light radius
- Disable flicker for some lights
- Implement camera culling
