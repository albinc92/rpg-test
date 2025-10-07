# Spirit Collision & Spawn Zone Boundary Fixes

## Issues Fixed

### 1. Collision Boxes Not Showing for Spirits
**Problem**: Spirit collision boxes weren't visible when debug mode (F1) was enabled, even though other objects showed collision boxes.

**Root Cause**: Spirits inherit `hasCollision: true` from GameObject by default, but the property wasn't explicitly passed through the template system.

**Fix**:
- ✅ Added `hasCollision` property to spirit templates
- ✅ Pass `hasCollision` through SpiritRegistry when creating spirits
- ✅ Update `hasCollision` in `updateFromTemplate()`
- ✅ Added "Has Collision" checkbox in Spirit Editor UI
- ✅ Collision boxes now show properly in debug mode

### 2. No Collision Toggle Option
**Problem**: Couldn't disable collision for spirits, NPCs, or other objects in the editor.

**Fix**:
- ✅ Added "Has Collision" checkbox to Spirit Editor
- ✅ Property defaults to `true` (backward compatible)
- ✅ Can now create ethereal spirits with no collision
- ✅ Updates propagate in real-time to existing spirits

### 3. Spirits Roaming Outside Spawn Zones
**Problem**: Spirits would wander far beyond their painted spawn zones, sometimes leaving the visible map area.

**Root Cause**: 
- Roaming used fixed `roamingRadius` (200px) from spawn point
- No awareness of spawn zone boundaries
- Coordinate scale mismatch (unscaled vs scaled)

**Fix**:
- ✅ Calculate spawn zone boundaries from spawn zone cache
- ✅ Set boundaries on each spirit when spawned
- ✅ Check boundaries in scaled coordinates during roaming
- ✅ Force return when spirit exits spawn zone
- ✅ 50px padding to prevent edge hugging

## Implementation Details

### Spawn Zone Boundary Calculation

```javascript
// In SpawnManager
calculateSpawnZoneBounds() {
    // Find min/max X and Y of all spawn points
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    spawnZoneCache.forEach(point => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
    });
    
    // Add 50px padding
    return { minX: minX - 50, maxX: maxX + 50,
             minY: minY - 50, maxY: maxY + 50 };
}
```

### Boundary Checking in Roaming

```javascript
// In Spirit.updateSpiritRoaming()
const scaledX = this.x * combinedScale;
const scaledY = this.y * combinedScale;

const outsideSpawnZone = 
    scaledX < bounds.minX || scaledX > bounds.maxX ||
    scaledY < bounds.minY || scaledY > bounds.maxY;

if (outsideSpawnZone) {
    // Move back towards center of spawn zone
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    // Apply stronger movement force...
}
```

### Collision Property Flow

```
Template (spirits.json)
    ↓
SpiritRegistry.createSpirit()
    ↓
Spirit constructor (receives hasCollision)
    ↓
GameObject (stores hasCollision)
    ↓
RenderSystem.renderDebugCollisionBoxes()
    ↓
Renders if hasCollision === true
```

## New Features

### 1. hasCollision Property
**Usage**:
```json
{
  "id": "ethereal_wisp",
  "hasCollision": false,  // <-- No collision
  "collisionShape": "circle",
  "collisionPercent": 0.3
}
```

**Behavior**:
- `hasCollision: true` (default) - Normal collision, shows debug box
- `hasCollision: false` - No collision, no debug box, passes through objects

### 2. Spawn Zone Boundaries
**Automatic**: Set when spirit spawns
```javascript
spirit.spawnZoneBounds = {
    minX: 100,
    maxX: 500,
    minY: 200,
    maxY: 600
};
```

**Behavior**:
- Spirit checks position every frame
- If outside bounds, moves back towards center
- Uses stronger movement force (1.5x) when returning
- Prevents spirits from escaping spawn zones

### 3. Spirit Editor Collision Settings

New section in Spirit Editor:
```
💥 Collision Settings
[✓] Has Collision
Collision Shape: [circle ▼]  Collision %: [0.3    ]
```

**Controls**:
- Checkbox to enable/disable collision
- Shape dropdown (circle/rectangle)
- Collision percent slider

## Testing

### Test Collision Boxes
1. **Enable Debug Mode**:
   ```
   Press F1 to toggle debug info
   ```

2. **Verify Collision Boxes Show**:
   ```
   - Red circles/boxes appear around spirits
   - Matches collision shape from template
   - Size matches collisionPercent setting
   ```

3. **Test hasCollision Toggle**:
   ```
   - Edit spirit template
   - Uncheck "Has Collision"
   - Save template
   - Collision boxes disappear
   - Spirit can be walked through
   ```

### Test Spawn Zone Boundaries
1. **Paint Spawn Zones**:
   ```
   - Open Map Editor (F2)
   - Select Paint Tool
   - Set mode to "Spawn Zones"
   - Paint blue areas on map
   ```

2. **Spawn Spirits**:
   ```
   - Configure spawn table in maps.json
   - Load map
   - Watch spirits spawn in blue zones
   ```

3. **Observe Boundary Respect**:
   ```
   - Watch spirits roam
   - They stay within blue spawn zones
   - If they approach edge, they turn back
   - No spirits escape to unpainted areas
   ```

4. **Test With F1 Debug**:
   ```
   - Press F1 to show spawn zones
   - Blue overlay shows spawn zone boundaries
   - Spirits should stay within blue areas
   ```

## Visual Debug Output

### Collision Boxes (F1)
- **Red Circle/Rectangle**: Collision area
- **Size**: Based on sprite size × scale × collisionPercent
- **Only shows if**: `hasCollision === true`

### Spawn Zones (F1)
- **Blue Overlay**: Painted spawn zones
- **50% Alpha**: Semi-transparent
- **Boundary**: Where spirits can roam

### Console Logging
```
[SpawnManager] ✨ Spawned Sylphie at scaled(250, 300)
[Spirit] Spawn zone bounds: minX:200, maxX:500, minY:250, maxY:650
[Spirit] Outside spawn zone, returning to center
```

## Configuration Examples

### Ethereal Spirit (No Collision)
```json
{
  "id": "ghost",
  "name": "Ghost",
  "hasCollision": false,
  "scale": 0.8
}
```
Result: Players and NPCs can walk through

### Solid Spirit (With Collision)
```json
{
  "id": "guardian",
  "name": "Stone Guardian",
  "hasCollision": true,
  "collisionShape": "circle",
  "collisionPercent": 0.8,
  "scale": 1.5
}
```
Result: Blocks movement, large collision area

### Tiny Spirit (Small Collision)
```json
{
  "id": "pixie",
  "name": "Pixie",
  "hasCollision": true,
  "collisionShape": "circle",
  "collisionPercent": 0.2,
  "scale": 0.5
}
```
Result: Very small collision area

## Technical Notes

### Coordinate Scales
- **Spawn zones**: Stored in scaled coordinates (canvas pixels)
- **Spirit positions**: Stored in unscaled world coordinates
- **Boundary check**: Converts spirit position to scaled coordinates
- **Formula**: `scaledX = x * mapScale * resolutionScale`

### Boundary Padding
- **50 pixels**: Added to all edges
- **Purpose**: Prevents edge-hugging behavior
- **Visual**: Spirits turn back before hitting exact boundary
- **Configurable**: Change padding in `calculateSpawnZoneBounds()`

### Fallback Behavior
If no spawn zone bounds set:
- Uses `roamingRadius` (default 200px)
- Distance-from-origin check
- Backward compatible with old system

## Files Modified

1. **src/entities/Spirit.js**:
   - Added `spawnZoneBounds` property
   - Updated `updateSpiritRoaming()` for boundary checking
   - Added `hasCollision` to `updateFromTemplate()`

2. **src/systems/SpawnManager.js**:
   - Added `calculateSpawnZoneBounds()` method
   - Set bounds on spirits when spawning
   - Calculate from spawn zone cache

3. **src/systems/SpiritRegistry.js**:
   - Pass `hasCollision` when creating spirits
   - Include in template data

4. **src/editor/EditorUI.js**:
   - Added "Has Collision" checkbox
   - Added collision settings section header
   - Integrated with spirit editor form

## Benefits

✅ **Visible Debug Info**: Can see collision boxes for all spirits
✅ **Controlled Movement**: Spirits stay in designated spawn zones
✅ **Flexible Collision**: Can create ethereal or solid spirits
✅ **Real-Time Updates**: Collision changes propagate instantly
✅ **Better Testing**: F1 debug shows both collision and spawn zones
✅ **Map Design**: Paint zones knowing spirits will respect them
✅ **Performance**: Boundary check is O(1) per frame

## Future Enhancements

Potential improvements:
- Visualize spawn zone bounds in editor (bounding box)
- Per-spirit roaming radius override
- Multiple spawn zone support (OR logic)
- Soft boundaries (gradual slowdown vs hard return)
- Spawn zone exclusion areas (obstacles within zones)
