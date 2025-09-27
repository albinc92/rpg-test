/**
 * MapManager Class
 * Manages multiple maps and transitions between them
 */
class MapManager {
    constructor(scene) {
        this.scene = scene;
        this.maps = new Map();
        this.currentMapId = null;
        this.currentMap = null;
    }

    // Create and add a new map
    createMap(id, width, height, backgroundImage = null) {
        const map = new GameMap(id, width, height, backgroundImage);
        this.maps.set(id, map);
        return map;
    }

    // Switch to a different map
    switchToMap(mapId, playerStartPosition = null) {
        const newMap = this.maps.get(mapId);
        if (!newMap) {
            console.error(`Map ${mapId} not found!`);
            return false;
        }

        // Remove current map from scene
        if (this.currentMap) {
            this.scene.removeGameObject(this.currentMap);
            
            // Remove all obstacles from current map
            for (const obstacle of this.currentMap.obstacles) {
                this.scene.removeGameObject(obstacle);
            }
        }

        // Set new current map
        this.currentMap = newMap;
        this.currentMapId = mapId;
        this.scene.currentMap = newMap;

        // Add new map to scene
        this.scene.addGameObject(newMap);

        // Add all obstacles from new map
        for (const obstacle of newMap.obstacles) {
            this.scene.addGameObject(obstacle);
        }

        // Move player to start position if specified
        if (playerStartPosition && this.scene.player) {
            this.scene.player.position = playerStartPosition.clone();
            this.scene.player.velocity = new Vector2(0, 0);
        }

        console.log(`Switched to map: ${mapId}`);
        return true;
    }

    // Get current map
    getCurrentMap() {
        return this.currentMap;
    }

    // Add an obstacle to a specific map
    addObstacleToMap(mapId, obstacle) {
        const map = this.maps.get(mapId);
        if (map) {
            map.addObstacle(obstacle);
            
            // If it's the current map, add to scene immediately
            if (mapId === this.currentMapId) {
                this.scene.addGameObject(obstacle);
            }
        }
    }

    // Load map background from file
    loadMapBackground(mapId, imageFile) {
        const map = this.maps.get(mapId);
        if (!map) {
            console.error(`Map ${mapId} not found!`);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                map.setBackgroundImage(img);
                console.log(`Background loaded for map: ${mapId}`);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(imageFile);
    }

    // Load map background from URL
    loadMapBackgroundFromUrl(mapId, imageUrl) {
        const map = this.maps.get(mapId);
        if (!map) {
            console.error(`Map ${mapId} not found!`);
            return;
        }

        const img = new Image();
        img.onload = () => {
            map.setBackgroundImage(img);
            console.log(`Background loaded for map: ${mapId}`);
        };
        img.src = imageUrl;
    }

    // Get all map IDs
    getMapIds() {
        return Array.from(this.maps.keys());
    }
}
