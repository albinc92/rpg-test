/**
 * Camera System
 * Handles camera movement, zoom, and following targets in isometric view
 */
class Camera {
    constructor(screenWidth, screenHeight) {
        this.position = new Vector2(0, 0);
        this.targetPosition = new Vector2(0, 0);
        this.zoom = 1.0;
        this.targetZoom = 1.0;
        
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        
        // Camera follow settings
        this.followTarget = null;
        this.followSpeed = 5.0;
        this.followDeadzone = new Vector2(50, 50);
        this.followOffset = new Vector2(0, 0);
        
        // Zoom settings
        this.minZoom = 0.5;
        this.maxZoom = 3.0;
        this.zoomSpeed = 3.0;
        
        // Camera shake
        this.shakeAmount = new Vector2(0, 0);
        this.shakeDuration = 0;
        this.shakeDecay = 5.0;
        this.currentShakeOffset = new Vector2(0, 0);
        
        // Smooth movement
        this.smoothing = true;
        this.positionSmoothing = 0.1;
        this.zoomSmoothing = 0.1;
        
        // Bounds
        this.bounds = null; // {x, y, width, height}
        this.boundsPadding = 100;
    }

    update(deltaTime) {
        // Update target position based on follow target
        if (this.followTarget) {
            this.updateFollowTarget();
        }
        
        // Apply camera shake
        this.updateShake(deltaTime);
        
        // Smooth camera movement
        if (this.smoothing) {
            this.position = this.position.add(
                this.targetPosition.subtract(this.position).multiply(this.positionSmoothing)
            );
            
            this.zoom += (this.targetZoom - this.zoom) * this.zoomSmoothing;
        } else {
            this.position = this.targetPosition.clone();
            this.zoom = this.targetZoom;
        }
        
        // Apply bounds
        this.applyBounds();
        
        // Clamp zoom
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));
    }

    updateFollowTarget() {
        if (!this.followTarget) return;
        
        const targetPos = this.followTarget.position.add(this.followOffset);
        const currentPos = this.targetPosition;
        const difference = targetPos.subtract(currentPos);
        
        // Check if target is outside deadzone
        if (Math.abs(difference.x) > this.followDeadzone.x) {
            this.targetPosition.x = targetPos.x - Math.sign(difference.x) * this.followDeadzone.x;
        }
        
        if (Math.abs(difference.y) > this.followDeadzone.y) {
            this.targetPosition.y = targetPos.y - Math.sign(difference.y) * this.followDeadzone.y;
        }
    }

    updateShake(deltaTime) {
        if (this.shakeDuration > 0) {
            this.shakeDuration -= deltaTime;
            
            // Generate random shake offset (stored separately, not applied to position)
            this.currentShakeOffset = new Vector2(
                (Math.random() - 0.5) * 2 * this.shakeAmount.x,
                (Math.random() - 0.5) * 2 * this.shakeAmount.y
            );
            
            // Decay shake
            this.shakeAmount = this.shakeAmount.multiply(Math.pow(0.5, deltaTime * this.shakeDecay));
        } else {
            this.shakeAmount = new Vector2(0, 0);
            this.currentShakeOffset = new Vector2(0, 0);
        }
    }

    applyBounds() {
        if (!this.bounds) return;
        
        const halfScreenWidth = (this.screenWidth / this.zoom) / 2;
        const halfScreenHeight = (this.screenHeight / this.zoom) / 2;
        
        this.position.x = Math.max(
            this.bounds.x + halfScreenWidth + this.boundsPadding,
            Math.min(
                this.bounds.x + this.bounds.width - halfScreenWidth - this.boundsPadding,
                this.position.x
            )
        );
        
        this.position.y = Math.max(
            this.bounds.y + halfScreenHeight + this.boundsPadding,
            Math.min(
                this.bounds.y + this.bounds.height - halfScreenHeight - this.boundsPadding,
                this.position.y
            )
        );
    }

    // Camera control methods
    setPosition(position) {
        this.position = position.clone();
        this.targetPosition = position.clone();
    }

    move(direction, speed = 100) {
        this.targetPosition = this.targetPosition.add(direction.multiply(speed));
    }

    setZoom(zoom) {
        this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    }

    adjustZoom(delta) {
        this.setZoom(this.targetZoom + delta);
    }

    // Follow methods
    follow(target, offset = new Vector2(0, 0)) {
        this.followTarget = target;
        this.followOffset = offset.clone();
    }

    stopFollowing() {
        this.followTarget = null;
    }

    setFollowDeadzone(deadzone) {
        this.followDeadzone = deadzone.clone();
    }

    setFollowSpeed(speed) {
        this.followSpeed = speed;
    }

    // Shake methods
    shake(amount, duration = 1.0) {
        this.shakeAmount = amount.clone();
        this.shakeDuration = duration;
    }

    shakeSimple(intensity, duration = 0.5) {
        this.shake(new Vector2(intensity, intensity), duration);
    }

    stopShake() {
        this.shakeAmount = new Vector2(0, 0);
        this.shakeDuration = 0;
        this.currentShakeOffset = new Vector2(0, 0);
    }

    // Bounds methods
    setBounds(bounds) {
        this.bounds = bounds;
    }

    removeBounds() {
        this.bounds = null;
    }

    // Coordinate conversion methods
    worldToScreen(worldPos) {
        // Apply shake offset to camera position during rendering only
        const shakeAdjustedPosition = this.position.add(this.currentShakeOffset || new Vector2(0, 0));
        const cameraRelative = worldPos.subtract(shakeAdjustedPosition);
        return new Vector2(
            (cameraRelative.x * this.zoom) + (this.screenWidth / 2),
            (cameraRelative.y * this.zoom) + (this.screenHeight / 2)
        );
    }

    screenToWorld(screenPos) {
        const centerOffset = screenPos.subtract(new Vector2(this.screenWidth / 2, this.screenHeight / 2));
        const worldOffset = centerOffset.divide(this.zoom);
        return worldOffset.add(this.position);
    }

    // Query methods
    isPointVisible(worldPos, margin = 0) {
        const screenPos = this.worldToScreen(worldPos);
        return screenPos.x >= -margin &&
               screenPos.x <= this.screenWidth + margin &&
               screenPos.y >= -margin &&
               screenPos.y <= this.screenHeight + margin;
    }

    isRectVisible(rect, margin = 0) {
        const topLeft = new Vector2(rect.x, rect.y);
        const bottomRight = new Vector2(rect.x + rect.width, rect.y + rect.height);
        
        const screenTopLeft = this.worldToScreen(topLeft);
        const screenBottomRight = this.worldToScreen(bottomRight);
        
        return screenBottomRight.x >= -margin &&
               screenTopLeft.x <= this.screenWidth + margin &&
               screenBottomRight.y >= -margin &&
               screenTopLeft.y <= this.screenHeight + margin;
    }

    getVisibleArea(margin = 0) {
        const topLeft = this.screenToWorld(new Vector2(-margin, -margin));
        const bottomRight = this.screenToWorld(new Vector2(
            this.screenWidth + margin,
            this.screenHeight + margin
        ));
        
        return {
            x: topLeft.x,
            y: topLeft.y,
            width: bottomRight.x - topLeft.x,
            height: bottomRight.y - topLeft.y
        };
    }

    // Utility methods
    getDistance(worldPos) {
        return this.position.distanceTo(worldPos);
    }

    lookAt(worldPos) {
        this.setPosition(worldPos);
    }

    reset() {
        this.position = new Vector2(0, 0);
        this.targetPosition = new Vector2(0, 0);
        this.zoom = 1.0;
        this.targetZoom = 1.0;
        this.followTarget = null;
        this.shakeAmount = new Vector2(0, 0);
        this.shakeDuration = 0;
        this.currentShakeOffset = new Vector2(0, 0);
    }
}
