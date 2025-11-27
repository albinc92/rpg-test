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
    
    /**
     * Check if a point is inside any collision zone
     * Optionally checks actor bounds if provided (for more accurate collision)
     */
    checkZoneCollision(x, y, game, actor = null) {
        // Get current map zones
        const mapData = game.mapManager.maps[game.currentMapId];
        if (!mapData || !mapData.zones) return false;
        
        let pointsToCheck = [{x, y}];
        
        // If actor provided, check multiple points around their collision bounds
        if (actor) {
            // Get scaled collision bounds (current position)
            const bounds = actor.getCollisionBounds(game);
            
            // Calculate scale factors
            const mapScale = mapData.scale || 1.0;
            const resolutionScale = game.resolutionScale || 1.0;
            const totalScale = mapScale * resolutionScale;
            
            // Calculate unscaled dimensions
            const unscaledWidth = bounds.width / totalScale;
            const unscaledHeight = bounds.height / totalScale;
            
            // Calculate offset of collision box center relative to actor center
            // We use the CURRENT actor position to determine the offset
            const currentScaledX = actor.getScaledX(game);
            const currentScaledY = actor.getScaledY(game);
            const boundsCenterX = bounds.x + bounds.width / 2;
            const boundsCenterY = bounds.y + bounds.height / 2;
            
            const scaledOffsetX = boundsCenterX - currentScaledX;
            const scaledOffsetY = boundsCenterY - currentScaledY;
            
            const unscaledOffsetX = scaledOffsetX / totalScale;
            const unscaledOffsetY = scaledOffsetY / totalScale;
            
            // Apply offset to NEW position (x,y)
            const centerX = x + unscaledOffsetX;
            const centerY = y + unscaledOffsetY;
            
            // Calculate unscaled bounds at new position
            const left = centerX - unscaledWidth / 2;
            const right = centerX + unscaledWidth / 2;
            const top = centerY - unscaledHeight / 2;
            const bottom = centerY + unscaledHeight / 2;
            
            // Add edge points to check list (corners and midpoints)
            pointsToCheck = [
                {x: centerX, y: centerY}, // Center
                {x: left, y: top}, // Top-Left
                {x: right, y: top}, // Top-Right
                {x: left, y: bottom}, // Bottom-Left
                {x: right, y: bottom}, // Bottom-Right
                {x: centerX, y: top}, // Top-Center
                {x: centerX, y: bottom}, // Bottom-Center
                {x: left, y: centerY}, // Left-Center
                {x: right, y: centerY} // Right-Center
            ];
        }
        
        for (const zone of mapData.zones) {
            // Only check collision zones
            if (zone.type !== 'collision') continue;
            
            // Check all sample points
            for (const point of pointsToCheck) {
                if (this.pointInPolygon(point, zone.points)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Check if a point is inside a polygon
     */
    pointInPolygon(point, vs) {
        var x = point.x, y = point.y;
        var inside = false;
        for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            var xi = vs[i].x, yi = vs[i].y;
            var xj = vs[j].x, yj = vs[j].y;
            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
}
