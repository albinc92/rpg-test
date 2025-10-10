# Preview Sprite Fix

## Problem
Preview sprites were not showing when placing objects from the ObjectPlacementPanel.

## Root Causes

### 1. **Load Order Issue**
The preview sprite was only loaded in `setTool()` when the prefab was already set. But in ObjectPlacementPanel, the tool was being set BEFORE the prefab data was assigned.

**Wrong Order:**
```javascript
this.editor.setTool('place');        // Tool set first
const prefabData = createPrefabData(); // Prefab created second
this.editor.selectedPrefab = prefabData; // Prefab set third
// No preview sprite loaded!
```

**Fixed Order:**
```javascript
const prefabData = createPrefabData();   // Create prefab first
this.editor.selectedPrefab = prefabData; // Set prefab second
this.editor.setTool('place');            // Set tool third
if (prefabData?.spriteSrc) {
    this.editor.loadPreviewSprite(prefabData.spriteSrc); // Explicitly load sprite
}
```

### 2. **Missing Leading Slash in Asset Paths**
All asset paths in `spirits.json` and `objects.json` were missing the leading `/` required by Vite for proper module resolution.

**Before:**
```json
"spriteSrc": "assets/npc/Spirits/sylphie.png"
```

**After:**
```json
"spriteSrc": "/assets/npc/Spirits/sylphie.png"
```

### 3. **Missing Sprite Sources**
Chests prefab data had no `spriteSrc` property at all.

**Before:**
```javascript
case 'chests':
    return {
        category: 'InteractiveObject',
        objectType: 'chest',
        chestType: template.chestType,
        // No spriteSrc!
        gold: 0,
        loot: []
    };
```

**After:**
```javascript
case 'chests':
    return {
        category: 'InteractiveObject',
        objectType: 'chest',
        spriteSrc: '/assets/npc/chest-0.png',  // Added!
        chestType: template.chestType,
        gold: 0,
        loot: []
    };
```

## Changes Made

### ObjectPlacementPanel.js
1. Reordered `activatePlacementMode()` to create prefab before setting tool
2. Added explicit `loadPreviewSprite()` call after setting prefab
3. Added logging to show sprite source being loaded
4. Fixed all asset paths to use leading `/`
5. Added `spriteSrc` to chests prefab data

### data/spirits.json
Fixed all 4 spirit sprite paths:
- Sylphie: `/assets/npc/Spirits/sylphie.png`
- Nythra: `/assets/npc/Spirits/nythra.png`
- Dawn Guardian: `/assets/npc/Spirits/Sylphie00.png`
- Dusk Shadow: `/assets/npc/Spirits/Sylphie00.png`

### data/objects.json
Used PowerShell to batch-fix all asset paths:
```powershell
(Get-Content "data/objects.json" -Raw) -replace '"spriteSrc": "assets/', '"spriteSrc": "/assets/' | Set-Content "data/objects.json"
```

This updated hundreds of entries automatically.

## How Preview System Works Now

### Flow
1. User clicks template in ObjectPlacementPanel
2. `selectTemplate()` called → auto-activates placement
3. `activatePlacementMode()`:
   - Creates prefab data with spriteSrc
   - Sets `editor.selectedPrefab = prefabData`
   - Sets `editor.setTool('place')`
   - Explicitly loads preview sprite: `editor.loadPreviewSprite(prefabData.spriteSrc)`
4. Preview sprite loads asynchronously
5. During editor render loop:
   - `renderPlacementPreview()` called
   - Draws preview sprite at mouse position with transparency
   - Shows collision shape outline
6. User clicks map → object placed

### Preview Rendering
The `renderPlacementPreview()` method draws:
- Semi-transparent sprite at cursor position (50% opacity)
- Collision shape outline (green rectangle or circle)
- Scale and position match what will be placed
- Updates in real-time as cursor moves

## Testing

### Verify Spirits
1. Press **P** to open placement panel
2. Select **Spirits** from dropdown
3. Click "Sylphie" template
4. You should see green forest sprite following cursor
5. Click map → spirit should be placed

### Verify Doodads
1. Select **Doodads** from dropdown
2. Click any tree/rock template
3. You should see object sprite following cursor
4. Click map → doodad should be placed

### Verify NPCs/Chests/Portals
1. Select each type from dropdown
2. Click any template
3. You should see placeholder sprite following cursor
4. Click map → object should be placed

## Console Logs to Expect

When clicking a template:
```
[ObjectPlacementPanel] Activated placement mode: spirits
[ObjectPlacementPanel] Template: {id: "forest_sprite", name: "Sylphie", ...}
[ObjectPlacementPanel] Prefab data: {category: "Actor", actorType: "spirit", ...}
[ObjectPlacementPanel] Editor tool: place
[ObjectPlacementPanel] Preview sprite loading: /assets/npc/Spirits/sylphie.png
[EditorManager] Preview sprite loaded: /assets/npc/Spirits/sylphie.png
```

## Future Improvements

- [ ] Add loading indicator while sprite loads
- [ ] Show "sprite not found" placeholder if image fails to load
- [ ] Cache loaded sprites to avoid reloading same sprite
- [ ] Add rotation preview (show how object will be rotated)
- [ ] Add scale slider to adjust preview size before placing
