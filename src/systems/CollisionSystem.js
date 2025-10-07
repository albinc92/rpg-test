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
     * Collision detection supporting multiple shapes (rectangle, circle, ellipse)
     * Now properly accounts for all sprite scaling
     */
    checkCollision(objA, objB, game) {
        const shapeA = objA.collisionShape || 'rectangle';
        const shapeB = objB.collisionShape || 'rectangle';
        
        // Rectangle-Rectangle collision (AABB)
        if (shapeA === 'rectangle' && shapeB === 'rectangle') {
            const boundsA = objA.getCollisionBounds(game);
            const boundsB = objB.getCollisionBounds(game);
            
            return (
                boundsA.left < boundsB.right &&
                boundsA.right > boundsB.left &&
                boundsA.top < boundsB.bottom &&
                boundsA.bottom > boundsB.top
            );
        }
        
        // Circle-Circle collision
        if (shapeA === 'circle' && shapeB === 'circle') {
            const circleA = objA.getCollisionCircle(game);
            const circleB = objB.getCollisionCircle(game);
            
            // Use ellipse collision for accurate ellipse-ellipse test
            return this.checkEllipseEllipseCollision(circleA, circleB);
        }
        
        // Circle-Rectangle collision (mixed shapes)
        if (shapeA === 'circle' && shapeB === 'rectangle') {
            const circle = objA.getCollisionCircle(game);
            const rect = objB.getCollisionBounds(game);
            return this.checkCircleRectangleCollision(circle, rect);
        }
        
        if (shapeA === 'rectangle' && shapeB === 'circle') {
            const rect = objA.getCollisionBounds(game);
            const circle = objB.getCollisionCircle(game);
            return this.checkCircleRectangleCollision(circle, rect);
        }
        
        // Fallback to rectangle collision
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
     * Check collision between a circle/ellipse and a rectangle
     */
    checkCircleRectangleCollision(circle, rect) {
        // Find the closest point on the rectangle to the circle center
        const closestX = Math.max(rect.left, Math.min(circle.centerX, rect.right));
        const closestY = Math.max(rect.top, Math.min(circle.centerY, rect.bottom));
        
        // Calculate distance from circle center to closest point
        const distanceX = circle.centerX - closestX;
        const distanceY = circle.centerY - closestY;
        
        // For ellipse, normalize distance by radius in each axis
        const normalizedDistX = distanceX / circle.radiusX;
        const normalizedDistY = distanceY / circle.radiusY;
        const normalizedDistance = Math.sqrt(normalizedDistX * normalizedDistX + normalizedDistY * normalizedDistY);
        
        return normalizedDistance <= 1.0;
    }
    
    /**
     * Check collision between two circles/ellipses
     */
    checkEllipseEllipseCollision(circleA, circleB) {
        // Calculate distance between centers
        const dx = circleB.centerX - circleA.centerX;
        const dy = circleB.centerY - circleA.centerY;
        
        // For ellipses, use average radius for approximation
        const avgRadiusA = (circleA.radiusX + circleA.radiusY) / 2;
        const avgRadiusB = (circleB.radiusX + circleB.radiusY) / 2;
        
        // If both are perfect circles (radiusX == radiusY), use exact circle collision
        if (circleA.radiusX === circleA.radiusY && circleB.radiusX === circleB.radiusY) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= (circleA.radiusX + circleB.radiusX);
        }
        
        // For ellipses, use approximate collision with average radii
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= (avgRadiusA + avgRadiusB);
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
        const shape = obj.collisionShape || 'rectangle';
        
        if (shape === 'circle') {
            const circle = obj.getCollisionCircle(game);
            const dx = x - circle.centerX;
            const dy = y - circle.centerY;
            
            // For ellipse, normalize by radii
            const normalizedDistX = dx / circle.radiusX;
            const normalizedDistY = dy / circle.radiusY;
            const normalizedDistance = Math.sqrt(normalizedDistX * normalizedDistX + normalizedDistY * normalizedDistY);
            
            return normalizedDistance <= 1.0;
        }
        
        // Rectangle collision
        const bounds = obj.getCollisionBounds(game);
        return (
            x >= bounds.left &&
            x <= bounds.right &&
            y >= bounds.top &&
            y <= bounds.bottom
        );
    }
}
