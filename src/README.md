# RPG Game - Object-Oriented Architecture

## Project Structure

```
src/
├── core/               # Core classes and base functionality
│   ├── GameObject.js   # Base class for all game objects
│   └── Actor.js        # Base class for moving entities
├── entities/           # Living entities (players, NPCs, creatures)
│   ├── Player.js       # Player character class
│   ├── NPC.js          # Non-player character class
│   └── Spirit.js       # Ethereal/floating entity class
├── objects/            # Static environmental objects
│   └── StaticObject.js # Trees, bushes, decorations, etc.
└── systems/            # Game systems and managers
    ├── maps.js         # Map loading and management
    ├── npcs.js         # NPC management system
    ├── items.js        # Item definitions and management
    └── inventory.js    # Inventory system
```

## Class Hierarchy

```
GameObject (base class for all game objects)
├── Actor (moveable entities with AI/behavior)
│   ├── Player (player-controlled character)
│   ├── NPC (dialogue, merchants, chests, portals)
│   └── Spirit (floating ethereal entities)
└── StaticObject (environmental objects)
    └── Trees, bushes, decorations, obstacles
```

## Core Features

### GameObject (Base Class)
- Sprite loading and rendering
- Position, direction, collision detection
- Shadow casting system
- Basic physics and interactions

### Actor (Moving Entities)
- Movement with acceleration/friction
- Health system and combat
- AI behavior types (static, roaming, following)
- Delta-time physics

### Entity Classes

**Player:**
- Input handling and movement
- Gold, level, experience system
- Save/load functionality  
- Running speed modifier

**NPC:**
- Dialogue system with multiple messages
- Different types (dialogue, merchant, portal, chest)
- Interaction radius and state tracking
- Roaming AI behavior

**Spirit:**
- Floating animation with altitude
- Ethereal effects (pulsing alpha, glow)
- Phases through walls
- Spawn effects

### Object Classes

**StaticObject:**
- Environmental objects (trees, bushes, etc.)
- Animation types (sway, pulse, rotate)
- Collision and interaction support
- Environmental effects (shade, sound)

## Usage

Classes are loaded in dependency order:
1. Core classes (GameObject, Actor)
2. Entity classes (Player, NPC, Spirit)
3. Object classes (StaticObject)
4. Game systems (maps, npcs, items, inventory)
5. Main game (game.js)

## Benefits

- **Modular Design**: Each class has a specific responsibility
- **Code Reuse**: Shared behavior through inheritance
- **Easy Extension**: Add new entity types by extending base classes
- **Maintainability**: Organized file structure makes code easy to find and modify
- **Separation of Concerns**: Game systems separated from entity logic