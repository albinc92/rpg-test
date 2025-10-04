# Paint Tool Guide 🖌️

## Overview
The Paint Tool allows you to paint custom ground textures onto your maps with different brush styles and opacities. This is perfect for creating paths, terrain variations, and other ground details.

## Features

### 🎨 Texture Painting
- Paint custom textures directly onto the map
- Support for any image texture (grass, dirt, stone, etc.)
- Real-time preview while painting
- Smooth brush strokes with drag painting

### 🖌️ Brush Styles
- **Hard Edge**: Sharp, defined borders (like a stamp)
- **Soft Edge**: Medium gradual fade (default)
- **Very Soft**: Gradual, natural-looking fade

### ⚙️ Brush Settings
- **Size**: 16px to 256px (adjustable with slider or `[` and `]` keys)
- **Opacity**: 0% to 100% (for layering effects)
- **Style**: Choose between hard, soft, and very soft edges

### 📚 Texture Management
- Add unlimited custom textures
- Preview all available textures
- Quick texture selection
- Textures persist per editing session

## How to Use

### Activating Paint Tool
1. Open the map editor (`F2` or `Ctrl+E`)
2. Click **Tools** menu → **🖌️ Paint Terrain**
3. Or directly from **Tools** → **🎨 Manage Textures**

### Adding Textures
1. Click **🎨 Manage Textures** or **Select Texture** in paint panel
2. Enter texture path (e.g., `assets/textures/grass.png`)
3. Enter a name for the texture (e.g., "Grass")
4. Click **➕ Add Texture**

### Painting
1. Select a texture from the texture manager
2. Adjust brush size with slider or `[` / `]` keys
3. Choose brush style (Hard, Soft, Very Soft)
4. Set opacity level
5. Click and drag on the map to paint
6. Release mouse to stop painting

### Keyboard Shortcuts
- `[` - Decrease brush size (-8px)
- `]` - Increase brush size (+8px)
- `Escape` - Exit paint tool

## Technical Details

### Paint Layer System
- Each map has its own paint layer (canvas)
- Paint layer is rendered above the base map but below objects
- Default canvas size: 2048x2048 (matches map dimensions)
- Paint data is stored per map

### Brush Algorithm
The paint tool uses:
1. **Radial Gradient Mask**: Creates soft/hard edges
2. **Texture Pattern**: Repeating texture fill
3. **Composite Operations**: Blends texture with mask
4. **Real-time Rendering**: Paint appears immediately

### Brush Styles Explained
- **Hard**: 80% solid core, sharp 1% fade at edge
- **Soft**: Gradual fade from center (70% mark to edge)
- **Very Soft**: Extended fade starting at 30% from center

## Adding New Textures

### Location
All paint textures are stored in: `assets/texture/`

Currently available:
- ✅ `grass.png` - Grass terrain

### How to Add More Textures
1. Add your texture image (PNG recommended) to `assets/texture/`
2. Open `src/editor/EditorUI.js`
3. Find the `showTextureManager()` function
4. Add your texture to the `availableTextures` array:
```javascript
const availableTextures = [
    { path: 'assets/texture/grass.png', name: 'Grass' },
    { path: 'assets/texture/dirt.png', name: 'Dirt' },     // Add new textures here
    { path: 'assets/texture/stone.png', name: 'Stone' },
];
```

### Suggested Textures to Add
```
assets/texture/grass.png       # Grass terrain (✅ already added)
assets/texture/dirt.png        # Dirt paths
assets/texture/stone.png       # Stone floors
assets/texture/sand.png        # Sandy areas
assets/texture/water.png       # Water edges
assets/texture/wood.png        # Wooden floors
```

## Tips & Best Practices

### 1. Layering Textures
- Start with low opacity (30-50%)
- Build up layers gradually
- Use different textures for depth

### 2. Creating Natural Edges
- Use "Very Soft" brush for terrain transitions
- Use "Hard" brush for defined paths/borders
- Vary opacity for organic look

### 3. Performance
- Larger brush sizes may impact performance on older devices
- Consider using smaller brushes for detail work
- Paint layer is per-map, not per-session

### 4. Workflow
1. Paint terrain first (before placing objects)
2. Use grid (`G`) and collision boxes (`C`) for reference
3. Test with different zoom levels
4. Save frequently (`Ctrl+S`)

## Future Enhancements (Planned)

- [ ] Eraser tool for removing paint
- [ ] Paint layer undo/redo support
- [ ] Export/import paint layers
- [ ] Texture rotation and scaling
- [ ] Custom brush shapes
- [ ] Color tinting for textures
- [ ] Blend modes (overlay, multiply, etc.)
- [ ] Paint layer opacity control

## Troubleshooting

### Texture Not Loading
- Check file path is correct
- Ensure texture file exists
- Check browser console for errors

### Paint Not Appearing
- Ensure paint tool is active (blue circle cursor)
- Check opacity is not set to 0%
- Verify texture is selected

### Performance Issues
- Reduce brush size
- Lower opacity for faster painting
- Close other applications

## Integration with Map Editor

The paint tool integrates seamlessly with:
- **Object Placement**: Paint under objects
- **Grid System**: Align with grid for precision
- **Zoom Controls**: Paint at any zoom level
- **History System**: Undo/redo support (coming soon)

---

**Note**: This is an initial implementation. More features and improvements will be added based on usage and feedback!
