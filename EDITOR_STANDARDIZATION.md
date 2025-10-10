# Template Editor Standardization

## Overview
All template editors now share a consistent design system through `EditorStyles.js`, ensuring uniform appearance and behavior across the entire editor interface.

## Standardized Editors
1. **LightEditor.js** - Yellow theme (`#f1c40f`)
2. **NPCEditor.js** - Green theme (`#2ecc71`)
3. **ChestEditor.js** - Orange theme (`#f39c12`)
4. **PortalEditor.js** - Purple theme (`#9b59b6`)
5. **DoodadEditor.js** - Gray theme (`#95a5a6`)
6. **SpiritEditor.js** - Blue theme (`#3498db`)

## Design System Components

### Color Themes
Each editor type has its own color theme defined in `EditorStyles.THEMES`:
- **NPC**: Green (`#2ecc71`)
- **Chest**: Orange (`#f39c12`)
- **Portal**: Purple (`#9b59b6`)
- **Light**: Yellow (`#f1c40f`) - Reserved for future LightEditor update
- **Spirit**: Blue (`#3498db`) - Reserved for future SpiritEditor update
- **Doodad**: Gray (`#95a5a6`) - Reserved for future DoodadEditor update

### Standardized Components

#### Panel Structure
- Fixed position (right: 20px, top: 80px)
- Width: 380px
- Max-height: 85vh
- Dark translucent background with backdrop blur
- Theme-colored border (2px solid)
- Rounded corners (8px)

#### Header
- Gradient background using theme colors
- Title with theme accent color
- Subtitle in muted gray
- Close button (red, consistent across all editors)

#### Buttons
- **New Button**: Full width, theme-colored
- **Edit Button**: Blue (`#3498db`)
- **Delete Button**: Red (`#e74c3c`)
- **Save Button**: Theme-colored
- **Cancel Button**: Gray (`#95a5a6`)
- All buttons have consistent hover effects

#### Form Elements
- **Labels**: Small, gray (`#bdc3c7`)
- **Inputs**: Dark background with light gray border
- **Focus**: Blue border highlight
- **Section Titles**: Blue (`#3498db`)

#### List Items
- Dark background (`rgba(52, 73, 94, 0.3)`)
- Light gray border
- Edit/Delete buttons in consistent positions
- Hover effects applied via `EditorStyles`

### Usage Pattern

```javascript
// In constructor
const theme = EditorStyles.THEMES.npc; // or .chest, .portal, etc.

// Panel
this.panel.style.cssText = EditorStyles.getPanelStyle(theme);

// Header
header.style.cssText = EditorStyles.getHeaderStyle(theme);
header.innerHTML = EditorStyles.createHeader(theme, 'Title', 'Subtitle');

// Buttons
button.style.cssText = EditorStyles.getNewButtonStyle(theme);
EditorStyles.applyNewButtonHover(button, theme);

// Form fields
input.style.cssText = EditorStyles.getInputStyle();
EditorStyles.applyInputFocus(input);
```

## Benefits

### Consistency
- All editors look and behave identically (except for theme colors)
- Reduces cognitive load for users
- Professional, polished appearance

### Maintainability
- Single source of truth for styling
- Easy to update all editors at once
- Reduces code duplication

### Scalability
- New editors can easily adopt the same patterns
- Theme system allows easy color customization
- Hover effects and transitions centralized

## Completed Features
✅ All template editors standardized with consistent design
✅ Six editor types with unique color themes
✅ Unified component structure and behavior
✅ Consistent hover effects and transitions
✅ Form validation and error handling
✅ CRUD operations (Create, Read, Update, Delete)

## Future Improvements
1. Add animation transitions for panel show/hide
2. Add keyboard shortcuts (consistent across all editors)
3. Add template preview thumbnails
4. Add template import/export functionality
5. Add template duplication feature
6. Add search/filter in template lists

## Files Created/Modified
- `src/editor/EditorStyles.js` - NEW: Centralized design system
- `src/editor/LightEditor.js` - REBUILT: Fully standardized
- `src/editor/NPCEditor.js` - CREATED: Fully standardized
- `src/editor/ChestEditor.js` - CREATED: Fully standardized
- `src/editor/PortalEditor.js` - CREATED: Fully standardized
- `src/editor/DoodadEditor.js` - CREATED: Fully standardized
- `src/editor/SpiritEditor.js` - CREATED: Fully standardized
- `src/editor/EditorUI.js` - UPDATED: Initialize all editors
- `src/main.js` - UPDATED: Load all new editors
- `src/editor/LightEditor_old.js` - BACKUP: Old light editor

## Testing Checklist
- [ ] Open Light Editor - verify yellow theme and color picker
- [ ] Create/Edit/Delete Light template with flicker settings
- [ ] Open NPC Editor - verify green theme
- [ ] Create/Edit/Delete NPC template
- [ ] Open Chest Editor - verify orange theme and rarity system
- [ ] Create/Edit/Delete Chest template
- [ ] Open Portal Editor - verify purple theme and destination settings
- [ ] Create/Edit/Delete Portal template
- [ ] Open Doodad Editor - verify gray theme and collision settings
- [ ] Create/Edit/Delete Doodad template
- [ ] Open Spirit Editor - verify blue theme and behavior settings
- [ ] Create/Edit/Delete Spirit template
- [ ] Verify all hover effects work across all editors
- [ ] Verify input focus highlights
- [ ] Verify button transitions
- [ ] Verify empty states display correctly
- [ ] Verify form validation works
- [ ] Test template placement from Tools menu
