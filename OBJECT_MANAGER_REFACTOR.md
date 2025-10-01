# Object Manager Refactor - Architecture Improvement ✅

## What We Did

Replaced three separate managers with one unified `ObjectManager`:

### Before (Old Architecture)
```
NPCManager → Manages NPCs, merchants, spirits
StaticObjectManager → Manages trees, rocks, decorations
InteractiveObjectManager → Manages chests, portals, signs
```

### After (New Architecture)
```
ObjectManager → Manages ALL game objects
```

## Why This Is Better

### 1. **Single Responsibility**
- One manager handles all object lifecycle (create, update, render, destroy)
- Consistent API across all object types
- Less code duplication

### 2. **Simpler API**
```javascript
// Old way - different managers for different objects
game.npcManager.getNPCsForMap('0-0');
game.staticObjectManager.getObjectsForMap('0-0');
game.interactiveObjectManager.getObjectsForMap('0-0');

// New way - one manager for everything
game.objectManager.getObjectsForMap('0-0');
game.objectManager.getNPCsForMap('0-0');  // Still available for filtering
game.objectManager.getStaticObjectsForMap('0-0');  // Still available for filtering
```

### 3. **Type-Based Filtering**
```javascript
// Get all objects
const allObjects = objectManager.getObjectsForMap('0-0');

// Filter by type
const trees = objectManager.getObjectsByType('0-0', 'tree');
const chests = objectManager.getObjectsByType('0-0', 'chest');

// Filter by class
const npcs = objectManager.getObjectsByClass('0-0', NPC);
const portals = objectManager.getObjectsByClass('0-0', Portal);
```

### 4. **Behavior Stays in Classes**
```javascript
// Each object type defines its own behavior
class Merchant extends NPC {
    interact(player, game) {
        game.openShop(this.inventory);  // Merchant-specific behavior
    }
}

class Chest extends InteractiveObject {
    interact(player, game) {
        game.openLootWindow(this.loot);  // Chest-specific behavior
    }
}

class Tree extends StaticObject {
    // No special interaction - just exists
}
```

## Map 0-0 Configuration

We've cleaned up map 0-0 with a nice, simple layout:

```javascript
'0-0': {
    static: [
        // 8 trees scattered around edges
        { id: 'tree_01', x: 200, y: 150, ... },
        { id: 'tree_02', x: 1750, y: 200, ... },
        // ... more trees
    ],
    
    npcs: [
        // Sage NPC near player spawn
        { 
            id: 'elder_sage',
            x: 500, y: 350,  // Near spawn (400, 300)
            name: 'Elder Sage',
            dialogue: "Welcome, young adventurer! The forest is peaceful, but adventure awaits beyond.",
        }
    ],
    
    interactive: [],  // No chests on this map
    portals: []       // No portals on this map
}
```

## Files Changed

### Created
- `src/systems/ObjectManager.js` - New unified manager (500+ lines)

### Modified
- `src/GameEngine.js` - Updated to use ObjectManager
- `src/main.js` - Loads ObjectManager instead of old managers

### To Be Deleted (No Longer Needed)
- `src/systems/NPCManager.js` ❌
- `src/systems/StaticObjectManager.js` ❌
- `src/systems/InteractiveObjectManager.js` ❌

## API Reference

### Loading Objects
```javascript
// Load all objects for a map (called automatically when map loads)
objectManager.loadObjectsForMap('0-0');

// Unload objects when leaving map
objectManager.unloadObjectsForMap('0-0');
```

### Getting Objects
```javascript
// Get all objects on a map
const allObjects = objectManager.getObjectsForMap('0-0');

// Get specific types
const npcs = objectManager.getNPCsForMap('0-0');
const trees = objectManager.getStaticObjectsForMap('0-0');
const chests = objectManager.getInteractiveObjectsForMap('0-0');
const portals = objectManager.getPortalsForMap('0-0');

// Filter by type or class
const trees = objectManager.getObjectsByType('0-0', 'tree');
const merchants = objectManager.getObjectsByClass('0-0', Merchant);
```

### Creating Objects
```javascript
// Define objects in getMapDefinitions()
// Objects are created automatically when map loads

// Or create manually
objectManager.createStaticObject('0-0', {
    id: 'tree_new',
    x: 500,
    y: 600,
    spriteSrc: 'assets/objects/trees/tree-01.png',
    scale: 0.3
});
```

### Updating Objects
```javascript
// Update all objects on a map (called every frame)
objectManager.updateObjects('0-0', deltaTime, game);
```

### Interactions
```javascript
// Check for nearby interactable objects
const nearbyObject = objectManager.checkNearbyInteractions(player, '0-0');

// Handle interaction
if (nearbyObject) {
    const result = objectManager.handleInteraction(nearbyObject, player, game);
}

// Check portal collisions
const portal = objectManager.checkPortalCollisions(player, '0-0', game);
```

### Searching
```javascript
// Find object by ID
const sage = objectManager.findObjectById('elder_sage');

// Find object by name
const chest = objectManager.findObjectByName('Treasure Chest', '0-0');
```

### State Management
```javascript
// Save object states
const states = objectManager.getObjectStates();

// Restore object states
objectManager.restoreObjectStates(states);
```

### Statistics
```javascript
// Get statistics about loaded objects
const stats = objectManager.getStats();
console.log(stats);
// {
//     totalObjects: 9,
//     loadedMaps: ['0-0'],
//     objectsByMap: {
//         '0-0': {
//             total: 9,
//             npcs: 1,
//             static: 8,
//             interactive: 0,
//             portals: 0
//         }
//     }
// }
```

## Backwards Compatibility

The new ObjectManager provides all the same methods the old managers had, so existing code continues to work:

```javascript
// These still work!
objectManager.getNPCsForMap('0-0');  // Was npcManager.getNPCsForMap()
objectManager.getObjectsForMap('0-0');  // Was staticObjectManager.getObjectsForMap()
objectManager.checkPortalCollisions(...);  // Was interactiveObjectManager.checkPortalCollisions()
```

## Benefits Summary

✅ **Less code** - One manager instead of three
✅ **Consistent API** - Same methods for all object types
✅ **Easier to maintain** - Single place to update logic
✅ **Easier to extend** - Just add new object types to definitions
✅ **Better performance** - Unified update loop
✅ **Cleaner architecture** - Separation of concerns (manager = lifecycle, classes = behavior)

## Next Steps

1. ✅ Test the game with new ObjectManager
2. ✅ Verify map 0-0 looks good (8 trees + 1 sage)
3. ❌ Delete old manager files (NPCManager, StaticObjectManager, InteractiveObjectManager)
4. ❌ Update documentation
5. ❌ Add more object types as needed

The game is now easier to work with and extend! 🎮✨
