/**
 * MapManager - Manages map data and loading
 */
class MapManager {
    constructor() {
        this.maps = {};
        this.loadedImages = {};
    }
    
    /**
     * Initialize all map data (image path and settings only)
     * Width/height are set automatically when the image loads
     */
    initializeAllMaps() {
        this.maps = {
            '0-0': {
                imageSrc: 'assets/maps/0-0.png',
                image: null,
                width: 0,  // Set when image loads
                height: 0, // Set when image loads
                scale: 1.0,
                music: 'assets/audio/bgm/01.mp3',
                ambience: 'assets/audio/ambience/forest-0.mp3'
            },
            '0-1': {
                imageSrc: 'assets/maps/0-1.png',
                image: null,
                width: 0,  // Set when image loads
                height: 0, // Set when image loads
                scale: 1.0,
                music: 'assets/audio/bgm/01.mp3',
                ambience: 'assets/audio/ambience/forest-0.mp3'
            }
        };
        
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