/**
 * Player Class
 * Handles player movement, rotation, and interactions with 360-degree movement
 */
class Player extends GameObject {
    constructor(x = 0, y = 0) {
        super('Player');
        
        this.position = new Vector2(x, y);
        this.color = '#4CAF50';
        
        // Player-specific properties
        this.moveSpeed = 100; // Reduced from 200 to 100
        this.rotationSpeed = 5.0;
        this.size = new Vector2(20, 20);
        
        // Movement state
        this.isMoving = false;
        this.facingDirection = 0; // Angle in radians
        this.targetRotation = 0;
        this.rotationSmoothing = 0.15;
        
        // Stats
        this.health = 100;
        this.maxHealth = 100;
        this.energy = 100;
        this.maxEnergy = 100;
        
        // Damage system
        this.lastDamageTime = 0;
        this.damageShakeCooldown = 0.5; // Only shake once per 0.5 seconds
        
        // Set up collider
        this.collider = {
            x: -this.size.x / 2,
            y: -this.size.y / 2,
            width: this.size.x,
            height: this.size.y
        };
        this.solid = true;
        
        // Animation
        this.animationTimer = 0;
        this.animationSpeed = 2.0;
        
        // Input state
        this.inputVector = new Vector2(0, 0);
        
        this.addTag('player');
    }

    update(deltaTime) {
        this.handleInput(deltaTime);
        this.updateMovement(deltaTime);
        this.updateRotation(deltaTime);
        this.updateAnimation(deltaTime);
        this.updateUI();
        
        super.update(deltaTime);
    }

    handleInput(deltaTime) {
        if (!this.scene || !this.scene.engine) return;
        
        const inputSystem = this.scene.engine.inputSystem;
        
        // Get movement input (360-degree movement)
        this.inputVector = inputSystem.getMovementVector();
        this.isMoving = this.inputVector.magnitude() > 0;
        
        // Apply movement force
        if (this.isMoving) {
            const moveForce = this.inputVector.multiply(this.moveSpeed);
            this.addForce(moveForce);
            
            // Update target rotation to face movement direction only
            this.targetRotation = this.inputVector.angle();
        }
        
        // Special actions
        if (inputSystem.isActionPressed('interact')) {
            this.interact();
        }
    }

    updateMovement(deltaTime) {
        // Apply friction when not moving
        if (!this.isMoving) {
            this.friction = 0.85;
        } else {
            this.friction = 0.95;
        }
        
        // Limit max speed
        if (this.velocity.magnitude() > this.moveSpeed) {
            this.velocity = this.velocity.normalize().multiply(this.moveSpeed);
        }
        
        // Constrain player to current map boundaries
        this.constrainToCurrentMap();
    }

    constrainToCurrentMap() {
        if (!this.scene || !this.scene.currentMap) return;
        
        const map = this.scene.currentMap;
        const newPosition = map.clampToMap(this.position);
        
        // If position was clamped, stop velocity in that direction
        if (newPosition.x !== this.position.x) {
            this.velocity.x = 0;
        }
        if (newPosition.y !== this.position.y) {
            this.velocity.y = 0;
        }
        
        this.position = newPosition;
    }

    updateRotation(deltaTime) {
        // Smooth rotation towards target
        let angleDiff = this.targetRotation - this.facingDirection;
        
        // Wrap angle difference to [-π, π]
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Apply smooth rotation
        this.facingDirection += angleDiff * this.rotationSmoothing;
        this.rotation = this.facingDirection;
    }

    updateAnimation(deltaTime) {
        if (this.isMoving) {
            this.animationTimer += deltaTime * this.animationSpeed;
        } else {
            this.animationTimer *= 0.8; // Slow down when not moving
        }
    }

    updateUI() {
        // Update position display
        const posElement = document.getElementById('position');
        if (posElement) {
            posElement.textContent = `${Math.round(this.position.x)}, ${Math.round(this.position.y)}`;
        }
        
        // Update rotation display
        const rotElement = document.getElementById('rotation');
        if (rotElement) {
            const degrees = Math.round(this.facingDirection * 180 / Math.PI);
            rotElement.textContent = `${degrees}°`;
        }
    }

    render(renderer) {
        if (!this.visible) return;
        
        // For static following, ALWAYS render at screen center
        const camera = this.scene.engine.camera;
        let screenPos;
        
        if (camera && camera.isStaticFollowing() && camera.followTarget === this) {
            // Static follow: player is ALWAYS at screen center, period
            screenPos = new Vector2(
                renderer.canvas.width / 2,
                renderer.canvas.height / 2
            );
        } else {
            // Normal rendering: use world-to-screen conversion
            screenPos = renderer.worldToScreen(this.position);
        }
        
        renderer.ctx.save();
        renderer.ctx.translate(screenPos.x, screenPos.y);
        renderer.ctx.rotate(this.rotation);
        
        // Draw player body
        renderer.ctx.fillStyle = this.color;
        renderer.ctx.fillRect(-this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
        
        // Draw direction indicator
        renderer.ctx.strokeStyle = '#2E7D32';
        renderer.ctx.lineWidth = 3;
        renderer.ctx.beginPath();
        renderer.ctx.moveTo(0, 0);
        renderer.ctx.lineTo(this.size.x / 2 + 5, 0);
        renderer.ctx.stroke();
        
        // Draw movement animation (if moving)
        if (this.isMoving) {
            const pulseSize = Math.sin(this.animationTimer * 3) * 2;
            renderer.ctx.strokeStyle = '#81C784';
            renderer.ctx.lineWidth = 1;
            renderer.ctx.strokeRect(
                -this.size.x / 2 - pulseSize,
                -this.size.y / 2 - pulseSize,
                this.size.x + pulseSize * 2,
                this.size.y + pulseSize * 2
            );
        }
        
        renderer.ctx.restore();
        
        // Draw health bar
        this.drawHealthBar(renderer);
        
        // Draw debug info if enabled
        if (renderer.showColliders) {
            renderer.drawCollider(this);
        }
        
        if (renderer.showOrigins) {
            renderer.drawOrigin(this);
        }
    }

    drawHealthBar(renderer) {
        // Always render health bar above the player's visual position
        const camera = this.scene.engine.camera;
        let screenPos;
        
        if (camera && camera.isStaticFollowing() && camera.followTarget === this) {
            // Static follow: health bar renders above screen center
            screenPos = new Vector2(
                renderer.canvas.width / 2,
                renderer.canvas.height / 2
            );
        } else {
            // Normal rendering: use world-to-screen conversion
            screenPos = renderer.worldToScreen(this.position);
        }
        
        const barWidth = 30;
        const barHeight = 4;
        const offsetY = -this.size.y / 2 - 10;
        
        renderer.ctx.save();
        
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
        const healthColor = healthPercent > 0.5 ? '#4CAF50' : 
                           healthPercent > 0.25 ? '#FF9800' : '#F44336';
        
        renderer.ctx.fillStyle = healthColor;
        renderer.ctx.fillRect(
            screenPos.x - barWidth / 2,
            screenPos.y + offsetY,
            barWidth * healthPercent,
            barHeight
        );
        
        renderer.ctx.restore();
    }



    interact() {
        // Find nearby interactable objects
        if (!this.scene) return;
        
        const nearbyObjects = this.scene.gameObjects.filter(obj => {
            return obj !== this && 
                   obj.hasTag && obj.hasTag('interactable') &&
                   this.getDistance(obj) < 50;
        });
        
        if (nearbyObjects.length > 0) {
            const closest = nearbyObjects.reduce((closest, obj) => {
                return this.getDistance(obj) < this.getDistance(closest) ? obj : closest;
            });
            
            if (closest.onInteract) {
                closest.onInteract(this);
            }
            
            console.log(`Interacted with ${closest.name}`);
        } else {
            console.log('Nothing to interact with nearby');
        }
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        
        // Camera shake on damage (but only occasionally to prevent continuous shaking)
        const currentTime = performance.now() / 1000;
        if (this.scene && this.scene.engine && this.scene.engine.camera && 
            currentTime - this.lastDamageTime > this.damageShakeCooldown) {
            this.scene.engine.camera.shakeSimple(5, 0.3);
            this.lastDamageTime = currentTime;
        }
        
        if (this.health <= 0) {
            this.die();
        }
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    die() {
        console.log('Player died!');
        // Handle player death
        this.color = '#777777';
        // You could trigger a respawn, game over screen, etc.
    }

    // Collision handling
    onCollision(other) {
        if (other.hasTag && other.hasTag('enemy')) {
            // Take damage from enemies
            if (!this.invulnerable) {
                this.takeDamage(10);
                this.invulnerable = true;
                setTimeout(() => this.invulnerable = false, 1000);
            }
        } else if (other.hasTag && other.hasTag('pickup')) {
            // Handle pickups
            if (other.onPickup) {
                other.onPickup(this);
            }
        }
    }

    // Utility methods
    getForwardDirection() {
        return Vector2.fromAngle(this.facingDirection);
    }

    teleport(position) {
        this.position = position.clone();
        this.velocity = new Vector2(0, 0);
    }

    reset() {
        this.position = new Vector2(0, 0);
        this.velocity = new Vector2(0, 0);
        this.rotation = 0;
        this.facingDirection = 0;
        this.targetRotation = 0;
        this.health = this.maxHealth;
        this.energy = this.maxEnergy;
        this.color = '#4CAF50';
    }
}
