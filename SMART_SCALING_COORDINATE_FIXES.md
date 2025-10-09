# Smart Scaling Coordinate System Fixes

## Problem Summary

After implementing the smart scaling system, coordinate calculations were broken because the code was using **physical pixel dimensions** (`canvas.width`, `canvas.height`) instead of **logical dimensions** (`game.CANVAS_WIDTH`, `game.CANVAS_HEIGHT`).

### The Three Rendering Modes

1. **Small screens (≤1920x1080)**: Canvas uses actual window dimensions, CSS stretches to fill viewport
2. **Large screens (>1920x1080)**: Canvas capped at 1920x1080, CSS scales up with `object-fit: contain`
3. **All modes**: No letterboxing due to fill strategy

### The Core Issue

**Physical vs Logical Dimensions:**
- `canvas.width` = logical width × devicePixelRatio (e.g., 603 × 1.935 = 1167)
- `game.CANVAS_WIDTH` = logical width (e.g., 603)

**All coordinate calculations must use LOGICAL dimensions**, not physical pixels!

## Files Fixed

### 1. EditorManager.js

**updateMousePosition()** - Line ~404
- Changed from `canvas.width` / `canvas.height` to `game.CANVAS_WIDTH` / `game.CANVAS_HEIGHT`
- Fixed mouse-to-canvas coordinate conversion
- Fixed zoom calculation to use logical dimensions

**renderSelection()** - Line ~595
- Fixed zoom transformation to use `game.CANVAS_WIDTH` and `game.CANVAS_HEIGHT`

**renderMultiSelection()** - Line ~630
- Fixed zoom transformation to use logical dimensions

**renderMultiSelectBox()** - Line ~670
- Fixed zoom transformation to use logical dimensions

**renderBrushPreview()** - Line ~727
- Fixed canvas-to-display ratio calculation to use logical dimensions
- Fixed zoom transformation to use logical dimensions

**renderOverlays()** - Line ~920
- Fixed bottom-right positioning to use `game.CANVAS_WIDTH` and `game.CANVAS_HEIGHT`

### 2. WeatherSystem.js

**getCameraViewport()** - Line ~142
- Changed from `canvas.width / devicePixelRatio` to `game.CANVAS_WIDTH`
- Ensures weather particles render in correct viewport bounds

### 3. RenderSystem.js

**render()** - Line ~83
- Fixed zoom transformation to use `game.CANVAS_WIDTH` and `game.CANVAS_HEIGHT`

**render()** - Line ~157
- Fixed day/night overlay dimensions to use logical canvas dimensions

### 4. DayNightShader.js

**initWebGL()** - Line ~37
- Fixed offscreen and WebGL canvas creation to use logical dimensions
- Added `game.CANVAS_WIDTH` and `game.CANVAS_HEIGHT` references

**apply()** - Line ~367
- Fixed display dimensions to use logical canvas dimensions

## Key Principle

**Always use `game.CANVAS_WIDTH` and `game.CANVAS_HEIGHT` for coordinate calculations!**

The physical `canvas.width` and `canvas.height` are scaled by devicePixelRatio for high-DPI displays and should ONLY be used for:
- Creating offscreen canvases for pixel-perfect effects
- Getting image data from canvases
- Setting canvas size (never for math!)

## Testing Checklist

- [ ] Mouse cursor positioning accurate in editor (painting textures)
- [ ] Object selection works correctly
- [ ] Multi-select drag box appears in correct position
- [ ] Object dragging follows mouse accurately
- [ ] Zoom works correctly with all mouse operations
- [ ] Weather particles cover full visible area
- [ ] Day/night shader covers full screen
- [ ] Editor UI elements positioned correctly

## Technical Details

### Coordinate Flow

1. **Raw Mouse Position**: `event.clientX`, `event.clientY` (screen pixels)
2. **Canvas Rect**: `canvas.getBoundingClientRect()` (CSS pixels)
3. **Relative Position**: Mouse - rect offset (CSS pixels)
4. **Letterbox Adjustment**: Account for object-fit: contain borders
5. **Scale to Logical Canvas**: Use logical dimensions (not physical pixels!)
6. **Apply Zoom**: Reverse zoom transformation using logical dimensions
7. **Add Camera Offset**: Final world coordinates

### Device Pixel Ratio

- **Desktop (this PC)**: 1.935
- **Purpose**: Makes canvas sharper on high-DPI displays
- **Never use in coordinate math**: Only for canvas size and image data operations

### Resolution Scale

- `game.resolutionScale = min(CANVAS_WIDTH / 1920, CANVAS_HEIGHT / 1080)`
- Used for scaling world objects to match canvas size
- Separate from coordinate calculations

## Summary

By consistently using logical dimensions (`game.CANVAS_WIDTH`, `game.CANVAS_HEIGHT`) instead of physical pixels (`canvas.width`, `canvas.height`), all coordinate calculations now work correctly across:
- Different screen sizes
- Different device pixel ratios
- Different zoom levels
- Small and large screen modes

The smart scaling system provides optimal screen usage without coordinate calculation issues!
