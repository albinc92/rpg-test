/**
 * CollisionSystem - Handles all collision detection with proper sprite scaling
 * 
 * Key feature: Collision boxes now match the ACTUAL rendered size of sprites
 * - Takes into account: sprite size × object scale × resolution scale × map scale
 * - Collision boxes are pixel-perfect with what the player sees on screen
 * - Supports custom collision offsets and size percentages for fine-tuning
 * 
 * Responsible for: portal checks, NPC collisions, object boundaries
 */
class CollisionSystem {
    constructor() {
        this.portalCheckThrottle = 0;
        this.PORTAL_CHECK_INTERVAL = 0.1; // Check portals every 100ms
    }
    
    /**
     * Check if player is colliding with any portals
     */
    checkPortalCollisions(player, portals, deltaTime, game) {
        this.portalCheckThrottle -= deltaTime;
        
        if (this.portalCheckThrottle <= 0) {
            this.portalCheckThrottle = this.PORTAL_CHECK_INTERVAL;
            
            for (const portal of portals) {
                if (this.checkCollision(player, portal, game)) {
                    return portal; // Return the portal for teleportation
                }
            }
        }
        
        return null;
    }
    
    /**
     * Basic AABB collision detection
     * Now properly accounts for all sprite scaling
     */
    checkCollision(objA, objB, game) {
        const boundsA = objA.getCollisionBounds(game);
        const boundsB = objB.getCollisionBounds(game);
        
        return (
            boundsA.left < boundsB.right &&
            boundsA.right > boundsB.left &&
            boundsA.top < boundsB.bottom &&
            boundsA.bottom > boundsB.top
        );
    }
    
    /**
     * Check distance between two objects (center to center)
     */
    getDistance(objA, objB) {
        const dx = objA.x - objB.x;
        const dy = objA.y - objB.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Find closest object within range
     */
    findClosestInRange(source, targets, maxDistance, game) {
        let closest = null;
        let closestDistance = Infinity;
        
        targets.forEach(target => {
            const distance = this.getDistance(source, target);
            if (distance <= maxDistance && distance < closestDistance) {
                closestDistance = distance;
                closest = target;
            }
        });
        
        return closest;
    }
    
    /**
     * Get collision bounds for an object (helper method)
     */
    getCollisionBounds(obj, game) {
        return obj.getCollisionBounds(game);
    }
    
    /**
     * Check if a point is inside an object's collision bounds
     */
    pointInCollisionBounds(x, y, obj, game) {
        const bounds = obj.getCollisionBounds(game);
        return (
            x >= bounds.left &&
            x <= bounds.right &&
            y >= bounds.top &&
            y <= bounds.bottom
        );
    }
}
