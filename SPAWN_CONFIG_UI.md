# Spawn Configuration UI - Implementation Complete

## ✅ What Was Added

### Map Config Dialog Enhancement
Added a new **"🎯 Spirit Spawn Configuration"** section to the Map Config dialog (`EditorUI.showMapConfig()`).

## 🎨 UI Features

### Spawn Table Display
- **Entry List** - Shows all configured spawn entries for the current map
- **Entry Cards** - Each entry displays:
  - Spirit name (with rarity)
  - Max population limit
  - Spawn rate per second
  - Time condition (Any/Day/Night/Dawn/Dusk/Nightfall)
  - Remove button (🗑️)
- **Empty State** - Shows "No spawn entries configured" when table is empty

### Add New Spawn Entry Form
**Input Fields:**
1. **Spirit Dropdown** - Select from loaded spirit templates
   - Shows: "Spirit Name (rarity)"
   - Populated from `game.spiritRegistry.getAllTemplates()`
   
2. **Max Population** - Number input
   - Default: 5
   - Min: 1
   - How many of this spirit can exist simultaneously
   
3. **Spawn Rate** - Number input
   - Default: 0.1
   - Min: 0.01
   - Step: 0.01
   - Probability per second to spawn (when below max population)
   
4. **Time Condition** - Dropdown
   - Any Time (spawns always)
   - ☀️ Day (7:00 - 17:00)
   - 🌙 Night (0:00 - 5:00)
   - 🌅 Dawn (5:00 - 7:00)
   - 🌆 Dusk (17:00 - 19:00)
   - 🌃 Nightfall (19:00 - 24:00)

**Validation:**
- ⚠️ Must select a spirit
- ⚠️ Max population ≥ 1
- ⚠️ Spawn rate > 0

**Actions:**
- **➕ Add Spawn Entry** - Adds to `mapData.spawnTable` array
- **🗑️ Remove** - Removes entry from spawn table
- Auto-clears form after adding

## 💾 Data Structure

### mapData.spawnTable Format
```javascript
mapData.spawnTable = [
  {
    spiritId: "forest_sprite",      // Template ID from spirits.json
    maxPopulation: 5,                // Max concurrent spirits of this type
    spawnRate: 0.1,                  // Probability per second (0.1 = 10% chance/sec)
    timeCondition: "day"             // "any"|"day"|"night"|"dawn"|"dusk"|"nightfall"
  },
  {
    spiritId: "night_wisp",
    maxPopulation: 3,
    spawnRate: 0.05,
    timeCondition: "night"
  }
];
```

### Storage
- Saved in `data/maps.json` per map
- Persists with map data
- Loaded automatically when map loads

## 🎯 Usage Flow

1. **Open Editor** - Enable editor mode
2. **Paint Spawn Zones** - Switch to "🎯 Spawn Zones" paint mode, paint blue zones
3. **Configure Spawns** - File → Map Config → Scroll to "🎯 Spirit Spawn Configuration"
4. **Add Entries:**
   - Select spirit from dropdown
   - Set max population (e.g., 5)
   - Set spawn rate (e.g., 0.1 = spawn check every 10 seconds)
   - Choose time condition (e.g., Night only)
   - Click "➕ Add Spawn Entry"
5. **Save** - Click "💾 Save Changes"

## 📋 Example Configuration

### Forest Map Spawns
```javascript
// Common sprites during day
{
  spiritId: "forest_sprite",
  maxPopulation: 10,
  spawnRate: 0.15,        // 15% chance per second
  timeCondition: "day"
}

// Rare wisps at night
{
  spiritId: "night_wisp",
  maxPopulation: 3,
  spawnRate: 0.05,        // 5% chance per second
  timeCondition: "night"
}

// Legendary guardian at dawn only
{
  spiritId: "dawn_guardian",
  maxPopulation: 1,
  spawnRate: 0.02,        // 2% chance per second
  timeCondition: "dawn"
}
```

## 🔧 Integration Points

### Spawn Table Access
```javascript
// Get spawn table for current map
const spawnTable = game.mapManager.maps[game.currentMapId].spawnTable;

// Iterate spawn entries
spawnTable.forEach(entry => {
  console.log(`Spirit: ${entry.spiritId}, Max: ${entry.maxPopulation}`);
});
```

### Time Condition Checking
```javascript
// Check if current time matches condition (SpawnManager will handle this)
function checkTimeCondition(condition) {
  if (condition === 'any') return true;
  
  const currentTime = game.dayNightCycle.currentTime;
  
  switch(condition) {
    case 'day': return currentTime >= 7 && currentTime < 17;
    case 'night': return currentTime >= 0 && currentTime < 5;
    case 'dawn': return currentTime >= 5 && currentTime < 7;
    case 'dusk': return currentTime >= 17 && currentTime < 19;
    case 'nightfall': return currentTime >= 19 && currentTime < 24;
    default: return false;
  }
}
```

## 🎮 Next Step: SpawnManager

The spawn configuration UI is complete! Now we need to create **SpawnManager.js** to:

1. **Load spawn table** from mapData on map change
2. **Periodic checks** - Every few seconds, check each spawn entry
3. **Time condition** - Only spawn if current time matches condition
4. **Population tracking** - Count existing spirits of each type
5. **Spawn logic:**
   - Roll random chance against spawn rate
   - If below max population and spawn succeeds
   - Find valid spawn position in spawn zones
   - Create spirit using `spiritRegistry.createSpirit()`
   - Add to game world
6. **Cleanup** - Remove spawned spirits on map change

### SpawnManager Methods Needed:
```javascript
class SpawnManager {
  constructor(game)
  initialize(mapId, spawnTable)
  update(deltaTime)
  checkSpawn(entry)
  checkTimeCondition(condition)
  countSpirits(spiritId)
  spawnSpirit(spiritId)
  findValidSpawnPosition(spiritId)
  isInSpawnZone(x, y)
  clearSpawns()
}
```

---

**Status:** Spawn configuration UI is fully functional! Ready to implement SpawnManager system. 🎯
