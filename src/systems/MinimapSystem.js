/**
 * MinimapSystem - Renders a small corner minimap showing the world grid
 * 
 * Features:
 * - Shows nearby world cells color-coded by biome
 * - Blinking player dot at current position
 * - Fog of war (only visited cells revealed)
 * - Toggle with N key
 * - Hidden during battles, menus, cutscenes
 * - Semi-transparent, non-intrusive overlay
 */
class MinimapSystem {
    // Biome colors matching WorldMapState
    static BIOME_COLORS = {
        'village':        '#A0805A',
        'grassland':      '#7CCD7C',
        'woodland':       '#3CB371',
        'dense-forest':   '#1E6B1E',
        'meadow':         '#A8E6A0',
        'plains':         '#C8B560',
        'desert':         '#E0C890',
        'arid-desert':    '#C8A860',
        'oasis':          '#40B0A0',
        'mountain':       '#9E9E9E',
        'high-mountain':  '#787878',
        'volcanic':       '#C03030',
        'snow':           '#E8F0F8',
        'tundra':         '#A0B8D0',
        'frozen-peak':    '#D0E8F0',
        'tropical':       '#50C050',
        'jungle':         '#207820',
        'swamp':          '#556B2F',
        'coast':          '#70B8E0',
        'lake':           '#4070C0',
        'river-valley':   '#508888'
    };

    constructor(game) {
        this.game = game;

        // Visibility
        this.visible = true;

        // Layout
        this.viewRadius = 4;             // Show 4 cells in each direction (9×9 grid)
        this.cellSize = 16;              // Pixels per cell
        this.padding = 12;              // Padding inside frame
        this.margin = 16;               // Margin from canvas edge

        // Derived
        this.gridDiameter = this.viewRadius * 2 + 1; // 9
        this.mapSize = this.gridDiameter * this.cellSize; // 144
        // Cache is 2 cells wider/taller for smooth sub-cell scrolling
        this.cacheGridDiameter = this.gridDiameter + 2; // 11
        this.cacheSize = this.cacheGridDiameter * this.cellSize; // 176

        // Player dot animation
        this.pulseTimer = 0;
        this.pulseSpeed = 2.5; // Hz

        // Fog of war: Set of visited map IDs
        this.visitedCells = new Set();

        // Offscreen canvas for caching the minimap tiles
        this.cacheCanvas = null;
        this.cacheCtx = null;
        this.cachedCenterX = null;
        this.cachedCenterY = null;
        this.cacheValid = false;

        // Compass labels
        this.compassLabels = ['N', 'E', 'S', 'W'];
    }

    /**
     * Toggle minimap visibility
     */
    toggle() {
        this.visible = !this.visible;
    }

    /**
     * Mark a map cell as visited (call on every map load)
     */
    markVisited(mapId) {
        this.visitedCells.add(mapId);
        // Invalidate cache since fog of war changed
        this.cacheValid = false;
    }

    /**
     * Parse map ID string to grid coordinates
     * Handles format like "3--5" (gridX=3, gridY=-5)
     */
    parseMapId(mapId) {
        const match = mapId.match(/^(-?\d+)-(-?\d+)$/);
        if (!match) return null;
        return { x: parseInt(match[1]), y: parseInt(match[2]) };
    }

    /**
     * Build a map ID from grid coordinates
     */
    buildMapId(x, y) {
        return `${x}-${y}`;
    }

    /**
     * Update (animation timers)
     */
    update(deltaTime) {
        this.pulseTimer += deltaTime;
    }

    /**
     * Ensure offscreen canvas exists and is correctly sized
     */
    ensureCache() {
        if (!this.cacheCanvas) {
            this.cacheCanvas = document.createElement('canvas');
            this.cacheCanvas.width = this.cacheSize;
            this.cacheCanvas.height = this.cacheSize;
            this.cacheCtx = this.cacheCanvas.getContext('2d');
        }
    }

    /**
     * Rebuild the cached tile grid
     */
    rebuildCache(centerX, centerY) {
        this.ensureCache();
        const ctx = this.cacheCtx;
        const cs = this.cellSize;
        const r = this.viewRadius + 1; // +1 extra cell on each side for scrolling

        // Clear
        ctx.clearRect(0, 0, this.cacheSize, this.cacheSize);

        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const gx = centerX + dx;
                // Flip Y: negative dy = top of screen = north = higher grid Y
                const gy = centerY - dy;
                const mapId = this.buildMapId(gx, gy);
                const px = (dx + r) * cs;
                const py = (dy + r) * cs;

                // Check if cell exists in map data
                const mapData = this.game.mapManager?.getMapData(mapId);
                if (!mapData) {
                    // Out of bounds — dark void
                    ctx.fillStyle = 'rgba(10, 10, 15, 0.9)';
                    ctx.fillRect(px, py, cs, cs);
                    continue;
                }

                // Check fog of war
                if (!this.visitedCells.has(mapId)) {
                    // Unvisited — dark with subtle hint
                    ctx.fillStyle = 'rgba(20, 20, 30, 0.85)';
                    ctx.fillRect(px, py, cs, cs);

                    // Subtle question mark
                    ctx.fillStyle = 'rgba(100, 100, 120, 0.3)';
                    ctx.font = `${Math.floor(cs * 0.5)}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('?', px + cs / 2, py + cs / 2);
                    continue;
                }

                // Visited — draw biome color
                const biome = mapData.biome || 'grassland';
                const color = MinimapSystem.BIOME_COLORS[biome] || '#666666';
                ctx.fillStyle = color;
                ctx.fillRect(px, py, cs, cs);

                // Subtle cell border
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(px + 0.5, py + 0.5, cs - 1, cs - 1);
            }
        }

        this.cachedCenterX = centerX;
        this.cachedCenterY = centerY;
        this.cacheValid = true;
    }

    /**
     * Main render — draws the minimap on the HUD canvas
     */
    render(ctx) {
        if (!this.visible) return;
        if (!this.game.currentMapId) return;

        const pos = this.parseMapId(this.game.currentMapId);
        if (!pos) return;

        const centerX = pos.x;
        const centerY = pos.y;

        // Rebuild cache if player moved to a different cell
        if (!this.cacheValid || this.cachedCenterX !== centerX || this.cachedCenterY !== centerY) {
            this.rebuildCache(centerX, centerY);
        }

        const canvasW = this.game.CANVAS_WIDTH;
        const canvasH = this.game.CANVAS_HEIGHT;
        const cs = this.cellSize;
        const r = this.viewRadius;

        // Position: bottom-right corner
        const frameW = this.mapSize + this.padding * 2;
        const frameH = this.mapSize + this.padding * 2;
        const frameX = canvasW - frameW - this.margin;
        const frameY = canvasH - frameH - this.margin;

        ctx.save();

        // ── Frame background ──
        // Rounded rect with semi-transparent dark background
        const cornerRadius = 8;
        ctx.beginPath();
        this.roundRect(ctx, frameX, frameY, frameW, frameH, cornerRadius);
        ctx.fillStyle = 'rgba(10, 12, 18, 0.75)';
        ctx.fill();

        // Frame border
        ctx.strokeStyle = 'rgba(180, 190, 210, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // ── Sub-cell position for grid scrolling ──
        let subX = 0.5, subY = 0.5;
        if (this.game.player) {
            subX = this.game.player.x / this.game.WORLD_WIDTH;
            // Flip Y: higher game Y = north = up on minimap
            subY = 1.0 - (this.game.player.y / this.game.WORLD_HEIGHT);
            subX = Math.max(0, Math.min(1, subX));
            subY = Math.max(0, Math.min(1, subY));
        }

        // ── Draw cached tile grid with sub-cell scrolling ──
        // Offset grid so player is always at exact center of the minimap.
        // The cache has 1 extra cell on each side to fill gaps during scrolling.
        const mapX = frameX + this.padding;
        const mapY = frameY + this.padding;

        // Sub-cell offset: at subX=0.5 player is cell-center → no shift
        const scrollOffsetX = -(subX - 0.5) * cs;
        const scrollOffsetY = -(subY - 0.5) * cs;

        // The cache is 1 cell larger on each side, so its origin is shifted by -1 cell relative to display
        const cacheDrawX = mapX + scrollOffsetX - cs; // -cs to account for extra cell
        const cacheDrawY = mapY + scrollOffsetY - cs;

        // Clip to the minimap frame so the extra cache cells don't overflow
        ctx.save();
        ctx.beginPath();
        ctx.rect(mapX, mapY, this.mapSize, this.mapSize);
        ctx.clip();
        ctx.drawImage(this.cacheCanvas, cacheDrawX, cacheDrawY);
        ctx.restore();

        // ── Player position dot — always at exact center ──
        const dotX = mapX + this.mapSize / 2;
        const dotY = mapY + this.mapSize / 2;

        // Pulsing glow
        const pulse = 0.5 + 0.5 * Math.sin(this.pulseTimer * this.pulseSpeed * Math.PI * 2);
        const glowRadius = 4 + pulse * 2;

        // Outer glow
        ctx.beginPath();
        ctx.arc(dotX, dotY, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 200, 255, ${0.15 + pulse * 0.15})`;
        ctx.fill();

        // Inner dot
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // ── Current cell highlight border (scrolls with grid) ──
        const cellHighlightX = mapX + r * cs + scrollOffsetX;
        const cellHighlightY = mapY + r * cs + scrollOffsetY;
        ctx.save();
        ctx.beginPath();
        ctx.rect(mapX, mapY, this.mapSize, this.mapSize);
        ctx.clip();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + pulse * 0.2})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cellHighlightX + 0.5, cellHighlightY + 0.5, cs - 1, cs - 1);
        ctx.restore();

        // ── Compass labels ──
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(200, 210, 230, 0.6)';

        const midX = mapX + this.mapSize / 2;
        const midY = mapY + this.mapSize / 2;

        // N (top)
        ctx.fillText('N', midX, mapY - 5);
        // S (bottom)
        ctx.fillText('S', midX, mapY + this.mapSize + 7);
        // W (left)
        ctx.fillText('W', mapX - 7, midY);
        // E (right)
        ctx.fillText('E', mapX + this.mapSize + 7, midY);

        // ── Region name label ──
        const mapData = this.game.mapManager?.getMapData(this.game.currentMapId);
        if (mapData?.region) {
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = 'rgba(220, 225, 240, 0.7)';
            const labelX = frameX + frameW / 2;
            const labelY = frameY - 4;
            ctx.fillText(mapData.region, labelX, labelY);
        }

        ctx.restore();
    }

    /**
     * Draw a rounded rectangle path
     */
    roundRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    /**
     * Serialize for save data
     */
    serialize() {
        return {
            visitedCells: Array.from(this.visitedCells),
            visible: this.visible
        };
    }

    /**
     * Deserialize from save data
     */
    deserialize(data) {
        if (data?.visitedCells) {
            this.visitedCells = new Set(data.visitedCells);
        }
        if (data?.visible !== undefined) {
            this.visible = data.visible;
        }
        this.cacheValid = false;
    }
}

// Export
window.MinimapSystem = MinimapSystem;
