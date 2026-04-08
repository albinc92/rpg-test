/**
 * BiomeGroundRenderer — Replaces flat gray map backgrounds with biome-appropriate
 * colored + textured ground.
 * 
 * Each biome maps to:
 *   - A base color (used immediately, replaces the gray rect)
 *   - A tiled texture from /assets/texture/ (loaded lazily, subtle overlay)
 * 
 * Ground tiles are generated once per biome type and cached.
 * Works with both WebGL and Canvas2D render paths.
 */

class BiomeGroundRenderer {
    // ── Biome → ground configuration ────────────────────────────────────────
    // color: [R, G, B] in 0-255 range
    // texture: filename in /assets/texture/
    // opacity: how strongly the texture overlays the base color (0-1)
    static BIOME_GROUNDS = {
        'woodland':       { texture: 'grass.png',    color: [82, 114, 58],   opacity: 0.30 },
        'dense-forest':   { texture: 'foliage.png',  color: [48, 82, 34],    opacity: 0.35 },
        'grassland':      { texture: 'grass.png',    color: [108, 142, 72],  opacity: 0.25 },
        'plains':         { texture: 'grass2.png',   color: [136, 136, 84],  opacity: 0.25 },
        'meadow':         { texture: 'grass.png',    color: [120, 158, 80],  opacity: 0.25 },
        'desert':         { texture: 'dirt.png',     color: [174, 148, 96],  opacity: 0.30 },
        'arid-desert':    { texture: 'dirt.png',     color: [188, 164, 112], opacity: 0.35 },
        'snow':           { texture: 'grass2.png',   color: [212, 220, 230], opacity: 0.12 },
        'tundra':         { texture: 'dirt.png',     color: [148, 160, 174], opacity: 0.18 },
        'mountain':       { texture: 'bedrock.png',  color: [124, 120, 112], opacity: 0.28 },
        'high-mountain':  { texture: 'bedrock.png',  color: [112, 112, 124], opacity: 0.32 },
        'lake':           { texture: 'water.png',    color: [58, 98, 148],   opacity: 0.30 },
        'river-valley':   { texture: 'grass.png',    color: [96, 134, 96],   opacity: 0.25 },
    };

    // Default fallback
    static DEFAULT_GROUND = { texture: 'dirt.png', color: [100, 100, 100], opacity: 0.15 };

    constructor() {
        // Texture image cache: filename → Image
        this.textureImages = {};
        this.textureLoadPromises = {};
        
        // Generated tile cache: biome → Canvas (1024×1024 tinted+textured tile)
        this.tileCache = {};
        
        // Tile dimensions (small for memory, tiled to fill maps)
        this.tileSize = 1024;
        
        this._loading = false;
        this._loaded = false;
        
        console.log('🗺️ BiomeGroundRenderer initialized');
    }

    /**
     * Start loading all texture images. Call once at game init.
     */
    loadTextures() {
        if (this._loading) return;
        this._loading = true;
        
        const uniqueTextures = new Set();
        for (const config of Object.values(BiomeGroundRenderer.BIOME_GROUNDS)) {
            uniqueTextures.add(config.texture);
        }
        uniqueTextures.add(BiomeGroundRenderer.DEFAULT_GROUND.texture);
        
        const promises = [];
        for (const filename of uniqueTextures) {
            const p = this._loadTexture(filename);
            promises.push(p);
        }
        
        Promise.all(promises).then(() => {
            this._loaded = true;
            console.log(`🗺️ All ${uniqueTextures.size} ground textures loaded`);
        }).catch(err => {
            console.warn('🗺️ Some ground textures failed to load:', err);
        });
    }

    _loadTexture(filename) {
        if (this.textureLoadPromises[filename]) return this.textureLoadPromises[filename];
        
        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.textureImages[filename] = img;
                resolve(img);
            };
            img.onerror = () => {
                console.warn(`🗺️ Failed to load texture: ${filename}`);
                resolve(null); // Don't reject — fallback to color-only
            };
            img.src = `/assets/texture/${filename}`;
        });
        
        this.textureLoadPromises[filename] = promise;
        return promise;
    }

    /**
     * Get ground base color for a biome as [r,g,b,a] in 0-1 range (for WebGL).
     */
    getGroundColorGL(biome) {
        const config = BiomeGroundRenderer.BIOME_GROUNDS[biome] || BiomeGroundRenderer.DEFAULT_GROUND;
        const [r, g, b] = config.color;
        return [r / 255, g / 255, b / 255, 1.0];
    }

    /**
     * Get ground base color for a biome as CSS hex string (for Canvas2D).
     */
    getGroundColorCSS(biome) {
        const config = BiomeGroundRenderer.BIOME_GROUNDS[biome] || BiomeGroundRenderer.DEFAULT_GROUND;
        const [r, g, b] = config.color;
        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Get or generate the ground tile canvas for a biome.
     * Returns a 1024×1024 canvas with base color + tiled texture overlay.
     * Returns null if texture not loaded yet (caller should use color-only).
     */
    getGroundTile(biome) {
        // Return cached tile
        if (this.tileCache[biome]) return this.tileCache[biome];
        
        const config = BiomeGroundRenderer.BIOME_GROUNDS[biome] || BiomeGroundRenderer.DEFAULT_GROUND;
        const textureImg = this.textureImages[config.texture];
        
        // Can't generate until texture is loaded
        if (!textureImg) return null;
        
        // Generate tile
        const canvas = document.createElement('canvas');
        canvas.width = this.tileSize;
        canvas.height = this.tileSize;
        const ctx = canvas.getContext('2d');
        
        // Fill with base color
        const [r, g, b] = config.color;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(0, 0, this.tileSize, this.tileSize);
        
        // Overlay tiled texture with opacity
        ctx.globalAlpha = config.opacity;
        const pattern = ctx.createPattern(textureImg, 'repeat');
        if (pattern) {
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, this.tileSize, this.tileSize);
        }
        ctx.globalAlpha = 1.0;
        
        // Add very subtle noise variation for natural feel
        this._addNoise(ctx, this.tileSize, this.tileSize, 0.03);
        
        this.tileCache[biome] = canvas;
        return canvas;
    }

    /**
     * Render biome ground for a map area.
     * Replaces the flat gray renderMapBackground.
     * 
     * @param {string} biome - Biome type string
     * @param {number} offsetX - World X offset of the map
     * @param {number} offsetY - World Y offset of the map 
     * @param {number} width - Map width in world units
     * @param {number} height - Map height in world units
     * @param {CanvasRenderingContext2D} ctx - Canvas2D context (fallback)
     * @param {object} webglRenderer - WebGL renderer (preferred)
     * @param {boolean} useWebGL - Whether to use WebGL path
     */
    renderGround(biome, offsetX, offsetY, width, height, ctx, webglRenderer, useWebGL) {
        const groundTile = this.getGroundTile(biome);
        
        if (useWebGL && webglRenderer && webglRenderer.initialized) {
            if (groundTile) {
                // Tile the ground canvas across the map area
                // Always draw full tiles — slight overdraw at edges is covered by adjacent map backgrounds
                const ts = this.tileSize;
                const cols = Math.ceil(width / ts);
                const rows = Math.ceil(height / ts);
                const texKey = `biome_ground_${biome}`;
                
                for (let row = 0; row < rows; row++) {
                    for (let col = 0; col < cols; col++) {
                        const dx = offsetX + col * ts;
                        const dy = offsetY + row * ts;
                        webglRenderer.drawSprite(dx, dy, ts, ts, groundTile, texKey);
                    }
                }
            } else {
                // Texture not loaded yet — use biome color
                const color = this.getGroundColorGL(biome);
                webglRenderer.drawRect(offsetX, offsetY, width, height, color);
            }
        } else {
            // Canvas2D path
            if (groundTile) {
                const pattern = ctx.createPattern(groundTile, 'repeat');
                if (pattern) {
                    ctx.save();
                    ctx.translate(offsetX, offsetY);
                    ctx.fillStyle = pattern;
                    ctx.fillRect(0, 0, width, height);
                    ctx.restore();
                } else {
                    ctx.fillStyle = this.getGroundColorCSS(biome);
                    ctx.fillRect(offsetX, offsetY, width, height);
                }
            } else {
                ctx.fillStyle = this.getGroundColorCSS(biome);
                ctx.fillRect(offsetX, offsetY, width, height);
            }
        }
    }

    /**
     * Add very subtle noise to a canvas for organic feel
     */
    _addNoise(ctx, width, height, intensity) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Use a simple PRNG for deterministic noise
        let seed = 12345;
        for (let i = 0; i < data.length; i += 4) {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            const noise = ((seed / 0x7fffffff) - 0.5) * intensity * 255;
            data[i]     = Math.max(0, Math.min(255, data[i] + noise));     // R
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
}
