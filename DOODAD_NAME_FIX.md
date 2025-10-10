# Doodad Name Display Fix

## Problem
All doodads in the placement tool list were showing as "Undefined" instead of their actual names (Oak Tree, Green Bush, Boulder, etc.).

## Root Cause

### StaticObjectRegistry Structure
The `StaticObjectRegistry` stores templates differently from other registries:

```javascript
// Storage in Map
this.templates.set('Oak Tree', {
    objectCategory: 'tree',
    spriteSrc: 'assets/objects/trees/tree-01.png',
    scale: 1.0,
    // ... other properties
    // NOTE: No 'name' property!
});
```

The name is stored as the **Map key**, not as a property within the template object.

### getAllTemplates() Format
```javascript
getAllTemplates() {
    return Array.from(this.templates.entries()).map(([name, template]) => ({
        name,      // Map key
        template   // Template object (without name property)
    }));
}
```

Returns: `[{name: "Oak Tree", template: {...}}, ...]`

### Previous Fix Issue
When I fixed the preview sprite issue, I extracted just the template:
```javascript
templates = this.game.staticObjectRegistry.getAllTemplates()
    .map(item => item.template);  // Lost the name!
```

This gave us template objects without names, causing "Undefined" in the UI.

## Solution

Merge the name from the wrapper into the template object:

```javascript
case 'doodads':
    // StaticObjectRegistry returns {name, template} format - merge name into template
    templates = this.game.staticObjectRegistry.getAllTemplates()
        .map(item => ({ 
            ...item.template,      // Spread all template properties
            name: item.name,       // Add name property
            id: item.name          // Add id property (used for selection)
        }));
    break;
```

## How It Works Now

### Before Fix
```javascript
template = {
    objectCategory: 'tree',
    spriteSrc: 'assets/objects/trees/tree-01.png',
    scale: 1.0,
    // name: undefined ❌
}
```

Display: `${template.name || template.id}` → "Undefined"

### After Fix
```javascript
template = {
    objectCategory: 'tree',
    spriteSrc: 'assets/objects/trees/tree-01.png',
    scale: 1.0,
    name: 'Oak Tree',  ✅
    id: 'Oak Tree'     ✅
}
```

Display: `${template.name || template.id}` → "Oak Tree"

## Comparison with Other Registries

### Spirit Registry
```javascript
// Spirits store name IN the template object
{
    id: "forest_sprite",
    name: "Sylphie",          ✅ Name is a property
    spriteSrc: "...",
    // ...
}
```

### Light Registry
```javascript
// Lights store name IN the template object
{
    name: "Torch Light",      ✅ Name is a property
    radius: 200,
    // ...
}
```

### Static Object Registry (Doodads)
```javascript
// Name is Map KEY, not in template
Map<string, template>
    "Oak Tree" → {...}        ❌ Name is separate from template
    "Green Bush" → {...}
```

This inconsistency required special handling in the placement panel.

## Why This Structure?

The StaticObjectRegistry was designed for the Template Editor UI, which:
1. Uses the name as a unique identifier/key
2. Manages templates through the Map interface
3. Displays name separately from template data

This is fine for the Template Editor, but the ObjectPlacementPanel expects unified template objects.

## Testing

### Expected Behavior
1. Press **P** to open placement panel
2. Select **Doodads** from dropdown
3. List shows:
   - 🎨 **Oak Tree** - Scale: 1.0
   - 🎨 **Green Bush** - Scale: 0.5
   - 🎨 **Boulder** - Scale: 0.3

### Verify Fix Works
```javascript
// In browser console after opening placement panel with doodads selected
const panel = editor.placementPanel;
console.log(panel.selectedType); // "doodads"

// Check populated templates
const templates = game.staticObjectRegistry.getAllTemplates()
    .map(item => ({ ...item.template, name: item.name, id: item.name }));
console.log(templates);
// Should show: [{name: "Oak Tree", ...}, {name: "Green Bush", ...}, ...]
```

## Future Improvements

Consider standardizing all registries to store name within template:

### Option 1: Update addTemplate to include name
```javascript
addTemplate(name, template) {
    this.templates.set(name, {
        ...template,
        name: name,
        id: name
    });
}
```

### Option 2: Update getAllTemplates to merge automatically
```javascript
getAllTemplates() {
    return Array.from(this.templates.entries()).map(([name, template]) => ({
        ...template,
        name: name,
        id: name
    }));
}
```

Either approach would make doodads consistent with other object types and eliminate the need for special handling in consumers.

## Related Code

- **StaticObjectRegistry.js**: Template storage and retrieval
- **ObjectPlacementPanel.js**: Template display and selection
- **TemplateEditor.js**: Template creation and editing (works with current structure)

## Console Logs

### When Opening Doodads in Placement Panel
```
[ObjectPlacementPanel] Activated placement mode: doodads
[ObjectPlacementPanel] Template: {name: "Oak Tree", spriteSrc: "/assets/objects/trees/tree-01.png", ...}
[EditorManager] Preview sprite loading: /assets/objects/trees/tree-01.png
```

### When Placing Doodad
```
[EditorManager] Creating object with data: {category: "StaticObject", name: "Oak Tree", ...}
[EditorManager] Successfully placed: StaticObject at X, Y
```
