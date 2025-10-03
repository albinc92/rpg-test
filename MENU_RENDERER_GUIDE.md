# MenuRenderer - Developer Guide

## Quick Reference

### Always Use MenuRenderer for Menu Rendering

```javascript
// ✅ CORRECT - Use MenuRenderer
render(ctx) {
    const canvasWidth = this.game.CANVAS_WIDTH;
    const canvasHeight = this.game.CANVAS_HEIGHT;
    const menuRenderer = this.stateManager.menuRenderer;
    
    menuRenderer.drawTitle(ctx, 'My Menu', canvasWidth, canvasHeight);
    menuRenderer.drawMenuOptions(ctx, this.options, this.selectedOption, 
                                 canvasWidth, canvasHeight);
}

// ❌ WRONG - Don't calculate fonts manually
render(ctx) {
    const titleSize = Math.min(48, canvasHeight * 0.08); // DON'T DO THIS
    ctx.font = `${titleSize}px Arial`;
    ctx.fillText('My Menu', x, y);
}
```

## Standard Font Sizes

Get consistent font sizes using `getFontSizes()`:

```javascript
const sizes = menuRenderer.getFontSizes(canvasHeight);
// sizes.title     - For main titles (largest)
// sizes.menu      - For menu options
// sizes.subtitle  - For subtitles/settings
// sizes.instruction - For instructions
// sizes.detail    - For detail text
// sizes.hint      - For hints (smallest)
```

## Common Patterns

### Basic Menu
```javascript
render(ctx) {
    const canvasWidth = this.game.CANVAS_WIDTH;
    const canvasHeight = this.game.CANVAS_HEIGHT;
    const menuRenderer = this.stateManager.menuRenderer;
    
    // Overlay background
    menuRenderer.drawOverlay(ctx, canvasWidth, canvasHeight, 0.7);
    
    // Title
    menuRenderer.drawTitle(ctx, 'Menu Title', canvasWidth, canvasHeight, 0.25);
    
    // Options
    menuRenderer.drawMenuOptions(
        ctx,
        this.options,        // Array of strings
        this.selectedOption, // Index of selected item
        canvasWidth,
        canvasHeight,
        0.45,               // Start Y position (0-1 ratio)
        0.10                // Spacing between items (0-1 ratio)
    );
    
    // Hint at bottom
    menuRenderer.drawHint(ctx, 'Press ESC to go back', canvasWidth, canvasHeight);
}
```

### Settings-Style Menu
```javascript
// For menus with left-aligned labels and right-aligned values
const sizes = menuRenderer.getFontSizes(canvasHeight);
ctx.font = `${sizes.subtitle}px Arial`;

this.options.forEach((option, index) => {
    const y = startY + (index * lineHeight);
    const isSelected = index === this.selectedOption;
    
    // Yellow text when selected
    ctx.fillStyle = isSelected ? '#ffff00' : '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(option.name, leftX, y);
    
    ctx.textAlign = 'right';
    ctx.fillText(option.value, rightX, y);
});
```

### Confirmation Dialog
```javascript
render(ctx) {
    const menuRenderer = this.stateManager.menuRenderer;
    const sizes = menuRenderer.getFontSizes(canvasHeight);
    
    // Dark overlay
    menuRenderer.drawOverlay(ctx, canvasWidth, canvasHeight, 0.9);
    
    // Title
    ctx.fillStyle = '#ff3333'; // Custom color for warning
    ctx.font = `bold ${sizes.subtitle}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('Are you sure?', canvasWidth / 2, canvasHeight * 0.25);
    
    // Message
    ctx.fillStyle = '#fff';
    ctx.font = `${sizes.instruction}px Arial`;
    ctx.fillText('This cannot be undone', canvasWidth / 2, canvasHeight * 0.35);
    
    // Warning
    menuRenderer.drawInstruction(ctx, 'All data will be lost!', 
                                 canvasWidth, canvasHeight, 0.43);
    
    // Yes/No options (manually for custom colors)
    ctx.font = `bold ${sizes.menu}px Arial`;
    ['Yes', 'No'].forEach((option, index) => {
        const y = canvasHeight * 0.55 + (index * canvasHeight * 0.08);
        if (index === 0) {
            ctx.fillStyle = index === this.selectedOption ? '#ffff00' : '#ff3333';
        } else {
            ctx.fillStyle = index === this.selectedOption ? '#ffff00' : '#fff';
        }
        ctx.fillText(option, canvasWidth / 2, y);
    });
    
    // Hint
    menuRenderer.drawHint(ctx, 'Enter: Select | ESC: Cancel', 
                         canvasWidth, canvasHeight, 0.85);
}
```

## Color Standards

### Text Colors
- **Selected item**: `#ffff00` (yellow)
- **Unselected item**: `#fff` (white)
- **Disabled/hint**: `#666` or `#888` (gray)
- **Detail text**: `#aaa` (light gray)
- **Warning**: `#ff3333` (red)
- **Caution**: `#FFA500` (orange)

### Background Colors
- **Light overlay**: `rgba(0, 0, 0, 0.7)` - For pause menus
- **Dark overlay**: `rgba(0, 0, 0, 0.8)` - For settings
- **Very dark overlay**: `rgba(0, 0, 0, 0.9)` - For confirmations

## Do's and Don'ts

### ✅ DO
- Use `menuRenderer.getFontSizes()` for all text
- Use `menuRenderer.draw*()` methods when available
- Keep font styles consistent (Arial)
- Use yellow (#ffff00) for selected items
- Use responsive positioning (ratios 0-1, not pixels)

### ❌ DON'T
- Calculate font sizes manually with `Math.min()`
- Hardcode pixel sizes for positioning
- Use custom colors without documenting them
- Create new rendering methods - add to MenuRenderer instead
- Forget to pass `canvasWidth` and `canvasHeight`

## Adding New Menu Features

If you need a new menu component:

1. Add the method to `MenuRenderer.js`
2. Use `getFontSizes()` internally
3. Follow existing naming conventions
4. Document the method with JSDoc
5. Update this guide with usage example

Example:
```javascript
// In MenuRenderer.js
drawBadge(ctx, text, x, y, canvasHeight) {
    const sizes = this.getFontSizes(canvasHeight);
    ctx.font = `${sizes.detail}px Arial`;
    ctx.fillStyle = '#FFD700';
    ctx.fillText(text, x, y);
}
```

## Debugging Tips

If menu text looks wrong:
1. Check that you're using `menuRenderer.getFontSizes()` not custom calculations
2. Verify you're passing correct `canvasWidth` and `canvasHeight`
3. Check color values - selected should be `#ffff00`
4. Use browser dev tools to inspect ctx.font values at runtime
