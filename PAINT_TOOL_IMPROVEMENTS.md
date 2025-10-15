# Paint Tool Improvements

## Changes Made

### 1. Default Opacity to 100%
- Changed `brushOpacity` default from `0.8` (80%) to `1.0` (100%)
- Provides full opacity by default for cleaner painting

### 2. Square and Circle Brush for Texture Painting
- Added brush shape support (`circle` and `square`) to texture painting mode
- Previously only collision and spawn modes had shape options
- Square brush applies texture with full opacity in a square pattern
- Circle brush maintains the gradient styles (soft, hard, very-soft)

**Implementation:**
- Modified `paintAt()` method to check `brushShape` before creating gradient
- Square brushes fill with flat opacity instead of radial gradient

### 3. Fixed Fill Mode - Flood Fill Algorithm
- Changed from "fill entire layer" to proper **flood fill** functionality
- Fills only connected areas of the same color (like paint bucket in Photoshop)
- Works for all three paint modes: texture, collision, and spawn zones

**Fill Mode Behavior:**
- **Texture Mode**: Flood fills connected transparent/matching pixels with selected texture pattern
- **Collision Mode**: Flood fills with red collision color
- **Spawn Mode**: Flood fills with blue spawn zone color

**Technical Details:**
- Added `floodFill()` helper function with stack-based algorithm
- Renamed `fillLayer()` to `fillArea()` and added flood fill logic
- For textures: Creates a mask of the fill area, applies texture pattern, then composites
- Safety limit of 1 million pixels to prevent hang on huge areas
- Properly invalidates WebGL texture cache and spawn zone cache

### 4. UI Updates
- Added brush shape controls to texture painting mode
- Brush shape section now visible for all paint modes
- Consistent controls across all three painting modes

## Usage

### Texture Painting
- **Brush Shape**: Choose circle or square
- **Brush Style** (circle only): Soft, hard, or very-soft edges
- **Opacity**: 0-100% (default 100%)
- **Fill Tool**: Click to flood fill connected area with texture

### Collision Painting
- **Brush Shape**: Choose circle or square
- **Fill Tool**: Click to flood fill connected area with collision

### Spawn Zone Painting
- **Brush Shape**: Choose circle or square
- **Fill Tool**: Click to flood fill connected area with spawn zones

## Benefits
1. More intuitive defaults (100% opacity)
2. Consistent brush shape options across all modes
3. Proper flood fill behavior for precise area filling
4. Better control over texture application
