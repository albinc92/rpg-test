# Isometric RPG Game Engine

A complete JavaScript game engine for creating isometric RPG games with 360-degree movement, physics, and procedural world generation.

## 🎮 Features

### Core Engine
- **Modular Architecture**: Clean separation of systems (Rendering, Physics, Input, Camera, etc.)
- **Game Loop**: Smooth 60 FPS game loop with delta time
- **Scene Management**: Easy scene switching and management
- **Component System**: Extensible game object component architecture

### Graphics & Rendering
- **Isometric Projection**: True isometric rendering with proper coordinate transformations
- **Depth Sorting**: Automatic depth sorting for proper object layering
- **Camera System**: Smooth camera following with zoom, shake effects, and bounds
- **Debug Visualization**: Toggle grid, collision boxes, and object origins

### Physics & Movement
- **360° Movement**: Smooth movement in all directions using vector math
- **Collision Detection**: Efficient spatial partitioning for collision detection
- **Physics Simulation**: Velocity, acceleration, friction, and force-based movement
- **Collision Response**: Proper collision resolution for solid objects

### Input System
- **Multi-Input Support**: Keyboard and mouse input with customizable key bindings
- **360° Movement**: WASD/Arrow keys for smooth directional movement
- **Mouse Integration**: Mouse rotation and interaction support
- **Action System**: Named actions for easier input management

### World & Objects
- **Procedural Generation**: Automatic world generation with multiple biomes
- **Tile System**: Flexible tile-based world with different terrain types
- **Interactive Objects**: Trees, rocks, crates, crystals with destruction and item drops
- **Player Character**: Full-featured player with health, rotation, and interactions

### UI & Debug
- **Real-time UI**: FPS counter, position display, and health bars
- **Minimap**: Live minimap showing world overview and player position
- **Debug Tools**: Comprehensive debugging tools and console utilities
- **Performance Monitoring**: Built-in performance tracking

## 🚀 Quick Start

1. **Clone or download** this repository
2. **Open `index.html`** in a modern web browser
3. **Start playing!** Use WASD to move, mouse to rotate, Space to jump

No build process or dependencies required - just open and play!

## 🎯 Controls

### Movement
- **WASD** or **Arrow Keys** - Move character in 360 degrees
- **Mouse** - Rotate character to face cursor direction
- **Mouse Wheel** - Zoom camera in/out

### Actions
- **Space** - Jump (with camera shake effect)
- **E** - Interact with nearby objects
- **Shift** - Run (reserved for future use)

### Debug Controls
- **F1** - Toggle debug panel
- **G** - Toggle grid overlay
- **C** - Toggle collision visualization
- **O** - Toggle object origin points
- **R** - Reset camera position and zoom
- **P** - Pause/Resume game
- **F11** - Toggle fullscreen

## 🏗️ Architecture

### File Structure
```
rpg-test/
├── index.html              # Main HTML file
├── engine/                 # Core engine files
│   ├── core/
│   │   ├── Vector2.js      # 2D vector math
│   │   ├── Engine.js       # Main engine class
│   │   ├── Scene.js        # Scene management
│   │   └── GameObject.js   # Base game object
│   ├── systems/
│   │   ├── InputSystem.js  # Input handling
│   │   ├── Renderer.js     # Isometric rendering
│   │   ├── Physics.js      # Physics simulation
│   │   ├── Camera.js       # Camera system
│   │   └── AssetManager.js # Asset loading
│   └── objects/
│       ├── Player.js       # Player character
│       ├── Tile.js         # World tiles
│       └── Obstacle.js     # Interactive objects
├── game/
│   ├── GameScene.js        # Main game scene
│   └── main.js             # Game initialization
└── README.md
```

### Key Classes

#### Engine Core
- **Engine**: Main game engine managing all systems
- **Scene**: Container for game objects with update/render loops
- **GameObject**: Base class for all game entities
- **Vector2**: 2D vector math utilities

#### Systems
- **InputSystem**: Handles keyboard/mouse input with 360° movement
- **Renderer**: Isometric rendering with coordinate transformations
- **Physics**: Collision detection and physics simulation
- **Camera**: Smooth camera following with effects
- **AssetManager**: Asset loading and management

#### Game Objects
- **Player**: Main character with movement, rotation, and interactions
- **Tile**: World tiles with different terrain types and properties
- **Obstacle**: Interactive objects like trees, rocks, and crates

## 🎨 Customization

### Adding New Tile Types
```javascript
// In Tile.js, add to getTileColor() method
'lava': '#FF5722',
'ice': '#00BCD4'

// Then use in world generation
const tile = new Tile(x, y, 'lava');
```

### Creating New Obstacles
```javascript
// Add to Obstacle.js initializeType() method
'house': {
    color: '#795548',
    size: new Vector2(40, 40),
    height: 60,
    destructible: false,
    health: 0
}

// Spawn in game
const house = new Obstacle(x, y, 'house');
scene.addGameObject(house);
```

### Custom Player Actions
```javascript
// In Player.js, add to handleInput() method
if (inputSystem.isActionPressed('spell')) {
    this.castSpell();
}

// Add the action to InputSystem key bindings
'q': 'spell'
```

## 🔧 Debug Utilities

The engine includes powerful debug utilities accessible via the browser console:

```javascript
// Teleport player
gameUtils.teleportPlayer(100, 100);

// Spawn objects
gameUtils.spawnObstacle('tree', 50, 50);
gameUtils.spawnObstacle('crystal', -100, 200);

// Camera effects
gameUtils.setZoom(2.0);
gameUtils.shakeCamera(15, 2);

// Access engine internals
const engine = gameUtils.getEngine();
const scene = gameUtils.getScene();
const player = gameUtils.getPlayer();
```

## 🌟 Features Showcase

### 360-Degree Movement
- Smooth movement in all directions using vector math
- Normalized diagonal movement (no speed advantage)
- Mouse-based rotation with smooth interpolation

### Isometric Rendering
- True isometric projection with proper depth sorting
- Coordinate transformation between world and screen space
- Automatic object layering based on Y position

### Procedural World
- 50x50 tile world with multiple biomes
- Noise-based terrain generation
- Strategic obstacle placement

### Interactive Objects
- Destructible obstacles with health systems
- Item dropping on destruction
- Visual feedback (shaking, health bars)

### Camera System
- Smooth following with deadzone
- Zoom with mouse wheel
- Screen shake effects
- World boundary constraints

## 🚧 Future Enhancements

- **Sprite Support**: Replace colored rectangles with actual sprites
- **Animation System**: Frame-based animations for characters
- **Sound System**: Audio effects and background music
- **Inventory System**: Item collection and management
- **Quest System**: Mission and objective tracking
- **Multiplayer**: Network support for multiple players
- **Save System**: Game state persistence
- **AI Enemies**: Pathfinding and combat AI
- **Particle Effects**: Visual effects for spells and impacts
- **Level Editor**: In-game world editing tools

## 📜 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Feel free to fork this project and submit pull requests for improvements!

### Areas for Contribution
- Sprite artwork and animations
- Sound effects and music
- Additional game mechanics
- Performance optimizations
- Mobile touch controls
- Additional debug tools

---

**Enjoy building your isometric RPG!** 🎮✨
