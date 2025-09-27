/**
 * Scene Class
 * Base class for game scenes that contain and manage game objects
 */
class Scene {
    constructor(name = 'Scene') {
        this.name = name;
        this.engine = null;
        this.gameObjects = [];
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        this.initialized = true;
        console.log(`Scene '${this.name}' initialized`);
    }

    update(deltaTime) {
        // Update all game objects
        for (let i = this.gameObjects.length - 1; i >= 0; i--) {
            const obj = this.gameObjects[i];
            
            if (obj.destroyed) {
                this.gameObjects.splice(i, 1);
                continue;
            }
            
            if (obj.active) {
                obj.update(deltaTime);
            }
        }

        // Update camera
        if (this.engine && this.engine.camera) {
            this.engine.camera.update(deltaTime);
        }
    }

    render(renderer) {
        // Sort objects by depth (Y position for isometric)
        this.gameObjects.sort((a, b) => {
            const aDepth = a.position.y + (a.depth || 0);
            const bDepth = b.position.y + (b.depth || 0);
            return aDepth - bDepth;
        });

        // Render all game objects
        for (const obj of this.gameObjects) {
            if (obj.active && obj.visible) {
                obj.render(renderer);
            }
        }
    }

    addGameObject(gameObject) {
        gameObject.scene = this;
        this.gameObjects.push(gameObject);
        return gameObject;
    }

    removeGameObject(gameObject) {
        const index = this.gameObjects.indexOf(gameObject);
        if (index !== -1) {
            gameObject.scene = null;
            this.gameObjects.splice(index, 1);
        }
    }

    findGameObject(name) {
        return this.gameObjects.find(obj => obj.name === name);
    }

    findGameObjects(name) {
        return this.gameObjects.filter(obj => obj.name === name);
    }

    findGameObjectByTag(tag) {
        return this.gameObjects.find(obj => obj.tags && obj.tags.includes(tag));
    }

    findGameObjectsByTag(tag) {
        return this.gameObjects.filter(obj => obj.tags && obj.tags.includes(tag));
    }

    destroy() {
        // Destroy all game objects
        for (const obj of this.gameObjects) {
            obj.destroy();
        }
        this.gameObjects = [];
        this.initialized = false;
        
        console.log(`Scene '${this.name}' destroyed`);
    }

    // Utility methods
    getEngine() {
        return this.engine;
    }

    getCamera() {
        return this.engine ? this.engine.camera : null;
    }

    getRenderer() {
        return this.engine ? this.engine.renderer : null;
    }

    getInputSystem() {
        return this.engine ? this.engine.inputSystem : null;
    }

    getPhysics() {
        return this.engine ? this.engine.physics : null;
    }
}
