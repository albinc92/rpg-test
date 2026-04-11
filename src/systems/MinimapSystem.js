/**
 * MapCoords — single source of truth for map coordinate display.
 * Raw map IDs use -15..16 (x) and -8..9 (y) internally.
 */
class MapCoords {
    static GRID_MIN_X = -15;
    static GRID_MIN_Y = -8;

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
        this.cellSize = 20;              // Pixels per cell
        this.padding = 12;              // Padding inside frame
        this.margin = 16;               // Margin from canvas edge

        // Derived
        this.gridDiameter = this.viewRadius * 2 + 1; // 9
        this.mapSize = this.gridDiameter * this.cellSize; // 180

        // World grid bounds (must match WorldMapState)
        this.gridMinX = -15;
        this.gridMaxX = 16;
        this.gridMinY = -8;
        this.gridMaxY = 9;
        this.gridCols = this.gridMaxX - this.gridMinX + 1; // 32
        this.gridRows = this.gridMaxY - this.gridMinY + 1; // 18

        // Player dot animation
        this.pulseTimer = 0;
        this.pulseSpeed = 2.5; // Hz

        // Fog of war: Set of visited map IDs
        this.visitedCells = new Set();

        // Map markers (shared static — loaded once)
        if (!MinimapSystem._markers) {
            MinimapSystem._markers = [];
            fetch('data/markers.json')
                .then(r => r.json())
                .then(d => { MinimapSystem._markers = d.markers || []; })
                .catch(() => {});
        }

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

        const ds = window.ds;
        const centerX = pos.x;
        const centerY = pos.y;

        const canvasW = this.game.CANVAS_WIDTH;
        const canvasH = this.game.CANVAS_HEIGHT;
        const cs = this.cellSize;
        const r = this.viewRadius;

        // Position: top-right corner
        const frameW = this.mapSize + this.padding * 2;
        const frameH = this.mapSize + this.padding * 2;
        const frameX = canvasW - frameW - this.margin;
        const frameY = this.margin;

        ctx.save();

        // ── Frame panel via DesignSystem (sharp corners, gradient, corner accents) ──
        if (ds) {
            ds.drawPanel(ctx, frameX, frameY, frameW, frameH, {
                alpha: 0.75,
                showCorners: true
            });
        } else {
            ctx.fillStyle = 'rgba(10, 12, 18, 0.75)';
            ctx.fillRect(frameX, frameY, frameW, frameH);
            ctx.strokeStyle = 'rgba(180, 190, 210, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(frameX, frameY, frameW, frameH);
        }

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
                    ctx.fillStyle = ds ? ds.colors.alpha(ds.colors.background.dark, 0.95)
                                       : 'rgba(10, 10, 15, 0.95)';
                    ctx.fillRect(px, py, cs, cs);
                    continue;
                }

                // Fog of war — unvisited cells
                if (!this.visitedCells.has(mapId)) {
                    ctx.fillStyle = ds ? ds.colors.alpha(ds.colors.background.dark, 0.55)
                                       : 'rgba(15, 15, 25, 0.55)';
                    ctx.fillRect(px, py, cs, cs);
                    continue;
                }

                // Grid line for visited cells
                ctx.strokeStyle = ds ? ds.colors.alpha(ds.colors.text.primary, 0.10)
                                     : 'rgba(255, 255, 255, 0.10)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(px + 0.5, py + 0.5, cs - 1, cs - 1);
            }
        }

        // ── Map markers on minimap ──
        if (MinimapSystem._markers) {
            for (const marker of MinimapSystem._markers) {
                const dx = marker.x - centerX;
                const dy = centerY - marker.y; // flip Y
                // Only show markers within visible radius
                if (Math.abs(dx) > r + 1 || Math.abs(dy) > r + 1) continue;

                const mpx = mapX + (dx + r) * cs + scrollOffsetX + cs / 2;
                const mpy = mapY + (dy + r) * cs + scrollOffsetY + cs / 2;

                // Check if within clipped minimap area
                if (mpx < mapX - 2 || mpx > mapX + this.mapSize + 2) continue;
                if (mpy < mapY - 2 || mpy > mapY + this.mapSize + 2) continue;

                const dotSize = marker.type === 'capital' ? 3.5
                              : marker.type === 'town' ? 2.5
                              : marker.type === 'village' ? 1.8
                              : 1.5;

                const dotColor = marker.type === 'capital' ? '#ffd700'
                               : marker.type === 'town' ? '#e8d8b8'
                               : marker.type === 'village' ? '#c8b898'
                               : marker.type === 'ruins' ? '#a0a0a0'
                               : marker.type === 'dungeon' ? '#d06060'
                               : '#80c0e0';

                ctx.beginPath();
                if (marker.type === 'capital') {
                    // Small star shape for capital
                    for (let i = 0; i < 8; i++) {
                        const sr = i % 2 === 0 ? dotSize : dotSize * 0.5;
                        const a = (i * Math.PI / 4) - Math.PI / 2;
                        if (i === 0) ctx.moveTo(mpx + Math.cos(a) * sr, mpy + Math.sin(a) * sr);
                        else ctx.lineTo(mpx + Math.cos(a) * sr, mpy + Math.sin(a) * sr);
                    }
                    ctx.closePath();
                } else {
                    ctx.arc(mpx, mpy, dotSize, 0, Math.PI * 2);
                }
                ctx.fillStyle = dotColor;
                ctx.fill();
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
        ctx.fillStyle = ds ? ds.colors.primaryAlpha(0.15 + pulse * 0.15)
                           : `rgba(100, 200, 255, ${0.15 + pulse * 0.15})`;
        ctx.fill();

        // Inner dot
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = ds ? ds.colors.text.primary : '#FFFFFF';
        ctx.fill();

        // ── Current cell highlight border ──
        const cellHighlightX = mapX + r * cs + scrollOffsetX;
        const cellHighlightY = mapY + r * cs + scrollOffsetY;
        ctx.save();
        ctx.beginPath();
        ctx.rect(mapX, mapY, this.mapSize, this.mapSize);
        ctx.clip();
        ctx.strokeStyle = ds ? ds.colors.alpha(ds.colors.text.primary, 0.3 + pulse * 0.2)
                             : `rgba(255, 255, 255, ${0.3 + pulse * 0.2})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cellHighlightX + 0.5, cellHighlightY + 0.5, cs - 1, cs - 1);
        ctx.restore();

        // ── Compass labels ──
        ctx.font = ds ? ds.font('micro', 'bold', 'body') : 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = ds ? ds.colors.alpha(ds.colors.text.muted, 0.7)
                           : 'rgba(200, 210, 230, 0.6)';

        const midX = mapX + this.mapSize / 2;
        const midY = mapY + this.mapSize / 2;
        ctx.fillText('N', midX, mapY - 5);
        ctx.fillText('S', midX, mapY + this.mapSize + 7);
        ctx.fillText('W', mapX - 7, midY);
        ctx.fillText('E', mapX + this.mapSize + 7, midY);

        // ── Location label below minimap ──
        const currentMapData = this.game.mapManager?.getMapData(this.game.currentMapId);
        const coordStr = `(${MapCoords.formatDisplay(centerX, centerY)})`;
        const labelX = frameX + frameW / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Top line (below frame): Super-region
        if (currentMapData?.superRegion) {
            ctx.font = ds ? ds.font('tiny', 'bold', 'display') : 'bold 10px "Cinzel", serif';
            ctx.fillStyle = ds ? ds.colors.alpha(ds.colors.text.secondary, 0.65)
                               : 'rgba(210, 218, 235, 0.65)';
            ctx.fillText(currentMapData.superRegion, labelX, frameY + frameH + 5);
        }

        // Bottom line: Region (x, y)
        const regionCoord = currentMapData?.region
            ? `${currentMapData.region} ${coordStr}`
            : coordStr;
        ctx.font = ds ? ds.font('tiny', 'bold', 'body') : 'bold 11px Arial';
        ctx.fillStyle = ds ? ds.colors.alpha(ds.colors.text.secondary, 0.75)
                           : 'rgba(220, 225, 240, 0.75)';
        ctx.fillText(regionCoord, labelX, frameY + frameH + 19);

        ctx.restore();
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
