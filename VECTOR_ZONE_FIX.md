# Vector Zone Persistence Fix

## Issue
Vector zones created in the editor were disappearing upon closing the editor (F2), not showing in Debug Mode (F1), and failing to trigger collision or spawning.

## Root Cause
In `EditorManager.js`, the `activate()` method initialized the local `this.zones` variable like this:
```javascript
this.zones = mapData.zones || [];
```
If `mapData.zones` was undefined, `this.zones` became a **new local array**. Any zones added were pushed to this local array, which was disconnected from the actual `mapData`. When the editor closed, this local array was lost.

## Fixes Applied

### 1. EditorManager.js - Persistence
Updated `activate()` to ensure `mapData.zones` is initialized on the map object itself:
```javascript
// Load zones for current map
const mapData = this.game.mapManager.maps[this.game.currentMapId];
if (!mapData.zones) {
    mapData.zones = [];
}
this.zones = mapData.zones;
```
Now, `this.zones` references the persistent data structure.

### 2. EditorManager.js - Spawn Cache Invalidation
Updated `handleZoneClick` (creation) and `deleteZone` (deletion) to notify the `SpawnManager` when zones change:
```javascript
if (zone.type === 'spawn' && this.game.spawnManager) {
    this.game.spawnManager.invalidateSpawnZoneCache();
}
```
This ensures that newly created spawn zones are immediately recognized by the spawning system without requiring a reload.

## Verification
- **Persistence**: Zones remain in memory after toggling F2.
- **Debug View**: F1 now renders the zones because `RenderSystem` reads the populated `mapData.zones`.
- **Collision**: `CollisionSystem` now sees the zones in `mapData.zones`.
- **Spawning**: `SpawnManager` rebuilds its cache when zones are edited.
