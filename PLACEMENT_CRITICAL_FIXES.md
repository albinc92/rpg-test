# Placement System Critical Fixes

## Bugs Fixed

### 1. **Light Mode Persisting After Switching Object Types**
**Symptom:** After placing a light, switching to NPCs/Spirits/Doodads would still place lights instead.

**Root Cause:** 
- When placing lights, `lightEditor.placementMode = true` was set
- When switching to other object types, this flag was never cleared
- `handlePlaceClick()` checks `lightEditor.placementMode` first, so it always placed lights

**Fix:**
```javascript
// In activatePlacementMode() - clear previous state first
if (this.editor.lightEditor) {
    this.editor.lightEditor.placementMode = false;
    this.editor.lightEditor.selectedTemplate = null;
}

// In deactivatePlacementMode() - also clear light editor state
if (this.editor.lightEditor) {
    this.editor.lightEditor.placementMode = false;
    this.editor.lightEditor.selectedTemplate = null;
}
```

### 2. **Spirits Not Being Created**
**Symptom:** Clicking to place a spirit did nothing - no error, no placement.

**Root Cause:** 
- Spirit constructor signature: `Spirit(game, x, y, mapId, options)`
- ObjectManager factory was calling: `new Spirit(data)` with single object
- Constructor expected separate parameters, got one bundled object

**Fix:**
```javascript
// ObjectManager.js - Updated Spirit factory
'spirit': (data) => {
    // Spirit expects (game, x, y, mapId, options)
    const { x, y, mapId, ...options } = data;
    return new Spirit(this.game, x || 0, y || 0, mapId, options);
}
```

### 3. **Missing mapId in Placement Data**
**Symptom:** Spirits need mapId at construction time but it wasn't being provided.

**Root Cause:**
- `placeObject()` was creating object first, then adding mapId via `addObject()`
- Spirit constructor needs mapId immediately

**Fix:**
```javascript
// EditorManager.js - placeObject()
const dataWithMap = {
    ...objectData,
    mapId: this.game.currentMapId
};
const obj = this.game.objectManager.createObjectFromData(dataWithMap);
```

## Complete Fix Summary

### ObjectPlacementPanel.js Changes

**activatePlacementMode():**
```javascript
activatePlacementMode() {
    if (!this.selectedTemplate) return;
    
    // 🔧 Clear any previous placement state first
    this.editor.selectedPrefab = null;
    if (this.editor.lightEditor) {
        this.editor.lightEditor.placementMode = false;
        this.editor.lightEditor.selectedTemplate = null;
    }
    
    this.placementMode = true;
    
    // Create prefab data based on type
    const prefabData = this.createPrefabData(this.selectedTemplate);
    this.editor.selectedPrefab = prefabData;
    
    // Set editor to place mode AFTER setting prefab
    this.editor.setTool('place');
    
    // Load preview sprite if prefab has one
    if (prefabData && prefabData.spriteSrc) {
        this.editor.loadPreviewSprite(prefabData.spriteSrc);
    }
    
    // ... logging ...
    this.updateUI();
}
```

**deactivatePlacementMode():**
```javascript
deactivatePlacementMode() {
    this.placementMode = false;
    this.editor.setTool('select');
    this.editor.selectedPrefab = null;
    
    // 🔧 Clear light editor placement mode if it was active
    if (this.editor.lightEditor) {
        this.editor.lightEditor.placementMode = false;
        this.editor.lightEditor.selectedTemplate = null;
    }
    
    console.log('[ObjectPlacementPanel] Deactivated placement mode');
    this.updateUI();
}
```

### ObjectManager.js Changes

**Spirit Factory Fix:**
```javascript
this.subtypeFactories = {
    'Actor': {
        'npc': (data) => new NPC(data),
        'spirit': (data) => {
            // 🔧 Spirit expects (game, x, y, mapId, options)
            const { x, y, mapId, ...options } = data;
            return new Spirit(this.game, x || 0, y || 0, mapId, options);
        },
        'merchant': (data) => new NPC({ ...data, npcType: 'merchant' })
    },
    // ...
};
```

### EditorManager.js Changes

**placeObject() with mapId:**
```javascript
placeObject(objectData) {
    console.log('[EditorManager] Attempting to place object:', objectData);
    
    // 🔧 Add mapId to object data (needed for some constructors like Spirit)
    const dataWithMap = {
        ...objectData,
        mapId: this.game.currentMapId
    };
    
    const obj = this.game.objectManager.createObjectFromData(dataWithMap);
    if (obj) {
        console.log('[EditorManager] Object created with position:', obj.x, obj.y);
        this.game.objectManager.addObject(this.game.currentMapId, obj);
        // ... rest of placement logic
    } else {
        console.error('[EditorManager] Failed to create object from data:', objectData);
    }
}
```

## How Placement Works Now

### Workflow
1. User opens ObjectPlacementPanel
2. Selects object type (Lights/Spirits/Doodads/etc)
3. Clicks on a template
4. `selectTemplate()` → `activatePlacementMode()` called

### activatePlacementMode() Flow
```
1. Clear previous state:
   - Set lightEditor.placementMode = false
   - Set lightEditor.selectedTemplate = null
   - Set editor.selectedPrefab = null

2. Create new prefab data for selected type:
   - Lights: Set lightEditor state, return null
   - Spirits: Create Actor prefab with actorType='spirit'
   - Doodads: Create StaticObject prefab
   - NPCs/Chests/Portals: Create appropriate prefab

3. Set editor.selectedPrefab = prefabData

4. Set editor tool to 'place'

5. Load preview sprite if prefab has spriteSrc
```

### Click Map Flow
```
1. handlePlaceClick() called

2. Check if lightEditor.placementMode = true:
   - Yes: Call lightEditor.handleMapClick() → place light
   - No: Continue

3. Check if selectedPrefab exists:
   - No: Return (nothing to place)
   - Yes: Continue

4. Create object:
   - Add mapId to prefab data
   - Call objectManager.createObjectFromData()
   - Spirit factory extracts x, y, mapId, options
   - Calls new Spirit(game, x, y, mapId, options)

5. Add object to scene:
   - objectManager.addObject(mapId, obj)
   - Add to history for undo/redo
```

## Testing Checklist

### Lights
- [ ] Press P, select Lights
- [ ] Click a light template
- [ ] Click map → light appears
- [ ] Switch to Spirits
- [ ] Click spirit template
- [ ] Click map → **SPIRIT appears (not light)** ✅

### Spirits
- [ ] Press P, select Spirits
- [ ] Click "Sylphie" or any spirit
- [ ] See preview sprite following cursor
- [ ] Click map → **spirit appears** ✅
- [ ] Repeat with different spirit templates

### Doodads
- [ ] Press P, select Doodads
- [ ] Click a tree/rock template
- [ ] Click map → doodad appears
- [ ] Works correctly ✅

### NPCs
- [ ] Press P, select NPCs
- [ ] Click any NPC template
- [ ] Click map → NPC appears

### Chests
- [ ] Press P, select Chests
- [ ] Click any chest template
- [ ] Click map → chest appears

### Portals
- [ ] Press P, select Portals
- [ ] Click any portal template
- [ ] Click map → portal appears

### Cross-Type Switching
- [ ] Place a light
- [ ] Switch to Spirits → place spirit (NOT light) ✅
- [ ] Switch to Doodads → place doodad (NOT spirit) ✅
- [ ] Switch back to Lights → place light ✅
- [ ] Press ESC → all modes cancelled ✅

## Console Logs to Expect

### When Switching from Lights to Spirits:
```
[ObjectPlacementPanel] Activated placement mode: spirits
[ObjectPlacementPanel] Template: {id: "forest_sprite", name: "Sylphie", ...}
[ObjectPlacementPanel] Prefab data: {category: "Actor", actorType: "spirit", ...}
[ObjectPlacementPanel] Light editor mode: false ✅
[EditorManager] Preview sprite loaded: /assets/npc/Spirits/sylphie.png
```

### When Placing a Spirit:
```
[EditorManager] handlePlaceClick called at screen: 500, 300
[EditorManager] Selected prefab: {category: "Actor", actorType: "spirit", ...}
[EditorManager] Attempting to place object: {..., mapId: "0-0"}
[Spirit] Sylphie constructor: isFloating=true, ...
[EditorManager] Object created with position: 123, 456
[EditorManager] Successfully placed: Spirit at 123, 456
```

## Known Limitations

1. **Preview Sprite for Lights**: Lights don't have preview sprites (they use radius circles instead)
2. **NPC/Chest/Portal Sprites**: Using placeholder sprites, may need template-specific sprites
3. **No Rotation**: Can't rotate objects during placement yet
4. **No Scale Adjustment**: Can't adjust scale before placing (uses template default)

## Future Enhancements

- [ ] Add rotation control during placement (mouse wheel or keys)
- [ ] Add scale slider in ObjectPlacementPanel
- [ ] Show template preview images in list
- [ ] Add "Place Multiple" mode (stay in placement after each click)
- [ ] Add grid snapping toggle
- [ ] Preview collision shapes before placing
