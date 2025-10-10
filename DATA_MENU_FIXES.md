# Data Menu and Doodad Preview Fixes

## Issues Fixed

### 1. **Doodad Preview Sprites Not Showing**
**Problem:** When placing doodads through the placement tool, no preview sprite appeared at the cursor.

**Root Cause:** 
- `StaticObjectRegistry.getAllTemplates()` returns `{name, template}` format
- ObjectPlacementPanel was trying to access properties directly on this wrapper object
- Template data was nested inside `.template` property

**Fix:**
```javascript
case 'doodads':
    // StaticObjectRegistry returns {name, template} format
    templates = this.game.staticObjectRegistry.getAllTemplates()
        .map(item => item.template);  // Extract the actual template
    break;
```

Now doodad templates are properly extracted and preview sprites load correctly.

---

### 2. **Data Menu Items Not Opening Browsers**
**Problem:** Clicking on NPCs, Chests, or Portals in the Data menu showed "coming soon" alerts instead of proper browsers.

**Root Cause:** 
- These menu items had placeholder `alert()` implementations
- Only Lights, Spirits, Doodads, Items, and Maps had full browsers

**Fix:** Implemented full browser UIs for:
- **NPCs**: 4 predefined types (Merchant, Sage, Guard, Villager)
- **Chests**: 4 rarity types (Wooden, Iron, Golden, Mystical)
- **Portals**: 5 portal types (Door, Teleport, Stairs, Cave, Warp Gate)

## Implementation Details

### NPC Browser
- **Color Theme**: Purple (#9b59b6)
- **Templates**: Merchant, Sage, Guard, Villager
- **Features**: 
  - Icon-based grid layout
  - Description and type info
  - Clicking opens placement panel with NPCs selected

### Chest Browser
- **Color Theme**: Orange (#f39c12)
- **Templates**: Wooden, Iron, Golden, Mystical
- **Features**:
  - Rarity-based color coding
  - Visual differentiation by chest value
  - Direct integration with placement panel

### Portal Browser
- **Color Theme**: Red (#e74c3c)
- **Templates**: Door, Teleport Pad, Stairs, Cave Entrance, Warp Gate
- **Features**:
  - Transport type descriptions
  - Icon-based visual selection
  - Seamless placement panel integration

## How It Works Now

### Opening Data Menu Browsers

1. **Lights** → Opens Light Editor (template CRUD)
2. **Spirits** → Opens Spirit Browser (view all spirit templates)
3. **Doodads** → Opens Template Editor (doodad CRUD)
4. **NPCs** → Opens NPC Browser ✅ NEW
5. **Chests** → Opens Chest Browser ✅ NEW
6. **Portals** → Opens Portal Browser ✅ NEW
7. **Items** → Opens Item Browser
8. **Maps** → Opens Map Browser

### Browser Workflow

1. Click Data → [Object Type]
2. Browser modal appears with template gallery
3. Click on a template card
4. Browser closes
5. Placement Panel opens automatically
6. Selected type is pre-selected in dropdown
7. Template list populated
8. Ready to place!

### Alternative: Direct Placement

Users can also bypass the Data menu:
1. Press **P** or Tools → Place Objects
2. Select object type from dropdown
3. Click template
4. Auto-activates placement mode

## Browser UI Design

All browsers follow consistent design:
- **Modal backdrop**: Semi-transparent overlay
- **Centered modal**: Color-coded border based on object type
- **Title bar**: Icon + "Template Browser"
- **Info section**: Description of what the templates do
- **Template grid**: 2-column card layout
- **Template cards**: 
  - Large icon
  - Name (color-coded)
  - Description/metadata
  - Hover effects
  - Click to select
- **Close button**: Bottom button or click outside

## Template Structure

### NPC Templates
```javascript
{
    id: 'npc-merchant',
    name: 'Merchant',
    npcType: 'merchant',
    icon: '🏪',
    description: 'Buys and sells items'
}
```

### Chest Templates
```javascript
{
    id: 'chest-wooden',
    name: 'Wooden Chest',
    chestType: 'wooden',
    icon: '📦',
    description: 'Basic wooden chest',
    rarity: 'Common'
}
```

### Portal Templates
```javascript
{
    id: 'portal-door',
    name: 'Door',
    portalType: 'door',
    icon: '🚪',
    description: 'Standard door entrance'
}
```

## Color Coding

- **Lights**: Green (#4CAF50)
- **Spirits**: Blue (#4a9eff)
- **Doodads**: Teal (Template Editor default)
- **NPCs**: Purple (#9b59b6)
- **Chests**: Orange (#f39c12)
- **Portals**: Red (#e74c3c)
- **Items**: Blue variant
- **Maps**: Map Editor default

### Chest Rarity Colors
- **Common**: Gray (#95a5a6)
- **Uncommon**: Green (#2ecc71)
- **Rare**: Blue (#3498db)
- **Epic**: Purple (#9b59b6)

## Testing Checklist

### Doodad Preview Fix
- [ ] Press P → Select Doodads
- [ ] Click any tree/rock template
- [ ] **Preview sprite should follow cursor** ✅
- [ ] Click map → doodad places correctly

### NPC Browser
- [ ] Data → NPCs
- [ ] Browser opens with 4 NPC types ✅
- [ ] Click "Merchant"
- [ ] Placement panel opens with NPCs selected
- [ ] Can place NPC successfully

### Chest Browser
- [ ] Data → Chests
- [ ] Browser shows 4 chest types with rarities ✅
- [ ] Click "Golden Chest"
- [ ] Placement panel opens with Chests selected
- [ ] Can place chest successfully

### Portal Browser
- [ ] Data → Portals
- [ ] Browser shows 5 portal types ✅
- [ ] Click "Teleport Pad"
- [ ] Placement panel opens with Portals selected
- [ ] Can place portal successfully

### All Types Complete
- [ ] Lights ✅ (already working)
- [ ] Spirits ✅ (already working)
- [ ] Doodads ✅ (already working)
- [ ] NPCs ✅ (newly implemented)
- [ ] Chests ✅ (newly implemented)
- [ ] Portals ✅ (newly implemented)
- [ ] Items ✅ (already working)
- [ ] Maps ✅ (already working)

## Console Logs to Expect

### When Opening NPC Browser:
```
(No errors - browser displays)
```

### When Selecting Template from Browser:
```
[ObjectPlacementPanel] Populated templates for: npcs
[ObjectPlacementPanel] Found X templates
```

### When Placing Doodad:
```
[EditorManager] Preview sprite loaded: /assets/objects/trees/tree-01.png
[EditorManager] Successfully placed: StaticObject at X, Y
```

## Future Enhancements

- [ ] Add "New Template" button in each browser (opens editor)
- [ ] Add template editing from browser (edit button per template)
- [ ] Add template deletion from browser
- [ ] Add search/filter in browsers
- [ ] Add template preview images (not just icons)
- [ ] Add template stats/properties display
- [ ] Add template duplication feature
- [ ] Save custom NPC/Chest/Portal templates to JSON files
