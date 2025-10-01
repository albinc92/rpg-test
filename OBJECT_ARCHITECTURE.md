# Object Architecture Analysis

## Current Object Hierarchy

Your game uses a well-designed inheritance hierarchy for managing different types of game entities:

```
GameObject (Base Class)
├── Actor (Moving entities)
│   ├── Player (Player-controlled character)
│   ├── NPC (Non-player characters with dialogue/AI)
│   └── Spirit (Ethereal floating creatures)
└── StaticObject (Non-moving environment)
    └── InteractiveObject (Chests, doors, etc.)
        ├── Chest
        └── Portal
```

## Class Breakdown

### 1. **GameObject** (`src/core/GameObject.js`)
**Purpose**: Base class for ALL game objects

**Common Attributes**:
- ✅ **Position**: `x, y`
- ✅ **Sprites**: `spriteSrc, sprite, spriteLoaded, spriteWidth, spriteHeight`
- ✅ **Collision**: `hasCollision, collisionPercent, collisionOffsetY, blocksMovement, canBeBlocked`
- ✅ **Rendering**: `direction, scale, altitude, castsShadow`
- ✅ **Dimensions**: `getWidth(), getHeight()` (scale-aware)

**Key Features**:
- Sprite loading and management
- Collision detection (`collidesWith()`, `wouldCollideAt()`)
- Bounding box calculations (`getBounds()`, `getCollisionBounds()`)
- Rendering with shadows and direction flipping
- Distance calculations

### 2. **Actor** (`src/core/Actor.js`)
**Purpose**: Extends GameObject for entities that can move

**Additional Attributes**:
- Movement: `velocityX, velocityY, maxSpeed, acceleration, friction`
- State: `health, maxHealth, isMoving`
- AI: `behaviorType, movementSpeed`

**Key Features**:
- Physics system with friction and velocity
- Movement with collision sliding
- AI behavior system (`updateBehavior()`)
- Health management

**Default Collision Config**:
```javascript
collisionPercent: 0.4,  // 40% of sprite (lower body)
collisionOffsetY: 10    // Collision box at feet
```

### 3. **Player** (`src/entities/Player.js`)
**Purpose**: Player-controlled actor

**Additional Attributes**:
- RPG Stats: `gold, level, experience`
- Input: `inputX, inputY, isRunning`
- Audio: `footstepTimer, footstepInterval`

**Collision Config**:
```javascript
collisionPercent: 0.25,  // 25% (very small, just feet)
collisionOffsetY: 15
maxSpeed: 800
```

### 4. **NPC** (`src/entities/NPC.js`)
**Purpose**: Non-player characters with dialogue/interaction

**Additional Attributes**:
- Identity: `id, name, type, mapId`
- Dialogue: `messages[], currentMessageIndex`
- Interaction: `interactionRadius, canInteract`
- State: `mood, faction`

**Types**: `'dialogue'`, `'merchant'`, `'guard'`, `'quest'`

**Behaviors**: `'static'`, `'roaming'`, `'following'`

### 5. **Spirit** (`src/entities/Spirit.js`)
**Purpose**: Ethereal floating creatures (Pokemon-like)

**Additional Attributes**:
- Visual: `baseAlpha, pulseSpeed, glowEffect`
- Animation: `floatingSpeed, floatingRange`
- Movement: `phasesThroughWalls, roamingRadius`

**Unique Features**:
- Floats above ground (animated altitude)
- Ethereal rendering (transparency, glow)
- Can phase through walls
- Roams within spawn radius
- Spawn effect animation

**Collision Config**:
```javascript
blocksMovement: false,  // Ethereal - doesn't block
canBeBlocked: false,    // Can move through everything
collisionPercent: 0.3,  // Small collision area
altitude: 40            // Floats in air
```

### 6. **StaticObject** (`src/objects/StaticObject.js`)
**Purpose**: Non-moving environmental objects

**Additional Attributes**:
- Identity: `id, name, type`
- Collision: `collisionBounds` (custom collision box)
- Interaction: `canInteract, interactionRadius, interactionMessage`
- Animation: `animationType, animationSpeed, animationIntensity`
- Environment: `providesShade, makesSound, soundRadius`

**Types**: `'decoration'`, `'obstacle'`, `'interactive'`

**Animation Types**: `'none'`, `'sway'`, `'pulse'`, `'rotate'`

**Use Cases**:
- Trees (obstacles with collision)
- Bushes (decorations without collision)
- Rocks (obstacles)
- Signs (interactive)

## Object Management System

### Current Managers

1. **NPCManager** (`src/systems/NPCManager.js`)
   - Manages all NPCs per map
   - `getNPCsForMap(mapId)` - returns NPCs for specific map
   - Update loop calls `npc.update()`

2. **InteractiveObjectManager** (`src/systems/InteractiveObjectManager.js`)
   - Manages chests, doors, portals
   - Per-map object storage
   - State persistence

3. **GameEngine** - Central coordinator
   - `getAllGameObjectsOnMap(mapId)` - combines NPCs + interactive objects
   - `checkActorCollisions()` - collision detection against all objects
   - Rendering through `RenderSystem`

### ⚠️ **MISSING: StaticObjectManager**

Currently, there's **NO manager for StaticObjects** like trees, rocks, bushes, etc.

## Recommendations

### 1. Create StaticObjectManager
Similar to NPCManager and InteractiveObjectManager:

```javascript
class StaticObjectManager {
    constructor() {
        this.staticObjects = {}; // Map ID -> array of StaticObjects
    }
    
    addObject(mapId, staticObject) { }
    getObjectsForMap(mapId) { }
    updateObjects(mapId, deltaTime, game) { }
}
```

### 2. Integrate with GameEngine
Add to `getAllGameObjectsOnMap()`:
```javascript
getAllGameObjectsOnMap(mapId) {
    const objects = [];
    objects.push(...this.npcManager.getNPCsForMap(mapId));
    objects.push(...this.interactiveObjectManager.getObjectsForMap(mapId));
    objects.push(...this.staticObjectManager.getObjectsForMap(mapId)); // NEW
    return objects;
}
```

### 3. Add to Map Configuration
Extend MapManager to support static objects per map:
```javascript
'0-0': {
    image: null,
    width: 1920,
    height: 1080,
    staticObjects: [  // NEW
        { type: 'tree', x: 500, y: 400, spriteSrc: 'assets/objects/trees/tree-01.png' },
        { type: 'rock', x: 800, y: 600, spriteSrc: 'assets/objects/rocks/rock-01.png' }
    ]
}
```

## Object Attribute Summary

| Attribute | GameObject | Actor | Player | NPC | Spirit | StaticObject |
|-----------|------------|-------|--------|-----|--------|--------------|
| Position (x, y) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sprite | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Collision | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Scale | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Direction | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Shadow | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Velocity | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Health | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| AI Behavior | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Dialogue | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Floating | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Animation | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Interaction | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |

## Common Design Patterns

### Collision Configuration
Objects can be configured for different collision behaviors:

```javascript
// Solid obstacle (tree, rock)
{
    hasCollision: true,
    blocksMovement: true,
    canBeBlocked: false,
    collisionPercent: 0.8
}

// Ethereal (spirit, ghost)
{
    hasCollision: false,
    blocksMovement: false,
    canBeBlocked: false
}

// Interactive (sign, small object)
{
    hasCollision: true,
    blocksMovement: false,
    canBeBlocked: false,
    collisionPercent: 0.5
}
```

### Rendering Order
Objects are rendered based on Y position (depth sorting):
1. Objects with lower Y coordinate (further back) render first
2. Objects with higher Y coordinate (closer) render on top
3. This creates a pseudo-3D effect

### Scale Awareness
All rendering respects:
- Object's own `scale` property
- Map's `scale` property
- Combined: `scaledSize = objectSize * objectScale * mapScale`

## Best Practices

1. ✅ **Use appropriate base class**:
   - Moving entities → `Actor`
   - Environmental objects → `StaticObject`
   - Player-controlled → `Player`

2. ✅ **Configure collision properly**:
   - Characters: Small collision at feet (25-40%)
   - Trees/obstacles: Large collision (70-90%)
   - Decorations: No collision

3. ✅ **Set altitude for layering**:
   - Ground objects: `altitude: 0`
   - Floating/flying: `altitude: 20-100`
   - Shadows automatically adjust

4. ✅ **Use managers for organization**:
   - Group objects by map
   - Easy to save/load state
   - Centralized update logic
