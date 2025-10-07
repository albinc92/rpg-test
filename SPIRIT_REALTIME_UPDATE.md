# Spirit Template Real-Time Update System

## Feature Overview

When you edit a spirit template in the Spirit Editor, all existing spirits using that template will automatically update in real-time with the new values.

## How It Works

### 1. Template Update Flow

```
Spirit Editor UI (Save) 
    ↓
SpiritRegistry.updateTemplate()
    ↓
Updates template in memory
    ↓
Finds all existing spirits with matching spiritId
    ↓
Calls spirit.updateFromTemplate() on each
    ↓
Spirits immediately reflect changes
```

### 2. What Gets Updated

When you save a template, the following properties update on all existing spirits:

**Visual Properties**:
- `name` - Spirit name
- `description` - Spirit description
- `scale` - Sprite scale (size)
- `spriteSrc` - Sprite image (reloads if changed)

**Collision**:
- `collisionShape` - 'circle' or 'rectangle'
- `collisionPercent` - Collision size percentage

**Stats**:
- `hp` - Max health points
- `attack` - Attack power
- `defense` - Defense power
- `speed` - Speed stat
- Current HP adjusts proportionally if max HP changes

**Movement**:
- `moveSpeed` - Movement speed
- `maxSpeed` - Physics max speed (derived from moveSpeed)
- `movementSpeed` - AI movement input (derived from moveSpeed)
- `movePattern` - 'wander' or 'static'

### 3. Implementation Details

**SpiritRegistry.updateTemplate(spiritId, templateData)**:
```javascript
// Updates template in registry
this.templates.set(spiritId, templateData);

// Finds all spirits using this template
for (const mapId in allMaps) {
    mapObjects.forEach(obj => {
        if (obj instanceof Spirit && obj.spiritId === spiritId) {
            obj.updateFromTemplate(templateData);
        }
    });
}
```

**Spirit.updateFromTemplate(template)**:
```javascript
// Updates all properties from template
this.scale = template.scale;
this.stats = { ...template.stats };
this.movementSpeed = template.moveSpeed * 0.8;
// etc...
```

## Usage

### Testing Real-Time Updates

1. **Spawn some spirits**:
   - Load a map with spirit spawning enabled (e.g., map 0-0)
   - Wait for spirits to spawn (should see 10 spirits)

2. **Open Spirit Editor**:
   - Press F2 to open Map Editor
   - Click "Spirit Templates" button
   - Select a spirit template to edit

3. **Make changes**:
   - Change scale (e.g., 0.01 to 1.5)
   - Change moveSpeed (e.g., 1.5 to 3.0)
   - Change stats (e.g., HP from 50 to 100)
   - Click "Save Template"

4. **Observe changes**:
   - All existing spirits of that type update immediately
   - You'll see:
     - Size changes (scale)
     - Speed changes (movement)
     - No respawn needed!
   - Console shows: "Propagated template changes to X existing spirit(s)"

### Example Use Cases

**1. Testing Spirit Sizes**:
```javascript
// Change scale from 0.8 to 1.5
// All spirits immediately grow larger
// No need to respawn or reload
```

**2. Balancing Movement Speed**:
```javascript
// Change moveSpeed from 1.5 to 3.0
// All spirits immediately move faster
// Test in real-time without respawning
```

**3. Adjusting Combat Stats**:
```javascript
// Change HP from 50 to 100
// Existing spirits' HP scales proportionally
// E.g., spirit at 25/50 HP becomes 50/100 HP
```

**4. Swapping Sprites**:
```javascript
// Change spriteSrc to different image
// All spirits reload and display new sprite
// Useful for testing different visuals
```

## Benefits

✅ **Instant Feedback**: See changes immediately without respawning
✅ **Faster Iteration**: Test balance changes in seconds
✅ **Consistent Data**: All spirits always match their template
✅ **Editor Integration**: Works seamlessly with Spirit Editor UI
✅ **Preserves State**: Spirits keep their position and current HP ratio

## Technical Notes

### HP Scaling
When max HP changes, current HP scales proportionally:
```javascript
const hpRatio = currentHp / oldMaxHp;
newCurrentHp = Math.floor(newMaxHp * hpRatio);
```

Example: Spirit at 25/50 HP (50% health)
- Template HP changes to 100
- Spirit becomes 50/100 HP (maintains 50% health)

### Sprite Reloading
If sprite source changes:
```javascript
if (template.spriteSrc !== this.spriteSrc) {
    this.loadSprite(template.spriteSrc);
}
```
- Old sprite discarded
- New sprite loads asynchronously
- Placeholder shown while loading

### Movement Speed Derivation
```javascript
const moveSpeed = template.moveSpeed || 1.5;
this.maxSpeed = moveSpeed * 50;        // Physics limit
this.movementSpeed = moveSpeed * 0.8;  // AI input
```

## Limitations

⚠️ **File Save Still Manual**: You still need to manually copy the JSON from console to `spirits.json` to persist changes across sessions

⚠️ **Position Not Affected**: Spirits don't move when updated (only their properties change)

⚠️ **No Undo**: Template changes are immediate - no undo button (yet)

## Future Enhancements

Potential improvements:
- Auto-save to file (needs server endpoint)
- Visual feedback effect when spirits update
- Undo/redo for template edits
- Batch update multiple templates
- Update animation/transition
