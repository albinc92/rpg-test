# Map Editor Guide

## 🎮 Getting Started

The map editor is built directly into the game! Press **F2** or **Ctrl+E** to toggle it on/off.

## ⌨️ Keyboard Shortcuts

### Editor Control
- **F2** or **Ctrl+E** - Toggle editor on/off
- **Ctrl+S** - Save map data to console
- **Ctrl+Z** - Undo last action
- **Ctrl+Y** - Redo last undone action

### Tools
- **V** - Select tool (click objects to select/edit)
- **B** - Place tool (place selected object from palette)
- **D** - Delete tool (click objects to delete)
- **M** - Move tool (drag objects around)

### Navigation
- **G** - Toggle grid visibility
- **Hold Shift** - Snap to grid while placing/moving

### Object Operations
- **Delete** - Delete selected object
- **Ctrl+C** - Copy selected object
- **Ctrl+V** - Paste copied object at mouse position

## 🎨 UI Components

### Top Toolbar
- Tool buttons (Select, Place, Delete, Move)
- Save, Undo, Redo buttons
- Grid toggle
- Close editor button

### Left Panel: Object Palette
Choose what to place:
- **🌳 Static Objects** - Trees, bushes, rocks
- **🚶 Actors** - NPCs, spirits, merchants
- **📦 Interactive** - Chests, portals, signs

Click an object type, then use Place tool (B) to place it

### Right Panel: Properties
When an object is selected:
- Edit position (X, Y)
- Change scale/size
- Modify object-specific properties
- Adjust collision boxes
- Delete object button

## 📝 Workflow Example

### Adding a Tree
1. Press **F2** to open editor
2. Click **🌳 Static Objects** tab in left panel
3. Click **🌳 Tree** in the object list
4. Tool automatically switches to Place (or press **B**)
5. Click on map to place tree
6. Click **Select tool (V)** to select the tree
7. Edit properties in right panel (position, scale, etc.)
8. Press **Ctrl+S** to save

### Adding an NPC
1. Open editor (**F2**)
2. Click **🚶 Actors** tab
3. Click **🧙 NPC**
4. Place on map with Place tool
5. Select the NPC
6. Edit properties:
   - Change Name
   - Set Dialogue text
   - Adjust position/scale
7. Save (**Ctrl+S**)

### Copying Objects
1. Select an object (Select tool + click)
2. Press **Ctrl+C** to copy
3. Move mouse to new location
4. Press **Ctrl+V** to paste
5. Repeat Ctrl+V to paste multiple copies

## 💾 Saving Your Work

1. Press **Ctrl+S** in editor
2. Open browser console (**F12**)
3. Find the JSON output
4. Copy the JSON array
5. Paste into `data/objects.json` for your map ID

**Example Console Output:**
```
[EditorManager] Map data: 
[
  {
    "category": "StaticObject",
    "spriteSrc": "assets/objects/trees/tree-01.png",
    "x": 200,
    "y": 150,
    ...
  }
]
```

Copy this array and replace the contents of `data/objects.json` for the map you edited (e.g., `"0-0": [...]`)

## 🔧 Property Editing

### Common Properties (All Objects)
- **X, Y** - Position on map
- **Scale** - Size multiplier (1.0 = normal size)

### Static Objects
- **spriteSrc** - Path to sprite image
- **castsShadow** - Whether object casts shadow
- **Collision %** - Adjust collision box (negative values shrink)

### NPCs (Actors)
- **Name** - Display name
- **Dialogue** - What NPC says when interacted with
- **npcType** - NPC role (sage, merchant, guard, etc.)

### Chests (Interactive)
- **Gold** - Amount of gold inside
- **chestType** - Visual variant (wooden, silver, golden)
- **loot** - Items inside (edit in JSON for now)

### Portals (Interactive)
- **targetMap** - Map ID to travel to
- **spawnPoint** - Where player spawns on target map
- **portalType** - Visual type (door, magic, cave)

## 🎯 Tips & Tricks

### Grid Alignment
- Press **G** to toggle grid visibility
- Hold **Shift** while placing to snap to grid
- Grid size is 32 pixels by default

### Quick Placement
1. Select object from palette
2. Click rapidly to place multiple instances
3. Press **V** to stop placing and select instead

### Collision Adjustment
- Use collision percentages to fine-tune hit boxes
- Negative values shrink collision
- Useful for tree trunks, bush tops, etc.

### Organizing Objects
- Place larger objects (trees) first
- Add medium objects (bushes) second
- Add small details (rocks) last
- Use layers mentally: background → midground → foreground

## 🐛 Troubleshooting

### Editor won't open
- Check console for errors (F12)
- Make sure game loaded successfully
- Try refreshing page

### Objects not appearing
- Check if object is outside visible map area
- Verify sprite path is correct
- Check scale isn't set too small (< 0.1)

### Can't select object
- Make sure Select tool (V) is active
- Click near center of object
- Try zooming in if object is small

### Save doesn't work
- Ctrl+S only logs to console (for now)
- Must manually copy JSON to data file
- Refresh page after editing JSON to see changes

## 🚀 Future Features (Coming Soon)

- Direct save to file (no copy/paste needed)
- Map creation wizard
- Item editor
- Chest loot editor
- Layer system
- Multi-select
- Drag-to-move
- Visual sprite browser
- Prefab system (save common object configs)
- Live preview while editing

## 📚 Object Categories Reference

### StaticObject
- Trees, bushes, rocks, decorations
- No AI, no movement
- Can block movement (collision)
- Can have animations (future)

### Actor
- NPCs, spirits, merchants
- Can move (roaming behavior)
- Can have dialogue
- Can have AI patterns

### InteractiveObject
- Chests, portals, signs, switches
- Player can interact (E key)
- Trigger events (portals, loot, etc.)

---

**Happy Editing! 🎨**

Press F2 and start building your world!
