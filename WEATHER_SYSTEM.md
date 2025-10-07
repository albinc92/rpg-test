# 🌤️ Weather System

A three-layer weather system that adds atmospheric effects to your game maps.

## Features

### Layer 1: Precipitation (Mutually Exclusive)
Choose one weather type:
- **☀️ Sun** - Lens flare/god rays during daytime
- **🌧️ Rain** - Light/Medium/Heavy rain particles
- **❄️ Snow** - Light/Medium/Heavy snow particles
- **🔄 Dynamic** - Automatically transitions between weather types (2-5 min cycles)

### Layer 2: Wind (Independent)
Control wind strength:
- **None** - No wind
- **Light** - Gentle breeze
- **Medium** - Moderate wind
- **Heavy** - Strong wind
- **🔄 Dynamic** - Oscillating wind strength

Wind affects:
- Particle drift angle
- Rain/snow slant
- Leaf movement

### Layer 3: Falling Particles (Independent)
Add ambient particle effects:
- **🍃 Green Leaves** - Fresh spring/summer leaves
- **🍂 Orange Leaves** - Autumn leaves
- **🍁 Red Leaves** - Fall foliage
- **🤎 Brown Leaves** - Dried leaves
- **🌸 Sakura** - Cherry blossom petals

## Configuration

### In Map Editor

1. Open the **Map Editor** (F2)
2. Go to **Data** → **🗺️ Maps**
3. Choose one:
   - **⚙️ Current Map Config** - Edit active map
   - **➕ New Map** - Create new map with weather
   - **📋 All Maps** - Browse and edit any map

### Weather Section

In the map configuration dialog, you'll find the **🌤️ Weather Configuration** section with three dropdowns:

**Precipitation:**
```
[Dropdown: none | dynamic | sun | rain-light | rain-medium | rain-heavy | snow-light | snow-medium | snow-heavy]
```

**Wind:**
```
[Dropdown: none | dynamic | light | medium | heavy]
```

**Falling Particles:**
```
[Dropdown: none | leaf-green | leaf-orange | leaf-red | leaf-brown | sakura]
```

## Examples

### Sunny Day
- Precipitation: `sun`
- Wind: `light`
- Particles: `none`

### Rainy Autumn
- Precipitation: `rain-medium`
- Wind: `medium`
- Particles: `leaf-orange`

### Winter Blizzard
- Precipitation: `snow-heavy`
- Wind: `heavy`
- Particles: `none`

### Dynamic Forest
- Precipitation: `dynamic` (changes over time)
- Wind: `dynamic` (oscillating)
- Particles: `leaf-green`

### Cherry Blossom Scene
- Precipitation: `sun`
- Wind: `light`
- Particles: `sakura`

## Technical Details

### Performance
- Particle count: 50-200 depending on intensity
- Efficient particle pooling and reuse
- Only visible particles are rendered
- ~60 FPS maintained with full weather

### Map Data Structure
Weather is stored in the map configuration:

```json
{
  "0-0": {
    "name": "Forest Path",
    "imageSrc": "assets/maps/0-0.png",
    "scale": 3.0,
    "weather": {
      "precipitation": "rain-light",
      "wind": "light",
      "particles": "leaf-green"
    }
  }
}
```

### Dynamic Weather
When `precipitation` is set to `dynamic`, the system:
1. Randomly cycles between sun, light rain, and medium rain
2. Each weather phase lasts 2-5 minutes (randomized)
3. Smooth transitions between weather types
4. Particles automatically adjust to current weather

### Rendering Order
Weather effects render AFTER the game world but BEFORE UI:
1. Game world (map, objects, player)
2. Day/night cycle overlay
3. **Weather effects** ← Here
4. UI elements (menus, inventory, etc.)

## Tips

- **Sun effects** only show during daytime (7am-5pm) when day/night cycle is enabled
- **Wind** affects all particle types (rain, snow, leaves)
- **Dynamic weather** works great for outdoor areas
- Indoor maps should use `none` for all weather settings
- Combine with **day/night cycle** for maximum atmosphere

## Exporting Configuration

After configuring weather:
1. Click **💾 Export maps.json** in the map browser
2. Replace `data/maps.json` with the downloaded file
3. Refresh the page to apply changes

## Performance Notes

- Weather effects are canvas-based (2D)
- No WebGL required
- Mobile-friendly
- Automatically disabled if map has no weather config
- Particles are recycled for efficiency
