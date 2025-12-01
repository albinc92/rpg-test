/**
 * MapManager - Manages map data and loading
 */
class MapManager {
    constructor(dataLoader) {
        this.dataLoader = dataLoader;
        this.maps = {};
    }
    
    /**
     * Initialize all map data from JSON
     */
    async initialize() {
        const mapsData = await this.dataLoader.loadMaps();
        
        // Convert JSON data to internal format
        for (const [mapId, mapData] of Object.entries(mapsData)) {
            this.maps[mapId] = {
                ...mapData
            };
        }
        
        console.log('[MapManager] ✅ Initialized with', Object.keys(this.maps).length, 'maps');
        return this.maps;
    }
    
    /**
     * Load maps from cached data (synchronous, must call initialize first)
     */
    loadFromCache() {
        const mapsData = this.dataLoader.getMaps();
        if (mapsData) {
            for (const [mapId, mapData] of Object.entries(mapsData)) {
                if (!this.maps[mapId]) {
                    this.maps[mapId] = {
                        ...mapData
                    };
                }
            }
            console.log('[MapManager] Loaded from cache:', Object.keys(this.maps).length, 'maps');
        }
    }
    
    /**
     * Initialize all map data (deprecated - kept for backwards compatibility)
     */
    initializeAllMaps() {
        console.warn('[MapManager] initializeAllMaps() is deprecated, use initialize() instead');
        return this.maps;
    }
    
    /**
     * Get map data by ID
     */
    getMapData(mapId) {
        return this.maps[mapId] || null;
    }
    
    /**
     * Load a map (no-op, kept for backwards compatibility)
     * Map images are no longer used - we use gray backgrounds with paint layers
     */
    async loadMap(mapId) {
        const mapData = this.maps[mapId];
        if (!mapData) {
            throw new Error(`Map not found: ${mapId}`);
        }
        // No image loading needed - maps use gray backgrounds with paint layers
        return Promise.resolve();
    }
    
    /**
     * Get all available map IDs
     */
    getAllMapIds() {
        return Object.keys(this.maps);
    }
    
    /**
     * Check if map exists
     */
    mapExists(mapId) {
        return mapId in this.maps;
    }
    
    /**
     * Add a new map
     */
    addMap(mapId, mapData) {
        this.maps[mapId] = mapData;
    }
    
    /**
     * Remove a map
     */
    removeMap(mapId) {
        delete this.maps[mapId];
    }
}

// Export for use
window.MapManager = MapManager;