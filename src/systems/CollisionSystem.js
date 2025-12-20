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
     * Optionally specify mapId to check zones on a different map
     */
    checkZoneCollision(x, y, game, actor = null, mapId = null) {
        // Get map zones (default to current map)
        const targetMapId = mapId || game.currentMapId;
        const mapData = game.mapManager.maps[targetMapId];
        if (!mapData || !mapData.zones) return false;
        
        // Filter for collision zones only
        const collisionZones = mapData.zones.filter(z => z.type === 'collision');
        if (collisionZones.length === 0) return false;
        
        // If no actor, just check the single point
        if (!actor) {
            for (const zone of collisionZones) {
                if (this.pointInPolygon({x, y}, zone.points)) {
                    return true;
                }
            }
            return false;
        }
        
        // Get actor's collision bounds in UNSCALED/logical space
        // getCollisionBounds returns scaled coordinates, so we need to unscale
        const resolutionScale = game.resolutionScale || 1.0;
        const scaledBounds = actor.getCollisionBounds(game);
        
        // Convert to unscaled space (zone points are stored unscaled)
        const rect = {
            left: scaledBounds.left / resolutionScale,
            right: scaledBounds.right / resolutionScale,
            top: scaledBounds.top / resolutionScale,
            bottom: scaledBounds.bottom / resolutionScale
        };
        
        // Offset the rect to the new position (x, y) instead of actor's current position
        const currentX = actor.x;
        const currentY = actor.y;
        const deltaX = x - currentX;
        const deltaY = y - currentY;
        
        rect.left += deltaX;
        rect.right += deltaX;
        rect.top += deltaY;
        rect.bottom += deltaY;
        
        // Check each collision zone for intersection with the rect
        for (const zone of collisionZones) {
            if (this.polygonRectIntersect(zone.points, rect)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if a polygon intersects with a rectangle
     * Uses three checks:
     * 1. Any corner of rect inside polygon
     * 2. Any vertex of polygon inside rect
     * 3. Any edge of polygon intersects any edge of rect
     */
    polygonRectIntersect(polygon, rect) {
        // Check 1: Any corner of rect inside polygon
        const rectCorners = [
            {x: rect.left, y: rect.top},
            {x: rect.right, y: rect.top},
            {x: rect.right, y: rect.bottom},
            {x: rect.left, y: rect.bottom}
        ];
        
        for (const corner of rectCorners) {
            if (this.pointInPolygon(corner, polygon)) {
                return true;
            }
        }
        
        // Check 2: Any vertex of polygon inside rect
        for (const vertex of polygon) {
            if (vertex.x >= rect.left && vertex.x <= rect.right &&
                vertex.y >= rect.top && vertex.y <= rect.bottom) {
                return true;
            }
        }
        
        // Check 3: Any edge of polygon intersects any edge of rect
        const rectEdges = [
            [{x: rect.left, y: rect.top}, {x: rect.right, y: rect.top}],      // Top
            [{x: rect.right, y: rect.top}, {x: rect.right, y: rect.bottom}],  // Right
            [{x: rect.right, y: rect.bottom}, {x: rect.left, y: rect.bottom}], // Bottom
            [{x: rect.left, y: rect.bottom}, {x: rect.left, y: rect.top}]     // Left
        ];
        
        for (let i = 0; i < polygon.length; i++) {
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % polygon.length];
            
            for (const rectEdge of rectEdges) {
                if (this.lineSegmentsIntersect(p1, p2, rectEdge[0], rectEdge[1])) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Check if two line segments intersect
     */
    lineSegmentsIntersect(p1, p2, p3, p4) {
        const d1 = this.direction(p3, p4, p1);
        const d2 = this.direction(p3, p4, p2);
        const d3 = this.direction(p1, p2, p3);
        const d4 = this.direction(p1, p2, p4);
        
        if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
            ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
            return true;
        }
        
        if (d1 === 0 && this.onSegment(p3, p4, p1)) return true;
        if (d2 === 0 && this.onSegment(p3, p4, p2)) return true;
        if (d3 === 0 && this.onSegment(p1, p2, p3)) return true;
        if (d4 === 0 && this.onSegment(p1, p2, p4)) return true;
        
        return false;
    }
    
    /**
     * Calculate cross product direction
     */
    direction(p1, p2, p3) {
        return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
    }
    
    /**
     * Check if point is on line segment
     */
    onSegment(p1, p2, p) {
        return Math.min(p1.x, p2.x) <= p.x && p.x <= Math.max(p1.x, p2.x) &&
               Math.min(p1.y, p2.y) <= p.y && p.y <= Math.max(p1.y, p2.y);
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
