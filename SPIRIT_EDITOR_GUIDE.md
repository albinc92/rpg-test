# 👻 Spirit Editor - User Guide

## Overview
The Spirit Editor allows you to browse, create, edit, and delete spirit templates directly in the map editor. All spirit templates are managed in `data/spirits.json`.

---

## 📍 Location
**Data Menu → 👻 Spirit Templates**

### Options:
- **📝 Browse Spirits** - View all spirit templates in a grid
- **➕ New Spirit** - Create a new spirit template

---

## 🎨 Spirit Browser

### Features:
- **Grid View:** Visual cards showing sprite preview, stats, and rarity
- **Search:** Filter spirits by name or rarity
- **Click to Edit:** Click any spirit card to edit it
- **Rarity Colors:** Common (white), Uncommon (green), Rare (blue), Legendary (purple)

### Display Info:
- Sprite preview (64x64 pixelated)
- Spirit name
- Rarity badge
- Stats summary (HP, ATK, DEF, SPD)

---

## ✏️ Spirit Editor

### Creating New Spirit:
1. Data → Spirit Templates → ➕ New Spirit
2. Fill in all required fields:
   - **Spirit ID:** Unique identifier (e.g., `fire_spirit`)
   - **Name:** Display name (e.g., "Fire Spirit")
   - **Sprite Path:** Path to sprite asset
   - **Dimensions:** Width and height of sprite
   - **Stats:** HP, Attack, Defense, Speed
   - **Movement:** Move speed and pattern
   - **Rarity:** common/uncommon/rare/legendary
   - **Description:** Flavor text
3. Click "💾 Save Spirit"
4. **Important:** Copy the JSON from console and manually update `data/spirits.json`

### Editing Existing Spirit:
1. Browse Spirits → Click spirit card
2. Modify any fields
3. Save and copy JSON from console

### Deleting Spirit:
1. Open spirit in editor
2. Click "🗑️ Delete" button
3. Confirm deletion
4. Copy updated JSON from console

---

## 📊 Spirit Template Fields

### Required Fields:
- **id** (string) - Unique identifier, cannot be changed after creation
- **name** (string) - Display name
- **spriteSrc** (string) - Path to sprite file
- **spriteWidth** (number) - Sprite width in pixels
- **spriteHeight** (number) - Sprite height in pixels

### Combat Stats:
- **HP** (number) - Health points (min: 1)
- **Attack** (number) - Attack power (min: 0)
- **Defense** (number) - Defense power (min: 0)
- **Speed** (number) - Speed stat (min: 1)

### Movement:
- **moveSpeed** (number) - Movement speed multiplier (min: 0.1, step: 0.1)
- **movePattern** (string) - `wander` or `static`

### Properties:
- **collisionShape** (string) - `circle` or `rectangle`
- **rarity** (string) - `common`, `uncommon`, `rare`, or `legendary`
- **description** (string) - Flavor text (optional)

### Collision Percent:
Defines hitbox size relative to sprite:
```json
{
  "top": -0.7,
  "left": -0.1,
  "right": -0.1,
  "bottom": 0
}
```

---

## ⚠️ Important Notes

### Manual Save Required:
Due to browser security, the editor cannot automatically write to `data/spirits.json`. After saving:

1. Check console for JSON output
2. Copy the entire JSON object
3. Manually update `data/spirits.json`
4. Refresh the game to load changes

### Console Output Example:
```
[SpiritEditor] Spirit data to save: 
{
  "spirits": [
    { ... spirit data ... }
  ]
}
```

### Sprite Assets:
- Place sprite files in `assets/npc/Spirits/`
- Recommended: 32x32 pixels
- Format: PNG with transparency
- Use pixelated/pixel-art style

---

## 🎯 Workflow

### Adding a New Spirit:
1. **Create Sprite:** Make 32x32 PNG sprite
2. **Save to:** `assets/npc/Spirits/your-spirit.png`
3. **Open Editor:** Data → Spirit Templates → New Spirit
4. **Fill Form:**
   - ID: `your_spirit`
   - Name: `Your Spirit`
   - Sprite Path: `assets/npc/Spirits/your-spirit.png`
   - Stats, movement, rarity
5. **Save:** Copy JSON from console
6. **Update File:** Paste into `data/spirits.json`
7. **Reload Game:** Spirits will be available

### Testing Your Spirit:
1. Open Map Config
2. Add spawn entry with your spirit ID
3. Paint spawn zones (blue)
4. Play and watch it spawn!

---

## 🔍 Tips

### Balancing Stats:
- **Common:** HP ~40-60, ATK ~10-15, DEF ~5-10, SPD ~15-20
- **Uncommon:** HP ~50-70, ATK ~15-20, DEF ~8-15, SPD ~18-25
- **Rare:** HP ~60-80, ATK ~18-25, DEF ~12-20, SPD ~12-20
- **Legendary:** HP ~80-120, ATK ~25-40, DEF ~20-35, SPD ~10-15

### Move Speed:
- **Slow:** 0.8 - 1.2
- **Normal:** 1.3 - 1.8
- **Fast:** 1.9 - 2.5

### Rarity Colors in UI:
- **Common:** #aaa (gray)
- **Uncommon:** #1eff00 (green)
- **Rare:** #0070dd (blue)
- **Legendary:** #a335ee (purple)

---

## ✅ Complete Example

```json
{
  "id": "fire_spirit",
  "name": "Flame Wisp",
  "spriteSrc": "assets/npc/Spirits/flame-wisp.png",
  "spriteWidth": 32,
  "spriteHeight": 32,
  "collisionShape": "circle",
  "collisionPercent": {
    "top": -0.7,
    "left": -0.1,
    "right": -0.1,
    "bottom": 0
  },
  "stats": {
    "hp": 60,
    "attack": 35,
    "defense": 12,
    "speed": 20
  },
  "moveSpeed": 1.8,
  "movePattern": "wander",
  "rarity": "rare",
  "description": "A blazing spirit born from eternal flames"
}
```

---

## 🚀 Status
✅ **Fully Functional** - Browse, create, edit, and delete spirit templates!

**Note:** Manual JSON copy-paste required for persistence.
