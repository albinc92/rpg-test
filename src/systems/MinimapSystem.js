/**
 * MapCoords — single source of truth for map coordinate display.
 * Raw map IDs use -14..15 internally. Display uses 0..29 with (0,0) at bottom-left.
 */
class MapCoords {
    static GRID_MIN_X = -14;
    static GRID_MIN_Y = -14;

    /** Convert raw map-ID coords to display coords (0-based, 0,0 = bottom-left) */
    static toDisplay(rawX, rawY) {
        return {
            x: rawX - MapCoords.GRID_MIN_X,
            y: rawY - MapCoords.GRID_MIN_Y
        };
    }

    /** Format display string from raw coords */
    static formatDisplay(rawX, rawY) {
        const d = MapCoords.toDisplay(rawX, rawY);
        return `${d.x}, ${d.y}`;
    }
}
window.MapCoords = MapCoords;

/**
 * MinimapSystem - Renders a small corner minimap showing the world map image
 * 
 * Features:
 * - Shows the actual worldmap.webp image cropped to nearby area
 * - Grid overlay on top of the map image
 * - Blinking player dot at current position
 * - Fog of war (only visited cells revealed)
 * - Toggle with N key
 * - Hidden during battles, menus, cutscenes
 * - Semi-transparent, non-intrusive overlay
 */
class MinimapSystem {

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

        // World grid bounds (must match WorldMapState)
        this.gridMinX = -14;
        this.gridMaxX = 15;
        this.gridMinY = -14;
        this.gridMaxY = 15;
        this.gridCols = this.gridMaxX - this.gridMinX + 1; // 30
        this.gridRows = this.gridMaxY - this.gridMinY + 1; // 30

        // Player dot animation
        this.pulseTimer = 0;
        this.pulseSpeed = 2.5; // Hz

        // Fog of war: Set of visited map IDs
        this.visitedCells = new Set();

        // World map background image (shared static — loaded once)
        if (!MinimapSystem._bgImage) {
            MinimapSystem._bgImage = new Image();
            MinimapSystem._bgImage.src = 'assets/bg/worldmap.webp';
            MinimapSystem._bgLoaded = false;
            MinimapSystem._bgImage.onload = () => { MinimapSystem._bgLoaded = true; };
        }

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
     * Main render — draws the minimap on the HUD canvas
     */
    render(ctx) {
        if (!this.visible) return;
        if (!this.game.currentMapId) return;

        const pos = this.parseMapId(this.game.currentMapId);
        if (!pos) return;

        const centerX = pos.x;
        const centerY = pos.y;

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
        const cornerRadius = 8;
        ctx.beginPath();
        this.roundRect(ctx, frameX, frameY, frameW, frameH, cornerRadius);
        ctx.fillStyle = 'rgba(10, 12, 18, 0.75)';
        ctx.fill();

        // Frame border
        ctx.strokeStyle = 'rgba(180, 190, 210, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // ── Sub-cell position for smooth scrolling ──
        let subX = 0.5, subY = 0.5;
        if (this.game.player) {
            subX = this.game.player.x / this.game.WORLD_WIDTH;
            subY = this.game.player.y / this.game.WORLD_HEIGHT;
            subX = Math.max(0, Math.min(1, subX));
            subY = Math.max(0, Math.min(1, subY));
        }

        const mapX = frameX + this.padding;
        const mapY = frameY + this.padding;

        // Sub-cell scroll offset
        const scrollOffsetX = -(subX - 0.5) * cs;
        const scrollOffsetY = -(subY - 0.5) * cs;

        // Clip to minimap area
        ctx.save();
        ctx.beginPath();
        ctx.rect(mapX, mapY, this.mapSize, this.mapSize);
        ctx.clip();

        // ── Draw worldmap image ──
        if (MinimapSystem._bgLoaded && MinimapSystem._bgImage) {
            const img = MinimapSystem._bgImage;

            // The full grid in minimap pixels
            const fullGridW = this.gridCols * cs;
            const fullGridH = this.gridRows * cs;

            const gridOriginX = mapX + this.mapSize / 2 + (this.gridMinX - centerX) * cs + scrollOffsetX - cs / 2;
            const gridOriginY = mapY + this.mapSize / 2 + (centerY - this.gridMaxY) * cs + scrollOffsetY - cs / 2;

            ctx.drawImage(img, gridOriginX, gridOriginY, fullGridW, fullGridH);
        }

        // ── Draw grid lines + fog of war ──
        for (let dy = -r - 1; dy <= r + 1; dy++) {
            for (let dx = -r - 1; dx <= r + 1; dx++) {
                const gx = centerX + dx;
                const gy = centerY - dy; // flip Y
                const mapId = this.buildMapId(gx, gy);
                const px = mapX + (dx + r) * cs + scrollOffsetX;
                const py = mapY + (dy + r) * cs + scrollOffsetY;

                // Check if cell exists
                const mapData = this.game.mapManager?.getMapData(mapId);

                if (!mapData) {
                    // Out of bounds — dark void
                    ctx.fillStyle = 'rgba(10, 10, 15, 0.95)';
                    ctx.fillRect(px, py, cs, cs);
                    continue;
                }

                // Fog of war — unvisited cells
                if (!this.visitedCells.has(mapId)) {
                    ctx.fillStyle = 'rgba(15, 15, 25, 0.55)';
                    ctx.fillRect(px, py, cs, cs);
                    continue;
                }

                // Grid line for visited cells
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(px + 0.5, py + 0.5, cs - 1, cs - 1);
            }
        }

        ctx.restore(); // unclip

        // ── Player position dot — always at exact center ──
        const dotX = mapX + this.mapSize / 2;
        const dotY = mapY + this.mapSize / 2;

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

        // ── Current cell highlight border ──
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
        ctx.fillText('N', midX, mapY - 5);
        ctx.fillText('S', midX, mapY + this.mapSize + 7);
        ctx.fillText('W', mapX - 7, midY);
        ctx.fillText('E', mapX + this.mapSize + 7, midY);

        // ── Region name + coordinates label ──
        const currentMapData = this.game.mapManager?.getMapData(this.game.currentMapId);
        const coordStr = `(${MapCoords.formatDisplay(centerX, centerY)})`;
        const labelText = currentMapData?.region
            ? `${currentMapData.region} ${coordStr}`
            : coordStr;
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(220, 225, 240, 0.7)';
        const labelX = frameX + frameW / 2;
        const labelY = frameY - 4;
        ctx.fillText(labelText, labelX, labelY);

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
