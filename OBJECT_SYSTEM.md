# Hybrid Category-Subtype Object System

## Overview
The game uses a **hybrid category-subtype system** for flexible, data-driven object creation. This allows:
- Generic base behavior through **categories** (StaticObject, Actor, InteractiveObject)
- Specialized behavior through **subtypes** (npc, spirit, chest, portal, etc.)
- Easy extension without creating new classes for every variant

## Object Categories

### 1. StaticObject
Non-interactive environmental objects like trees, bushes, rocks, decorations.

**Required Fields:**
- `category`: "StaticObject"
- `spriteSrc`: Path to sprite image
- `x`, `y`: Position

**Optional Fields:**
- `scale`: Size multiplier (default: 1.0)
- `collisionExpandTopPercent`: Adjust collision box top (default: 0)
- `collisionExpandBottomPercent`: Adjust collision box bottom (default: 0)
- `collisionExpandLeftPercent`: Adjust collision box left (default: 0)
- `collisionExpandRightPercent`: Adjust collision box right (default: 0)
- `collisionOffsetXPercent`: Horizontal collision offset (default: 0)
- `collisionOffsetYPercent`: Vertical collision offset (default: 0)
- `animationSpeed`: If sprite has animation (default: 0.1)
- `frameCount`: Number of animation frames (default: 1)

**Example:**
```json
{
  "category": "StaticObject",
  "spriteSrc": "assets/objects/trees/tree-01.png",
  "x": 200,
  "y": 150,
  "scale": 0.95,
  "collisionExpandTopPercent": -0.3
}
```

### 2. Actor
Characters that can move, interact, have AI behavior.

**Subtypes:**
- `npc`: Non-player characters (dialogue, quests, merchants)
- `spirit`: Roaming spirits (can initiate battles)
- `merchant`: NPCs with shop inventory

**Required Fields:**
- `category`: "Actor"
- `actorType`: Subtype name ("npc", "spirit", "merchant")
- `spriteSrc`: Path to sprite image
- `x`, `y`: Position
- `name`: Display name

**Optional Fields (All Actors):**
- `scale`: Size multiplier (default: 1.0)
- `maxSpeed`: Maximum movement speed (default: 100)
- `behaviorType`: AI behavior ("static", "roaming", "following") (default: "static")
- `collisionExpand*` / `collisionOffset*`: Same as StaticObject

**NPC-Specific Fields:**
- `npcType`: NPC role ("sage", "merchant", "guard", etc.)
- `dialogue`: Dialogue text or ID
- `messages`: Array of dialogue messages
- `mood`: NPC mood ("friendly", "neutral", "hostile")
- `faction`: NPC faction name

**Spirit-Specific Fields:**
- `roamRadius`: How far spirit wanders from spawn (default: 100)
- `spiritType`: Spirit variant ("flying", "ground", "water")
- `floatOffset`: Vertical hover animation amount
- `battleData`: Stats for battle initiation

**Merchant-Specific Fields:**
- `inventory`: Array of items for sale
- `shopName`: Display name for shop UI
- `buyMultiplier`: Price multiplier when buying (default: 1.0)
- `sellMultiplier`: Price multiplier when selling (default: 0.5)

**Examples:**
```json
{
  "category": "Actor",
  "actorType": "npc",
  "id": "elder_sage",
  "name": "Elder Sage",
  "spriteSrc": "assets/npc/sage-0.png",
  "npcType": "sage",
  "dialogue": "Welcome, young adventurer!",
  "x": 1075,
  "y": 416,
  "scale": 0.15,
  "collisionExpandTopPercent": -0.70
}

{
  "category": "Actor",
  "actorType": "spirit",
  "name": "Sylphie",
  "spriteSrc": "assets/npc/Spirits/Sylphie00.png",
  "spiritType": "flying",
  "roamRadius": 150,
  "floatOffset": 10,
  "behaviorType": "roaming",
  "x": 700,
  "y": 300
}
```

### 3. InteractiveObject
Objects player can interact with (chests, portals, signs, switches, etc.)

**Subtypes:**
- `chest`: Treasure chests with loot
- `portal`: Map transitions (doors, magic portals)
- `sign`: Readable signs

**Required Fields:**
- `category`: "InteractiveObject"
- `objectType`: Subtype name ("chest", "portal", "sign")
- `x`, `y`: Position

**Chest-Specific Fields:**
- `id`: Unique identifier (required for save system)
- `chestType`: Visual variant ("wooden", "silver", "golden")
- `gold`: Amount of gold inside
- `loot`: Array of items `[{ "id": "item_id", "quantity": 2 }]`

**Portal-Specific Fields:**
- `id`: Unique identifier
- `targetMap`: Map ID to travel to
- `spawnPoint`: Spawn point name on target map
- `spriteSrc`: Portal sprite image
- `portalType`: Visual variant ("door", "magic", "cave")
- `name`: Portal display name

**Sign-Specific Fields:**
- `text`: Sign text to display
- `spriteSrc`: Sign sprite image

**Examples:**
```json
{
  "category": "InteractiveObject",
  "objectType": "chest",
  "id": "treasure_chest_1",
  "chestType": "golden",
  "gold": 200,
  "loot": [
    { "id": "iron_sword", "quantity": 1 },
    { "id": "health_potion", "quantity": 3 }
  ],
  "x": 300,
  "y": 700
}

{
  "category": "InteractiveObject",
  "objectType": "portal",
  "id": "portal_to_village",
  "targetMap": "0-1",
  "spawnPoint": "fromDoor",
  "spriteSrc": "assets/npc/door-0.png",
  "portalType": "door",
  "name": "Village Entrance",
  "x": 695,
  "y": 515
}
```

## How It Works

### Object Creation Flow

1. **JSON Data** → DataLoader reads `data/objects.json`
2. **ObjectManager** → Calls `createObjectFromData(data)`
3. **Category Check** → Identifies base category (StaticObject, Actor, InteractiveObject)
4. **Subtype Factory** → If subtype exists, uses specialized factory
5. **Instantiation** → Creates instance with all properties
6. **Registration** → Adds to object registry and map

### Adding New Subtypes

To add a new actor type (e.g., "flying" spirit):

1. **No code needed!** Just use JSON:
```json
{
  "category": "Actor",
  "actorType": "spirit",
  "spiritType": "flying",
  "floatOffset": 15,
  "floatSpeed": 0.05,
  ...
}
```

2. **If custom behavior needed**, add factory:
```javascript
// In ObjectManager.js
this.subtypeFactories = {
  'Actor': {
    'spirit': (data) => {
      if (data.spiritType === 'flying') {
        return new FlyingSpirit(data);
      }
      return new Spirit(data);
    }
  }
}
```

## Benefits

✅ **Flexible**: Mix and match properties per object
✅ **Extensible**: New subtypes without new classes
✅ **Clean JSON**: Only specify what differs from defaults
✅ **Editor-Friendly**: Clear category → subtype hierarchy
✅ **Type-Safe**: Categories enforce structure
✅ **Maintainable**: Less code, more data

## Map Editor Integration

The map editor will use this system:

1. **Category Dropdown**: Choose StaticObject, Actor, or InteractiveObject
2. **Subtype Dropdown**: If Actor/InteractiveObject, choose subtype
3. **Property Panel**: Shows relevant fields for category + subtype
4. **Sprite Browser**: For StaticObject, browse sprite folders
5. **Save**: Writes clean JSON with only specified properties

Example editor workflow:
```
1. Select "Actor" category
2. Select "spirit" subtype
3. Editor shows: name, spriteSrc, x, y, roamRadius, spiritType, etc.
4. Fill in values
5. Place on map
6. Save → Writes minimal JSON to objects.json
```
