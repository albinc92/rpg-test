/**
 * DesignSystem - Centralized design tokens and UI utilities
 * Provides consistent, scalable styling across all game UI
 * 
 * Design Principles:
 * - All sizes are relative to canvas dimensions
 * - Colors are defined once and referenced everywhere
 * - Spacing follows a consistent scale
 * - Components have standardized configurations
 */

class DesignSystem {
    constructor() {
        // Base unit is 1% of the smaller canvas dimension
        // This ensures consistent proportions across aspect ratios
        this.baseUnit = 1;
        
        // Initialize with default dimensions (will be updated on render)
        this.canvasWidth = 1280;
        this.canvasHeight = 720;
        
        this._initializeTokens();
    }
    
    /**
     * Update dimensions - call at start of each render
     */
    setDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        // Base unit = 1% of the smaller dimension for consistent scaling
        this.baseUnit = Math.min(width, height) / 100;
    }
    
    /**
     * Initialize all design tokens
     */
    _initializeTokens() {
        // ═══════════════════════════════════════════════════════════════
        // COLOR PALETTE
        // ═══════════════════════════════════════════════════════════════
        this.colors = {
            // Primary brand color (cyan/blue)
            primary: '#4a9eff',
            primaryDark: '#3a7ecc',
            primaryLight: '#6ab4ff',
            
            // Semantic colors
            success: '#4ade80',
            warning: '#fbbf24',
            danger: '#ef4444',
            
            // Text colors
            text: {
                primary: '#ffffff',
                secondary: '#cccccc',
                muted: '#888888',
                disabled: '#555555',
                inverse: '#000000'
            },
            
            // Background colors
            background: {
                dark: '#0a0a0f',
                panel: '#1a1a24',
                elevated: '#252530',
                overlay: '#000000'
            },
            
            // Utility function for alpha variants
            alpha: (color, alpha) => {
                // Convert hex to rgba
                if (color.startsWith('#')) {
                    const r = parseInt(color.slice(1, 3), 16);
                    const g = parseInt(color.slice(3, 5), 16);
                    const b = parseInt(color.slice(5, 7), 16);
                    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                }
                return color;
            }
        };
        
        // Convenience method for primary alpha
        this.colors.primaryAlpha = (alpha) => this.colors.alpha(this.colors.primary, alpha);
        
        // ═══════════════════════════════════════════════════════════════
        // SPACING SCALE (based on 4-unit system)
        // ═══════════════════════════════════════════════════════════════
        // spacing(1) = 0.5% of smaller dimension
        // spacing(2) = 1%, spacing(4) = 2%, spacing(8) = 4%, etc.
        this.spacingScale = {
            0: 0,
            1: 0.5,   // ~4px at 720p
            2: 1,     // ~8px
            3: 1.5,   // ~12px
            4: 2,     // ~16px
            5: 2.5,   // ~20px
            6: 3,     // ~24px
            8: 4,     // ~32px
            10: 5,    // ~40px
            12: 6,    // ~48px
            16: 8,    // ~64px
            20: 10,   // ~80px
            24: 12    // ~96px
        };
        
        // ═══════════════════════════════════════════════════════════════
        // TYPOGRAPHY
        // ═══════════════════════════════════════════════════════════════
        this.typography = {
            // Font families
            families: {
                display: "'Cinzel', serif",      // Titles, headers
                body: "'Lato', sans-serif",      // Body text, menus
                mono: "'Consolas', monospace"    // Debug, code
            },
            
            // Font sizes as % of canvas height
            sizes: {
                xs: 2,      // ~14px at 720p
                sm: 2.5,    // ~18px
                md: 3.5,    // ~25px (base menu text)
                lg: 4.5,    // ~32px
                xl: 6,      // ~43px
                xxl: 8,     // ~58px (titles)
                display: 10 // ~72px (large titles)
            },
            
            // Font weights
            weights: {
                normal: 400,
                medium: 500,
                semibold: 600,
                bold: 700,
                black: 900
            },
            
            // Line heights (multipliers)
            lineHeights: {
                tight: 1.1,
                normal: 1.4,
                relaxed: 1.6
            }
        };
        
        // ═══════════════════════════════════════════════════════════════
        // COMPONENT CONFIGURATIONS
        // ═══════════════════════════════════════════════════════════════
        this.components = {
            // Button styles
            button: {
                height: 7,          // % of canvas height
                minWidth: 15,       // % of canvas width
                paddingX: 4,        // spacing units
                paddingY: 2,
                borderRadius: 0,    // Sharp corners for RPG feel
                borderWidth: 2
            },
            
            // Panel/Card styles
            panel: {
                padding: 4,         // spacing units
                borderWidth: 1,
                cornerAccentSize: 1 // spacing units
            },
            
            // Menu item styles
            menuItem: {
                height: 8,          // % of canvas height
                paddingX: 6,        // spacing units
                spacing: 2          // spacing units between items
            },
            
            // Tab styles
            tab: {
                height: 6,          // % of canvas height
                minWidth: 15,       // % of canvas width
                gap: 0.5            // spacing units
            },
            
            // Modal styles
            modal: {
                width: 50,          // % of canvas width
                height: 40,         // % of canvas height
                maxHeight: 70,      // % of canvas height
                padding: 6          // spacing units
            },
            
            // List item styles
            listItem: {
                height: 12,         // % of canvas height
                padding: 4          // spacing units
            },
            
            // Scrollbar styles
            scrollbar: {
                width: 1,           // spacing units
                thumbMinHeight: 5   // spacing units
            },
            
            // Selection indicator (diamonds)
            selectionIndicator: {
                size: 2,            // % of canvas height
                offset: 4           // spacing units from text
            }
        };
        
        // ═══════════════════════════════════════════════════════════════
        // LAYOUT POSITIONS (% of canvas)
        // ═══════════════════════════════════════════════════════════════
        this.layout = {
            // Standard title position
            title: {
                y: 12               // % from top
            },
            
            // Content area
            content: {
                top: 20,            // % from top
                bottom: 15,         // % from bottom
                paddingX: 10        // % padding on sides
            },
            
            // Footer area (for hints, instructions)
            footer: {
                y: 92               // % from top
            }
        };
        
        // ═══════════════════════════════════════════════════════════════
        // EFFECTS
        // ═══════════════════════════════════════════════════════════════
        this.effects = {
            // Shadow configurations
            shadow: {
                none: { blur: 0, offsetX: 0, offsetY: 0, color: 'transparent' },
                sm: { blur: 4, offsetX: 0, offsetY: 2, color: 'rgba(0,0,0,0.3)' },
                md: { blur: 8, offsetX: 0, offsetY: 4, color: 'rgba(0,0,0,0.4)' },
                lg: { blur: 16, offsetX: 0, offsetY: 8, color: 'rgba(0,0,0,0.5)' },
                glow: { blur: 15, offsetX: 0, offsetY: 0, color: '#4a9eff' }
            },
            
            // Transition durations (in seconds)
            transitions: {
                fast: 0.1,
                normal: 0.2,
                slow: 0.3
            }
        };
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Get spacing value in pixels
     * @param {number} scale - Spacing scale (1-24)
     */
    spacing(scale) {
        const percentage = this.spacingScale[scale] || scale * 0.5;
        return this.baseUnit * percentage;
    }
    
    /**
     * Get value as percentage of canvas width
     */
    width(percent) {
        return this.canvasWidth * (percent / 100);
    }
    
    /**
     * Get value as percentage of canvas height
     */
    height(percent) {
        return this.canvasHeight * (percent / 100);
    }
    
    /**
     * Get font size in pixels
     * @param {string} size - Size name (xs, sm, md, lg, xl, xxl, display)
     */
    fontSize(size) {
        const percentage = this.typography.sizes[size] || this.typography.sizes.md;
        return this.canvasHeight * (percentage / 100);
    }
    
    /**
     * Get complete font string for canvas
     * @param {string} size - Size name
     * @param {string} weight - Weight name (normal, medium, bold, black)
     * @param {string} family - Family name (display, body, mono)
     */
    font(size = 'md', weight = 'normal', family = 'body') {
        const sizeValue = this.fontSize(size);
        const weightValue = this.typography.weights[weight] || this.typography.weights.normal;
        const familyValue = this.typography.families[family] || this.typography.families.body;
        return `${weightValue} ${sizeValue}px ${familyValue}`;
    }
    
    /**
     * Apply shadow effect to canvas context
     */
    applyShadow(ctx, shadowName = 'none') {
        const shadow = this.effects.shadow[shadowName] || this.effects.shadow.none;
        ctx.shadowBlur = shadow.blur;
        ctx.shadowOffsetX = shadow.offsetX;
        ctx.shadowOffsetY = shadow.offsetY;
        ctx.shadowColor = shadow.color;
    }
    
    /**
     * Clear shadow effects
     */
    clearShadow(ctx) {
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowColor = 'transparent';
    }
    
    /**
     * Create a horizontal gradient
     */
    horizontalGradient(ctx, x, width, colorStops) {
        const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
        colorStops.forEach(([stop, color]) => gradient.addColorStop(stop, color));
        return gradient;
    }
    
    /**
     * Create a vertical gradient
     */
    verticalGradient(ctx, y, height, colorStops) {
        const gradient = ctx.createLinearGradient(0, y, 0, y + height);
        colorStops.forEach(([stop, color]) => gradient.addColorStop(stop, color));
        return gradient;
    }
    
    /**
     * Draw corner accents (RPG-style decoration)
     */
    drawCornerAccents(ctx, x, y, width, height, color = null) {
        const size = this.spacing(this.components.panel.cornerAccentSize) * 2;
        const thickness = 2;
        
        ctx.fillStyle = color || this.colors.primary;
        
        // Top-left
        ctx.fillRect(x - 1, y - 1, size, thickness);
        ctx.fillRect(x - 1, y - 1, thickness, size);
        
        // Top-right
        ctx.fillRect(x + width - size + 1, y - 1, size, thickness);
        ctx.fillRect(x + width - 1, y - 1, thickness, size);
        
        // Bottom-left
        ctx.fillRect(x - 1, y + height - 1, size, thickness);
        ctx.fillRect(x - 1, y + height - size + 1, thickness, size);
        
        // Bottom-right
        ctx.fillRect(x + width - size + 1, y + height - 1, size, thickness);
        ctx.fillRect(x + width - 1, y + height - size + 1, thickness, size);
    }
    
    /**
     * Draw a glass-style panel background
     */
    drawPanel(ctx, x, y, width, height, options = {}) {
        const {
            alpha = 0.6,
            showCorners = true,
            borderColor = null,
            backgroundColor = null
        } = options;
        
        ctx.save();
        
        // Background gradient
        const gradient = this.verticalGradient(ctx, y, height, [
            [0, backgroundColor || this.colors.alpha(this.colors.background.panel, alpha)],
            [1, backgroundColor || this.colors.alpha(this.colors.background.dark, alpha)]
        ]);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, height);
        
        // Border
        ctx.strokeStyle = borderColor || this.colors.alpha(this.colors.text.primary, 0.1);
        ctx.lineWidth = this.components.panel.borderWidth;
        ctx.strokeRect(x, y, width, height);
        
        // Corner accents
        if (showCorners) {
            this.drawCornerAccents(ctx, x, y, width, height);
        }
        
        ctx.restore();
    }
    
    /**
     * Draw selection highlight (glass bar with gradient)
     */
    drawSelectionHighlight(ctx, x, y, width, height) {
        // Gradient background
        const gradient = this.horizontalGradient(ctx, x, width, [
            [0, this.colors.primaryAlpha(0)],
            [0.15, this.colors.primaryAlpha(0.2)],
            [0.85, this.colors.primaryAlpha(0.2)],
            [1, this.colors.primaryAlpha(0)]
        ]);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, height);
        
        // Top/bottom accent lines - fade out at edges to match background
        const lineGradient = this.horizontalGradient(ctx, x, width, [
            [0, 'rgba(255, 255, 255, 0)'],
            [0.15, 'rgba(255, 255, 255, 0.2)'],
            [0.85, 'rgba(255, 255, 255, 0.2)'],
            [1, 'rgba(255, 255, 255, 0)']
        ]);
        
        ctx.strokeStyle = lineGradient;
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x, y + height);
        ctx.lineTo(x + width, y + height);
        ctx.stroke();
    }
    
    /**
     * Draw a button
     */
    drawButton(ctx, x, y, width, height, text, isSelected = false, isDisabled = false) {
        ctx.save();
        
        const btnX = x - width / 2;
        const btnY = y - height / 2;
        
        if (isSelected && !isDisabled) {
            // Selected state - glass highlight
            const gradient = this.horizontalGradient(ctx, btnX, width, [
                [0, this.colors.primaryAlpha(0.1)],
                [0.5, this.colors.primaryAlpha(0.25)],
                [1, this.colors.primaryAlpha(0.1)]
            ]);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(btnX, btnY, width, height);
            
            ctx.strokeStyle = this.colors.primary;
            ctx.lineWidth = this.components.button.borderWidth;
            ctx.strokeRect(btnX, btnY, width, height);
            
            this.drawCornerAccents(ctx, btnX, btnY, width, height);
            
            // Text
            ctx.fillStyle = this.colors.text.primary;
            ctx.font = this.font('md', 'bold', 'display');
            this.applyShadow(ctx, 'glow');
        } else {
            // Normal state
            ctx.fillStyle = this.colors.alpha(this.colors.background.elevated, 0.6);
            ctx.fillRect(btnX, btnY, width, height);
            
            ctx.strokeStyle = this.colors.alpha(this.colors.text.primary, 0.1);
            ctx.lineWidth = 1;
            ctx.strokeRect(btnX, btnY, width, height);
            
            // Text
            ctx.fillStyle = isDisabled ? this.colors.text.disabled : this.colors.text.muted;
            ctx.font = this.font('md', 'normal', 'body');
        }
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
        
        this.clearShadow(ctx);
        ctx.restore();
    }
    
    /**
     * Draw overlay with vignette effect
     */
    drawOverlay(ctx, alpha = 0.7) {
        // Dark overlay
        ctx.fillStyle = this.colors.alpha(this.colors.background.overlay, alpha);
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Vignette
        const gradient = ctx.createRadialGradient(
            this.canvasWidth / 2, this.canvasHeight / 2, this.canvasHeight * 0.3,
            this.canvasWidth / 2, this.canvasHeight / 2, this.canvasHeight * 0.8
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }
    
    /**
     * Draw title with underline decoration
     */
    drawTitle(ctx, text, yPercent = null) {
        const y = this.height(yPercent || this.layout.title.y);
        const centerX = this.canvasWidth / 2;
        
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Title text
        ctx.font = this.font('xxl', 'black', 'display');
        ctx.fillStyle = this.colors.text.primary;
        this.applyShadow(ctx, 'glow');
        ctx.fillText(text, centerX, y);
        this.clearShadow(ctx);
        
        // Underline decoration
        const textWidth = ctx.measureText(text).width;
        const lineWidth = textWidth * 0.8;
        const lineY = y + this.fontSize('xxl') * 0.5;
        
        const gradient = this.horizontalGradient(ctx, centerX - lineWidth / 2, lineWidth, [
            [0, this.colors.primaryAlpha(0)],
            [0.2, this.colors.primaryAlpha(0.8)],
            [0.8, this.colors.primaryAlpha(0.8)],
            [1, this.colors.primaryAlpha(0)]
        ]);
        
        ctx.fillStyle = gradient;
        this.applyShadow(ctx, 'glow');
        ctx.fillRect(centerX - lineWidth / 2, lineY, lineWidth, 2);
        
        ctx.restore();
    }
    
    /**
     * Draw hint text at bottom of screen
     * @param {number} yPosition - Y position as ratio (0-1) or percentage (1-100), defaults to footer position
     */
    drawHint(ctx, text, yPosition = null) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = this.font('xs', 'normal', 'body');
        ctx.fillStyle = this.colors.text.muted;
        
        // Use provided position or default to footer
        let y;
        if (yPosition === null) {
            y = this.height(this.layout.footer.y);
        } else {
            // Handle both ratio (0-1) and percentage (1-100) formats
            const yRatio = yPosition <= 1 ? yPosition : yPosition / 100;
            y = this.canvasHeight * yRatio;
        }
        
        ctx.fillText(text, this.canvasWidth / 2, y);
        ctx.restore();
    }
    
    /**
     * Draw instruction text
     * @param {number} yPosition - Y position as ratio (0-1) or percentage (1-100)
     */
    drawInstruction(ctx, text, yPosition = 0.22) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = this.font('sm', 'normal', 'body');
        ctx.fillStyle = this.colors.primary;
        // Handle both ratio (0-1) and percentage (1-100) formats
        const yRatio = yPosition <= 1 ? yPosition : yPosition / 100;
        ctx.fillText(text, this.canvasWidth / 2, this.canvasHeight * yRatio);
        ctx.restore();
    }
    
    /**
     * Draw scroll indicators
     */
    drawScrollIndicators(ctx, canScrollUp, canScrollDown, listY, listHeight) {
        const arrowSize = this.fontSize('sm');
        const offset = this.spacing(3);
        const centerX = this.canvasWidth / 2;
        
        ctx.save();
        ctx.font = `${arrowSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillStyle = this.colors.primary;
        
        if (canScrollUp) {
            ctx.fillText('▲', centerX, listY - offset);
        }
        
        if (canScrollDown) {
            ctx.fillText('▼', centerX, listY + listHeight + offset);
        }
        
        ctx.restore();
    }
}

// Create singleton instance
const designSystem = new DesignSystem();

// Export for use in other files
window.DesignSystem = DesignSystem;
window.ds = designSystem;
