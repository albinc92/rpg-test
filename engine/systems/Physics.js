/**
 * Physics System
 * Handles collision detection and physics simulation
 */
class Physics {
    constructor() {
        this.gravity = new Vector2(0, 0); // No gravity by default for top-down view
        this.collisionIterations = 4;
        this.spatialGrid = new Map(); // For optimized collision detection
        this.gridSize = 100; // Size of spatial grid cells
    }

    update(gameObjects, deltaTime) {
        // Clear spatial grid
        this.spatialGrid.clear();
        
        // Update spatial grid with current objects
        this.updateSpatialGrid(gameObjects);
        
        // Apply gravity to all objects
        for (const obj of gameObjects) {
            if (obj.active && !obj.destroyed) {
                obj.acceleration = obj.acceleration.add(this.gravity);
            }
        }
        
        // Handle collisions
        this.handleCollisions(gameObjects, deltaTime);
    }

    updateSpatialGrid(gameObjects) {
        for (const obj of gameObjects) {
            if (!obj.active || obj.destroyed || !obj.collider) continue;
            
            const bounds = obj.getBounds();
            const startX = Math.floor(bounds.x / this.gridSize);
            const endX = Math.floor((bounds.x + bounds.width) / this.gridSize);
            const startY = Math.floor(bounds.y / this.gridSize);
            const endY = Math.floor((bounds.y + bounds.height) / this.gridSize);
            
            for (let x = startX; x <= endX; x++) {
                for (let y = startY; y <= endY; y++) {
                    const key = `${x},${y}`;
                    if (!this.spatialGrid.has(key)) {
                        this.spatialGrid.set(key, []);
                    }
                    this.spatialGrid.get(key).push(obj);
                }
            }
        }
    }

    handleCollisions(gameObjects, deltaTime) {
        const collisionPairs = new Set();
        
        // Get potential collision pairs from spatial grid
        for (const cell of this.spatialGrid.values()) {
            for (let i = 0; i < cell.length; i++) {
                for (let j = i + 1; j < cell.length; j++) {
                    const objA = cell[i];
                    const objB = cell[j];
                    
                    // Create unique pair identifier
                    const pairId = objA.name < objB.name ? 
                        `${objA.name}-${objB.name}` : 
                        `${objB.name}-${objA.name}`;
                    
                    collisionPairs.add({ objA, objB, pairId });
                }
            }
        }
        
        // Process collisions
        for (const { objA, objB, pairId } of collisionPairs) {
            if (this.checkCollision(objA, objB)) {
                this.resolveCollision(objA, objB, deltaTime);
            }
        }
    }

    checkCollision(objA, objB) {
        if (!objA.collider || !objB.collider) return false;
        if (!objA.active || !objB.active) return false;
        if (objA.destroyed || objB.destroyed) return false;
        
        const boundsA = objA.getBounds();
        const boundsB = objB.getBounds();
        
        return this.boundsIntersect(boundsA, boundsB);
    }

    boundsIntersect(boundsA, boundsB) {
        return boundsA.x < boundsB.x + boundsB.width &&
               boundsA.x + boundsA.width > boundsB.x &&
               boundsA.y < boundsB.y + boundsB.height &&
               boundsA.y + boundsA.height > boundsB.y;
    }

    resolveCollision(objA, objB, deltaTime) {
        // Trigger collision events
        this.onCollision(objA, objB);
        this.onCollision(objB, objA);
        
        // Handle solid collision resolution
        if (objA.solid && objB.solid) {
            this.resolveSolidCollision(objA, objB, deltaTime);
        } else if (objA.solid && !objB.solid) {
            this.resolveStaticCollision(objB, objA, deltaTime);
        } else if (!objA.solid && objB.solid) {
            this.resolveStaticCollision(objA, objB, deltaTime);
        }
    }

    resolveSolidCollision(objA, objB, deltaTime) {
        const boundsA = objA.getBounds();
        const boundsB = objB.getBounds();
        
        // Calculate overlap
        const overlapX = Math.min(
            boundsA.x + boundsA.width - boundsB.x,
            boundsB.x + boundsB.width - boundsA.x
        );
        const overlapY = Math.min(
            boundsA.y + boundsA.height - boundsB.y,
            boundsB.y + boundsB.height - boundsA.y
        );
        
        // Resolve along axis of minimum overlap
        if (overlapX < overlapY) {
            // Resolve horizontally
            const direction = boundsA.x < boundsB.x ? -1 : 1;
            const separation = overlapX / 2;
            
            objA.position.x += direction * separation;
            objB.position.x -= direction * separation;
            
            // Exchange velocities
            const tempVx = objA.velocity.x;
            objA.velocity.x = objB.velocity.x * 0.8;
            objB.velocity.x = tempVx * 0.8;
        } else {
            // Resolve vertically
            const direction = boundsA.y < boundsB.y ? -1 : 1;
            const separation = overlapY / 2;
            
            objA.position.y += direction * separation;
            objB.position.y -= direction * separation;
            
            // Exchange velocities
            const tempVy = objA.velocity.y;
            objA.velocity.y = objB.velocity.y * 0.8;
            objB.velocity.y = tempVy * 0.8;
        }
    }

    resolveStaticCollision(movingObj, staticObj, deltaTime) {
        const movingBounds = movingObj.getBounds();
        const staticBounds = staticObj.getBounds();
        
        // Calculate overlap
        const overlapX = Math.min(
            movingBounds.x + movingBounds.width - staticBounds.x,
            staticBounds.x + staticBounds.width - movingBounds.x
        );
        const overlapY = Math.min(
            movingBounds.y + movingBounds.height - staticBounds.y,
            staticBounds.y + staticBounds.height - movingBounds.y
        );
        
        // Resolve collision by moving the moving object
        if (overlapX < overlapY) {
            // Resolve horizontally
            const direction = movingBounds.x < staticBounds.x ? -1 : 1;
            movingObj.position.x += direction * overlapX;
            movingObj.velocity.x = 0; // Stop horizontal movement
        } else {
            // Resolve vertically
            const direction = movingBounds.y < staticBounds.y ? -1 : 1;
            movingObj.position.y += direction * overlapY;
            movingObj.velocity.y = 0; // Stop vertical movement
        }
    }

    onCollision(objA, objB) {
        // Call collision callback if it exists
        if (objA.onCollision) {
            objA.onCollision(objB);
        }
        
        // Trigger events for components
        for (const component of objA.components.values()) {
            if (component.onCollision) {
                component.onCollision(objB);
            }
        }
    }

    // Raycast methods
    raycast(origin, direction, maxDistance = Infinity, gameObjects = []) {
        const results = [];
        const normalizedDir = direction.normalize();
        
        for (const obj of gameObjects) {
            if (!obj.collider || !obj.active || obj.destroyed) continue;
            
            const hit = this.raycastObject(origin, normalizedDir, maxDistance, obj);
            if (hit) {
                results.push(hit);
            }
        }
        
        // Sort by distance
        results.sort((a, b) => a.distance - b.distance);
        return results;
    }

    raycastObject(origin, direction, maxDistance, obj) {
        const bounds = obj.getBounds();
        
        // Simple AABB raycast
        const invDir = new Vector2(
            1 / direction.x,
            1 / direction.y
        );
        
        const t1 = (bounds.x - origin.x) * invDir.x;
        const t2 = (bounds.x + bounds.width - origin.x) * invDir.x;
        const t3 = (bounds.y - origin.y) * invDir.y;
        const t4 = (bounds.y + bounds.height - origin.y) * invDir.y;
        
        const tMin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
        const tMax = Math.min(Math.max(t1, t2), Math.max(t3, t4));
        
        if (tMax < 0 || tMin > tMax || tMin > maxDistance) {
            return null;
        }
        
        const distance = tMin > 0 ? tMin : tMax;
        const hitPoint = origin.add(direction.multiply(distance));
        
        return {
            object: obj,
            point: hitPoint,
            distance: distance,
            normal: this.calculateNormal(hitPoint, bounds)
        };
    }

    calculateNormal(point, bounds) {
        // Calculate which face was hit
        const center = new Vector2(
            bounds.x + bounds.width / 2,
            bounds.y + bounds.height / 2
        );
        
        const diff = point.subtract(center);
        const absX = Math.abs(diff.x);
        const absY = Math.abs(diff.y);
        
        if (absX > absY) {
            return new Vector2(diff.x > 0 ? 1 : -1, 0);
        } else {
            return new Vector2(0, diff.y > 0 ? 1 : -1);
        }
    }

    // Utility methods
    getObjectsInArea(center, radius, gameObjects) {
        const result = [];
        
        for (const obj of gameObjects) {
            if (!obj.active || obj.destroyed) continue;
            
            const distance = center.distanceTo(obj.position);
            if (distance <= radius) {
                result.push(obj);
            }
        }
        
        return result;
    }

    getObjectsInRect(rect, gameObjects) {
        const result = [];
        
        for (const obj of gameObjects) {
            if (!obj.active || obj.destroyed || !obj.collider) continue;
            
            const bounds = obj.getBounds();
            if (this.boundsIntersect(rect, bounds)) {
                result.push(obj);
            }
        }
        
        return result;
    }
}
