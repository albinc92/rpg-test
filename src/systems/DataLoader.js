/**
 * DataLoader - Centralized data loading from JSON files
 * Handles caching and provides easy access to game data
 */
class DataLoader {
    constructor() {
        this.cache = {
            maps: null,
            items: null,
            objects: null
        };
        this.loading = {
            maps: null,
            items: null,
            objects: null
        };
    }

    /**
     * Load JSON file with caching
     */
    async loadJSON(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load ${path}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`[DataLoader] Error loading ${path}:`, error);
            throw error;
        }
    }

    /**
     * Load maps data
     */
    async loadMaps() {
        if (this.cache.maps) {
            return this.cache.maps;
        }
        if (this.loading.maps) {
            return this.loading.maps;
        }

        console.log('[DataLoader] Loading maps.json...');
        this.loading.maps = this.loadJSON('data/maps.json');
        this.cache.maps = await this.loading.maps;
        this.loading.maps = null;
        console.log('[DataLoader] ✅ Maps loaded:', Object.keys(this.cache.maps).length, 'maps');
        return this.cache.maps;
    }

    /**
     * Load items data
     */
    async loadItems() {
        if (this.cache.items) {
            return this.cache.items;
        }
        if (this.loading.items) {
            return this.loading.items;
        }

        console.log('[DataLoader] Loading items.json...');
        this.loading.items = this.loadJSON('data/items.json');
        this.cache.items = await this.loading.items;
        this.loading.items = null;
        console.log('[DataLoader] ✅ Items loaded:', Object.keys(this.cache.items).length, 'items');
        return this.cache.items;
    }

    /**
     * Load objects data
     */
    async loadObjects() {
        if (this.cache.objects) {
            return this.cache.objects;
        }
        if (this.loading.objects) {
            return this.loading.objects;
        }

        console.log('[DataLoader] Loading objects.json...');
        this.loading.objects = this.loadJSON('data/objects.json');
        this.cache.objects = await this.loading.objects;
        this.loading.objects = null;
        
        const totalObjects = Object.values(this.cache.objects).reduce((sum, arr) => sum + arr.length, 0);
        console.log('[DataLoader] ✅ Objects loaded:', totalObjects, 'objects across', Object.keys(this.cache.objects).length, 'maps');
        return this.cache.objects;
    }

    /**
     * Load all game data
     */
    async loadAll() {
        console.log('[DataLoader] Loading all game data...');
        await Promise.all([
            this.loadMaps(),
            this.loadItems(),
            this.loadObjects()
        ]);
        console.log('[DataLoader] ✅ All game data loaded successfully');
    }

    /**
     * Get cached maps data (must be loaded first)
     */
    getMaps() {
        if (!this.cache.maps) {
            console.warn('[DataLoader] Maps not loaded yet! Call loadMaps() first');
        }
        return this.cache.maps;
    }

    /**
     * Get cached items data (must be loaded first)
     */
    getItems() {
        if (!this.cache.items) {
            console.warn('[DataLoader] Items not loaded yet! Call loadItems() first');
        }
        return this.cache.items;
    }

    /**
     * Get cached objects data (must be loaded first)
     */
    getObjects() {
        if (!this.cache.objects) {
            console.warn('[DataLoader] Objects not loaded yet! Call loadObjects() first');
        }
        return this.cache.objects;
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache = {
            maps: null,
            items: null,
            objects: null
        };
        console.log('[DataLoader] Cache cleared');
    }

    /**
     * Reload specific data file
     */
    async reload(dataType) {
        switch (dataType) {
            case 'maps':
                this.cache.maps = null;
                return await this.loadMaps();
            case 'items':
                this.cache.items = null;
                return await this.loadItems();
            case 'objects':
                this.cache.objects = null;
                return await this.loadObjects();
            default:
                throw new Error(`Unknown data type: ${dataType}`);
        }
    }
}

// Export for use
window.DataLoader = DataLoader;
