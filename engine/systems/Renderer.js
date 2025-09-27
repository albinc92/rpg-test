/**
 * Renderer System
 * Handles isometric rendering and screen transformations
 */
class Renderer {
    constructor(ctx) {
        this.ctx = ctx;
        this.canvas = ctx.canvas;
        
        // Isometric projection settings
        this.tileWidth = 64;
        this.tileHeight = 32;
        this.scale = 1.0;
        
        // Grid settings
        this.showGrid = false;
        this.gridColor = '#333333';
        this.gridAlpha = 0.3;
        
        // Debug rendering
        this.showColliders = false;
        this.showOrigins = false;
        
        // Background image
        this.backgroundImage = null;
        this.backgroundScale = 1.0;
        this.backgroundOffset = new Vector2(0, 0);
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background image if available
        if (this.backgroundImage) {
            this.drawBackground();
        }
    }

    drawBackground() {
        if (!this.backgroundImage) return;
        
        const camera = this.getCamera();
        
        // Calculate background position relative to camera
        const bgX = (-camera.position.x * this.backgroundScale * 0.1) + this.backgroundOffset.x;
        const bgY = (-camera.position.y * this.backgroundScale * 0.1) + this.backgroundOffset.y;
        
        // Tile the background to cover the screen
        const bgWidth = this.backgroundImage.width * this.backgroundScale;
        const bgHeight = this.backgroundImage.height * this.backgroundScale;
        
        // Calculate how many tiles we need
        const tilesX = Math.ceil(this.canvas.width / bgWidth) + 2;
        const tilesY = Math.ceil(this.canvas.height / bgHeight) + 2;
        
        // Start position for tiling
        const startX = Math.floor(bgX / bgWidth) * bgWidth;
        const startY = Math.floor(bgY / bgHeight) * bgHeight;
        
        this.ctx.save();
        this.ctx.globalAlpha = 0.3; // Make background subtle
        
        for (let x = 0; x < tilesX; x++) {
            for (let y = 0; y < tilesY; y++) {
                this.ctx.drawImage(
                    this.backgroundImage,
                    startX + (x * bgWidth),
                    startY + (y * bgHeight),
                    bgWidth,
                    bgHeight
                );
            }
        }
        
        this.ctx.restore();
    }

    // Coordinate transformation methods
    worldToScreen(worldPos) {
        // Convert world coordinates to isometric screen coordinates
        const camera = this.getCamera();
        
        // Apply camera transform
        const cameraRelative = worldPos.subtract(camera.position);
        
        // Convert to isometric projection
        const iso = this.cartesianToIsometric(cameraRelative);
        
        // Apply camera zoom and center on screen
        const screenX = (iso.x * this.scale * camera.zoom) + (this.canvas.width / 2);
        const screenY = (iso.y * this.scale * camera.zoom) + (this.canvas.height / 2);
        
        return new Vector2(screenX, screenY);
    }

    screenToWorld(screenPos) {
        const camera = this.getCamera();
        
        // Convert screen coordinates back to world
        const centerOffset = screenPos.subtract(new Vector2(this.canvas.width / 2, this.canvas.height / 2));
        const unscaled = centerOffset.divide(this.scale * camera.zoom);
        const cartesian = this.isometricToCartesian(unscaled);
        
        return cartesian.add(camera.position);
    }

    cartesianToIsometric(pos) {
        return new Vector2(
            (pos.x - pos.y) * (this.tileWidth / 2),
            (pos.x + pos.y) * (this.tileHeight / 2)
        );
    }

    isometricToCartesian(pos) {
        return new Vector2(
            (pos.x / (this.tileWidth / 2) + pos.y / (this.tileHeight / 2)) / 2,
            (pos.y / (this.tileHeight / 2) - pos.x / (this.tileWidth / 2)) / 2
        );
    }

    // Drawing methods
    drawSprite(texture, position, options = {}) {
        const {
            width = texture.width,
            height = texture.height,
            rotation = 0,
            scale = new Vector2(1, 1),
            alpha = 1,
            flipX = false,
            flipY = false
        } = options;

        const screenPos = this.worldToScreen(position);

        this.ctx.save();
        
        this.ctx.globalAlpha = alpha;
        this.ctx.translate(screenPos.x, screenPos.y);
        this.ctx.rotate(rotation);
        this.ctx.scale(scale.x * (flipX ? -1 : 1), scale.y * (flipY ? -1 : 1));
        
        this.ctx.drawImage(
            texture,
            -width / 2,
            -height / 2,
            width,
            height
        );
        
        this.ctx.restore();
    }

    drawRect(position, width, height, color = '#ffffff', rotation = 0) {
        const screenPos = this.worldToScreen(position);

        this.ctx.save();
        
        this.ctx.translate(screenPos.x, screenPos.y);
        this.ctx.rotate(rotation);
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(-width / 2, -height / 2, width, height);
        
        this.ctx.restore();
    }

    drawCircle(position, radius, color = '#ffffff', filled = true) {
        const screenPos = this.worldToScreen(position);

        this.ctx.save();
        
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
        
        if (filled) {
            this.ctx.fillStyle = color;
            this.ctx.fill();
        } else {
            this.ctx.strokeStyle = color;
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    drawLine(from, to, color = '#ffffff', lineWidth = 1) {
        const screenFrom = this.worldToScreen(from);
        const screenTo = this.worldToScreen(to);

        this.ctx.save();
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(screenFrom.x, screenFrom.y);
        this.ctx.lineTo(screenTo.x, screenTo.y);
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    drawText(text, position, options = {}) {
        const {
            font = '16px Arial',
            color = '#ffffff',
            align = 'center',
            baseline = 'middle'
        } = options;

        const screenPos = this.worldToScreen(position);

        this.ctx.save();
        
        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        
        this.ctx.fillText(text, screenPos.x, screenPos.y);
        
        this.ctx.restore();
    }

    // Isometric tile rendering
    drawTile(position, tileImage, options = {}) {
        const {
            offsetX = 0,
            offsetY = 0,
            alpha = 1
        } = options;

        const screenPos = this.worldToScreen(position);

        this.ctx.save();
        
        this.ctx.globalAlpha = alpha;
        this.ctx.drawImage(
            tileImage,
            screenPos.x - this.tileWidth / 2 + offsetX,
            screenPos.y - this.tileHeight / 2 + offsetY
        );
        
        this.ctx.restore();
    }

    // Grid rendering
    drawGrid() {
        if (!this.showGrid) return;

        const camera = this.getCamera();
        const startX = Math.floor(camera.position.x - 20);
        const endX = Math.ceil(camera.position.x + 20);
        const startY = Math.floor(camera.position.y - 20);
        const endY = Math.ceil(camera.position.y + 20);

        this.ctx.save();
        this.ctx.strokeStyle = this.gridColor;
        this.ctx.globalAlpha = this.gridAlpha;
        this.ctx.lineWidth = 1;

        // Draw vertical lines
        for (let x = startX; x <= endX; x++) {
            const from = new Vector2(x, startY);
            const to = new Vector2(x, endY);
            const screenFrom = this.worldToScreen(from);
            const screenTo = this.worldToScreen(to);

            this.ctx.beginPath();
            this.ctx.moveTo(screenFrom.x, screenFrom.y);
            this.ctx.lineTo(screenTo.x, screenTo.y);
            this.ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = startY; y <= endY; y++) {
            const from = new Vector2(startX, y);
            const to = new Vector2(endX, y);
            const screenFrom = this.worldToScreen(from);
            const screenTo = this.worldToScreen(to);

            this.ctx.beginPath();
            this.ctx.moveTo(screenFrom.x, screenFrom.y);
            this.ctx.lineTo(screenTo.x, screenTo.y);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    // Debug rendering
    drawCollider(gameObject) {
        if (!this.showColliders || !gameObject.collider) return;

        const bounds = gameObject.getBounds();
        const position = new Vector2(
            bounds.x + bounds.width / 2,
            bounds.y + bounds.height / 2
        );

        this.drawRect(
            position,
            bounds.width,
            bounds.height,
            gameObject.solid ? '#ff0000' : '#00ff00',
            0
        );
    }

    drawOrigin(gameObject) {
        if (!this.showOrigins) return;

        this.drawCircle(gameObject.position, 3, '#ffff00', true);
        this.drawLine(
            gameObject.position,
            gameObject.position.add(Vector2.fromAngle(gameObject.rotation, 20)),
            '#ffff00',
            2
        );
    }

    // Utility methods
    getCamera() {
        // This should be injected or managed by the engine
        return window.gameEngine ? window.gameEngine.camera : { 
            position: new Vector2(0, 0), 
            zoom: 1 
        };
    }

    setShowGrid(show) {
        this.showGrid = show;
    }

    setShowColliders(show) {
        this.showColliders = show;
    }

    setShowOrigins(show) {
        this.showOrigins = show;
    }

    setBackgroundImage(image, scale = 1.0) {
        this.backgroundImage = image;
        this.backgroundScale = scale;
    }

    removeBackground() {
        this.backgroundImage = null;
    }
}
