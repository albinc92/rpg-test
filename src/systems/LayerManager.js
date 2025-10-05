/**
 * LayerManager - Multi-layer map system for depth-based rendering and collisions
 * 
 * Architecture:
 * - Each map can have multiple layers with z-index ordering
 * - Layer 0 (Ground) is locked and cannot be deleted
 * - Objects are stored in ObjectManager with obj.layerId property
 * - Layers contain: background image, paint canvas, collision detection
 * - Player's active layer determined by background/paint at their position
 */
class LayerManager {
    constructor() {
        // Map ID -> Array of layers
        this.layers = {};
        
        // Currently active layer ID for editing
        this.activeLayerId = null;
        
        console.log('[LayerManager] Initialized');
    }

    /**
     * Initialize layers for a map (called once when map first loads)
     */
    initializeMapLayers(mapId) {
        // Only initialize if layers don't exist yet
        if (this.layers[mapId]) {
            console.log(`[LayerManager] Layers already initialized for map ${mapId}`);
            return;
        }
        
        // Create base layer (always locked, cannot be deleted)
        this.layers[mapId] = [
            {
                id: `${mapId}_layer_0`,
                name: 'Ground',
                zIndex: 0,
                visible: true,
                locked: true, // Base layer is always locked
                opacity: 1.0,
                backgroundImage: null, // Will be set to map.image
                paintCanvas: null // Created on-demand in editor
            }
        ];
        
        this.activeLayerId = this.layers[mapId][0].id;
        console.log(`[LayerManager] Created base layer for map ${mapId}`);
    }

    /**
     * Check if a map has layers
     */
    hasLayers(mapId) {
        return this.layers[mapId] && this.layers[mapId].length > 0;
    }

    /**
     * Get all layers for a map (sorted by zIndex)
     */
    getLayers(mapId) {
        if (!this.layers[mapId]) return [];
        return [...this.layers[mapId]].sort((a, b) => a.zIndex - b.zIndex);
    }

    /**
     * Get a specific layer by ID
     */
    getLayer(mapId, layerId) {
        if (!this.layers[mapId]) return null;
        return this.layers[mapId].find(l => l.id === layerId) || null;
    }

    /**
     * Get the currently active layer for editing
     */
    getActiveLayer(mapId) {
        return this.getLayer(mapId, this.activeLayerId);
    }

    /**
     * Set the active layer for editing
     */
    setActiveLayer(layerId) {
        this.activeLayerId = layerId;
        console.log(`[LayerManager] Active layer set to: ${layerId}`);
    }

    /**
     * Add a new layer to a map
     */
    addLayer(mapId, name = 'New Layer', zIndex = null) {
        if (!this.layers[mapId]) {
            console.error(`[LayerManager] Cannot add layer - map ${mapId} not initialized`);
            return null;
        }
        
        // If no z-index specified, add at top (one above max)
        if (zIndex === null) {
            const maxZ = Math.max(...this.layers[mapId].map(l => l.zIndex));
            zIndex = maxZ + 1;
        }
        
        const newLayer = {
            id: `${mapId}_layer_${Date.now()}`,
            name: name,
            zIndex: zIndex,
            visible: true,
            locked: false,
            opacity: 1.0,
            backgroundImage: null,
            paintCanvas: null
        };
        
        this.layers[mapId].push(newLayer);
        this.activeLayerId = newLayer.id;
        
        console.log(`[LayerManager] Added layer "${name}" (z:${zIndex}) to map ${mapId}`);
        return newLayer;
    }

    /**
     * Remove a layer from a map (cannot remove base layer)
     */
    removeLayer(mapId, layerId) {
        if (!this.layers[mapId]) return false;
        
        const layer = this.getLayer(mapId, layerId);
        if (!layer) {
            console.error(`[LayerManager] Layer ${layerId} not found`);
            return false;
        }
        
        // Cannot remove locked layer (base layer)
        if (layer.locked) {
            console.error(`[LayerManager] Cannot remove locked layer "${layer.name}"`);
            return false;
        }
        
        // Remove layer
        const index = this.layers[mapId].indexOf(layer);
        this.layers[mapId].splice(index, 1);
        
        // If removed layer was active, set base layer as active
        if (this.activeLayerId === layerId) {
            this.activeLayerId = this.layers[mapId][0].id;
        }
        
        console.log(`[LayerManager] Removed layer "${layer.name}" from map ${mapId}`);
        return true;
    }

    /**
     * Move layer up in z-order (increase z-index)
     */
    moveLayerUp(mapId, layerId) {
        const layer = this.getLayer(mapId, layerId);
        if (!layer) return false;
        
        layer.zIndex++;
        console.log(`[LayerManager] Moved layer "${layer.name}" up (z:${layer.zIndex})`);
        return true;
    }

    /**
     * Move layer down in z-order (decrease z-index)
     */
    moveLayerDown(mapId, layerId) {
        const layer = this.getLayer(mapId, layerId);
        if (!layer || layer.zIndex <= 0) return false;
        
        layer.zIndex--;
        console.log(`[LayerManager] Moved layer "${layer.name}" down (z:${layer.zIndex})`);
        return true;
    }

    /**
     * Toggle layer visibility
     */
    toggleLayerVisibility(mapId, layerId) {
        const layer = this.getLayer(mapId, layerId);
        if (!layer) return false;
        
        layer.visible = !layer.visible;
        console.log(`[LayerManager] Layer "${layer.name}" visible: ${layer.visible}`);
        return layer.visible;
    }

    /**
     * Initialize paint canvas for a layer
     */
    initializePaintCanvas(mapId, layerId, width, height) {
        const layer = this.getLayer(mapId, layerId);
        if (!layer) return null;
        
        if (!layer.paintCanvas) {
            layer.paintCanvas = document.createElement('canvas');
            layer.paintCanvas.width = width;
            layer.paintCanvas.height = height;
            console.log(`[LayerManager] Initialized paint canvas for layer "${layer.name}": ${width}x${height}`);
        }
        
        return layer.paintCanvas;
    }

    /**
     * Get paint canvas for a layer
     */
    getPaintCanvas(mapId, layerId) {
        const layer = this.getLayer(mapId, layerId);
        return layer ? layer.paintCanvas : null;
    }

    /**
     * Determine which layer the player is on based on their position
     * Checks if there's a visible background/paint at the player's position
     */
    getPlayerLayer(mapId, playerX, playerY) {
        const layers = this.getLayers(mapId);
        
        // Check layers from top to bottom
        for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            if (!layer.visible) continue;
            
            // Check if layer has content at player position
            if (this.hasContentAt(layer, playerX, playerY)) {
                return layer;
            }
        }
        
        // Default to base layer
        return layers[0];
    }

    /**
     * Check if a layer has visible content (background or paint) at a position
     */
    hasContentAt(layer, x, y) {
        // Check paint canvas for non-transparent pixels
        if (layer.paintCanvas) {
            const ctx = layer.paintCanvas.getContext('2d');
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            // If alpha > 0, there's painted content
            if (pixel[3] > 0) {
                return true;
            }
        }
        
        // Check if layer has a background image
        if (layer.backgroundImage) {
            return true;
        }
        
        return false;
    }

    /**
     * Export layer data for saving
     */
    exportLayerData(mapId) {
        const layers = this.getLayers(mapId);
        
        return layers.map(layer => ({
            id: layer.id,
            name: layer.name,
            zIndex: layer.zIndex,
            visible: layer.visible,
            locked: layer.locked,
            opacity: layer.opacity,
            // Paint canvas data (as base64)
            paintData: layer.paintCanvas ? layer.paintCanvas.toDataURL() : null
        }));
    }

    /**
     * Import layer data from save
     */
    async importLayerData(mapId, layersData) {
        this.layers[mapId] = [];
        
        for (const data of layersData) {
            const layer = {
                id: data.id,
                name: data.name,
                zIndex: data.zIndex,
                visible: data.visible,
                locked: data.locked,
                opacity: data.opacity,
                backgroundImage: null,
                paintCanvas: null
            };
            
            // Restore paint canvas if it had data
            if (data.paintData) {
                const img = new Image();
                await new Promise((resolve) => {
                    img.onload = () => {
                        layer.paintCanvas = document.createElement('canvas');
                        layer.paintCanvas.width = img.width;
                        layer.paintCanvas.height = img.height;
                        const ctx = layer.paintCanvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        resolve();
                    };
                    img.src = data.paintData;
                });
            }
            
            this.layers[mapId].push(layer);
        }
        
        console.log(`[LayerManager] Imported ${layersData.length} layers for map ${mapId}`);
    }
}

// Export
window.LayerManager = LayerManager;
