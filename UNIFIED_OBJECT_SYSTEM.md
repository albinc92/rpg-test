# 🎨 Unified Object Management System - Complete Guide

## Overview
The editor now features a **unified, consistent system** for managing ALL game object types! Template management is separated from placement for a clean, intuitive workflow.

## 🎯 System Architecture

### Two-Panel Approach

1. **Data Menu** → Template Management (Create, Edit, Delete)
2. **Tools Menu** → Object Placement (Select & Place)

This separation provides a clear workflow:
- **Manage your templates** in the Data menu
- **Place objects** using the unified placement panel

## 📋 Menu Structure

### Data Menu (Template Management)
```
Data:
├─ 💡 Lights          → Opens Light Editor
├─ 👻 Spirits         → Opens Spirit Browser
├─ 🎨 Doodads         → Opens Doodad Template Editor
├─ 🧙 NPCs            → Opens NPC Browser (coming soon)
├─ 📦 Chests          → Opens Chest Browser (coming soon)
├─ 🚪 Portals         → Opens Portal Browser (coming soon)
├─ 🎒 Items           → Opens Item Browser (always works, even if empty!)
└─ 🗺️ Maps            → Opens Map Browser (view/edit/delete/create all maps)
```

### Tools Menu (Placement & Tools)
```
Tools:
├─ 🎯 Select Tool (V)      → Select and move objects
├─ 📍 Place Objects (P)    → Opens unified placement panel
├─ 🖌️ Paint Tool (B)       → Paint textures/collision/spawn zones
└─ 🎨 Manage Textures      → Texture library
```

## 🎮 Unified Placement Panel

### Features
- **Single panel** for placing ALL object types
- **Type dropdown** to switch between categories
- **Template list** showing all available templates
- **Click to select** → **Place Mode** → Click map to place
- **Visual feedback** for selected template
- **Category switching** without closing the panel

### Supported Object Types

#### 💡 Lights
- Torch, Lantern, Campfire, Magic Crystal, etc.
- Shows radius info
- Uses special light placement system

#### 👻 Spirits
- Sylphie, Forest Sprite, Dusk Shadow, etc.
- Shows level info
- Places as Actor objects

#### 🎨 Doodads (formerly Static Objects)
- Trees, Rocks, Bushes, Flowers, etc.
- Shows scale info
- Places as decorative objects

#### 🧙 NPCs
- Merchant, Sage, Guard, etc.
- Shows NPC type
- Places as interactive actors

#### 📦 Chests
- Wooden, Iron, Golden, etc.
- Shows chest type
- Places as loot containers

#### 🚪 Portals
- Door, Teleport, Stairs, etc.
- Shows portal type
- Places as map transitions

## 🔄 Complete Workflow

### 1. Create Templates (Data Menu)

**Example: Creating a new Light**
1. Press **F2** to enter editor
2. Click **Data → 💡 Lights**
3. Click **New** button
4. Configure: Name, Radius, Color, Flicker
5. Click **Save**

**Example: Creating a new Spirit**
1. Click **Data → 👻 Spirits**
2. Click **New Spirit** button
3. Configure sprite, stats, behavior
4. Click **Save**

### 2. Place Objects (Tools Menu)

**Using Placement Panel:**
1. Click **Tools → 📍 Place Objects** (or press **P**)
2. Select object type from dropdown
3. Click a template from the list
4. Click **Place Mode** button
5. Click on map to place
6. Press **ESC** to cancel placement

**Quick placement:**
- Press **P** to open placement panel
- Select template
- Click **Place Mode**
- Click map
- Done!

### 3. Manage Items

**Creating items (even with empty list):**
1. Click **Data → 🎒 Items**
2. Item Browser opens (works even if no items exist!)
3. Click **➕ New Item**
4. Configure item properties
5. Save item

### 4. Manage Maps

**Viewing all maps:**
1. Click **Data → 🗺️ Maps**
2. Map Browser shows all maps
3. Current map is highlighted
4. Actions per map:
   - **🚀 Go** - Teleport to that map
   - **🖊️ Edit** - Edit map properties (loads map if not current)
   - **🗑️** - Delete map (can't delete current map)
5. Click **➕ New Map** to create new maps

**Editing current map:**
1. Open Map Browser
2. Find current map (highlighted in blue)
3. Click **🖊️ Edit**
4. Modify properties

### 5. Edit Placed Objects

1. Press **V** for Select Tool
2. Click an object on the map
3. Properties panel opens
4. Edit properties
5. Changes apply immediately

### 6. Delete Objects

1. Select object (click it)
2. Press **D** or **Delete** key
3. Object removed

## ⌨️ Keyboard Shortcuts

### Tools
- **V** - Select Tool
- **P** - Open Placement Panel
- **B** - Paint Tool

### Editor
- **F2** - Toggle Editor Mode
- **ESC** - Cancel placement/deselect
- **Ctrl+S** - Save map data
- **Ctrl+Z** - Undo
- **Ctrl+Y** - Redo
- **D/Delete** - Delete selected object

### View
- **G** - Toggle Grid
- **C** - Toggle Collision Boxes
- **L** - Toggle Layers Panel
- **+/-** - Zoom in/out
- **0** - Reset Zoom

## 📦 Object Categories Explained

### 🎨 Doodads (New Name!)
**Formerly:** "Static Objects"  
**Purpose:** Decorative, non-interactive scenery  
**Examples:** Trees, rocks, bushes, flowers, signs  
**Registry:** `game.staticObjectRegistry` (internal)  
**Templates:** Managed through Template Editor

**Why "Doodads"?**
- Clearer, more intuitive name
- Common game dev term for decorative objects
- Distinct from interactive objects

### 📦 Chests vs 🚪 Portals
**Before:** Combined as "Interactive Objects"  
**Now:** Separate categories for better organization

**Chests:**
- Loot containers
- Gold and item drops
- Different types: Wooden, Iron, Golden
- Opening animations

**Portals:**
- Map transitions
- Doors, teleports, stairs
- Target map and spawn point
- Connection between areas

## 🎯 Benefits of New System

### ✅ Consistency
- **Same workflow** for all object types
- **Predictable locations** - Data for templates, Tools for placement
- **Unified interface** - Learn once, use everywhere

### ✅ Efficiency
- **Faster placement** - One panel for everything
- **Quick switching** - Change types without closing
- **Less clicking** - Fewer nested menus

### ✅ Scalability
- **Easy to extend** - Add new object types easily
- **Clear structure** - New developers understand quickly
- **Maintainable** - Consistent patterns throughout

### ✅ Better UX
- **Intuitive** - Logical separation of concerns
- **Discoverable** - All options visible
- **Flexible** - Switch between tasks smoothly

## 🔧 Technical Details

### New Components

**ObjectPlacementPanel.js**
- Unified placement interface
- Handles all object type selection
- Manages placement mode activation
- Creates appropriate prefab data per type

**Updated Components:**
- `EditorUI.js` - Restructured menus
- `EditorManager.js` - Integrated placement panel
- `main.js` - Added script loading

### Placement Flow

1. User selects object type in dropdown
2. Panel queries appropriate registry for templates
3. User selects template from list
4. Clicks "Place Mode" button
5. EditorManager switches to place tool
6. Prefab data created based on type
7. User clicks map
8. Object instantiated at click position
9. Placement mode auto-deactivates

### Registry System

Each object type uses a registry:
- `LightRegistry` - Light templates
- `SpiritRegistry` - Spirit templates  
- `StaticObjectRegistry` - Doodad templates
- (Future: `NPCRegistry`, `ChestRegistry`, `PortalRegistry`)

## 🚀 Future Enhancements

### Coming Soon
- [ ] Full NPC template system with registry
- [ ] Full Chest template system with registry
- [ ] Full Portal template system with registry
- [ ] Template duplication in browsers
- [ ] Drag-and-drop in placement panel
- [ ] Recently used templates quick access
- [ ] Template categories/tags
- [ ] Import/export templates

### Planned Features
- [ ] Multi-select placement (place multiple at once)
- [ ] Placement patterns (grid, circle, line)
- [ ] Template preview in placement panel
- [ ] Copy template properties from placed objects
- [ ] Batch operations (replace all, update all)

## 💡 Pro Tips

1. **Use keyboard shortcuts** - P for placement, V for select, B for paint
2. **Keep placement panel open** - Switch types without closing
3. **Create templates first** - Build your library before placing
4. **Organize by naming** - Use prefixes (Tree_Oak, Tree_Pine, etc.)
5. **Test placement** - Place one, check scale, adjust template if needed
6. **Save often** - Ctrl+S to export map data regularly

## 🐛 Known Issues

- NPC/Chest/Portal browsers show placeholder alerts (full implementation coming)
- Template preview images not yet shown in placement panel
- No template search/filter yet (coming soon)

## 📚 Related Docs

- `LIGHT_SYSTEM_COMPLETE.md` - Light system details
- `SPIRIT_TEMPLATE_SYSTEM.md` - Spirit templates
- `TEMPLATE_SYSTEM_GUIDE.md` - Doodad templates
- `EDITOR_GUIDE.md` - General editor usage

---

**Status:** ✅ **CORE SYSTEM COMPLETE**

The unified object management system is now live! Start creating and placing objects with the new streamlined workflow.

**Next Steps:**
1. Press F2 to enter editor
2. Press P to open placement panel
3. Start placing objects!

Enjoy the improved workflow! 🎉
