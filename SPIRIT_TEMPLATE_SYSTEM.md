# Spirit Template System - Implementation Summary

## ✅ Completed Features

### 1. Spirit Templates (`data/spirits.json`)
- **4 Spirit Templates** pre-configured:
  - `forest_sprite` - Common spirit (HP: 50, Speed: 15)
  - `night_wisp` - Uncommon spirit (HP: 45, Speed: 18)
  - `dawn_guardian` - Rare spirit (HP: 65, Speed: 12)
  - `dusk_shadow` - Rare spirit (HP: 60, Speed: 16)

**Template Properties:**
```json
{
  "id": "unique_id",
  "name": "Display Name",
  "spriteSrc": "path/to/sprite.png",
  "spriteWidth": 32,
  "spriteHeight": 32,
  "collisionShape": "circle",
  "collisionPercent": { "top": -0.7, "left": -0.1, "right": -0.1, "bottom": 0 },
  "stats": { "hp": 50, "attack": 12, "defense": 8, "speed": 15 },
  "moveSpeed": 1.5,
  "movePattern": "wander",
  "rarity": "common|uncommon|rare|legendary",
  "description": "Flavor text"
}
```

### 2. SpiritRegistry System (`src/systems/SpiritRegistry.js`)
Centralized management system for spirit templates.

**Key Methods:**
- `load()` - Loads spirits.json on game initialization
- `getTemplate(spiritId)` - Get template by ID
- `getAllTemplates()` - Get all templates
- `createSpirit(spiritId, x, y, mapId)` - Instantiate spirit from template
- `getTemplatesByRarity(rarity)` - Filter by rarity
- `getWeightedRandomSpiritId()` - Weighted random selection based on rarity
  - Common: 50% chance
  - Uncommon: 30% chance
  - Rare: 15% chance
  - Legendary: 5% chance

### 3. Updated Spirit Entity (`src/entities/Spirit.js`)
Enhanced Spirit class to accept template data.

**New Constructor:**
```javascript
new Spirit(game, x, y, mapId, {
  name, spriteSrc, spriteWidth, spriteHeight,
  collisionShape, collisionPercent, stats,
  moveSpeed, movePattern, rarity, spiritId, description
})
```

**New Properties:**
- `spiritId` - References template ID
- `stats` - HP, attack, defense, speed
- `currentHp` - Current health points
- `rarity` - common/uncommon/rare/legendary
- `movePattern` - Movement behavior type
- `description` - Flavor text

### 4. Integration with GameEngine
- `spiritRegistry` initialized in GameEngine constructor
- Loaded during `initialize()` alongside other game data
- Available globally via `game.spiritRegistry`

### 5. Script Loading (`src/main.js`)
- SpiritRegistry added to script load order
- Loads after StaticObjectRegistry, before AudioManager

## 🎯 Usage Examples

### Create Spirit from Template
```javascript
// Get a spirit template
const template = game.spiritRegistry.getTemplate('forest_sprite');

// Create spirit instance at position
const spirit = game.spiritRegistry.createSpirit('forest_sprite', 500, 300, '0-0');

// Add to game (this will be handled by SpawnManager later)
game.npcs.push(spirit);
```

### Weighted Random Spirit
```javascript
// Get random spirit ID based on rarity weights
const randomSpiritId = game.spiritRegistry.getWeightedRandomSpiritId();
const spirit = game.spiritRegistry.createSpirit(randomSpiritId, x, y, mapId);
```

### Filter by Rarity
```javascript
// Get all rare spirits
const rareSpirits = game.spiritRegistry.getTemplatesByRarity('rare');
console.log(`Found ${rareSpirits.length} rare spirits`);
```

## 📋 Next Steps

### Phase 1: Spawn Configuration (Map-based)
1. **Add Spawn Table to Map Config Dialog**
   - UI in EditorUI.showMapConfig()
   - Fields: Spirit ID (dropdown), Max Population, Spawn Rate
   - Conditions: Time (any/day/night/dawn/dusk/nightfall)
   - Store in `mapData.spawnTable` array

**Spawn Table Structure:**
```javascript
mapData.spawnTable = [
  {
    spiritId: 'forest_sprite',
    maxPopulation: 5,
    spawnRate: 0.1, // per second
    timeCondition: 'day' // any|day|night|dawn|dusk|nightfall
  },
  {
    spiritId: 'night_wisp',
    maxPopulation: 3,
    spawnRate: 0.05,
    timeCondition: 'night'
  }
];
```

### Phase 2: SpawnManager System
1. **Create `src/systems/SpawnManager.js`**
   - `initialize(mapId, spawnTable)` - Set up for current map
   - `update(deltaTime)` - Periodic spawn checks
   - `spawnSpirit(spiritId)` - Create spirit at valid position
   - `findValidSpawnPosition(spiritId)` - Anti-collision spawn logic
   - `checkTimeCondition(condition)` - Check day/night cycle
   - `clearSpawns()` - Remove all spawned spirits on map change

2. **Spawn Position Logic:**
   - Check if random point is in spawn zone (blue pixel check)
   - Test collision with existing objects/NPCs/spirits
   - Retry with different position (max 20 attempts)
   - Return null if no valid position found

3. **Population Management:**
   - Track current population per spirit type
   - Spawn only when below maxPopulation
   - Periodic checks every 5-10 seconds
   - Apply spawn rate probability

### Phase 3: Integration
1. Add SpawnManager to GameEngine
2. Initialize on map load with spawn table
3. Update in game loop
4. Clear spawned spirits on map change
5. Save/load spawned spirits with save system (optional)

## 🎨 Design Notes

- **No Weather Conditions:** Removed as per requirement (user wants static weather)
- **Time-Based Spawning:** Day/night cycle is the primary spawn condition
- **Roaming Behavior:** Spirits spawn as visible NPCs, not random encounters
- **Template-Driven:** All spirit properties defined in JSON for easy editing
- **Rarity System:** Weighted spawning ensures common spirits appear more frequently
- **Circular Collision:** All spirits use circular collision by default
- **Ethereal Movement:** Spirits can phase through walls (`phasesThroughWalls: true`)

## 🔧 Testing Checklist

- [ ] Load game - spirit templates load successfully
- [ ] Console check - "Loaded 4 spirit templates" message appears
- [ ] Template lookup - `game.spiritRegistry.getTemplate('forest_sprite')` returns data
- [ ] Weighted random - `game.spiritRegistry.getWeightedRandomSpiritId()` returns ID
- [ ] Spirit creation - Can create spirit manually via console
- [ ] Spirit spawning - Spirits appear with correct sprites and stats
- [ ] Spirit movement - Wander behavior works correctly
- [ ] Spawn zones - Blue zones painted and visible in editor

---

**Status:** Spirit template system fully implemented and ready for spawn configuration UI! 🎯
