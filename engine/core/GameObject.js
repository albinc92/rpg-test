/**
 * GameObject Class
 * Base class for all objects in the game world
 */
class GameObject {
    constructor(name = 'GameObject') {
        this.name = name;
        this.scene = null;
        
        // Transform properties
        this.position = new Vector2(0, 0);
        this.rotation = 0; // in radians
        this.scale = new Vector2(1, 1);
        
        // Physics properties
        this.velocity = new Vector2(0, 0);
        this.acceleration = new Vector2(0, 0);
        this.friction = 0.8;
        this.maxSpeed = 200;
        
        // Collision properties
        this.collider = null; // {x, y, width, height} relative to position
        this.solid = false;
        this.trigger = false;
        
        // Rendering properties
        this.visible = true;
        this.color = '#ffffff';
        this.depth = 0; // For depth sorting
        
        // State
        this.active = true;
        this.destroyed = false;
        this.tags = [];
        
        // Components (for extensibility)
        this.components = new Map();
    }

    update(deltaTime) {
        if (!this.active || this.destroyed) return;

        // Update physics
        this.updatePhysics(deltaTime);
        
        // Update components
        for (const component of this.components.values()) {
            if (component.update) {
                component.update(deltaTime);
            }
        }
    }

    updatePhysics(deltaTime) {
        // Apply acceleration to velocity
        this.velocity = this.velocity.add(this.acceleration.multiply(deltaTime));
        
        // Apply friction
        this.velocity = this.velocity.multiply(this.friction);
        
        // Limit max speed
        if (this.velocity.magnitude() > this.maxSpeed) {
            this.velocity = this.velocity.normalize().multiply(this.maxSpeed);
        }
        
        // Apply velocity to position
        this.position = this.position.add(this.velocity.multiply(deltaTime));
        
        // Reset acceleration (forces need to be applied each frame)
        this.acceleration = new Vector2(0, 0);
    }

    render(renderer) {
        if (!this.visible || this.destroyed) return;

        // Render components
        for (const component of this.components.values()) {
            if (component.render) {
                component.render(renderer);
            }
        }

        // Default rendering (override in subclasses)
        this.renderDefault(renderer);
    }

    renderDefault(renderer) {
        // Simple colored rectangle
        const screenPos = renderer.worldToScreen(this.position);
        
        renderer.ctx.save();
        renderer.ctx.translate(screenPos.x, screenPos.y);
        renderer.ctx.rotate(this.rotation);
        renderer.ctx.scale(this.scale.x, this.scale.y);
        
        renderer.ctx.fillStyle = this.color;
        renderer.ctx.fillRect(-10, -10, 20, 20);
        
        renderer.ctx.restore();
    }

    // Physics methods
    addForce(force) {
        this.acceleration = this.acceleration.add(force);
    }

    setVelocity(velocity) {
        this.velocity = velocity.clone();
    }

    move(direction, speed) {
        const force = direction.normalize().multiply(speed);
        this.addForce(force);
    }

    // Collision methods
    getBounds() {
        if (!this.collider) {
            return {
                x: this.position.x - 10,
                y: this.position.y - 10,
                width: 20,
                height: 20
            };
        }
        
        return {
            x: this.position.x + this.collider.x,
            y: this.position.y + this.collider.y,
            width: this.collider.width,
            height: this.collider.height
        };
    }

    checkCollision(other) {
        const boundsA = this.getBounds();
        const boundsB = other.getBounds();
        
        return boundsA.x < boundsB.x + boundsB.width &&
               boundsA.x + boundsA.width > boundsB.x &&
               boundsA.y < boundsB.y + boundsB.height &&
               boundsA.y + boundsA.height > boundsB.y;
    }

    // Component system
    addComponent(name, component) {
        component.gameObject = this;
        this.components.set(name, component);
        
        if (component.init) {
            component.init();
        }
        
        return component;
    }

    getComponent(name) {
        return this.components.get(name);
    }

    removeComponent(name) {
        const component = this.components.get(name);
        if (component) {
            if (component.destroy) {
                component.destroy();
            }
            this.components.delete(name);
        }
    }

    // Tag system
    addTag(tag) {
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
        }
    }

    removeTag(tag) {
        const index = this.tags.indexOf(tag);
        if (index !== -1) {
            this.tags.splice(index, 1);
        }
    }

    hasTag(tag) {
        return this.tags.includes(tag);
    }

    // Lifecycle
    destroy() {
        this.destroyed = true;
        
        // Destroy components
        for (const component of this.components.values()) {
            if (component.destroy) {
                component.destroy();
            }
        }
        this.components.clear();
    }

    // Utility methods
    getDistance(other) {
        return this.position.distanceTo(other.position);
    }

    getDirection(other) {
        return other.position.subtract(this.position).normalize();
    }

    lookAt(target) {
        const direction = this.getDirection(target);
        this.rotation = direction.angle();
    }
}
