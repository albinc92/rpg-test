/**
 * GameMap Class
 * Represents a single map/screen with boundaries and background
 */
class GameMap extends GameObject {
    constructor(name, width, height, backgroundImage = null) {
        super(name);
        
        this.mapWidth = width;
        this.mapHeight = height;
        this.backgroundImage = backgroundImage;
        
        // Map boundaries (world coordinates)
        this.bounds = {
            left: -width / 2,
            right: width / 2,
            top: -height / 2,
            bottom: height / 2
        };
        
        // Tile-based properties
        this.tiles = new Map();
        this.obstacles = [];
        
        this.addTag('map');
    }

    render(renderer) {
        if (!this.visible) return;
        
        // Draw background image if available
        if (this.backgroundImage) {
            this.drawBackground(renderer);
        } else {
            // Draw default background color
            this.drawDefaultBackground(renderer);
        }
    }

    drawBackground(renderer) {
        const camera = renderer.getCamera();
        
        // Calculate how to position the background to fill the map
        const bgScale = Math.max(
            this.mapWidth / this.backgroundImage.width,
            this.mapHeight / this.backgroundImage.height
        );
        
        const bgWidth = this.backgroundImage.width * bgScale;
        const bgHeight = this.backgroundImage.height * bgScale;
        
        // Center the background on the map
        const bgX = -bgWidth / 2;
        const bgY = -bgHeight / 2;
        
        // Convert to screen coordinates
        const screenPos = renderer.worldToScreen(new Vector2(bgX, bgY));
        
        renderer.ctx.save();
        renderer.ctx.drawImage(
            this.backgroundImage,
            screenPos.x,
            screenPos.y,
            bgWidth * camera.zoom,
            bgHeight * camera.zoom
        );
        renderer.ctx.restore();
    }

    drawDefaultBackground(renderer) {
        // Draw a simple colored background
        const camera = renderer.getCamera();
        const topLeft = renderer.worldToScreen(new Vector2(this.bounds.left, this.bounds.top));
        const bottomRight = renderer.worldToScreen(new Vector2(this.bounds.right, this.bounds.bottom));
        
        renderer.ctx.save();
        renderer.ctx.fillStyle = '#87CEEB'; // Light blue
        renderer.ctx.fillRect(
            topLeft.x,
            topLeft.y,
            bottomRight.x - topLeft.x,
            bottomRight.y - topLeft.y
        );
        renderer.ctx.restore();
    }

    // Check if a position is within map boundaries
    isWithinBounds(position) {
        return position.x >= this.bounds.left &&
               position.x <= this.bounds.right &&
               position.y >= this.bounds.top &&
               position.y <= this.bounds.bottom;
    }

    // Clamp position to map boundaries
    clampToMap(position) {
        return new Vector2(
            Math.max(this.bounds.left, Math.min(this.bounds.right, position.x)),
            Math.max(this.bounds.top, Math.min(this.bounds.bottom, position.y))
        );
    }

    // Set background image
    setBackgroundImage(image) {
        this.backgroundImage = image;
    }

    // Add obstacles/objects to this map
    addObstacle(obstacle) {
        this.obstacles.push(obstacle);
        return obstacle;
    }

    removeObstacle(obstacle) {
        const index = this.obstacles.indexOf(obstacle);
        if (index !== -1) {
            this.obstacles.splice(index, 1);
        }
    }

    // Get all objects in this map
    getAllObjects() {
        return [...this.obstacles];
    }
}
