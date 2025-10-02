/**
 * MapManager - Manages map data and loading
 */
class MapManager {
    constructor(dataLoader) {
        this.dataLoader = dataLoader;
        this.maps = {};
        this.loadedImages = {};
    }
    
    /**
     * Initialize all map data from JSON
     */
    async initialize() {
        const mapsData = await this.dataLoader.loadMaps();
        
        // Convert JSON data to internal format with image placeholders
        for (const [mapId, mapData] of Object.entries(mapsData)) {
            this.maps[mapId] = {
                ...mapData,
                image: null,
                width: 0,  // Set when image loads
                height: 0  // Set when image loads
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
                        ...mapData,
                        image: null,
                        width: 0,
                        height: 0
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
     * Load a map image and automatically set width/height from it
     */
    async loadMap(mapId) {
        return new Promise((resolve, reject) => {
            const mapData = this.maps[mapId];
            if (!mapData) {
                reject(new Error(`Map not found: ${mapId}`));
                return;
            }
            
            // Check if already loaded
            if (this.loadedImages[mapId]) {
                mapData.image = this.loadedImages[mapId];
                resolve();
                return;
            }
            
            // Load the image
            const image = new Image();
            image.onload = () => {
                this.loadedImages[mapId] = image;
                mapData.image = image;
                // Set width/height from the actual image (1:1 relationship)
                mapData.width = image.width;
                mapData.height = image.height;
                console.log(`Loaded map image: ${mapId} (${image.width}x${image.height})`);
                resolve();
            };
            image.onerror = () => {
                reject(new Error(`Failed to load map image: ${mapData.imageSrc}`));
            };
            
            image.src = mapData.imageSrc;
        });
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
        delete this.loadedImages[mapId];
    }
}

// Export for use
window.MapManager = MapManager;