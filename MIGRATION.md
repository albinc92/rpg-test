# Data-Driven Game System Migration

## Overview
Migrated the game from hardcoded data structures to a JSON-based data-driven architecture. All game data (maps, items, objects) now loads from external JSON files, enabling easy editing and the foundation for a visual map editor.

## New File Structure

```
data/
  ├── maps.json          # Map definitions (bgm, ambience, spawn points)
  ├── items.json         # All item definitions
  └── objects.json       # Game objects per map (trees, NPCs, chests, etc.)

src/systems/
  └── DataLoader.js      # Centralized JSON loading with caching
```

## What Changed

### 1. Data Files Created

#### `data/maps.json`
- Map metadata (name, background image, music, ambience)
- Spawn points (default, fromPortal, fromDoor, etc.)
- No hardcoded objects

#### `data/items.json`
- All item definitions with icons, stats, effects
- Includes: potions, weapons, armor, materials, keys, currency
- Easily extensible for new items

#### `data/objects.json`
- All game objects organized by map ID
- Format: `{ "mapId": [ { "type": "ClassName", ...props } ] }`
- Includes: Trees, Bushes, NPCs, Chests, Portals
- Position, scale, and all properties in JSON

### 2. System Refactoring

#### **DataLoader** (NEW)
- Centralized JSON loading
- Caching system (no redundant loads)
- Methods: `loadMaps()`, `loadItems()`, `loadObjects()`, `loadAll()`
- Promise-based async loading

#### **MapManager** (REFACTORED)
- Now accepts `dataLoader` in constructor
- `initialize()` loads from `maps.json`
- No more hardcoded map data
- Backwards compatible

#### **ItemManager** (REFACTORED)
- Now accepts `dataLoader` in constructor
- `initialize()` loads from `items.json`
- Removed hardcoded item definitions
- Same API, different data source

#### **ObjectManager** (REFACTORED)
- Now accepts `dataLoader` in constructor
- `initialize()` loads from `objects.json`
- **Dynamic instantiation**: Creates objects from JSON data
- `classRegistry`: Maps type strings to classes
  ```javascript
  {
    'Tree01': Tree01,
    'Bush01': Bush01,
    'NPC': NPC,
    'Chest': Chest,
    'Portal': Portal
  }
  ```
- `createObjectFromData(data)`: Instantiates objects dynamically
- Removed all hardcoded object instantiation

#### **GameEngine** (UPDATED)
- Creates `DataLoader` first
- Passes `dataLoader` to all managers
- `initialize()` now async:
  1. Loads all JSON data
  2. Initializes all managers
  3. Starts game loop

### 3. Object Data Format

JSON format for objects:
```json
{
  "type": "Tree01",
  "x": 200,
  "y": 150,
  "scale": 0.95
}
```

For complex objects (NPCs, Chests):
```json
{
  "type": "NPC",
  "id": "elder_sage",
  "x": 1075,
  "y": 416,
  "spriteSrc": "assets/npc/sage-0.png",
  "npcType": "sage",
  "name": "Elder Sage",
  "dialogue": "Welcome, young adventurer!",
  "scale": 0.15
}
```

### 4. Class Registry System

The `ObjectManager` now has a class registry for dynamic instantiation:

```javascript
this.classRegistry = {
  'Tree01': Tree01,
  'Bush01': Bush01,
  'NPC': NPC,
  'Spirit': Spirit,
  'Chest': Chest,
  'Portal': Portal
};
```

To add new object types:
1. Create the class
2. Add to `classRegistry`
3. Add data to `objects.json`

## Benefits

### For Developers
- ✅ No code changes needed to add/modify/remove objects
- ✅ Easy to experiment with map layouts
- ✅ Version control friendly (JSON diffs are readable)
- ✅ Hot-reloadable data (can add live reload later)

### For Designers
- ✅ Edit game content without touching code
- ✅ Clear, structured data format
- ✅ Foundation for visual map editor

### For Game Engine
- ✅ Smaller code size (no hardcoded data)
- ✅ Faster iteration (edit JSON, refresh browser)
- ✅ Scalable architecture (100s of maps supported)

## Next Steps for Map Editor

### Phase 1: Editor UI (In-Game)
- Toggle editor mode (F12 or Ctrl+E)
- Object palette (list of available object types)
- Click to place objects
- Drag to move objects
- Delete selected objects
- Property panel for editing

### Phase 2: Data Management
- Save edited data back to JSON
- Map creation wizard
- Item editor (add/edit/remove items)
- Chest loot editor

### Phase 3: Polish
- Undo/redo system
- Grid snap
- Copy/paste objects
- Layer system (background, objects, actors)
- Collision visualization

## Migration Status

✅ **COMPLETED:**
- Data files created
- DataLoader system
- MapManager refactored
- ItemManager refactored  
- ObjectManager refactored
- GameEngine updated
- All existing content migrated to JSON

⏳ **PENDING:**
- Map editor UI (Phase 2)
- Hot reload system
- Data validation/schema

## Testing

To verify the migration works:
1. Run the game (`npm run dev`)
2. Check console for data loading messages:
   ```
   [DataLoader] Loading maps.json...
   [DataLoader] ✅ Maps loaded: 3 maps
   [DataLoader] Loading items.json...
   [DataLoader] ✅ Items loaded: 10 items
   [DataLoader] Loading objects.json...
   [DataLoader] ✅ Objects loaded: X objects across 3 maps
   ```
3. Load map 0-0 and verify all trees, bushes, and NPCs appear
4. Load map 0-1 and verify chests and portals work

## Backwards Compatibility

All existing systems remain compatible:
- `objectManager.getObjectsForMap(mapId)` - still works
- `itemManager.getItemType(itemId)` - still works
- `mapManager.getMapData(mapId)` - still works

The only change is that data now loads from JSON instead of hardcoded values.
