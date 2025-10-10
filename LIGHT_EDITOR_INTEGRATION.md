# Light Editor Integration

## Overview
Lights are now fully integrated into the map editor as first-class objects. You can select, drag, delete, and edit light properties just like any other game object.

## Features Implemented

### 1. Light Selection
- **Click lightbulb sprite** to select a light
- Selection works the same as other game objects
- Selected light shows in property panel
- Red selection marker appears around selected light

### 2. Light Dragging
- **Click and drag** lightbulb sprite to move light
- Uses same coordinate system as other objects
- Position updates in real-time
- Smooth dragging experience

### 3. Light Deletion
- **Press Delete key** to remove selected light
- Works with multi-select (Delete key deletes all selected objects)
- Undo/redo support for deleted lights

### 4. Light Property Editing
Property panel shows all editable light properties:
- **Template**: Light template name (read-only)
- **X, Y**: Position coordinates
- **Radius**: Light dispersion radius
- **Color**: RGBA color values
  - Red (0-255)
  - Green (0-255)
  - Blue (0-255)
  - Alpha (0-1)
- **Flicker**: Animation settings
  - Enabled (checkbox)
  - Speed (when enabled)
  - Intensity (0-1, when enabled)

## Technical Implementation

### Coordinate System (COMMON BEHAVIOR)
All operations use the unified coordinate system:

```javascript
// Storage: UNSCALED coordinates (what's saved to JSON)
light.x = 100;
light.y = 200;

// Rendering: WORLD coordinates (scaled for display)
worldX = light.x * mapScale * resolutionScale;
worldY = light.y * mapScale * resolutionScale;

// Selection: Check if mouse click hits light
isPointInLight(mouseWorldX, mouseWorldY, light) {
    const lightWorldX = light.x * totalScale;
    const lightWorldY = light.y * totalScale;
    const distance = Math.sqrt((mouseWorldX - lightWorldX)² + (mouseWorldY - lightWorldY)²);
    return distance <= threshold;
}
```

### Key Files Modified

#### 1. `src/systems/EditorManager.js`
- **handleSelectClick()**: Added light selection before object selection
- **deleteObject()**: Handles both lights and game objects
- Lights are treated as `selectedObject` for dragging

#### 2. `src/systems/LightManager.js`
- **isPointInLight()**: Fixed coordinate scaling for selection
- **findLightAtPosition()**: Returns light at world coordinates
- **removeLight()**: Delete light by ID
- **renderEditorPreviews()**: Fixed coordinate transformation

#### 3. `src/editor/PropertyPanel.js`
- **show()**: Detects if object is a light
- Added light-specific property editors
- Color and flicker properties with validation

### Selection Logic
```javascript
// 1. Check for light at click position
const selectedLight = this.game.lightManager.findLightAtPosition(worldX, worldY);
if (selectedLight) {
    this.selectObject(selectedLight);  // Treat as regular object
    // Setup drag offsets (unscaled space)
    this.dragOffsetX = unscaled.x - selectedLight.x;
    this.dragOffsetY = unscaled.y - selectedLight.y;
    return true;
}

// 2. Check for game objects
// ... existing code ...
```

### Deletion Logic
```javascript
deleteObject(obj) {
    // Detect if object is a light
    const isLight = obj.templateName && this.game.lightManager.lights.includes(obj);
    
    if (isLight) {
        this.game.lightManager.removeLight(obj.id);
    } else {
        this.game.objectManager.removeObject(this.game.currentMapId, obj.id);
    }
    
    // Deselect
    if (this.selectedObject === obj) {
        this.selectObject(null);
    }
}
```

## Usage

### Placing Lights
1. Open **Place Objects** panel
2. Select **Lights** category
3. Choose light template
4. Click on map to place

### Selecting Lights
1. Switch to **Select** tool
2. Click on lightbulb sprite
3. Light properties appear in property panel

### Moving Lights
1. Select light
2. Click and drag lightbulb sprite
3. Release to drop at new position

### Editing Light Properties
1. Select light
2. Property panel shows on right side
3. Edit values (radius, color, flicker, etc.)
4. Changes apply immediately

### Deleting Lights
1. Select light(s)
2. Press **Delete** key
3. Light removed from map

## Visual Indicators

### Lightbulb Sprite
- **Yellow/orange bulb icon** marks light position
- Appears only in editor mode
- Positioned at exact light center
- Shows light template name below

### Light Effect
- **Glowing circle** shows light radius
- Color matches light configuration
- Dispels darkness overlay (at night)
- Intensity affected by flicker settings

## Coordinate Consistency

All light operations use the **COMMON BEHAVIOR** coordinate system:
- ✅ Placement: `convertWorldToStorageCoordinates()`
- ✅ Selection: Scale storage → world for comparison
- ✅ Dragging: Convert world → storage when moving
- ✅ Rendering: Scale storage → world for display
- ✅ Preview: Scale storage → world for bulb sprite

This ensures lights behave identically to all other game objects.

## Future Enhancements
- [ ] Copy/paste lights
- [ ] Light preview in placement mode
- [ ] Batch edit multiple lights
- [ ] Light templates with presets
- [ ] Light occlusion/shadows
- [ ] Dynamic lights on moving objects
