/**
 * Obstacle Class
 * Represents solid objects that block movement (trees, rocks, buildings, etc.)
 */
class Obstacle extends GameObject {
    constructor(x, y, obstacleType = 'rock') {
        super(`Obstacle_${obstacleType}_${Date.now()}`);
        
        this.position = new Vector2(x, y);
        this.obstacleType = obstacleType;
        
        // Initialize based on type
        this.initializeType(obstacleType);
        
        // Make solid by default
        this.solid = true;
        
        // Rendering depth (obstacles render above tiles but below entities)
        this.depth = 0;
        
        this.addTag('obstacle');
        this.addTag(obstacleType);
    }

    initializeType(type) {
        const obstacleData = {
            'rock': {
                color: '#757575',
                size: new Vector2(30, 30),
                height: 20,
                destructible: false,
                health: 0
            },
            'tree': {
                color: '#4CAF50',
                size: new Vector2(25, 25),
                height: 40,
                destructible: true,
                health: 50
            },
            'bush': {
                color: '#66BB6A',
                size: new Vector2(20, 20),
                height: 15,
                destructible: true,
                health: 10
            },
            'crate': {
                color: '#8D6E63',
                size: new Vector2(28, 28),
                height: 25,
                destructible: true,
                health: 25
            },
            'barrel': {
                color: '#6D4C41',
                size: new Vector2(22, 22),
                height: 30,
                destructible: true,
                health: 15
            },
            'pillar': {
                color: '#9E9E9E',
                size: new Vector2(20, 20),
                height: 50,
                destructible: false,
                health: 0
            },
            'crystal': {
                color: '#9C27B0',
                size: new Vector2(18, 18),
                height: 25,
                destructible: true,
                health: 30,
                glowing: true
            }
        };

        const data = obstacleData[type] || obstacleData['rock'];
        
        this.color = data.color;
        this.size = data.size;
        this.obstacleHeight = data.height;
        this.destructible = data.destructible;
        this.maxHealth = data.health;
        this.health = data.health;
        this.glowing = data.glowing || false;
        
        // Set up collider
        this.collider = {
            x: -this.size.x / 2,
            y: -this.size.y / 2,
            width: this.size.x,
            height: this.size.y
        };
        
        // Animation properties
        this.animationTimer = 0;
        this.shakeAmount = 0;
        this.damaged = false;
    }

    update(deltaTime) {
        this.animationTimer += deltaTime;
        
        // Update shake effect when damaged
        if (this.shakeAmount > 0) {
            this.shakeAmount -= deltaTime * 5;
            if (this.shakeAmount < 0) {
                this.shakeAmount = 0;
                this.damaged = false;
            }
        }
        
        // Type-specific updates
        this.updateTypeSpecific(deltaTime);
        
        super.update(deltaTime);
    }

    updateTypeSpecific(deltaTime) {
        switch (this.obstacleType) {
            case 'tree':
                this.updateTree(deltaTime);
                break;
            case 'crystal':
                this.updateCrystal(deltaTime);
                break;
            case 'bush':
                this.updateBush(deltaTime);
                break;
        }
    }

    updateTree(deltaTime) {
        // Subtle swaying animation
        const sway = Math.sin(this.animationTimer * 0.5 + this.position.x * 0.01) * 1;
        this.rotation = sway * 0.02; // Very subtle rotation
    }

    updateCrystal(deltaTime) {
        // Glowing pulse animation
        if (this.glowing) {
            const pulse = (Math.sin(this.animationTimer * 3) + 1) * 0.5;
            this.glowIntensity = 0.3 + pulse * 0.4;
        }
    }

    updateBush(deltaTime) {
        // Gentle rustling animation
        const rustle = Math.sin(this.animationTimer * 2 + this.position.y * 0.01) * 0.5;
        this.scale = new Vector2(1 + rustle * 0.05, 1 + rustle * 0.03);
    }

    render(renderer) {
        if (!this.visible) return;
        
        const screenPos = renderer.worldToScreen(this.position);
        
        // Apply shake effect
        let renderPos = screenPos;
        if (this.shakeAmount > 0) {
            const shakeX = (Math.random() - 0.5) * this.shakeAmount * 4;
            const shakeY = (Math.random() - 0.5) * this.shakeAmount * 4;
            renderPos = screenPos.add(new Vector2(shakeX, shakeY));
        }
        
        renderer.ctx.save();
        renderer.ctx.translate(renderPos.x, renderPos.y);
        renderer.ctx.rotate(this.rotation);
        renderer.ctx.scale(this.scale.x, this.scale.y);
        
        // Render based on type
        this.renderByType(renderer);
        
        renderer.ctx.restore();
        
        // Render health bar if damaged and destructible
        if (this.destructible && this.health < this.maxHealth && this.health > 0) {
            this.renderHealthBar(renderer, screenPos);
        }
        
        // Render debug info
        if (renderer.showColliders) {
            renderer.drawCollider(this);
        }
        
        if (renderer.showOrigins) {
            renderer.drawOrigin(this);
        }
    }

    renderByType(renderer) {
        switch (this.obstacleType) {
            case 'rock':
                this.renderRock(renderer);
                break;
            case 'tree':
                this.renderTree(renderer);
                break;
            case 'bush':
                this.renderBush(renderer);
                break;
            case 'crate':
                this.renderCrate(renderer);
                break;
            case 'barrel':
                this.renderBarrel(renderer);
                break;
            case 'pillar':
                this.renderPillar(renderer);
                break;
            case 'crystal':
                this.renderCrystal(renderer);
                break;
            default:
                this.renderDefault(renderer);
        }
    }

    renderRock(renderer) {
        // Simple rock shape
        renderer.ctx.fillStyle = this.color;
        renderer.ctx.beginPath();
        renderer.ctx.ellipse(0, 0, this.size.x / 2, this.size.y / 2, 0, 0, Math.PI * 2);
        renderer.ctx.fill();
        
        // Highlight
        renderer.ctx.fillStyle = this.getLighterColor(this.color);
        renderer.ctx.beginPath();
        renderer.ctx.ellipse(-5, -5, this.size.x / 4, this.size.y / 4, 0, 0, Math.PI * 2);
        renderer.ctx.fill();
    }

    renderTree(renderer) {
        // Tree trunk
        renderer.ctx.fillStyle = '#795548';
        renderer.ctx.fillRect(-3, -5, 6, this.obstacleHeight / 2);
        
        // Tree crown
        renderer.ctx.fillStyle = this.color;
        renderer.ctx.beginPath();
        renderer.ctx.arc(0, -this.obstacleHeight / 2, this.size.x / 2, 0, Math.PI * 2);
        renderer.ctx.fill();
        
        // Leaves detail
        renderer.ctx.fillStyle = this.getDarkerColor(this.color);
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const x = Math.cos(angle) * (this.size.x / 4);
            const y = Math.sin(angle) * (this.size.y / 4) - this.obstacleHeight / 2;
            renderer.ctx.beginPath();
            renderer.ctx.arc(x, y, 4, 0, Math.PI * 2);
            renderer.ctx.fill();
        }
    }

    renderBush(renderer) {
        // Multiple overlapping circles for bush shape
        renderer.ctx.fillStyle = this.color;
        
        const circles = [
            { x: 0, y: 0, r: this.size.x / 2 },
            { x: -4, y: -2, r: this.size.x / 3 },
            { x: 4, y: -2, r: this.size.x / 3 },
            { x: 0, y: 4, r: this.size.x / 4 }
        ];
        
        for (const circle of circles) {
            renderer.ctx.beginPath();
            renderer.ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
            renderer.ctx.fill();
        }
    }

    renderCrate(renderer) {
        // Isometric crate
        renderer.ctx.fillStyle = this.color;
        renderer.ctx.fillRect(-this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
        
        // Wood grain lines
        renderer.ctx.strokeStyle = this.getDarkerColor(this.color);
        renderer.ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const y = -this.size.y / 2 + (i + 1) * (this.size.y / 4);
            renderer.ctx.beginPath();
            renderer.ctx.moveTo(-this.size.x / 2, y);
            renderer.ctx.lineTo(this.size.x / 2, y);
            renderer.ctx.stroke();
        }
    }

    renderBarrel(renderer) {
        // Barrel body
        renderer.ctx.fillStyle = this.color;
        renderer.ctx.beginPath();
        renderer.ctx.ellipse(0, 0, this.size.x / 2, this.size.y / 2, 0, 0, Math.PI * 2);
        renderer.ctx.fill();
        
        // Barrel bands
        renderer.ctx.strokeStyle = '#4A2C20';
        renderer.ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i++) {
            const y = i * (this.size.y / 4);
            renderer.ctx.beginPath();
            renderer.ctx.ellipse(0, y, this.size.x / 2, 2, 0, 0, Math.PI * 2);
            renderer.ctx.stroke();
        }
    }

    renderPillar(renderer) {
        // Pillar base
        renderer.ctx.fillStyle = this.color;
        renderer.ctx.fillRect(-this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
        
        // Pillar highlights
        renderer.ctx.fillStyle = this.getLighterColor(this.color);
        renderer.ctx.fillRect(-this.size.x / 2, -this.size.y / 2, 2, this.size.y);
        renderer.ctx.fillRect(-this.size.x / 2, -this.size.y / 2, this.size.x, 2);
    }

    renderCrystal(renderer) {
        // Crystal glow effect
        if (this.glowing && this.glowIntensity) {
            renderer.ctx.save();
            renderer.ctx.globalAlpha = this.glowIntensity;
            renderer.ctx.fillStyle = this.getLighterColor(this.color);
            renderer.ctx.beginPath();
            renderer.ctx.arc(0, 0, this.size.x, 0, Math.PI * 2);
            renderer.ctx.fill();
            renderer.ctx.restore();
        }
        
        // Crystal shape (diamond)
        renderer.ctx.fillStyle = this.color;
        renderer.ctx.beginPath();
        renderer.ctx.moveTo(0, -this.size.y / 2);
        renderer.ctx.lineTo(this.size.x / 2, 0);
        renderer.ctx.lineTo(0, this.size.y / 2);
        renderer.ctx.lineTo(-this.size.x / 2, 0);
        renderer.ctx.closePath();
        renderer.ctx.fill();
        
        // Crystal facets
        renderer.ctx.fillStyle = this.getLighterColor(this.color);
        renderer.ctx.beginPath();
        renderer.ctx.moveTo(0, -this.size.y / 2);
        renderer.ctx.lineTo(0, 0);
        renderer.ctx.lineTo(-this.size.x / 2, 0);
        renderer.ctx.closePath();
        renderer.ctx.fill();
    }

    renderDefault(renderer) {
        // Fallback rendering
        renderer.ctx.fillStyle = this.color;
        renderer.ctx.fillRect(-this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
    }

    renderHealthBar(renderer, screenPos) {
        const barWidth = this.size.x;
        const barHeight = 3;
        const offsetY = -this.size.y / 2 - 8;
        
        // Background
        renderer.ctx.fillStyle = '#333333';
        renderer.ctx.fillRect(
            screenPos.x - barWidth / 2,
            screenPos.y + offsetY,
            barWidth,
            barHeight
        );
        
        // Health
        const healthPercent = this.health / this.maxHealth;
        renderer.ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : '#F44336';
        renderer.ctx.fillRect(
            screenPos.x - barWidth / 2,
            screenPos.y + offsetY,
            barWidth * healthPercent,
            barHeight
        );
    }

    // Interaction methods
    takeDamage(amount, source) {
        if (!this.destructible) return false;
        
        this.health -= amount;
        this.shakeAmount = 2;
        this.damaged = true;
        
        if (this.health <= 0) {
            this.destroy();
            this.onDestroyed(source);
            return true;
        }
        
        return false;
    }

    onDestroyed(source) {
        console.log(`${this.obstacleType} destroyed!`);
        
        // Drop items based on type
        this.dropItems();
        
        // Create destruction particles/effects
        if (this.scene && this.scene.engine && this.scene.engine.camera) {
            this.scene.engine.camera.shakeSimple(3, 0.3);
        }
    }

    dropItems() {
        const dropChances = {
            'tree': [{ item: 'wood', chance: 0.8, amount: 3 }],
            'bush': [{ item: 'berries', chance: 0.6, amount: 1 }],
            'crate': [{ item: 'coins', chance: 0.9, amount: 5 }],
            'barrel': [{ item: 'coins', chance: 0.7, amount: 3 }],
            'crystal': [{ item: 'crystal_shard', chance: 1.0, amount: 1 }]
        };
        
        const drops = dropChances[this.obstacleType] || [];
        
        for (const drop of drops) {
            if (Math.random() < drop.chance) {
                console.log(`Dropped ${drop.amount}x ${drop.item}`);
                // Here you would create actual item objects
            }
        }
    }

    // Utility methods
    getLighterColor(color) {
        if (color.startsWith('#')) {
            const hex = color.substring(1);
            const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + 40);
            const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + 40);
            const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + 40);
            return `rgb(${r}, ${g}, ${b})`;
        }
        return '#ffffff';
    }

    getDarkerColor(color) {
        if (color.startsWith('#')) {
            const hex = color.substring(1);
            const r = Math.floor(parseInt(hex.substr(0, 2), 16) * 0.7);
            const g = Math.floor(parseInt(hex.substr(2, 2), 16) * 0.7);
            const b = Math.floor(parseInt(hex.substr(4, 2), 16) * 0.7);
            return `rgb(${r}, ${g}, ${b})`;
        }
        return '#000000';
    }

    // Static factory methods
    static createTree(x, y) {
        return new Obstacle(x, y, 'tree');
    }

    static createRock(x, y) {
        return new Obstacle(x, y, 'rock');
    }

    static createCrate(x, y) {
        return new Obstacle(x, y, 'crate');
    }

    static createCrystal(x, y) {
        return new Obstacle(x, y, 'crystal');
    }
}
