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
            title: Math.min(60, canvasHeight * 0.1),
            menu: Math.min(32, canvasHeight * 0.05),
            subtitle: Math.min(24, canvasHeight * 0.04),
            instruction: Math.min(18, canvasHeight * 0.03),
            detail: Math.min(16, canvasHeight * 0.028),
            hint: Math.min(14, canvasHeight * 0.025)
        };
    }

    /**
     * Draw a styled panel background (Glassmorphism)
     */
    drawPanel(ctx, x, y, width, height, alpha = 0.6) {
        ctx.save();
        
        // Unified background (Subtle vertical gradient)
        // Changed from diagonal to vertical to avoid "split" look
        const gradient = ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, `rgba(35, 35, 45, ${alpha})`);
        gradient.addColorStop(1, `rgba(25, 25, 35, ${alpha})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, height);

        // Glass border (white/transparent)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);

        // Top highlight (reflection) - REMOVED for cleaner look
        // ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        // ctx.fillRect(x, y, width, height * 0.4);

        // Inner glow/shadow - REDUCED BLUR FOR PERFORMANCE
        // High blur values (>10) can cause significant performance drops on some GPUs
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 0; // Disabled blur for performance
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 5;
        
        // Corner accents (Cyan)
        const cornerSize = 8;
        ctx.fillStyle = '#4a9eff';
        ctx.shadowColor = '#4a9eff';
        ctx.shadowBlur = 0; // Disabled blur for performance
        
        // Draw corners
        ctx.fillRect(x - 1, y - 1, cornerSize, 2); // Top-left H
        ctx.fillRect(x - 1, y - 1, 2, cornerSize); // Top-left V
        
        ctx.fillRect(x + width - cornerSize + 1, y - 1, cornerSize, 2); // Top-right H
        ctx.fillRect(x + width - 1, y - 1, 2, cornerSize); // Top-right V
        
        ctx.fillRect(x - 1, y + height - 1, cornerSize, 2); // Bottom-left H
        ctx.fillRect(x - 1, y + height - cornerSize + 1, 2, cornerSize); // Bottom-left V
        
        ctx.fillRect(x + width - cornerSize + 1, y + height - 1, cornerSize, 2); // Bottom-right H
        ctx.fillRect(x + width - 1, y + height - cornerSize + 1, 2, cornerSize); // Bottom-right V
        
        ctx.restore();
    }
    
    /**
     * Draw menu title
     */
    drawTitle(ctx, title, canvasWidth, canvasHeight, yPosition = 0.25) {
        const sizes = this.getFontSizes(canvasHeight);
        
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Title Shadow/Glow (Stronger for glass effect)
        ctx.shadowColor = '#4a9eff';
        ctx.shadowBlur = 0; // Reduced from 20
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${sizes.title}px 'Cinzel', serif`;
        ctx.fillText(title, canvasWidth / 2, canvasHeight * yPosition);
        
        // Sub-line decoration (Thinner, cleaner)
        const lineWidth = ctx.measureText(title).width * 0.8;
        const lineY = canvasHeight * yPosition + sizes.title * 0.6;
        
        const gradient = ctx.createLinearGradient(
            canvasWidth / 2 - lineWidth / 2, 0,
            canvasWidth / 2 + lineWidth / 2, 0
        );
        gradient.addColorStop(0, 'rgba(74, 158, 255, 0)');
        gradient.addColorStop(0.2, 'rgba(74, 158, 255, 0.8)');
        gradient.addColorStop(0.8, 'rgba(74, 158, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(74, 158, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 10; // Glow for the line too
        ctx.fillRect(canvasWidth / 2 - lineWidth / 2, lineY, lineWidth, 1.5);
        
        ctx.restore();
    }
    
    /**
     * Draw menu options with standard styling
     * @param {Array} options - Array of option strings or objects {text, color}
     * @param {number} selectedIndex - Currently selected option index
     * @param {number} startY - Y position ratio (0-1) where menu starts
     * @param {number} spacing - Spacing between options as ratio (0-1)
     */
    drawMenuOptions(ctx, options, selectedIndex, canvasWidth, canvasHeight, startY = 0.45, spacing = 0.10) {
        const sizes = this.getFontSizes(canvasHeight);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const menuStartY = canvasHeight * startY;
        const menuSpacing = canvasHeight * spacing;
        
        options.forEach((option, index) => {
            const optionText = typeof option === 'string' ? option : option.text;
            let optionColor = typeof option === 'object' && option.color ? option.color : '#ccc';
            const isDisabled = typeof option === 'object' && option.disabled;
            
            if (isDisabled) {
                optionColor = '#555';
            }

            const y = menuStartY + index * menuSpacing;
            const isSelected = index === selectedIndex;
            
            if (isSelected) {
                // Selection background (Glass bar)
                const textWidth = ctx.measureText(optionText).width + 100;
                const bgHeight = sizes.menu * 1.8;
                
                // Glass gradient
                const gradient = ctx.createLinearGradient(
                    canvasWidth / 2 - textWidth / 2, 0,
                    canvasWidth / 2 + textWidth / 2, 0
                );
                gradient.addColorStop(0, 'rgba(74, 158, 255, 0)');
                gradient.addColorStop(0.2, 'rgba(74, 158, 255, 0.15)');
                gradient.addColorStop(0.8, 'rgba(74, 158, 255, 0.15)');
                gradient.addColorStop(1, 'rgba(74, 158, 255, 0)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(canvasWidth / 2 - textWidth / 2, y - bgHeight / 2, textWidth, bgHeight);
                
                // Top/Bottom borders for glass effect
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(canvasWidth / 2 - textWidth / 2 + 20, y - bgHeight / 2);
                ctx.lineTo(canvasWidth / 2 + textWidth / 2 - 20, y - bgHeight / 2);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(canvasWidth / 2 - textWidth / 2 + 20, y + bgHeight / 2);
                ctx.lineTo(canvasWidth / 2 + textWidth / 2 - 20, y + bgHeight / 2);
                ctx.stroke();
                
                // Selected text
                ctx.font = `700 ${sizes.menu * 1.1}px 'Cinzel', serif`;
                ctx.fillStyle = '#fff';
                ctx.shadowColor = '#4a9eff';
                ctx.shadowBlur = 15;
                ctx.fillText(optionText, canvasWidth / 2, y);
                ctx.shadowBlur = 0;
                
                // Selection indicators (Diamonds)
                ctx.font = `${sizes.menu * 0.6}px 'Arial'`;
                ctx.fillStyle = '#4a9eff';
                ctx.shadowColor = '#4a9eff';
                ctx.shadowBlur = 5;
                ctx.fillText('❖', canvasWidth / 2 - textWidth / 2 + 10, y);
                ctx.fillText('❖', canvasWidth / 2 + textWidth / 2 - 10, y);
                ctx.shadowBlur = 0;
            } else {
                // Normal text
                ctx.font = `400 ${sizes.menu}px 'Lato', sans-serif`;
                ctx.fillStyle = optionColor;
                // Subtle shadow for readability
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 4;
                ctx.fillText(optionText, canvasWidth / 2, y);
                ctx.shadowBlur = 0;
            }
        });
    }
    
    /**
     * Draw menu options with subtitle values (for settings-style menus)
     * @param {Array} options - Array of {name, value, type} objects
     * @param {number} selectedIndex - Currently selected option index
     * @param {number} startY - Y position ratio (0-1) where menu starts
     * @param {number} spacing - Line height as ratio (0-1)
     * @param {Object} scrollInfo - Optional scroll info { offset, total, maxVisible }
     */
    drawSettingsOptions(ctx, options, selectedIndex, canvasWidth, canvasHeight, startY = 0.35, spacing = 0.12, scrollInfo = null) {
        const sizes = this.getFontSizes(canvasHeight);
        const menuStartY = canvasHeight * startY;
        const lineHeight = canvasHeight * spacing;
        
        // Draw panel background for settings
        // Widen panel to 0.8 to match tabs (4 tabs * 0.2 width)
        const panelWidth = canvasWidth * 0.8;
        // Fixed height based on max visible options if scrolling is active, otherwise dynamic
        const displayCount = scrollInfo ? scrollInfo.maxVisible : options.length;
        const panelHeight = displayCount * lineHeight + canvasHeight * 0.1;
        
        const panelX = (canvasWidth - panelWidth) / 2;
        const panelY = menuStartY - canvasHeight * 0.05;
        
        this.drawPanel(ctx, panelX, panelY, panelWidth, panelHeight);
        
        // Draw Scrollbar if needed
        if (scrollInfo && scrollInfo.total > scrollInfo.maxVisible) {
            const scrollbarWidth = 6;
            const scrollbarX = panelX + panelWidth - 20;
            const scrollbarY = panelY + 20;
            const scrollbarHeight = panelHeight - 40;
            
            // Track
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight);
            
            // Thumb
            const thumbHeight = Math.max(30, (scrollInfo.maxVisible / scrollInfo.total) * scrollbarHeight);
            const maxScroll = scrollInfo.total - scrollInfo.maxVisible;
            const scrollRatio = scrollInfo.offset / maxScroll;
            const thumbY = scrollbarY + (scrollRatio * (scrollbarHeight - thumbHeight));
            
            ctx.fillStyle = '#4a9eff';
            ctx.fillRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight);
        }
        
        options.forEach((option, index) => {
            const y = menuStartY + (index * lineHeight);
            const isSelected = index === selectedIndex;
            
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            
            // Selection highlight (Glass bar)
            if (isSelected) {
                // Gradient highlight
                const gradient = ctx.createLinearGradient(panelX + 20, y - lineHeight/2 + 5, panelX + panelWidth - 20, y - lineHeight/2 + 5);
                gradient.addColorStop(0, 'rgba(74, 158, 255, 0.1)');
                gradient.addColorStop(0.5, 'rgba(74, 158, 255, 0.25)');
                gradient.addColorStop(1, 'rgba(74, 158, 255, 0.1)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(panelX + 20, y - lineHeight/2 + 5, panelWidth - 40, lineHeight - 10);
                
                // Border for highlight
                ctx.strokeStyle = 'rgba(74, 158, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.strokeRect(panelX + 20, y - lineHeight/2 + 5, panelWidth - 40, lineHeight - 10);
                
                ctx.fillStyle = '#fff';
                ctx.font = `700 ${sizes.menu}px 'Lato', sans-serif`;
                ctx.shadowColor = '#4a9eff';
                ctx.shadowBlur = 0; // Reduced from 10
            } else {
                ctx.fillStyle = '#aaa';
                ctx.font = `400 ${sizes.menu}px 'Lato', sans-serif`;
                ctx.shadowBlur = 0;
            }
            
            // Draw Name
            ctx.fillText(option.name, panelX + 40, y);
            
            // Draw Value
            if (option.value !== undefined) {
                ctx.textAlign = 'right';
                ctx.fillStyle = isSelected ? '#4a9eff' : '#888';
                ctx.fillText(option.value, panelX + panelWidth - 40, y);
            }
            
            ctx.shadowBlur = 0;
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
            
            // Draw item box (Glass style)
            if (isSelected) {
                // Selected: Brighter glass
                const gradient = ctx.createLinearGradient(boxX, boxY, boxX + boxWidth, boxY + boxHeight);
                gradient.addColorStop(0, 'rgba(74, 158, 255, 0.1)');
                gradient.addColorStop(1, 'rgba(74, 158, 255, 0.2)');
                ctx.fillStyle = gradient;
                
                ctx.strokeStyle = '#4a9eff';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#4a9eff';
                ctx.shadowBlur = 10;
            } else {
                // Normal: Dark glass
                ctx.fillStyle = 'rgba(30, 30, 40, 0.4)';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 1;
                ctx.shadowBlur = 0;
            }
            
            ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
            
            if (item.isEmpty) {
                ctx.setLineDash([5, 5]);
            } else {
                ctx.setLineDash([]);
            }
            
            ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
            ctx.setLineDash([]);
            ctx.shadowBlur = 0; // Reset shadow
            
            // Item name
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillStyle = isSelected ? '#fff' : (item.isEmpty ? '#666' : '#ccc');
            ctx.font = `700 ${sizes.subtitle}px 'Lato', sans-serif`;
            
            if (isSelected) {
                ctx.shadowColor = '#4a9eff';
                ctx.shadowBlur = 5;
            }
            
            ctx.fillText(item.name, boxX + 20, boxY + 10);
            ctx.shadowBlur = 0;
            
            // Item details (if exists)
            if (item.details) {
                ctx.font = `${sizes.detail}px 'Lato', sans-serif`;
                ctx.fillStyle = isSelected ? '#4a9eff' : '#888';
                ctx.fillText(item.details, boxX + 20, boxY + 10 + sizes.subtitle * 1.2);
            }
        });
    }
    
    /**
     * Draw confirmation dialog (Yes/No)
     */
    drawConfirmation(ctx, title, message, warning, selectedOption, canvasWidth, canvasHeight, yesColor = '#e74c3c') {
        const sizes = this.getFontSizes(canvasHeight);
        
        // Darker overlay
        this.drawOverlay(ctx, canvasWidth, canvasHeight, 0.9);
        
        // Dialog Box
        const boxWidth = Math.min(600, canvasWidth * 0.8);
        const boxHeight = canvasHeight * 0.4;
        const boxX = (canvasWidth - boxWidth) / 2;
        const boxY = (canvasHeight - boxHeight) / 2;
        
        this.drawPanel(ctx, boxX, boxY, boxWidth, boxHeight);
        
        // Title
        ctx.fillStyle = yesColor;
        ctx.font = `700 ${sizes.subtitle}px 'Cinzel', serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = yesColor;
        ctx.shadowBlur = 10;
        ctx.fillText(title, canvasWidth / 2, boxY + 50);
        ctx.shadowBlur = 0;
        
        // Message
        ctx.fillStyle = '#fff';
        ctx.font = `${sizes.instruction}px 'Lato', sans-serif`;
        ctx.fillText(message, canvasWidth / 2, boxY + 100);
        
        // Warning (if provided)
        if (warning) {
            ctx.fillStyle = '#aaa';
            ctx.font = `italic ${sizes.instruction * 0.85}px 'Lato', sans-serif`;
            ctx.fillText(warning, canvasWidth / 2, boxY + 140);
        }
        
        // Options (Yes/No)
        const options = ['Yes', 'No'];
        const buttonY = boxY + boxHeight - 80;
        const buttonSpacing = 150;
        
        options.forEach((option, index) => {
            const x = canvasWidth / 2 + (index === 0 ? -buttonSpacing/2 : buttonSpacing/2);
            const isSelected = index === selectedOption;
            
            // Button Box
            const btnWidth = 100;
            const btnHeight = 40;
            
            if (isSelected) {
                ctx.fillStyle = index === 0 ? yesColor : '#4a9eff';
                ctx.shadowColor = index === 0 ? yesColor : '#4a9eff';
                ctx.shadowBlur = 10;
                ctx.fillRect(x - btnWidth/2, buttonY - btnHeight/2, btnWidth, btnHeight);
                ctx.fillStyle = '#fff';
            } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x - btnWidth/2, buttonY - btnHeight/2, btnWidth, btnHeight);
                ctx.fillStyle = '#aaa';
                ctx.shadowBlur = 0;
            }
            
            ctx.font = `700 ${sizes.menu}px 'Lato', sans-serif`;
            ctx.fillText(option, x, buttonY);
            ctx.shadowBlur = 0;
        });
    }
    
    /**
     * Draw hint text at bottom of screen
     */
    drawHint(ctx, text, canvasWidth, canvasHeight, yPosition = 0.95) {
        const sizes = this.getFontSizes(canvasHeight);
        ctx.fillStyle = '#888';
        ctx.font = `italic ${sizes.hint}px 'Lato', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(text, canvasWidth / 2, canvasHeight * yPosition);
    }
    
    /**
     * Draw instruction text
     */
    drawInstruction(ctx, text, canvasWidth, canvasHeight, yPosition = 0.22) {
        const sizes = this.getFontSizes(canvasHeight);
        ctx.fillStyle = '#4a9eff';
        ctx.font = `${sizes.instruction}px 'Lato', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(text, canvasWidth / 2, canvasHeight * yPosition);
    }
    
    /**
     * Draw overlay background (Glassmorphism blur simulation)
     */
    drawOverlay(ctx, canvasWidth, canvasHeight, alpha = 0.7) {
        // Darken background
        ctx.fillStyle = `rgba(10, 10, 15, ${alpha})`;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Vignette
        const gradient = ctx.createRadialGradient(
            canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.3,
            canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.8
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Scanline effect (very subtle)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        for (let i = 0; i < canvasHeight; i += 3) {
            ctx.fillRect(0, i, canvasWidth, 1);
        }
    }
    
    /**
     * Draw scroll indicators (up/down arrows)
     */
    drawScrollIndicators(ctx, canvasWidth, canvasHeight, canScrollUp, canScrollDown, listY, listHeight) {
        const sizes = this.getFontSizes(canvasHeight);
        const arrowSize = Math.min(20, canvasHeight * 0.035);
        const arrowOffset = canvasHeight * 0.03;
        
        ctx.fillStyle = '#4a9eff';
        ctx.font = `${arrowSize}px Arial`; // Arrows look better in Arial
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
