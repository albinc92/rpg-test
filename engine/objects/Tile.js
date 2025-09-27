/**
 * Tile Class
 * Represents a single tile in the isometric world
 */
class Tile extends GameObject {
    constructor(x, y, tileType = 'grass') {
        super(`Tile_${x}_${y}`);
        
        this.position = new Vector2(x, y);
        this.tileType = tileType;
        this.gridX = x;
        this.gridY = y;
        
        // Tile properties
        this.walkable = true;
        this.height = 0; // For elevation
        this.variant = 0; // For texture variations
        
        // Visual properties
        this.baseColor = this.getTileColor(tileType);
        this.color = this.baseColor;
        this.size = new Vector2(32, 32); // Tile size in world units
        
        // Rendering
        this.depth = -1; // Tiles render behind other objects
        
        this.addTag('tile');
        this.addTag(tileType);
    }

    getTileColor(type) {
        const colors = {
            'grass': '#7CB342',
            'dirt': '#8D6E63',
            'stone': '#757575',
            'water': '#2196F3',
            'sand': '#FFC107',
            'wood': '#795548',
            'metal': '#607D8B',
            'lava': '#FF5722'
        };
        
        return colors[type] || '#4CAF50';
    }

    update(deltaTime) {
        // Tiles typically don't need complex updates
        // But we can add effects like water animation, etc.
        
        if (this.tileType === 'water') {
            this.updateWaterAnimation(deltaTime);
        }
        
        super.update(deltaTime);
    }

    updateWaterAnimation(deltaTime) {
        // Simple water animation using color variation
        const time = performance.now() * 0.001;
        const wave = Math.sin(time + this.gridX * 0.5 + this.gridY * 0.3) * 0.1 + 0.9;
        
        // Animate between different shades of blue
        const baseBlue = 0x2196F3;
        const r = (baseBlue >> 16) & 0xFF;
        const g = (baseBlue >> 8) & 0xFF;
        const b = baseBlue & 0xFF;
        
        const newR = Math.floor(r * wave);
        const newG = Math.floor(g * wave);
        const newB = Math.floor(b * (1.1 - wave * 0.1));
        
        this.color = `rgb(${newR}, ${newG}, ${newB})`;
    }

    render(renderer) {
        if (!this.visible) return;
        
        // Use isometric rendering
        this.renderIsometric(renderer);
        
        // Add tile-specific effects
        if (this.tileType === 'lava') {
            this.renderLavaEffect(renderer);
        }
    }

    renderIsometric(renderer) {
        const screenPos = renderer.worldToScreen(this.position);
        
        // Calculate isometric tile vertices
        const tileWidth = renderer.tileWidth;
        const tileHeight = renderer.tileHeight;
        
        const vertices = [
            new Vector2(screenPos.x, screenPos.y - tileHeight / 2), // Top
            new Vector2(screenPos.x + tileWidth / 2, screenPos.y),  // Right
            new Vector2(screenPos.x, screenPos.y + tileHeight / 2), // Bottom
            new Vector2(screenPos.x - tileWidth / 2, screenPos.y)   // Left
        ];
        
        renderer.ctx.save();
        
        // Draw tile shape
        renderer.ctx.fillStyle = this.color;
        renderer.ctx.beginPath();
        renderer.ctx.moveTo(vertices[0].x, vertices[0].y);
        
        for (let i = 1; i < vertices.length; i++) {
            renderer.ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        
        renderer.ctx.closePath();
        renderer.ctx.fill();
        
        // Draw tile outline
        renderer.ctx.strokeStyle = this.getDarkerColor(this.color);
        renderer.ctx.lineWidth = 1;
        renderer.ctx.stroke();
        
        // Draw height/elevation effect
        if (this.height > 0) {
            this.renderElevation(renderer, vertices);
        }
        
        renderer.ctx.restore();
    }

    renderElevation(renderer, vertices) {
        const elevationOffset = this.height * 5;
        
        // Draw elevated sides
        renderer.ctx.fillStyle = this.getDarkerColor(this.color);
        
        // Right side
        renderer.ctx.beginPath();
        renderer.ctx.moveTo(vertices[1].x, vertices[1].y);
        renderer.ctx.lineTo(vertices[1].x, vertices[1].y + elevationOffset);
        renderer.ctx.lineTo(vertices[2].x, vertices[2].y + elevationOffset);
        renderer.ctx.lineTo(vertices[2].x, vertices[2].y);
        renderer.ctx.closePath();
        renderer.ctx.fill();
        
        // Bottom side
        renderer.ctx.beginPath();
        renderer.ctx.moveTo(vertices[2].x, vertices[2].y);
        renderer.ctx.lineTo(vertices[2].x, vertices[2].y + elevationOffset);
        renderer.ctx.lineTo(vertices[3].x, vertices[3].y + elevationOffset);
        renderer.ctx.lineTo(vertices[3].x, vertices[3].y);
        renderer.ctx.closePath();
        renderer.ctx.fill();
    }

    renderLavaEffect(renderer) {
        // Add glowing effect for lava tiles
        const screenPos = renderer.worldToScreen(this.position);
        const time = performance.now() * 0.003;
        const glowIntensity = (Math.sin(time + this.gridX + this.gridY) + 1) * 0.5;
        
        renderer.ctx.save();
        renderer.ctx.globalAlpha = glowIntensity * 0.3;
        renderer.ctx.fillStyle = '#FF9800';
        
        const glowSize = 40 + glowIntensity * 20;
        const gradient = renderer.ctx.createRadialGradient(
            screenPos.x, screenPos.y, 0,
            screenPos.x, screenPos.y, glowSize
        );
        
        gradient.addColorStop(0, 'rgba(255, 152, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 152, 0, 0)');
        
        renderer.ctx.fillStyle = gradient;
        renderer.ctx.beginPath();
        renderer.ctx.arc(screenPos.x, screenPos.y, glowSize, 0, Math.PI * 2);
        renderer.ctx.fill();
        
        renderer.ctx.restore();
    }

    getDarkerColor(color) {
        // Simple function to make a color darker
        if (color.startsWith('#')) {
            const hex = color.substring(1);
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            
            return `rgb(${Math.floor(r * 0.7)}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.7)})`;
        } else if (color.startsWith('rgb')) {
            const values = color.match(/\d+/g);
            if (values && values.length >= 3) {
                const r = Math.floor(parseInt(values[0]) * 0.7);
                const g = Math.floor(parseInt(values[1]) * 0.7);
                const b = Math.floor(parseInt(values[2]) * 0.7);
                return `rgb(${r}, ${g}, ${b})`;
            }
        }
        
        return '#333333'; // Fallback
    }

    // Tile utility methods
    setHeight(height) {
        this.height = Math.max(0, height);
        this.depth = -1 - height; // Higher tiles render first
    }

    setWalkable(walkable) {
        this.walkable = walkable;
        if (!walkable) {
            this.color = this.getDarkerColor(this.baseColor);
        } else {
            this.color = this.baseColor;
        }
    }

    setTileType(type) {
        this.tileType = type;
        this.baseColor = this.getTileColor(type);
        this.color = this.baseColor;
        
        // Remove old type tag and add new one
        this.tags = this.tags.filter(tag => !['grass', 'dirt', 'stone', 'water', 'sand', 'wood', 'metal', 'lava'].includes(tag));
        this.addTag(type);
        
        // Update walkability based on type
        if (type === 'water' || type === 'lava') {
            this.setWalkable(false);
        }
    }

    // Pathfinding helpers
    getNeighbors(tileMap) {
        const neighbors = [];
        const directions = [
            { x: -1, y: 0 },  // Left
            { x: 1, y: 0 },   // Right
            { x: 0, y: -1 },  // Up
            { x: 0, y: 1 },   // Down
            { x: -1, y: -1 }, // Top-left
            { x: 1, y: -1 },  // Top-right
            { x: -1, y: 1 },  // Bottom-left
            { x: 1, y: 1 }    // Bottom-right
        ];
        
        for (const dir of directions) {
            const newX = this.gridX + dir.x;
            const newY = this.gridY + dir.y;
            const key = `${newX}_${newY}`;
            
            if (tileMap.has(key)) {
                neighbors.push(tileMap.get(key));
            }
        }
        
        return neighbors;
    }

    getMovementCost() {
        const costs = {
            'grass': 1,
            'dirt': 1.2,
            'stone': 1.5,
            'sand': 1.8,
            'wood': 1.3,
            'metal': 1.1,
            'water': 10, // Very expensive to cross
            'lava': 100  // Nearly impossible
        };
        
        return costs[this.tileType] || 1;
    }

    // Static factory methods
    static createGrassTile(x, y) {
        return new Tile(x, y, 'grass');
    }

    static createWaterTile(x, y) {
        const tile = new Tile(x, y, 'water');
        tile.setWalkable(false);
        return tile;
    }

    static createStoneTile(x, y, height = 1) {
        const tile = new Tile(x, y, 'stone');
        tile.setHeight(height);
        return tile;
    }
}
