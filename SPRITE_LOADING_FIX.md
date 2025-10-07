# Spirit Sprite Loading Fix

## Issue Identified

Console error showed:
```
[Spirit] Sylphie (spirit_1759830623381_1y4em5wq8) not rendering - 
spriteLoaded: false, sprite exists: true, spriteSrc: assets/npc/Spirits/sylphie.png
```

**Root Cause**: Asynchronous sprite loading race condition
- Spirit is created and added to render queue immediately
- Sprite image starts loading asynchronously
- Render is called BEFORE sprite finishes loading
- `spriteLoaded = false` → Spirit doesn't render → appears invisible

## Solution: Progressive Rendering

### 1. Placeholder Rendering
Spirits now render a **loading placeholder** while sprite loads:
- Pulsing blue circle (ethereal effect)
- "Loading..." text above
- Matches spirit's ethereal theme
- User sees something immediately, not blank space

### 2. Automatic Transition
Once sprite loads (`spriteLoaded = true`):
- Placeholder disappears
- Actual sprite renders with full effects
- Smooth transition from placeholder → sprite

### 3. Enhanced Logging
Added comprehensive sprite loading logs:

```javascript
[GameObject] 🔄 Loading sprite: assets/npc/Spirits/sylphie.png (dimensions: 32x32)
[GameObject] 📡 Sprite src set to: http://localhost:5173/assets/npc/Spirits/sylphie.png
[GameObject] ✅ Sprite loaded successfully: assets/npc/Spirits/sylphie.png (32x32)
```

Or if sprite fails:
```javascript
[GameObject] ❌ Failed to load sprite: assets/npc/Spirits/sylphie.png
[GameObject] 💡 Check if file exists at: http://localhost:5173/assets/npc/Spirits/sylphie.png
```

## Code Changes

### `src/entities/Spirit.js`

#### Before (❌ Broken)
```javascript
render(ctx, game) {
    if (!this.spriteLoaded || !this.sprite) {
        return; // Spirit invisible!
    }
    // ... render sprite
}
```

#### After (✅ Fixed)
```javascript
render(ctx, game) {
    if (!this.sprite) {
        return; // No sprite object at all
    }
    
    // Render placeholder while loading
    if (!this.spriteLoaded) {
        this.renderPlaceholder(ctx, game);
        return;
    }
    
    // Render actual sprite (fully loaded)
    // ... render sprite with effects
}
```

### New Method: `renderPlaceholder()`
```javascript
renderPlaceholder(ctx, game) {
    const mapScale = game.currentMap?.scale || 1.0;
    const size = 32 * this.scale * mapScale;
    
    // Pulsing ethereal circle
    const pulseAlpha = 0.3 + Math.sin(game.gameTime * 0.005) * 0.2;
    ctx.globalAlpha = pulseAlpha;
    ctx.fillStyle = '#87CEEB'; // Sky blue
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    
    // Draw circle + "Loading..." text
    ctx.beginPath();
    ctx.arc(this.x, this.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillText('Loading...', this.x, this.y - size);
}
```

### `src/core/GameObject.js`

Enhanced `loadSprite()` with detailed logging:
```javascript
loadSprite(src) {
    console.log(`[GameObject] 🔄 Loading sprite: ${src} (dimensions: ${w}x${h})`);
    this.sprite = new Image();
    
    this.sprite.onload = () => {
        this.spriteLoaded = true;
        console.log(`[GameObject] ✅ Sprite loaded successfully: ${src}`);
    };
    
    this.sprite.onerror = (error) => {
        console.error(`[GameObject] ❌ Failed to load sprite: ${src}`, error);
        console.error(`[GameObject] 💡 Check if file exists at: ${full_url}`);
    };
    
    this.sprite.src = src;
    console.log(`[GameObject] 📡 Sprite src set to: ${this.sprite.src}`);
}
```

## Visual Timeline

### Frame 0: Spirit Created
```
[SpawnManager] ✨ Spawned Sylphie at (450, 320)
[GameObject] 🔄 Loading sprite: assets/npc/Spirits/sylphie.png
[GameObject] 📡 Sprite src set to: http://localhost:5173/...
```
**Visible**: Spawn animation (blue expanding ring) + loading placeholder

### Frames 1-10: Loading
**Visible**: Pulsing blue circle with "Loading..." text

### Frame ~10: Sprite Loaded
```
[GameObject] ✅ Sprite loaded successfully: assets/npc/Spirits/sylphie.png (32x32)
```
**Visible**: Full sprite with ethereal effects (glow, floating, transparency)

## Expected Behavior

### Normal Loading (Fast Network)
1. Spawn animation appears (blue ring)
2. Blue placeholder flashes briefly (~100-300ms)
3. Full sprite appears with effects
4. Spirit floats and moves normally

### Slow Loading (Slow Network/Large Sprites)
1. Spawn animation appears (blue ring)
2. Blue placeholder remains visible (1-2 seconds)
3. "Loading..." text pulses
4. Full sprite appears when ready
5. Spirit floats and moves normally

### Failed Loading (Missing File)
1. Spawn animation appears
2. Blue placeholder remains permanently
3. Console shows error with full URL to check
4. Spirit still interactive (placeholder shows position)

## Debugging Console Output

### Successful Load
```
[SpawnManager] 🎲 Rolled Sylphie (76.9% chance: 100/130) at time 12.3h
[SpiritRegistry] Creating Sylphie with sprite: assets/npc/Spirits/sylphie.png
[GameObject] 🔄 Loading sprite: assets/npc/Spirits/sylphie.png (dimensions: 32x32)
[GameObject] 📡 Sprite src set to: http://localhost:5173/assets/npc/Spirits/sylphie.png
[SpiritRegistry] ✅ Created Sylphie (spirit_123...) at (450, 320) - sprite loaded: false
[SpawnManager] ✨ Spawned Sylphie at (450, 320) [Total: 1/10]
[GameObject] ✅ Sprite loaded successfully: assets/npc/Spirits/sylphie.png (32x32)
```

### Failed Load
```
[GameObject] 🔄 Loading sprite: assets/npc/Spirits/sylphie.png (dimensions: 32x32)
[GameObject] 📡 Sprite src set to: http://localhost:5173/assets/npc/Spirits/sylphie.png
[GameObject] ❌ Failed to load sprite: assets/npc/Spirits/sylphie.png
[GameObject] 💡 Check if file exists at: http://localhost:5173/assets/npc/Spirits/sylphie.png
```

## Benefits

1. **✅ No More Invisible Spirits**: Placeholder shows something is there
2. **✅ Better UX**: User knows sprite is loading, not a bug
3. **✅ Easier Debugging**: Comprehensive logs show exact loading status
4. **✅ Graceful Degradation**: Failed sprites still show placeholder
5. **✅ Performance Friendly**: Placeholder is simple circle (fast to render)

## Files Modified

1. `src/entities/Spirit.js`
   - Updated `render()` to handle loading state
   - Added `renderPlaceholder()` method

2. `src/core/GameObject.js`
   - Enhanced `loadSprite()` with detailed logging
   - Added error handling with full URL logging

## Testing

Test the fix by:
1. Load game with spawn zones configured
2. Watch for spirits spawning
3. Check console for sprite loading logs
4. Verify you see either:
   - Brief blue placeholder → full sprite (success)
   - Permanent blue placeholder + error logs (failure)

If you see permanent placeholders, check console for the full URL and verify the sprite file exists at that location.
