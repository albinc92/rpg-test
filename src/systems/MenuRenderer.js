/**
 * MenuRenderer - Standardized menu rendering component
 * Provides consistent styling across all in-game menus
 */
class MenuRenderer {
    constructor(game) {
        this.game = game;
    }
    
    /**
     * Get responsive font sizes based on canvas height
     */
    getFontSizes(canvasHeight) {
        return {
            title: Math.min(48, canvasHeight * 0.08),
            menu: Math.min(36, canvasHeight * 0.055),
            subtitle: Math.min(28, canvasHeight * 0.048),
            instruction: Math.min(20, canvasHeight * 0.035),
            detail: Math.min(18, canvasHeight * 0.032),
            hint: Math.min(14, canvasHeight * 0.025)
        };
    }
    
    /**
     * Draw menu title
     */
    drawTitle(ctx, title, canvasWidth, canvasHeight, yPosition = 0.25) {
        const sizes = this.getFontSizes(canvasHeight);
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${sizes.title}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(title, canvasWidth / 2, canvasHeight * yPosition);
    }
    
    /**
     * Draw menu options with standard styling (yellow highlight, no box)
     * @param {Array} options - Array of option strings or objects {text, color}
     * @param {number} selectedIndex - Currently selected option index
     * @param {number} startY - Y position ratio (0-1) where menu starts
     * @param {number} spacing - Spacing between options as ratio (0-1)
     */
    drawMenuOptions(ctx, options, selectedIndex, canvasWidth, canvasHeight, startY = 0.45, spacing = 0.10) {
        const sizes = this.getFontSizes(canvasHeight);
        ctx.font = `bold ${sizes.menu}px Arial`;
        ctx.textAlign = 'center';
        
        const menuStartY = canvasHeight * startY;
        const menuSpacing = canvasHeight * spacing;
        
        options.forEach((option, index) => {
            const optionText = typeof option === 'string' ? option : option.text;
            const optionColor = typeof option === 'object' && option.color ? option.color : '#fff';
            const y = menuStartY + index * menuSpacing;
            const isSelected = index === selectedIndex;
            
            // Text shadow for all options (optional, makes text pop)
            ctx.fillStyle = '#000';
            ctx.fillText(optionText, canvasWidth / 2 + 2, y + 2);
            
            // Main text - yellow when selected, custom color or white otherwise
            ctx.fillStyle = isSelected ? '#ffff00' : optionColor;
            ctx.fillText(optionText, canvasWidth / 2, y);
        });
    }
    
    /**
     * Draw menu options with subtitle values (for settings-style menus)
     * @param {Array} options - Array of {name, value, type} objects
     * @param {number} selectedIndex - Currently selected option index
     * @param {number} startY - Y position ratio (0-1) where menu starts
     * @param {number} spacing - Line height as ratio (0-1)
     */
    drawSettingsOptions(ctx, options, selectedIndex, canvasWidth, canvasHeight, startY = 0.35, spacing = 0.12) {
        const sizes = this.getFontSizes(canvasHeight);
        ctx.font = `bold ${sizes.menu}px Arial`;
        
        const menuStartY = canvasHeight * startY;
        const lineHeight = canvasHeight * spacing;
        
        // Center the entire settings menu block
        const centerX = canvasWidth / 2;
        const valueGap = sizes.menu * 0.6; // Tiny gap - about half a character width
        
        options.forEach((option, index) => {
            const y = menuStartY + (index * lineHeight);
            const isSelected = index === selectedIndex;
            
            // Draw option value first (if exists) to measure for centering
            if (option.value !== undefined) {
                // Measure text widths
                const nameWidth = ctx.measureText(option.name).width;
                const valueWidth = ctx.measureText(option.value).width;
                const totalWidth = nameWidth + valueGap + valueWidth;
                
                // Calculate starting X position to center the entire line
                const startX = centerX - (totalWidth / 2);
                
                // Text shadow for option name
                ctx.fillStyle = '#000';
                ctx.textAlign = 'left';
                ctx.fillText(option.name, startX + 2, y + 2);
                
                // Draw option name
                ctx.fillStyle = isSelected ? '#ffff00' : '#fff';
                ctx.textAlign = 'left';
                ctx.fillText(option.name, startX, y);
                
                // Text shadow for value
                ctx.fillStyle = '#000';
                ctx.textAlign = 'left';
                ctx.fillText(option.value, startX + nameWidth + valueGap + 2, y + 2);
                
                // Value text
                ctx.fillStyle = isSelected ? '#ffff00' : '#fff';
                ctx.textAlign = 'left';
                ctx.fillText(option.value, startX + nameWidth + valueGap, y);
            } else {
                // Just center the text (for items without values like "Back")
                // Text shadow
                ctx.fillStyle = '#000';
                ctx.textAlign = 'center';
                ctx.fillText(option.name, centerX + 2, y + 2);
                
                // Draw option name
                ctx.fillStyle = isSelected ? '#ffff00' : '#fff';
                ctx.textAlign = 'center';
                ctx.fillText(option.name, centerX, y);
            }
        });
    }
    
    /**
     * Draw a list of items with details (for save/load menus)
     * @param {Array} items - Array of {name, details, isEmpty} objects
     * @param {number} selectedIndex - Currently selected item index
     * @param {number} startY - Y position ratio (0-1) where list starts
     * @param {number} spacing - Line height as ratio (0-1)
     * @param {boolean} showSelection - Whether to show selection highlight
     */
    drawItemList(ctx, items, selectedIndex, canvasWidth, canvasHeight, startY = 0.3, spacing = 0.12, showSelection = true) {
        const sizes = this.getFontSizes(canvasHeight);
        const listStartY = canvasHeight * startY;
        const lineHeight = canvasHeight * spacing;
        const boxWidth = canvasWidth * 0.8;
        const boxHeight = lineHeight * 0.85;
        
        items.forEach((item, index) => {
            const y = listStartY + index * lineHeight;
            const isSelected = showSelection && index === selectedIndex;
            const boxX = canvasWidth / 2 - boxWidth / 2;
            const boxY = y - boxHeight * 0.5;
            
            // Only highlight empty slots with dashed border
            if (item.isEmpty) {
                if (isSelected) {
                    // Empty slot gets a dashed yellow border when selected
                    ctx.strokeStyle = '#ffff00';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 5]);
                    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
                    ctx.setLineDash([]);
                } else {
                    // Empty slot gets subtle dashed border
                    ctx.strokeStyle = '#666';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([5, 5]);
                    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
                    ctx.setLineDash([]);
                }
            }
            
            // Item name
            ctx.textAlign = 'left';
            ctx.fillStyle = isSelected ? '#ffff00' : (item.isEmpty ? '#888' : '#fff');
            ctx.font = `bold ${sizes.subtitle}px Arial`;
            ctx.fillText(item.name, boxX + 20, y);
            
            // Item details (if exists)
            if (item.details) {
                ctx.font = `${sizes.detail}px Arial`;
                ctx.fillStyle = isSelected ? '#ffff88' : '#aaa';
                ctx.fillText(item.details, boxX + 20, y + lineHeight * 0.35);
            }
        });
    }
    
    /**
     * Draw confirmation dialog (Yes/No)
     * @param {string} title - Dialog title
     * @param {string} message - Main message
     * @param {string} warning - Warning text (optional)
     * @param {number} selectedOption - 0 for Yes, 1 for No
     * @param {string} yesColor - Color for Yes option
     */
    drawConfirmation(ctx, title, message, warning, selectedOption, canvasWidth, canvasHeight, yesColor = '#ff3333') {
        const sizes = this.getFontSizes(canvasHeight);
        
        // Darker overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Title
        ctx.fillStyle = yesColor;
        ctx.font = `bold ${sizes.subtitle}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(title, canvasWidth / 2, canvasHeight * 0.25);
        
        // Message
        ctx.fillStyle = '#fff';
        ctx.font = `${sizes.instruction}px Arial`;
        ctx.fillText(message, canvasWidth / 2, canvasHeight * 0.35);
        
        // Warning (if provided)
        if (warning) {
            ctx.fillStyle = '#aaa';
            ctx.font = `${sizes.instruction * 0.85}px Arial`;
            ctx.fillText(warning, canvasWidth / 2, canvasHeight * 0.43);
        }
        
        // Options (Yes/No)
        const options = ['Yes', 'No'];
        const menuStartY = canvasHeight * 0.55;
        const menuSpacing = canvasHeight * 0.08;
        
        options.forEach((option, index) => {
            const y = menuStartY + index * menuSpacing;
            
            // Option text with appropriate color (same as all menus)
            ctx.font = `bold ${sizes.menu}px Arial`;
            if (index === 0) {
                // "Yes" option
                ctx.fillStyle = index === selectedOption ? '#ffff00' : yesColor;
            } else {
                // "No" option
                ctx.fillStyle = index === selectedOption ? '#ffff00' : '#fff';
            }
            ctx.fillText(option, canvasWidth / 2, y);
        });
    }
    
    /**
     * Draw hint text at bottom of screen
     */
    drawHint(ctx, text, canvasWidth, canvasHeight, yPosition = 0.95) {
        const sizes = this.getFontSizes(canvasHeight);
        ctx.fillStyle = '#666';
        ctx.font = `${sizes.hint}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(text, canvasWidth / 2, canvasHeight * yPosition);
    }
    
    /**
     * Draw instruction text
     */
    drawInstruction(ctx, text, canvasWidth, canvasHeight, yPosition = 0.22) {
        const sizes = this.getFontSizes(canvasHeight);
        ctx.fillStyle = '#aaa';
        ctx.font = `${sizes.instruction}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(text, canvasWidth / 2, canvasHeight * yPosition);
    }
    
    /**
     * Draw overlay background (semi-transparent black)
     */
    drawOverlay(ctx, canvasWidth, canvasHeight, alpha = 0.7) {
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    
    /**
     * Draw scroll indicators (up/down arrows)
     */
    drawScrollIndicators(ctx, canvasWidth, canvasHeight, canScrollUp, canScrollDown, listY, listHeight) {
        const sizes = this.getFontSizes(canvasHeight);
        const arrowSize = Math.min(20, canvasHeight * 0.035);
        const arrowOffset = canvasHeight * 0.03;
        
        ctx.fillStyle = '#fff';
        ctx.font = `${arrowSize}px Arial`;
        ctx.textAlign = 'center';
        
        if (canScrollUp) {
            ctx.fillText('▲', canvasWidth / 2, listY - arrowOffset);
        }
        
        if (canScrollDown) {
            ctx.fillText('▼', canvasWidth / 2, listY + listHeight + arrowOffset);
        }
    }
}

// Export for use in other files
window.MenuRenderer = MenuRenderer;
