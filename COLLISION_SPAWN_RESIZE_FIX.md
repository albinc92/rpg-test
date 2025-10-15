# Collision and Spawn Zone Resize Fix

## Problem
Painted collision and spawn zones would move around relative to the map when resizing the game window (e.g., opening dev tools), while painted textures and game objects remained in their correct positions.

## Root Cause
The collision and spawn zone canvases were created with dimensions based on `resolutionScale` at creation time:
```javascript
const scaledWidth = mapData.width * mapScale * resolutionScale;
```

When the window was resized, `resolutionScale` would change (recalculated in GameEngine), but the existing collision/spawn canvases would NOT be resized. This caused a mismatch:
- **Painting coordinates**: Calculated using the NEW `resolutionScale`
- **Canvas size**: Still using the OLD `resolutionScale`

This resulted in painted zones appearing to "drift" when the window was resized.

## Solution
Added a `handleResize()` method to EditorManager that:

1. **Detects dimension changes**: Calculates new canvas size based on current `resolutionScale`
2. **Rescales canvases**: Creates new canvases at the correct size and scales old content to fit
3. **Preserves data**: Uses `ctx.drawImage()` with scaling to maintain painted areas
4. **Invalidates caches**: Clears WebGL texture cache and spawn zone cache for consistency

## Implementation

### EditorManager.js
Added `handleResize()` method that rescales collision and spawn layer canvases when resolution changes.

### GameEngine.js
Added calls to `editorManager.handleResize()` in both mobile and desktop resize handlers.

## Result
Collision and spawn zones now maintain their correct positions relative to the map when the window is resized, matching the behavior of painted textures and game objects.

## Technical Details
- Texture painting was unaffected because it uses the LayerManager system which may have had better resize handling
- Game objects were unaffected because they store positions in unscaled coordinates and scale them during rendering
- Collision/spawn zones used world coordinates directly on fixed-size canvases, causing the issue
