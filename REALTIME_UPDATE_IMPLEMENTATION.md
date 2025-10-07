# Real-Time Spirit Template Updates - Implementation Summary

## Overview

Implemented a complete real-time update system that propagates spirit template changes to all existing spirit instances on all maps. When you edit a spirit template in the Spirit Editor, all spawned spirits using that template immediately update without needing to respawn.

## Files Modified

### 1. `src/systems/SpiritRegistry.js`
**New Methods**:
- `updateTemplate(spiritId, templateData)` - Updates template and propagates to all spirits
- `exportTemplates()` - Exports all templates as JSON string

**Functionality**:
- Updates template in registry's Map
- Iterates through all map objects to find matching spirits
- Calls `updateFromTemplate()` on each matching spirit
- Returns count of updated spirits
- Logs propagation results

### 2. `src/entities/Spirit.js`
**New Method**:
- `updateFromTemplate(template)` - Receives and applies template updates

**Updates Applied**:
- Visual properties (name, description, scale, sprite)
- Collision settings (shape, percent)
- Stats (HP, attack, defense, speed) with proportional HP scaling
- Movement (moveSpeed, maxSpeed, movementSpeed, movePattern)
- Triggers visual effect (spawn flash) when updated

**HP Scaling Logic**:
```javascript
const oldMaxHp = this.stats.hp;
const hpRatio = this.currentHp / oldMaxHp;
this.currentHp = Math.max(1, Math.floor(template.stats.hp * hpRatio));
```
This maintains the HP percentage when max HP changes.

### 3. `src/editor/EditorUI.js`
**Modified Method**:
- `saveSpiritTemplate()` - Now calls `updateTemplate()` and shows update count

**New Method**:
- `countSpiritInstances(spiritId)` - Counts active spirits using a template

**UI Enhancements**:
- Shows instance count badge in spirit editor modal
- Badge color: blue if spirits exist, gray if none
- Tooltip shows full count message
- Success notification includes update count

## User Experience Flow

### Before (Old System)
1. Edit spirit template in editor
2. Save changes
3. Template updated in memory
4. Need to respawn spirits to see changes
5. Or reload entire game

### After (New System)
1. Edit spirit template in editor
2. See how many spirits are using this template (badge)
3. Click "Save Template"
4. All existing spirits flash and update instantly
5. See notification: "Template updated! Changes applied to X existing spirit(s)"
6. Immediate visual feedback - no respawn needed!

## Testing Instructions

### Test Real-Time Updates

1. **Setup**:
   ```
   - Load map 0-0
   - Wait for 10 spirits to spawn
   - Note their current size and movement
   ```

2. **Edit Template**:
   ```
   - Press F2 (open editor)
   - Click "Spirit Templates"
   - Select "forest_sprite" (or any spawned spirit)
   - Note the badge shows "10 active"
   ```

3. **Change Scale**:
   ```
   - Change scale from 0.01 to 1.5
   - Click "Save Template"
   - Watch all forest sprites immediately grow!
   - They flash briefly to show update
   ```

4. **Change Movement**:
   ```
   - Change moveSpeed from 1.5 to 5.0
   - Click "Save Template"
   - Watch all spirits immediately move faster!
   ```

5. **Change Stats**:
   ```
   - Change HP from 50 to 200
   - Change attack from 12 to 50
   - Click "Save Template"
   - Spirits update (maintain HP percentage)
   - Console shows: "HP: 75/200" (if was 25/50 before)
   ```

6. **Change Sprite**:
   ```
   - Change spriteSrc to different image
   - Click "Save Template"
   - Sprites reload with new image
   - Flash effect while loading
   ```

## Visual Feedback

### Update Flash Effect
When a spirit receives a template update:
- Spawn effect activates for 1 second
- Expanding blue circle animation
- Clearly shows which spirits were updated
- Multiple updates = multiple flashes

### Instance Count Badge
- Shows in spirit editor title bar
- Format: "X active"
- Blue background if spirits exist
- Gray background if no spirits
- Hover tooltip for details

### Console Logging
```
[SpiritRegistry] 📝 Updated template: forest_sprite
[Spirit] 🔄 Updating Sylphie (spirit_123...) from template
[Spirit] ✅ Updated Sylphie - scale: 1.5, moveSpeed: 5, stats: {...}, HP: 75/200
[SpiritRegistry] ✅ Propagated template changes to 10 existing spirit(s)
```

## Technical Details

### Performance
- O(n) where n = total spirits across all maps
- Typical: ~10-50 spirits, negligible impact
- Updates happen synchronously
- No lag or frame drops

### Safety
- Deep copies stats object to prevent reference issues
- Validates template data before applying
- Maintains HP ratio when max HP changes
- Falls back to defaults if values missing

### Extensibility
Easy to add more updatable properties:
```javascript
// In Spirit.updateFromTemplate():
this.newProperty = template.newProperty || defaultValue;
```

## Limitations & Notes

### Current Limitations
1. **File save still manual**: Must copy JSON from console to spirits.json
2. **No undo**: Template changes are immediate and irreversible
3. **Position unchanged**: Spirits stay in same location after update
4. **No update history**: Can't see what changed

### Future Enhancements
Potential improvements:
- Auto-save to file (needs server endpoint)
- Undo/redo stack for template edits
- Show diff of changes in UI
- Batch update multiple templates
- Update animation/transition effects
- "Reload all spirits" button
- Template version history

## Benefits

✅ **Instant Feedback** - See changes immediately, no respawn/reload
✅ **Faster Iteration** - Test balance changes in seconds, not minutes
✅ **Live Balancing** - Adjust stats while game is running
✅ **Visual Testing** - Try different scales/sprites instantly
✅ **Consistent State** - All spirits always match their template
✅ **Editor Integration** - Seamless workflow with Spirit Editor
✅ **Developer UX** - Clear feedback with counts and notifications

## Related Documentation

- See `SPIRIT_REALTIME_UPDATE.md` for detailed usage guide
- See `SPAWN_AND_SPIRIT_FIXES.md` for other spirit system improvements
- See `SPIRIT_EDITOR_GUIDE.md` for Spirit Editor documentation
