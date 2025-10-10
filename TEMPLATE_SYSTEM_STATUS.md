# Template Management System Status

## Overview
The editor has a **mixed implementation** - some object types have full template management systems with registries, while others use hardcoded placeholder data.

## Full Template Systems (With Registries)

### ✅ Lights
- **Registry**: `LightRegistry.js`
- **Editor**: `LightEditor.js`
- **Data Menu**: Data → Lights → Opens Light Editor
- **Features**:
  - Create new light templates
  - Edit existing templates (radius, color, flicker)
  - Delete templates
  - Browse all templates
  - Templates stored in registry
- **Placement**: Tools → Place Objects → Lights

### ✅ Spirits
- **Registry**: `SpiritRegistry.js`
- **Data Source**: `data/spirits.json`
- **Browser**: Data → Spirits → Opens Spirit Browser
- **Features**:
  - Browse all spirit templates from JSON
  - View template properties
  - Select for placement
  - ⚠️ **No editing UI yet** (edit JSON file manually)
- **Placement**: Tools → Place Objects → Spirits

### ✅ Doodads (Static Objects)
- **Registry**: `StaticObjectRegistry.js`
- **Editor**: `TemplateEditor.js`
- **Data Menu**: Data → Doodads → Opens Template Editor
- **Features**:
  - Create new doodad templates
  - Edit existing templates (sprite, scale, collision, effects)
  - Delete templates
  - Browse by category (trees, bushes, rocks, etc.)
  - Templates stored in registry
- **Placement**: Tools → Place Objects → Doodads

## Placeholder Systems (Hardcoded)

### ❌ NPCs
- **Registry**: ⚠️ **NONE** - Hardcoded array
- **Browser**: Data → NPCs → Opens placeholder browser
- **Features**:
  - Shows 4 hardcoded NPC types:
    - Merchant
    - Sage
    - Guard
    - Villager
  - ⚠️ **Cannot create/edit/delete**
  - ⚠️ **Not saved anywhere**
  - Click opens placement tool
- **Placement**: Tools → Place Objects → NPCs
- **Hardcoded in**: `ObjectPlacementPanel.getNPCTemplates()`

### ❌ Chests
- **Registry**: ⚠️ **NONE** - Hardcoded array
- **Browser**: Data → Chests → Opens placeholder browser
- **Features**:
  - Shows 4 hardcoded chest types:
    - Wooden Chest (Common)
    - Iron Chest (Uncommon)
    - Golden Chest (Rare)
    - Mystical Chest (Epic)
  - ⚠️ **Cannot create/edit/delete**
  - ⚠️ **Not saved anywhere**
  - Click opens placement tool
- **Placement**: Tools → Place Objects → Chests
- **Hardcoded in**: `ObjectPlacementPanel.getChestTemplates()`

### ❌ Portals
- **Registry**: ⚠️ **NONE** - Hardcoded array
- **Browser**: Data → Portals → Opens placeholder browser
- **Features**:
  - Shows 5 hardcoded portal types:
    - Door
    - Teleport Pad
    - Stairs
    - Cave Entrance
    - Warp Gate
  - ⚠️ **Cannot create/edit/delete**
  - ⚠️ **Not saved anywhere**
  - Click opens placement tool
- **Placement**: Tools → Place Objects → Portals
- **Hardcoded in**: `ObjectPlacementPanel.getPortalTemplates()`

## Items & Maps

### ✅ Items
- **Data Source**: `data/items.json`
- **Browser**: Data → Items → Opens Item Browser
- **Features**:
  - Browse all items from JSON
  - View item properties
  - ⚠️ **No editing UI yet** (edit JSON file manually)

### ✅ Maps
- **Data Source**: `data/maps.json`
- **Browser**: Data → Maps → Opens Map Browser
- **Features**:
  - Browse all maps
  - Create new maps
  - Edit map properties
  - Delete maps
  - Full CRUD operations

## Comparison Table

| Object Type | Registry | Editor/Browser | Create | Edit | Delete | Saved To | Status |
|-------------|----------|----------------|--------|------|--------|----------|--------|
| **Lights** | ✅ LightRegistry | ✅ LightEditor | ✅ | ✅ | ✅ | Memory | **Full** |
| **Spirits** | ✅ SpiritRegistry | ✅ Browser | ❌ | ❌ | ❌ | spirits.json | **Read-Only** |
| **Doodads** | ✅ StaticObjectRegistry | ✅ TemplateEditor | ✅ | ✅ | ✅ | Memory | **Full** |
| **NPCs** | ❌ Hardcoded | ⚠️ Placeholder | ❌ | ❌ | ❌ | None | **Fake** |
| **Chests** | ❌ Hardcoded | ⚠️ Placeholder | ❌ | ❌ | ❌ | None | **Fake** |
| **Portals** | ❌ Hardcoded | ⚠️ Placeholder | ❌ | ❌ | ❌ | None | **Fake** |
| **Items** | ✅ ItemRegistry | ✅ Browser | ❌ | ❌ | ❌ | items.json | **Read-Only** |
| **Maps** | ✅ MapManager | ✅ Browser | ✅ | ✅ | ✅ | maps.json | **Full** |

## What Users Can/Cannot Do

### ✅ Can Do (Full Systems)
1. **Create Light Templates**: Data → Lights → New
2. **Create Doodad Templates**: Data → Doodads → New Template
3. **Create Maps**: Data → Maps → New Map
4. **Edit Lights**: Select template, change properties, save
5. **Edit Doodads**: Select template, change properties, save
6. **Edit Maps**: Select map, change properties, save
7. **Delete Lights/Doodads**: Select and delete from UI

### ❌ Cannot Do (Placeholder Systems)
1. **Create NPC Templates**: No UI exists
2. **Edit NPC Templates**: Hardcoded, not editable
3. **Create Chest Templates**: No UI exists
4. **Edit Chest Templates**: Hardcoded, not editable
5. **Create Portal Templates**: No UI exists
6. **Edit Portal Templates**: Hardcoded, not editable
7. **Edit Spirit/Item Templates**: Must edit JSON files manually

### ⚠️ Workaround
For NPCs, Chests, and Portals:
- You can **place** them using the hardcoded types
- Once placed, you can **edit instance properties** (position, scale, etc.)
- But you cannot create new template types

## Browser Warning Messages

The NPC/Chest/Portal browsers now show warnings:

```
⚠️ NPC Quick Placement
These are hardcoded placeholder types - not editable templates.
A full NPC Registry with template management is not yet implemented.
Click on an NPC type to place it in the world.
```

## Code Locations

### Real Registries
```
src/systems/LightRegistry.js         - Light template storage
src/systems/SpiritRegistry.js        - Spirit template loading
src/systems/StaticObjectRegistry.js  - Doodad template storage
```

### Real Editors
```
src/editor/LightEditor.js            - Light template CRUD UI
src/editor/TemplateEditor.js         - Doodad template CRUD UI
src/editor/EditorUI.js               - Spirit browser (read-only)
src/editor/EditorUI.js               - Map browser (full CRUD)
```

### Hardcoded Data
```
src/editor/ObjectPlacementPanel.js   - getNPCTemplates() (lines ~244-252)
src/editor/ObjectPlacementPanel.js   - getChestTemplates() (lines ~254-262)
src/editor/ObjectPlacementPanel.js   - getPortalTemplates() (lines ~264-272)
```

### Placeholder Browsers
```
src/editor/EditorUI.js               - showNPCBrowser() (~line 4034)
src/editor/EditorUI.js               - showChestBrowser() (~line 4150)
src/editor/EditorUI.js               - showPortalBrowser() (~line 4266)
```

## Implementation TODO

To make NPCs, Chests, and Portals full-featured:

### 1. Create Registries
```javascript
// src/systems/NPCRegistry.js
class NPCRegistry {
    constructor() {
        this.templates = new Map();
        this.loadBuiltInTemplates();
    }
    
    addTemplate(name, template) { /* ... */ }
    getTemplate(name) { /* ... */ }
    getAllTemplates() { /* ... */ }
    removeTemplate(name) { /* ... */ }
}
```

### 2. Create Editors
```javascript
// src/editor/NPCEditor.js
class NPCEditor {
    // Similar to LightEditor.js
    // Create/Edit/Delete UI
    // Form for NPC properties
}
```

### 3. Update Data Menu
```javascript
// In EditorUI.js
{
    label: '🧙 NPCs',
    action: () => {
        if (this.editor.npcEditor) {
            this.editor.npcEditor.show();  // Open real editor
        }
    }
}
```

### 4. Update ObjectPlacementPanel
```javascript
case 'npcs':
    templates = this.game.npcRegistry.getAllTemplates();  // Use real registry
    break;
```

### 5. Persistence
```javascript
// Option 1: Store in memory like Lights/Doodads
// Option 2: Save to JSON like Spirits/Items
// data/npcs.json, data/chests.json, data/portals.json
```

## User Experience

### Expected (Real Systems)
1. Open Data → Lights
2. See list of templates with New button
3. Click New → Form appears
4. Fill properties → Save
5. Template appears in list
6. Can edit or delete from list
7. Template available in placement tool

### Current (Placeholder Systems)
1. Open Data → NPCs
2. See ⚠️ warning message
3. See hardcoded list (cannot edit)
4. Click to open placement tool
5. Can place instances but not customize types

## Migration Path

When implementing real registries:

1. **Keep hardcoded data as defaults**: Move to `loadBuiltInTemplates()`
2. **Allow customization**: Users can edit or create new types
3. **Preserve existing placed objects**: They reference type name, not template
4. **Update browsers**: Replace placeholder warnings with real editors

## Recommendations

### Short Term
- ✅ **Keep warnings** so users know what's real vs fake
- ✅ **Document clearly** in code comments
- ✅ **Expand hardcoded lists** if needed (more NPC types, etc.)

### Long Term
- 🔲 **Implement NPCRegistry.js**
- 🔲 **Implement ChestRegistry.js**
- 🔲 **Implement PortalRegistry.js**
- 🔲 **Create editor UIs** (similar to LightEditor)
- 🔲 **Add JSON persistence** or keep in-memory
- 🔲 **Unify all systems** to follow same pattern

## Questions to Consider

1. **Persistence**: Should NPC/Chest/Portal templates save to JSON or stay in memory like Lights?
2. **Complexity**: Do these types need as many properties as Doodads/Spirits?
3. **Priority**: Are editable templates needed or are hardcoded types sufficient?
4. **Integration**: How do templates relate to game mechanics (chest loot, portal destinations, NPC dialogue)?

## Current Best Practice

Until real registries are implemented:

1. **For quick placement**: Use hardcoded types through Data menu
2. **For customization**: Place object, then edit instance properties in PropertyPanel
3. **For new types**: Add to hardcoded arrays in ObjectPlacementPanel.js
4. **For complex setups**: Wait for full registry implementation
