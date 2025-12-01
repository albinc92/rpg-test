/**
 * MenuRenderer - Standardized menu rendering component
 * Uses DesignSystem for consistent, scalable styling across all menus
 * 
 * This is a higher-level API built on top of DesignSystem,
 * providing menu-specific components like option lists, modals, etc.
 */
class MenuRenderer {
    constructor(game) {
        this.game = game;
        // Reference to the global design system (initialized in main.js)
        this.ds = window.ds;
    }
    
    /**
     * Ensure design system is initialized with current dimensions
     */
    _ensureDS(canvasWidth, canvasHeight) {
        if (!this.ds) this.ds = window.ds;
        if (this.ds) {
            this.ds.setDimensions(canvasWidth, canvasHeight);
        }
    }
    
    /**
     * Get responsive font sizes based on canvas height
     * Uses DesignSystem if available, falls back to legacy calculation
     */
    getFontSizes(canvasHeight) {
        this._ensureDS(1280, canvasHeight);
        
        if (this.ds) {
            return {
                title: this.ds.fontSize('xxl'),
                menu: this.ds.fontSize('md'),
                subtitle: this.ds.fontSize('lg'),
                instruction: this.ds.fontSize('sm'),
                detail: this.ds.fontSize('sm'),
                hint: this.ds.fontSize('xs')
            };
        }
        
        // Legacy fallback
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
        this._ensureDS(ctx.canvas?.width || 1280, ctx.canvas?.height || 720);
        ctx.save();
        
        // Use DesignSystem if available
        if (this.ds) {
            // Background gradient
            const gradient = this.ds.verticalGradient(ctx, y, height, [
                [0, this.ds.colors.alpha(this.ds.colors.background.panel, alpha)],
                [1, this.ds.colors.alpha(this.ds.colors.background.dark, alpha)]
            ]);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, width, height);
            
            // Border
            ctx.strokeStyle = this.ds.colors.alpha(this.ds.colors.text.primary, 0.1);
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, width, height);
            
            // Corner accents
            this.ds.drawCornerAccents(ctx, x, y, width, height);
        } else {
            // Legacy fallback
            const gradient = ctx.createLinearGradient(x, y, x, y + height);
            gradient.addColorStop(0, `rgba(35, 35, 45, ${alpha})`);
            gradient.addColorStop(1, `rgba(25, 25, 35, ${alpha})`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, width, height);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, width, height);
            
            // Corner accents
            const cornerSize = 8;
            ctx.fillStyle = '#4a9eff';
            ctx.fillRect(x - 1, y - 1, cornerSize, 2);
            ctx.fillRect(x - 1, y - 1, 2, cornerSize);
            ctx.fillRect(x + width - cornerSize + 1, y - 1, cornerSize, 2);
            ctx.fillRect(x + width - 1, y - 1, 2, cornerSize);
            ctx.fillRect(x - 1, y + height - 1, cornerSize, 2);
            ctx.fillRect(x - 1, y + height - cornerSize + 1, 2, cornerSize);
            ctx.fillRect(x + width - cornerSize + 1, y + height - 1, cornerSize, 2);
            ctx.fillRect(x + width - 1, y + height - cornerSize + 1, 2, cornerSize);
        }
        
        ctx.restore();
    }
    
    /**
     * Draw menu title with underline decoration
     */
    drawTitle(ctx, title, canvasWidth, canvasHeight, yPosition = 0.12) {
        this._ensureDS(canvasWidth, canvasHeight);
        
        if (this.ds) {
            this.ds.drawTitle(ctx, title, yPosition * 100);
            return;
        }
        
        // Legacy fallback
        const sizes = this.getFontSizes(canvasHeight);
        
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.shadowColor = '#4a9eff';
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${sizes.title}px 'Cinzel', serif`;
        ctx.fillText(title, canvasWidth / 2, canvasHeight * yPosition);
        
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
        ctx.shadowBlur = 10;
        ctx.fillRect(canvasWidth / 2 - lineWidth / 2, lineY, lineWidth, 1.5);
        
        ctx.restore();
    }
    
    /**
     * Draw menu options with standard styling
     * @param {Array} options - Array of option strings or objects {text, color, disabled}
     * @param {number} selectedIndex - Currently selected option index
     * @param {number} startY - Y position ratio (0-1) where menu starts
     * @param {number} spacing - Spacing between options as ratio (0-1)
     */
    drawMenuOptions(ctx, options, selectedIndex, canvasWidth, canvasHeight, startY = 0.45, spacing = 0.10) {
        this._ensureDS(canvasWidth, canvasHeight);
        const sizes = this.getFontSizes(canvasHeight);
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const menuStartY = canvasHeight * startY;
        const menuSpacing = canvasHeight * spacing;
        const centerX = canvasWidth / 2;
        
        // Get colors from design system or use defaults
        const colors = this.ds ? this.ds.colors : {
            primary: '#4a9eff',
            primaryAlpha: (a) => `rgba(74, 158, 255, ${a})`,
            text: { primary: '#fff', secondary: '#ccc', disabled: '#555' }
        };
        
        options.forEach((option, index) => {
            const optionText = typeof option === 'string' ? option : option.text;
            const isDisabled = typeof option === 'object' && option.disabled;
            const customColor = typeof option === 'object' && option.color;
            
            const y = menuStartY + index * menuSpacing;
            const isSelected = index === selectedIndex;
            
            if (isSelected) {
                // Set font FIRST for accurate text measurement
                ctx.font = this.ds 
                    ? this.ds.font('lg', 'bold', 'display')
                    : `700 ${sizes.menu * 1.1}px 'Cinzel', serif`;
                
                // Measure actual text width
                const textWidth = ctx.measureText(optionText).width;
                
                // Use spacing from design system or fallback
                const indicatorOffset = this.ds ? this.ds.spacing(8) : 30;
                const bgPadding = this.ds ? this.ds.spacing(12) : 60;
                const bgWidth = textWidth + (indicatorOffset * 2) + bgPadding;
                const bgHeight = this.ds 
                    ? this.ds.height(this.ds.components.menuItem.height)
                    : sizes.menu * 1.8;
                
                // Draw selection highlight
                if (this.ds) {
                    this.ds.drawSelectionHighlight(ctx, centerX - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight);
                } else {
                    // Legacy gradient
                    const gradient = ctx.createLinearGradient(centerX - bgWidth / 2, 0, centerX + bgWidth / 2, 0);
                    gradient.addColorStop(0, 'rgba(74, 158, 255, 0)');
                    gradient.addColorStop(0.2, 'rgba(74, 158, 255, 0.15)');
                    gradient.addColorStop(0.8, 'rgba(74, 158, 255, 0.15)');
                    gradient.addColorStop(1, 'rgba(74, 158, 255, 0)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(centerX - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight);
                    
                    // Borders
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(centerX - bgWidth / 2 + 20, y - bgHeight / 2);
                    ctx.lineTo(centerX + bgWidth / 2 - 20, y - bgHeight / 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(centerX - bgWidth / 2 + 20, y + bgHeight / 2);
                    ctx.lineTo(centerX + bgWidth / 2 - 20, y + bgHeight / 2);
                    ctx.stroke();
                }
                
                // Draw text with glow
                ctx.fillStyle = colors.text.primary;
                if (this.ds) {
                    this.ds.applyShadow(ctx, 'glow');
                } else {
                    ctx.shadowColor = '#4a9eff';
                    ctx.shadowBlur = 15;
                }
                ctx.fillText(optionText, centerX, y);
                
                if (this.ds) {
                    this.ds.clearShadow(ctx);
                } else {
                    ctx.shadowBlur = 0;
                }
                
                // Draw selection indicators (diamonds)
                const indicatorSize = this.ds ? this.ds.fontSize('sm') : sizes.menu * 0.6;
                ctx.font = `${indicatorSize}px Arial`;
                ctx.fillStyle = colors.primary;
                if (this.ds) {
                    this.ds.applyShadow(ctx, 'glow');
                } else {
                    ctx.shadowColor = '#4a9eff';
                    ctx.shadowBlur = 5;
                }
                ctx.fillText('❖', centerX - textWidth / 2 - indicatorOffset, y);
                ctx.fillText('❖', centerX + textWidth / 2 + indicatorOffset, y);
                
                if (this.ds) {
                    this.ds.clearShadow(ctx);
                } else {
                    ctx.shadowBlur = 0;
                }
            } else {
                // Normal state
                ctx.font = this.ds
                    ? this.ds.font('md', 'normal', 'body')
                    : `400 ${sizes.menu}px 'Lato', sans-serif`;
                
                if (isDisabled) {
                    ctx.fillStyle = colors.text.disabled;
                } else if (customColor) {
                    ctx.fillStyle = customColor;
                } else {
                    ctx.fillStyle = colors.text.secondary;
                }
                
                // Subtle shadow for readability
                if (this.ds) {
                    this.ds.applyShadow(ctx, 'sm');
                } else {
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.shadowBlur = 4;
                }
                ctx.fillText(optionText, centerX, y);
                
                if (this.ds) {
                    this.ds.clearShadow(ctx);
                } else {
                    ctx.shadowBlur = 0;
                }
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
        this._ensureDS(canvasWidth, canvasHeight);
        const sizes = this.getFontSizes(canvasHeight);
        const menuStartY = canvasHeight * startY;
        const lineHeight = canvasHeight * spacing;
        
        // Get colors from design system or use defaults
        const colors = this.ds ? this.ds.colors : {
            primary: '#4a9eff',
            primaryAlpha: (a) => `rgba(74, 158, 255, ${a})`,
            text: { primary: '#fff', secondary: '#aaa', muted: '#888' },
            background: { elevated: 'rgba(255, 255, 255, 0.1)' }
        };
        
        // Draw panel background for settings
        // Widen panel to 0.8 to match tabs (4 tabs * 0.2 width)
        const panelWidth = canvasWidth * 0.8;
        // Height based on visible options with proper padding for selection highlights
        const displayCount = scrollInfo ? scrollInfo.maxVisible : options.length;
        const topPadding = lineHeight * 0.6; // Extra padding at top for first item's highlight
        const bottomPadding = lineHeight * 0.5; // Padding at bottom
        const panelHeight = displayCount * lineHeight + topPadding + bottomPadding;
        
        const panelX = (canvasWidth - panelWidth) / 2;
        const panelY = menuStartY - topPadding; // Panel starts above first item to contain highlight
        
        this.drawPanel(ctx, panelX, panelY, panelWidth, panelHeight);
        
        // Draw Scrollbar if needed
        if (scrollInfo && scrollInfo.total > scrollInfo.maxVisible) {
            const scrollbarWidth = this.ds ? this.ds.spacing(2) : 6;
            const scrollPadding = this.ds ? this.ds.spacing(5) : 20;
            const scrollbarX = panelX + panelWidth - scrollPadding;
            const scrollbarY = panelY + scrollPadding;
            const scrollbarHeight = panelHeight - (scrollPadding * 2);
            
            // Track
            ctx.fillStyle = colors.background.elevated;
            ctx.fillRect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight);
            
            // Thumb
            const minThumbHeight = this.ds ? this.ds.spacing(8) : 30;
            const thumbHeight = Math.max(minThumbHeight, (scrollInfo.maxVisible / scrollInfo.total) * scrollbarHeight);
            const maxScroll = scrollInfo.total - scrollInfo.maxVisible;
            const scrollRatio = scrollInfo.offset / maxScroll;
            const thumbY = scrollbarY + (scrollRatio * (scrollbarHeight - thumbHeight));
            
            ctx.fillStyle = colors.primary;
            ctx.fillRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight);
        }
        
        const itemPadding = this.ds ? this.ds.spacing(5) : 20;
        const itemMargin = this.ds ? this.ds.spacing(10) : 40;
        
        options.forEach((option, index) => {
            const y = menuStartY + (index * lineHeight);
            const isSelected = index === selectedIndex;
            
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            
            // Selection highlight (Glass bar)
            if (isSelected) {
                if (this.ds) {
                    this.ds.drawSelectionHighlight(
                        ctx, 
                        panelX + itemPadding, 
                        y - lineHeight/2 + 5, 
                        panelWidth - (itemPadding * 2), 
                        lineHeight - 10
                    );
                } else {
                    // Legacy gradient highlight
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
                }
                
                ctx.fillStyle = colors.text.primary;
                ctx.font = this.ds 
                    ? this.ds.font('md', 'bold', 'body')
                    : `700 ${sizes.menu}px 'Lato', sans-serif`;
            } else {
                ctx.fillStyle = colors.text.secondary;
                ctx.font = this.ds
                    ? this.ds.font('md', 'normal', 'body')
                    : `400 ${sizes.menu}px 'Lato', sans-serif`;
            }
            
            // Draw Name
            ctx.fillText(option.name, panelX + itemMargin, y);
            
            // Draw Value
            if (option.value !== undefined) {
                ctx.textAlign = 'right';
                ctx.fillStyle = isSelected ? colors.primary : colors.text.muted;
                ctx.fillText(option.value, panelX + panelWidth - itemMargin, y);
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
        this._ensureDS(canvasWidth, canvasHeight);
        const sizes = this.getFontSizes(canvasHeight);
        const listStartY = canvasHeight * startY;
        const lineHeight = canvasHeight * spacing;
        const boxWidth = canvasWidth * 0.8;
        const boxHeight = lineHeight * 0.85;
        
        const colors = this.ds ? this.ds.colors : {
            primary: '#4a9eff',
            primaryAlpha: (a) => `rgba(74, 158, 255, ${a})`,
            text: { primary: '#fff', secondary: '#ccc', muted: '#888', disabled: '#666' },
            background: { surface: 'rgba(30, 30, 40, 0.4)', border: 'rgba(255, 255, 255, 0.1)' }
        };
        
        items.forEach((item, index) => {
            const y = listStartY + index * lineHeight;
            const isSelected = showSelection && index === selectedIndex;
            const boxX = canvasWidth / 2 - boxWidth / 2;
            const boxY = y - boxHeight * 0.5;
            
            // Draw item box (Glass style)
            if (isSelected) {
                // Selected: Brighter glass
                if (this.ds) {
                    this.ds.drawSelectionHighlight(ctx, boxX, boxY, boxWidth, boxHeight);
                    ctx.strokeStyle = colors.primary;
                    ctx.lineWidth = 2;
                    this.ds.applyShadow(ctx, 'glow');
                    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
                    this.ds.clearShadow(ctx);
                } else {
                    const gradient = ctx.createLinearGradient(boxX, boxY, boxX + boxWidth, boxY + boxHeight);
                    gradient.addColorStop(0, 'rgba(74, 158, 255, 0.1)');
                    gradient.addColorStop(1, 'rgba(74, 158, 255, 0.2)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
                    
                    ctx.strokeStyle = '#4a9eff';
                    ctx.lineWidth = 2;
                    ctx.shadowColor = '#4a9eff';
                    ctx.shadowBlur = 10;
                    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
                    ctx.shadowBlur = 0;
                }
            } else {
                // Normal: Dark glass
                ctx.fillStyle = colors.background.surface || 'rgba(30, 30, 40, 0.4)';
                ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
                ctx.strokeStyle = colors.background.border || 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 1;
            }
            
            if (item.isEmpty) {
                ctx.setLineDash([5, 5]);
            } else {
                ctx.setLineDash([]);
            }
            
            if (!isSelected) {
                ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
            }
            ctx.setLineDash([]);
            
            // Item name
            const itemPadding = this.ds ? this.ds.spacing(5) : 20;
            const itemPaddingSmall = this.ds ? this.ds.spacing(3) : 10;
            
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillStyle = isSelected ? colors.text.primary : (item.isEmpty ? colors.text.disabled : colors.text.secondary);
            ctx.font = this.ds 
                ? this.ds.font('sm', 'bold', 'body')
                : `700 ${sizes.subtitle}px 'Lato', sans-serif`;
            
            if (isSelected && this.ds) {
                this.ds.applyShadow(ctx, 'sm');
            } else if (isSelected) {
                ctx.shadowColor = '#4a9eff';
                ctx.shadowBlur = 5;
            }
            
            ctx.fillText(item.name, boxX + itemPadding, boxY + itemPaddingSmall);
            
            if (this.ds) {
                this.ds.clearShadow(ctx);
            } else {
                ctx.shadowBlur = 0;
            }
            
            // Item details (if exists)
            if (item.details) {
                ctx.font = this.ds 
                    ? this.ds.font('xs', 'normal', 'body')
                    : `${sizes.detail}px 'Lato', sans-serif`;
                ctx.fillStyle = isSelected ? colors.primary : colors.text.muted;
                ctx.fillText(item.details, boxX + itemPadding, boxY + itemPaddingSmall + sizes.subtitle * 1.2);
            }
        });
    }
    

    /**
     * Draw hint text at bottom of screen
     */
    drawHint(ctx, text, canvasWidth, canvasHeight, yPosition = 0.95) {
        this._ensureDS(canvasWidth, canvasHeight);
        
        if (this.ds) {
            this.ds.drawHint(ctx, text, yPosition);
        } else {
            // Legacy fallback
            const sizes = this.getFontSizes(canvasHeight);
            ctx.fillStyle = '#888';
            ctx.font = `italic ${sizes.hint}px 'Lato', sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(text, canvasWidth / 2, canvasHeight * yPosition);
        }
    }
    
    /**
     * Draw instruction text
     */
    drawInstruction(ctx, text, canvasWidth, canvasHeight, yPosition = 0.22) {
        this._ensureDS(canvasWidth, canvasHeight);
        
        if (this.ds) {
            this.ds.drawInstruction(ctx, text, yPosition);
        } else {
            // Legacy fallback
            const sizes = this.getFontSizes(canvasHeight);
            ctx.fillStyle = '#4a9eff';
            ctx.font = `${sizes.instruction}px 'Lato', sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(text, canvasWidth / 2, canvasHeight * yPosition);
        }
    }
    
    /**
     * Draw overlay background (Glassmorphism blur simulation)
     */
    drawOverlay(ctx, canvasWidth, canvasHeight, alpha = 0.7) {
        this._ensureDS(canvasWidth, canvasHeight);
        
        if (this.ds) {
            this.ds.drawOverlay(ctx, alpha);
        } else {
            // Legacy fallback
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
    }
    
    /**
     * Draw scroll indicators (up/down arrows)
     */
    drawScrollIndicators(ctx, canvasWidth, canvasHeight, canScrollUp, canScrollDown, listY, listHeight) {
        this._ensureDS(canvasWidth, canvasHeight);
        
        const arrowSize = this.ds 
            ? this.ds.fontSize('sm') 
            : Math.min(20, canvasHeight * 0.035);
        const arrowOffset = this.ds 
            ? this.ds.spacing(6) 
            : canvasHeight * 0.03;
        
        const colors = this.ds ? this.ds.colors : { primary: '#4a9eff' };
        
        ctx.fillStyle = colors.primary;
        ctx.font = `${arrowSize}px Arial`;
        ctx.textAlign = 'center';
        
        if (canScrollUp) {
            ctx.fillText('▲', canvasWidth / 2, listY - arrowOffset);
        }
        
        if (canScrollDown) {
            ctx.fillText('▼', canvasWidth / 2, listY + listHeight + arrowOffset);
        }
    }

    /**
     * Draw a save slot item
     */
    drawSaveSlot(ctx, x, y, width, height, save, isSelected, isEmpty = false) {
        const canvasHeight = ctx.canvas.height;
        const canvasWidth = ctx.canvas.width;
        this._ensureDS(canvasWidth, canvasHeight);
        const sizes = this.getFontSizes(canvasHeight);
        
        const colors = this.ds ? this.ds.colors : {
            primary: '#4a9eff',
            primaryAlpha: (a) => `rgba(74, 158, 255, ${a})`,
            text: { primary: '#fff', secondary: '#ccc', muted: '#888' },
            background: { surface: 'rgba(0, 0, 0, 0.4)', border: 'rgba(255, 255, 255, 0.1)' }
        };
        
        // Background Panel
        if (isSelected) {
            if (this.ds) {
                this.ds.drawSelectionHighlight(ctx, x, y, width, height);
                ctx.strokeStyle = colors.primary;
                ctx.lineWidth = 2;
                this.ds.applyShadow(ctx, 'glow');
                ctx.strokeRect(x, y, width, height);
            } else {
                const gradient = ctx.createLinearGradient(x, y, x + width, y);
                gradient.addColorStop(0, 'rgba(74, 158, 255, 0.1)');
                gradient.addColorStop(0.5, 'rgba(74, 158, 255, 0.25)');
                gradient.addColorStop(1, 'rgba(74, 158, 255, 0.1)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, width, height);
                
                ctx.strokeStyle = '#4a9eff';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, width, height);
                ctx.shadowColor = '#4a9eff';
                ctx.shadowBlur = 10;
            }
        } else {
            ctx.fillStyle = colors.background.surface || 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(x, y, width, height);
            
            ctx.strokeStyle = colors.background.border || 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, width, height);
        }
        
        // Content
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (isEmpty) {
            ctx.fillStyle = isSelected ? colors.text.primary : colors.text.muted;
            ctx.font = this.ds 
                ? this.ds.font('sm', isSelected ? 'bold' : 'normal', 'display')
                : `${isSelected ? 'bold' : 'normal'} ${sizes.subtitle}px 'Cinzel', serif`;
            ctx.fillText('[ Empty Slot - New Save ]', x + width / 2, y + height / 2);
        } else {
            const centerY = y + height / 2;
            
            // Name
            ctx.fillStyle = isSelected ? colors.text.primary : colors.text.secondary;
            ctx.font = this.ds 
                ? this.ds.font('sm', 'bold', 'display')
                : `bold ${sizes.subtitle}px 'Cinzel', serif`;
            ctx.fillText(save.name, x + width / 2, centerY - height * 0.15);
            
            // Details
            ctx.fillStyle = isSelected ? colors.primary : colors.text.muted;
            ctx.font = this.ds 
                ? this.ds.font('xs', 'normal', 'body')
                : `${sizes.detail}px 'Lato', sans-serif`;
        }
        
        if (this.ds) {
            this.ds.clearShadow(ctx);
        } else {
            ctx.shadowBlur = 0;
        }
    }

    /**
     * Draw a generic list item with title and subtitle (details)
     */
    drawDetailedListItem(ctx, x, y, width, height, title, details, isSelected, isEmpty = false) {
        const canvasHeight = ctx.canvas.height;
        const canvasWidth = ctx.canvas.width;
        this._ensureDS(canvasWidth, canvasHeight);
        const sizes = this.getFontSizes(canvasHeight);
        
        const colors = this.ds ? this.ds.colors : {
            primary: '#4a9eff',
            primaryAlpha: (a) => `rgba(74, 158, 255, ${a})`,
            text: { primary: '#fff', secondary: '#ccc', muted: '#888' },
            background: { surface: 'rgba(30, 30, 40, 0.6)', border: 'rgba(255, 255, 255, 0.1)' }
        };
        
        // Background Panel
        if (isSelected) {
            if (this.ds) {
                this.ds.drawSelectionHighlight(ctx, x, y, width, height);
                ctx.strokeStyle = colors.primary;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, width, height);
                
                // Corner accents using design system
                const cornerSize = this.ds.spacing(2);
                this.ds.drawCornerAccents(ctx, x, y, width, height, cornerSize);
            } else {
                const gradient = ctx.createLinearGradient(x, y, x + width, y);
                gradient.addColorStop(0, 'rgba(74, 158, 255, 0.1)');
                gradient.addColorStop(0.5, 'rgba(74, 158, 255, 0.25)');
                gradient.addColorStop(1, 'rgba(74, 158, 255, 0.1)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, width, height);
                
                ctx.strokeStyle = '#4a9eff';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, width, height);
                
                // Corner accents (legacy)
                const cornerSize = 6;
                ctx.fillStyle = '#4a9eff';
                ctx.fillRect(x, y, cornerSize, 2);
                ctx.fillRect(x, y, 2, cornerSize);
                ctx.fillRect(x + width - cornerSize, y, cornerSize, 2);
                ctx.fillRect(x + width - 2, y, 2, cornerSize);
                ctx.fillRect(x, y + height - 2, cornerSize, 2);
                ctx.fillRect(x, y + height - cornerSize, 2, cornerSize);
                ctx.fillRect(x + width - cornerSize, y + height - 2, cornerSize, 2);
                ctx.fillRect(x + width - 2, y + height - cornerSize, 2, cornerSize);
            }
        } else {
            ctx.fillStyle = colors.background.surface || 'rgba(30, 30, 40, 0.6)';
            ctx.fillRect(x, y, width, height);
            
            ctx.strokeStyle = colors.background.border || 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, width, height);
        }
        
        // Content
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (isEmpty) {
            ctx.fillStyle = isSelected ? colors.text.primary : colors.text.muted;
            ctx.font = this.ds 
                ? this.ds.font('sm', isSelected ? 'bold' : 'normal', 'display')
                : `${isSelected ? 'bold' : 'normal'} ${sizes.subtitle}px 'Cinzel', serif`;
            if (isSelected) {
                if (this.ds) {
                    this.ds.applyShadow(ctx, 'glow');
                } else {
                    ctx.shadowColor = '#4a9eff';
                    ctx.shadowBlur = 10;
                }
            }
            ctx.fillText(title, x + width / 2, y + height / 2);
            if (this.ds) {
                this.ds.clearShadow(ctx);
            } else {
                ctx.shadowBlur = 0;
            }
        } else {
            const centerY = y + height / 2;
            
            // Title (Name)
            ctx.fillStyle = isSelected ? colors.text.primary : colors.text.secondary;
            ctx.font = this.ds 
                ? this.ds.font('sm', 'bold', 'display')
                : `bold ${sizes.subtitle}px 'Cinzel', serif`;
            if (isSelected) {
                if (this.ds) {
                    this.ds.applyShadow(ctx, 'glow');
                } else {
                    ctx.shadowColor = '#4a9eff';
                    ctx.shadowBlur = 10;
                }
            }
            ctx.fillText(title, x + width / 2, centerY - height * 0.15);
            if (this.ds) {
                this.ds.clearShadow(ctx);
            } else {
                ctx.shadowBlur = 0;
            }
            
            // Details
            ctx.fillStyle = isSelected ? colors.primary : colors.text.muted;
            ctx.font = this.ds 
                ? this.ds.font('xs', 'normal', 'body')
                : `${sizes.detail}px 'Lato', sans-serif`;
            ctx.fillText(details, x + width / 2, centerY + height * 0.25);
        }
    }

    /**
     * Draw a modal popup (e.g. for confirmations)
     */
    drawModal(ctx, title, message, options, selectedOption, canvasWidth, canvasHeight, warning = null) {
        console.log(`📦 drawModal called: ${title}, options: ${options.join(', ')}, selected: ${selectedOption}`);
        this._ensureDS(canvasWidth, canvasHeight);
        const sizes = this.getFontSizes(canvasHeight);
        
        const colors = this.ds ? this.ds.colors : {
            primary: '#4a9eff',
            primaryAlpha: (a) => `rgba(74, 158, 255, ${a})`,
            text: { primary: '#fff', secondary: '#ccc', muted: '#888' },
            background: { overlay: 'rgba(0, 0, 0, 0.85)', surface: '#1a1a1a', border: 'rgba(255, 255, 255, 0.1)' },
            danger: '#ff4444'
        };
        
        // Semi-transparent black background for modal overlay
        ctx.fillStyle = colors.background.overlay || 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Modal dimensions from design system or defaults
        const modalWidth = this.ds && this.ds.components?.modal?.width
            ? this.ds.width(this.ds.components.modal.width)
            : canvasWidth * 0.5;
        const modalHeight = this.ds && this.ds.components?.modal?.height
            ? this.ds.height(this.ds.components.modal.height)
            : canvasHeight * 0.4;
        const modalX = (canvasWidth - modalWidth) / 2;
        const modalY = (canvasHeight - modalHeight) / 2;
        
        // Modal Border
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 2;
        ctx.strokeRect(modalX, modalY, modalWidth, modalHeight);
        
        // Modal Background
        ctx.fillStyle = colors.background.surface || '#1a1a1a';
        ctx.fillRect(modalX, modalY, modalWidth, modalHeight);
        
        // Corner accents
        if (this.ds) {
            const cornerSize = this.ds.spacing(2);
            this.ds.drawCornerAccents(ctx, modalX, modalY, modalWidth, modalHeight, cornerSize);
        }
        
        // Title
        const titlePadding = this.ds ? this.ds.spacing(12) : 50;
        ctx.fillStyle = colors.text.primary;
        ctx.font = this.ds 
            ? this.ds.font('lg', 'bold', 'body')
            : `bold ${sizes.title * 0.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(title, canvasWidth / 2, modalY + titlePadding);
        
        // Message
        const messagePadding = this.ds ? this.ds.spacing(24) : 100;
        ctx.font = this.ds 
            ? this.ds.font('md', 'normal', 'body')
            : `${sizes.menu}px Arial`;
        ctx.fillStyle = colors.text.secondary;
        ctx.fillText(message, canvasWidth / 2, modalY + messagePadding);
        
        // Warning (optional)
        if (warning) {
            const warningPadding = this.ds ? this.ds.spacing(32) : 140;
            ctx.fillStyle = colors.danger || '#ff4444';
            ctx.font = this.ds 
                ? this.ds.font('sm', 'normal', 'body')
                : `italic ${sizes.menu * 0.8}px Arial`;
            ctx.fillText(warning, canvasWidth / 2, modalY + warningPadding);
        }
        
        // Options
        const optionOffset = this.ds ? this.ds.spacing(15) : 60;
        const optionY = modalY + modalHeight - optionOffset;
        const optionSpacing = modalWidth / options.length;
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        options.forEach((opt, index) => {
            const optX = modalX + (optionSpacing * index) + (optionSpacing / 2);
            const isSelected = index === selectedOption;
            
            // Button Box Dimensions
            const btnWidth = optionSpacing * 0.8;
            const btnHeight = this.ds 
                ? this.ds.height(this.ds.components.button.height)
                : sizes.menu * 2.2;
            const btnX = optX - btnWidth / 2;
            const btnY = optionY - btnHeight / 2;
            
            if (isSelected) {
                if (this.ds) {
                    this.ds.drawSelectionHighlight(ctx, btnX, btnY, btnWidth, btnHeight);
                    ctx.strokeStyle = colors.primary;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);
                    
                    // Corner accents
                    const cornerSize = this.ds.spacing(1);
                    this.ds.drawCornerAccents(ctx, btnX, btnY, btnWidth, btnHeight, cornerSize);
                    
                    // Text
                    ctx.fillStyle = colors.text.primary;
                    ctx.font = this.ds.font('md', 'bold', 'body');
                    this.ds.applyShadow(ctx, 'glow');
                    ctx.fillText(opt, optX, optionY);
                    this.ds.clearShadow(ctx);
                } else {
                    // Legacy selected button
                    const gradient = ctx.createLinearGradient(btnX, btnY, btnX + btnWidth, btnY + btnHeight);
                    gradient.addColorStop(0, 'rgba(74, 158, 255, 0.1)');
                    gradient.addColorStop(0.5, 'rgba(74, 158, 255, 0.25)');
                    gradient.addColorStop(1, 'rgba(74, 158, 255, 0.1)');
                    
                    ctx.fillStyle = gradient;
                    ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
                    
                    ctx.strokeStyle = '#4a9eff';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);
                    
                    // Corner accents
                    const cornerSize = 4;
                    ctx.fillStyle = '#4a9eff';
                    ctx.fillRect(btnX, btnY, cornerSize, 2);
                    ctx.fillRect(btnX, btnY, 2, cornerSize);
                    ctx.fillRect(btnX + btnWidth - cornerSize, btnY, cornerSize, 2);
                    ctx.fillRect(btnX + btnWidth - 2, btnY, 2, cornerSize);
                    ctx.fillRect(btnX, btnY + btnHeight - 2, cornerSize, 2);
                    ctx.fillRect(btnX, btnY + btnHeight - cornerSize, 2, cornerSize);
                    ctx.fillRect(btnX + btnWidth - cornerSize, btnY + btnHeight - 2, cornerSize, 2);
                    ctx.fillRect(btnX + btnWidth - 2, btnY + btnHeight - cornerSize, 2, cornerSize);
                    
                    // Text
                    ctx.fillStyle = '#fff';
                    ctx.font = `bold ${sizes.menu}px Arial`;
                    ctx.shadowColor = '#4a9eff';
                    ctx.shadowBlur = 10;
                    ctx.fillText(opt, optX, optionY);
                    ctx.shadowBlur = 0;
                }
            } else {
                // Unselected button
                ctx.fillStyle = this.ds 
                    ? (colors.background.surface || 'rgba(30, 30, 40, 0.6)')
                    : 'rgba(30, 30, 40, 0.6)';
                ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
                
                ctx.strokeStyle = colors.background.border || 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 1;
                ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);
                
                // Text
                ctx.fillStyle = colors.text.muted;
                ctx.font = this.ds 
                    ? this.ds.font('md', 'normal', 'body')
                    : `${sizes.menu}px Arial`;
                ctx.fillText(opt, optX, optionY);
            }
        });
    }
}

// Export for use in other files
window.MenuRenderer = MenuRenderer;
