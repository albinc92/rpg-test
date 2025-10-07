# Spawn System & Spirit Scale Fixes

## Issues Fixed

### 1. Spawn System Bugs
**Problem**: Spirits not spawning correctly - only 2-3 spawned instead of the configured 10 max, and they weren't spawning within spawn zones.

**Root Causes**:
- **Coordinate conversion bug**: `buildSpawnZoneCache()` was incorrectly converting canvas coordinates to world coordinates by dividing by resolution scale, when the spawn layer canvas already matches world coordinates
- **Collision detection bug**: `hasCollisionAt()` wasn't accounting for map scale and resolution scale when comparing positions with existing objects
- **Slow spawn rate**: Only spawning 2 spirits per check interval was too conservative
- **Position conversion bug**: Spawn positions needed to be converted from scaled canvas coordinates back to unscaled world coordinates for spirit creation

**Fixes Applied**:
- ✅ Fixed `buildSpawnZoneCache()` to use canvas coordinates directly (they already match scaled world coordinates)
- ✅ Fixed `hasCollisionAt()` to properly scale object positions for comparison
- ✅ Increased spawn rate from 2 to 5 spirits per check interval
- ✅ Fixed `spawnSpirit()` to convert scaled spawn positions back to unscaled coordinates
- ✅ Increased spawn position variety (±32 pixels instead of ±8)
- ✅ Increased max attempts from 20 to 30 for finding valid positions
- ✅ Added better logging to debug spawn issues
- ✅ Fixed cache invalidation - now only invalidates when spawn zones are edited, not on every map change

### 2. Spirit Property Inconsistency
**Problem**: Spirits used `spriteWidth`/`spriteHeight` properties while all other game objects (StaticObjects, NPCs, etc.) use `scale`. This was confusing and inconsistent.

**Why This Matters**:
- **Consistency**: All GameObjects should use the same sizing approach
- **Simplicity**: `scale` is more intuitive than specifying pixel dimensions
- **Auto-detection**: GameObject already auto-detects sprite dimensions when the image loads
- **Editor UX**: Scale is easier to work with than width/height

**Fixes Applied**:
- ✅ Updated `Spirit` class to not require `spriteWidth`/`spriteHeight` - GameObject auto-detects these
- ✅ Updated `SpiritRegistry` to pass `scale` instead of dimensions
- ✅ Updated `spirits.json` to use `scale` property (0.8 for all spirits)
- ✅ Simplified `collisionPercent` from object to single number (0.3)
- ✅ Updated Spirit Editor UI to show "Scale" field instead of "Sprite Width/Height"
- ✅ Added "Collision %" field to editor for easier collision tuning

## Changes Summary

### Modified Files

**src/systems/SpawnManager.js**:
- Fixed coordinate conversion in `buildSpawnZoneCache()`
- Fixed collision detection in `hasCollisionAt()`
- Fixed position conversion in `spawnSpirit()`
- Increased spawn rate and variety
- Improved logging
- Better cache management

**src/entities/Spirit.js**:
- Removed `spriteWidth`/`spriteHeight` from constructor (auto-detected now)
- Updated logging to reflect auto-detection

**src/systems/SpiritRegistry.js**:
- Changed to pass `scale` instead of `spriteWidth`/`spriteHeight`
- Updated logging

**data/spirits.json**:
- Changed all spirits from `spriteWidth: 32, spriteHeight: 32` to `scale: 0.8`
- Simplified `collisionPercent` from object to number (0.3)

**src/editor/EditorUI.js**:
- Replaced "Sprite Width" and "Sprite Height" fields with single "Scale" field
- Added "Collision %" field
- Updated default new spirit template

### 3. Spirit Roaming Behavior Issues
**Problem**: Spirits barely moved and when they did, they moved in slow motion.

**Root Causes**:
- **Tiny movement forces**: Using 0.2-0.3 instead of proper movementSpeed (1.0+)
- **Very low movement chance**: Only 1% chance per frame (~0.6 times per second)
- **No movementSpeed property**: Spirit wasn't setting movementSpeed from template
- **Random impulse system**: Applying tiny random forces doesn't create smooth movement

**Fixes Applied**:
- ✅ Set `movementSpeed` property in Spirit constructor based on template's `moveSpeed`
- ✅ Changed from random impulse to timer-based continuous movement system
- ✅ Spirits now move in one direction for 1-3 seconds before changing
- ✅ Added occasional pauses (20% chance) for more natural behavior
- ✅ Increased return force when spirits wander too far from spawn point
- ✅ Smoother, more fluid ethereal floating movement

**New Roaming System**:
- Spirits pick a random direction and move for 1-3 seconds
- When timer expires, pick new random direction
- 20% chance to pause for 0.5-1.5 seconds
- If too far from spawn point, return directly home
- More continuous and ethereal-feeling movement

## Testing

To verify the fixes:

1. **Spawn System**:
   - Load map 0-0
   - Open console (F12)
   - Look for spawn manager logs showing successful spawns
   - Should see 10 spirits spawn within spawn zones
   - Spirits should appear in painted blue spawn zones

2. **Spirit Scale**:
   - Open Spirit Editor (in Map Editor)
   - Create new spirit - should see "Scale" field instead of width/height
   - Edit existing spirit - scale should be 0.8
   - Spawn a spirit - should render at correct size

3. **Spirit Roaming**:
   - Watch spawned spirits move around
   - Should see smooth, continuous floating movement
   - Spirits should move at visible speed (not slow motion)
   - Should see occasional direction changes and pauses
   - Spirits should stay within their spawn area

### 4. Real-Time Template Updates
**New Feature**: When you edit a spirit template in the Spirit Editor, all existing spirits using that template automatically update in real-time!

**Implementation**:
- ✅ Added `SpiritRegistry.updateTemplate()` to propagate changes
- ✅ Added `Spirit.updateFromTemplate()` to receive updates
- ✅ Hooked up Spirit Editor save button to trigger updates
- ✅ Visual feedback: spirits flash when updated
- ✅ Stats scale proportionally (e.g., HP maintains percentage)
- ✅ Works for all properties: scale, stats, movement, sprite, etc.

**How to Use**:
1. Spawn some spirits on the map
2. Open Spirit Editor and edit a template
3. Click "Save Template"
4. Watch all spirits of that type update immediately!
5. No need to respawn or reload

**What Updates**:
- Visual: name, description, scale, sprite
- Collision: shape, size percentage
- Stats: HP, attack, defense, speed (HP scales proportionally)
- Movement: moveSpeed, movePattern

See `SPIRIT_REALTIME_UPDATE.md` for full documentation.

## Notes

- All existing spirit data has been migrated to use `scale`
- GameObject's auto-detection will handle sprite dimensions
- This makes the spirit system consistent with StaticObjects and NPCs
- Scale of 0.8 approximately equals the previous 32x32 pixel size for most sprites
- Spirit movement speed is based on template's `moveSpeed` property (default 1.5)
- Template changes propagate instantly to all existing spirits (no respawn needed!)
