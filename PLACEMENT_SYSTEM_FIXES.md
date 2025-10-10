# Object Placement System Fixes

## Issues Found

### 1. **Light Placement Not Working**
- **Problem**: Light editor's `handleMapClick` was only being called from `handleSelectClick`, not `handlePlaceClick`
- **Impact**: When ObjectPlacementPanel set tool to 'place' mode, lights couldn't be placed
- **Fix**: Added light editor check at the beginning of `handlePlaceClick()` in EditorManager

### 2. **ESC Key Handler Broken**
- **Problem**: ESC key handler was calling removed `lightEditor.togglePlacementMode()` method
- **Impact**: Pressing ESC would cause JavaScript errors
- **Fix**: Updated ESC handler to:
  1. First check if ObjectPlacementPanel is in placement mode and deactivate it
  2. Then check light editor and manually set `placementMode = false`
  3. Finally handle generic placement mode

### 3. **Incomplete Logging**
- **Problem**: Not enough debug information to diagnose placement issues
- **Fix**: Added comprehensive logging in `activatePlacementMode()` showing:
  - Selected object type
  - Template data
  - Generated prefab data
  - Current editor tool

## Code Changes

### EditorManager.js - `handlePlaceClick()`
```javascript
handlePlaceClick(x, y) {
    // Check if light editor is in placement mode (lights use special placement)
    if (this.lightEditor && this.lightEditor.placementMode) {
        const worldX = this.mouseWorldXUnsnapped;
        const worldY = this.mouseWorldYUnsnapped;
        const handled = this.lightEditor.handleMapClick(worldX, worldY);
        if (handled) {
            return true;
        }
    }
    
    if (!this.selectedPrefab) {
        console.log('[EditorManager] No prefab selected');
        return true;
    }
    
    // ... rest of placement logic
}
```

### EditorManager.js - ESC Key Handler
```javascript
if (e.key === 'Escape') {
    e.preventDefault();
    
    // Cancel placement mode through ObjectPlacementPanel if it's open
    if (this.placementPanel && this.placementPanel.isVisible() && this.placementPanel.placementMode) {
        this.placementPanel.deactivatePlacementMode();
    }
    // Cancel light placement mode if active
    else if (this.lightEditor && this.lightEditor.placementMode) {
        this.lightEditor.placementMode = false;
        this.setTool('select');
    }
    // Cancel object placement mode
    else if (this.selectedTool === 'place') {
        this.selectedPrefab = null;
        this.setTool('select');
    }
}
```

### ObjectPlacementPanel.js - Enhanced Logging
```javascript
activatePlacementMode() {
    if (!this.selectedTemplate) return;
    
    this.placementMode = true;
    this.editor.setTool('place');
    
    const prefabData = this.createPrefabData(this.selectedTemplate);
    this.editor.selectedPrefab = prefabData;
    
    console.log('[ObjectPlacementPanel] Activated placement mode:', this.selectedType);
    console.log('[ObjectPlacementPanel] Template:', this.selectedTemplate);
    console.log('[ObjectPlacementPanel] Prefab data:', prefabData);
    console.log('[ObjectPlacementPanel] Editor tool:', this.editor.selectedTool);
    
    this.updateUI();
}
```

## How It Works Now

### Light Placement Flow
1. User selects light template from ObjectPlacementPanel
2. `activatePlacementMode()` called
3. Sets `lightEditor.placementMode = true`
4. Sets `lightEditor.selectedTemplate = template`
5. Returns `null` for prefab (lights handled specially)
6. User clicks map
7. `handlePlaceClick()` detects light editor placement mode
8. Calls `lightEditor.handleMapClick()`
9. Light created and added to scene

### Other Object Placement Flow
1. User selects object template (spirit/doodad/npc/chest/portal)
2. `activatePlacementMode()` called
3. `createPrefabData()` generates appropriate data structure
4. Prefab data set on editor
5. User clicks map
6. `handlePlaceClick()` checks light editor (not active)
7. Calls `placeObject()` with prefab data
8. Object created via `createObjectFromData()`
9. Object added to scene

## Prefab Data Structures

### Spirits
```javascript
{
    category: 'Actor',
    actorType: 'spirit',
    spriteSrc: template.spriteSrc,
    name: template.name,
    scale: template.scale || 0.2,
    templateId: template.id
}
```

### Doodads (Static Objects)
```javascript
{
    category: 'StaticObject',
    spriteSrc: template.spriteSrc,
    name: template.name,
    scale: template.scale || 1.0,
    castsShadow: template.castsShadow !== false,
    templateId: template.id
}
```

### NPCs
```javascript
{
    category: 'Actor',
    actorType: 'npc',
    spriteSrc: 'assets/npc/main-0.png',
    name: template.name,
    npcType: template.npcType,
    dialogue: 'Hello!',
    scale: 0.15
}
```

### Chests
```javascript
{
    category: 'InteractiveObject',
    objectType: 'chest',
    chestType: template.chestType,
    gold: 0,
    loot: []
}
```

### Portals
```javascript
{
    category: 'InteractiveObject',
    objectType: 'portal',
    spriteSrc: 'assets/npc/door-0.png',
    portalType: template.portalType,
    targetMap: '0-0',
    spawnPoint: 'default'
}
```

## Testing Checklist

- [ ] Open ObjectPlacementPanel (press P or Tools → Place Objects)
- [ ] Select "Lights" type
- [ ] Click a light template
- [ ] Verify console shows activation logs
- [ ] Click on map - light should appear
- [ ] Press ESC - placement should cancel
- [ ] Select "Spirits" type
- [ ] Click a spirit template
- [ ] Click on map - spirit should appear
- [ ] Repeat for Doodads
- [ ] Test ESC key cancellation at each stage

## Known Limitations

1. **No Preview Sprite**: Currently no ghost preview at cursor position before placing
2. **NPC/Chest/Portal Sprites**: Using placeholder sprite paths, need proper sprite assignment
3. **Chest Data**: Missing proper sprite source in prefab data
4. **Interactive Objects**: May need collision shape definitions

## Next Steps

1. Add ghost preview sprite at cursor position (similar to what exists for other placement)
2. Verify chests and portals have proper sprite sources
3. Add template preview images in ObjectPlacementPanel UI
4. Test all object types can be placed and saved properly
5. Add "Place Multiple" mode option (checkbox to stay in placement)
