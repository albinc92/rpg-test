# Template System Guide

## Overview
The Template System allows you to edit object templates and automatically apply changes to ALL objects using that template. This is perfect for bulk updates like enabling shadows, adjusting collisions, or enabling sway animations.

## Features

### 1. **Centralized Template Management**
- All object templates are stored in `TemplateManager`
- Templates define default properties for objects
- Changes to templates apply to all instances

### 2. **Template Editor UI**
- Access via: **Editor → Tools → Edit Templates**
- Visual editor with all template properties
- Changes apply immediately to all objects

### 3. **Properties You Can Edit**
- ✅ **Cast Shadow** - Enable/disable shadows
- ✅ **Animation Type** - none, sway, pulse, rotate
- ✅ **Sways in Wind** - Enable wind-based swaying
- ✅ **Animation Speed** - How fast the animation plays
- ✅ **Animation Intensity** - How strong the effect is
- ✅ **Scale** - Object size multiplier
- ✅ **Collision Boxes** - Top, Left, Right expansion percentages

## How to Use

### Enabling Sway Animation for All Trees

1. **Open Editor** (F2)
2. **Go to Tools Menu** → Edit Templates
3. **Click "Oak Tree" template**
4. **Enable these settings:**
   - Animation Type: `sway`
   - Sways in Wind: `✓ checked`
   - Animation Speed: `0.001` (slow)
   - Animation Intensity: `1.0` (full)
5. **Click "Apply to All Objects"**
6. **Done!** All trees now sway

### Enabling Shadows for All Objects

1. Open template editor
2. Select any template (e.g., "Rock")
3. Check "Cast Shadow"
4. Click Apply
5. All rocks now cast shadows

### Adjusting Collision Boxes

1. Open template editor
2. Select template
3. Adjust collision percentages:
   - **Negative values** = shrink collision box
   - **Positive values** = expand collision box
   - Example: `-0.90` top = collision box 90% smaller at top
4. Click Apply

## Default Templates

### 🌳 Oak Tree (tree-01)
- Has sway animation enabled
- Wind-responsive
- Casts shadows
- Collision adjusted for trunk only

### 🌿 Bush (bush-01)
- Fast sway animation
- Wind-responsive
- No shadows
- Tight collision box

### 🪨 Rock (rock-01)
- No animation
- Casts shadows
- Reduced top collision (you can walk behind)

## Technical Details

### Template Storage
- Templates stored in `TemplateManager`
- Custom changes saved to localStorage
- Persists between sessions

### Object Instances
- Objects reference templates via `templateId`
- When template changes, all instances update
- Position and ID preserved during updates

### Creating New Objects
- Objects created from templates include `templateId`
- Automatically inherits all template properties
- Future template changes apply automatically

## Tips

1. **Test on One Object First** - Check the effect before applying
2. **Wind Required** - Sway animations need weather wind enabled
3. **Save Often** - Template changes are permanent
4. **Reload to Reset** - Delete localStorage to reset to defaults

## Troubleshooting

### Sway Not Working?
- Ensure template has `animationType: 'sway'`
- Enable `swaysInWind: true`
- Add weather with wind to your map
- Check animation speed isn't too slow

### Changes Not Applying?
- Check console for errors
- Verify object has `templateId` or matching `spriteSrc`
- Try reloading the map

### Lost Default Templates?
- Clear localStorage: `localStorage.removeItem('customTemplates')`
- Reload page to restore defaults
