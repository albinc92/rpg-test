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
        const shapeA = objA.collisionShape || 'circle';
        const shapeB = objB.collisionShape || 'circle';
        
        // Rectangle-Rectangle collision (AABB)
        // EDGE SMOOTHING: Shrink bounds slightly to create slippery edges
        if (shapeA === 'rectangle' && shapeB === 'rectangle') {
            const boundsA = objA.getCollisionBounds(game);
            const boundsB = objB.getCollisionBounds(game);
            
            // Shrink each bound by 5% to create edge tolerance
            const edgeTolerance = 0.05;
            const shrinkA = {
                left: boundsA.left + boundsA.width * edgeTolerance,
                right: boundsA.right - boundsA.width * edgeTolerance,
                top: boundsA.top + boundsA.height * edgeTolerance,
                bottom: boundsA.bottom - boundsA.height * edgeTolerance
            };
            const shrinkB = {
                left: boundsB.left + boundsB.width * edgeTolerance,
                right: boundsB.right - boundsB.width * edgeTolerance,
                top: boundsB.top + boundsB.height * edgeTolerance,
                bottom: boundsB.bottom - boundsB.height * edgeTolerance
            };
            
            return (
                shrinkA.left < shrinkB.right &&
                shrinkA.right > shrinkB.left &&
                shrinkA.top < shrinkB.bottom &&
                shrinkA.bottom > shrinkB.top
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
     * EDGE SMOOTHING: Slightly reduces collision radius to create "slippery" edges
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
        
        // EDGE SMOOTHING: Use 0.95 threshold instead of 1.0 to create slippery edges
        // This allows objects to slide along boundaries more smoothly
        return normalizedDistance <= 0.95;
    }
    
    /**
     * Check collision between two circles/ellipses
     * Uses proper ellipse-to-ellipse collision detection
     * EDGE SMOOTHING: Slightly reduces collision threshold for slippery edges
     */
    checkEllipseEllipseCollision(circleA, circleB) {
        // Calculate distance between centers
        const dx = circleB.centerX - circleA.centerX;
        const dy = circleB.centerY - circleA.centerY;
        
        // EDGE SMOOTHING: Reduce effective collision radius by 5% for slippery feel
        const edgeSmoothing = 0.95;
        
        // If both are perfect circles (radiusX == radiusY), use exact circle collision
        if (circleA.radiusX === circleA.radiusY && circleB.radiusX === circleB.radiusY) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            const collisionDistance = (circleA.radiusX + circleB.radiusX) * edgeSmoothing;
            return distance <= collisionDistance;
        }
        
        // For ellipses, treat ellipse B as a point and test against expanded ellipse A
        // This is more accurate than averaging radii
        // Expand ellipse A by ellipse B's radii (with smoothing applied)
        const expandedRadiusX = (circleA.radiusX + circleB.radiusX) * edgeSmoothing;
        const expandedRadiusY = (circleA.radiusY + circleB.radiusY) * edgeSmoothing;
        
        // Normalize the distance by the expanded radii
        const normalizedDistX = dx / expandedRadiusX;
        const normalizedDistY = dy / expandedRadiusY;
        const normalizedDistSquared = normalizedDistX * normalizedDistX + normalizedDistY * normalizedDistY;
        
        // Collision if normalized distance <= 1
        return normalizedDistSquared <= 1.0;
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
        const shape = obj.collisionShape || 'circle';
        
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
