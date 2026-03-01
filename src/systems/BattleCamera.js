/**
 * BattleCamera.js
 * Dynamic battle camera controller for dramatic cinematic combat
 * 
 * Outputs camera offsets + zoom that get applied on top of the base battle position.
 * All values are in WORLD SPACE (pre-worldScale).
 * 
 * Features:
 *   - Idle drift / breathing sway while waiting for input
 *   - Focus bias toward the active spirit (whose turn it is)
 *   - Action tracking: pan toward attacker → pan toward target on impact
 *   - Zoom pulse on actions (subtle zoom-in during attack, pull back after)
 *   - Screen shake on damage (intensity scales with crit / effectiveness)
 *   - KO drama: brief zoom + hold on a defeated spirit
 *   - Victory / defeat camera: drift toward the winning side
 *   - Smooth eased transitions between all states
 */

class BattleCamera {
    constructor() {
        // --- Output values (read by BattleState.render) ---
        this.offsetX = 0;       // World-space X offset from battle center
        this.offsetY = 0;       // World-space Y offset from battle center
        this.zoom = 1.6;        // Zoom multiplier (1.6 = default battle zoom)
        this.shakeX = 0;        // Shake offset X (screen-space pixels)
        this.shakeY = 0;        // Shake offset Y (screen-space pixels)

        // --- Targets (what we're easing toward) ---
        this.targetOffsetX = 0;
        this.targetOffsetY = 0;
        this.targetZoom = 1.6;

        // --- Easing speeds ---
        this.panSpeed = 3.0;        // How fast the offset lerps (per second, exponential)
        this.zoomSpeed = 4.0;       // How fast zoom lerps
        this.returnSpeed = 2.0;     // Speed when returning to neutral after an action

        // --- Idle drift (gentle swaying while waiting) ---
        this.idleDrift = {
            enabled: true,
            time: 0,
            amplitudeX: 4,          // World units of lateral sway
            amplitudeY: 2,          // World units of vertical sway
            frequencyX: 0.25,       // Hz
            frequencyY: 0.4,        // Hz, slightly different for Lissajous feel
        };

        // --- Screen shake ---
        this.shake = {
            intensity: 0,           // Current shake strength (pixels)
            decay: 8.0,             // How fast shake fades (per second)
            timer: 0,               // Continuous timer for noise
            frequencyHz: 30,        // Shake oscillation speed
        };

        // --- Action camera state ---
        this.actionState = 'idle';  
        // Possible: 'idle', 'focus_attacker', 'track_impact', 'focus_target',
        //           'ko_zoom', 'returning', 'victory', 'defeat'
        this.actionTimer = 0;
        this.actionDuration = 0;

        // --- Focus bias ---
        // When a spirit is "active" (selecting action), bias camera toward them
        this.focusBias = 0.15;      // 0 = center, 1 = fully on the spirit
        this.actionFocusBias = 0.25; // Stronger bias during action execution

        // --- Zoom presets (base zoom is already tight) ---
        this.idleZoom = 1.6;
        this.actionZoomIn = 1.66;   // Subtle zoom during action
        this.impactZoomIn = 1.70;   // Slightly more on impact
        this.koZoomIn = 1.74;       // Dramatic on KO
        this.victoryZoom = 1.66;

        // --- Stored positions (world coords of current points of interest) ---
        this.attackerPos = null;    // { x, y }
        this.targetPos = null;      // { x, y }
        this.activePos = null;      // Position of the spirit whose turn it is
        this.koPos = null;          // Position of a spirit that just got KO'd

        // --- State flags ---
        this.isActive = false;      // Whether the battle camera is running
    }

    // ============================================================
    //  Lifecycle
    // ============================================================

    /**
     * Activate the battle camera (call when battle starts / transition ends)
     */
    activate() {
        this.isActive = true;
        this.offsetX = 0;
        this.offsetY = 0;
        this.targetOffsetX = 0;
        this.targetOffsetY = 0;
        this.zoom = this.idleZoom;
        this.targetZoom = this.idleZoom;
        this.shakeX = 0;
        this.shakeY = 0;
        this.shake.intensity = 0;
        this.actionState = 'idle';
        this.idleDrift.time = 0;
        this.attackerPos = null;
        this.targetPos = null;
        this.activePos = null;
        this.koPos = null;
    }

    /**
     * Deactivate and reset
     */
    deactivate() {
        this.isActive = false;
        this.offsetX = 0;
        this.offsetY = 0;
        this.zoom = 1.0;
        this.shakeX = 0;
        this.shakeY = 0;
        this.targetOffsetX = 0;
        this.targetOffsetY = 0;
        this.targetZoom = 1.0;
        // Reset zoom to 1.0 on deactivate so overworld isn't affected
    }

    // ============================================================
    //  Events — called by BattleState to notify the camera
    // ============================================================

    /**
     * A spirit has become the "active" spirit (player selecting action)
     * @param {number} worldX - Spirit's world X
     * @param {number} worldY - Spirit's world Y
     */
    onSpiritActive(worldX, worldY) {
        this.activePos = { x: worldX, y: worldY };
        if (this.actionState === 'idle' || this.actionState === 'returning') {
            this.actionState = 'idle'; // Stay in idle; drift will bias toward activePos
        }
    }

    /**
     * No spirit is active (waiting for ATB)
     */
    onSpiritDeselected() {
        this.activePos = null;
    }

    /**
     * An action begins — attacker starts moving (or casting)
     * @param {number} attackerX 
     * @param {number} attackerY 
     * @param {number} targetX 
     * @param {number} targetY 
     * @param {boolean} isPhysical - true for melee (attack), false for ranged/magic
     */
    onActionStart(attackerX, attackerY, targetX, targetY, isPhysical) {
        this.attackerPos = { x: attackerX, y: attackerY };
        this.targetPos = { x: targetX, y: targetY };

        if (isPhysical) {
            // Melee: focus on attacker first, then track to target
            this.actionState = 'focus_attacker';
            this.targetOffsetX = (attackerX) * this.actionFocusBias;
            this.targetOffsetY = (attackerY) * this.actionFocusBias * 0.5;
            this.targetZoom = this.actionZoomIn;
            this.panSpeed = 5.0;
        } else {
            // Ranged / magic: focus midpoint biased toward target
            this.actionState = 'focus_attacker';
            const midX = (attackerX + targetX) / 2;
            const midY = (attackerY + targetY) / 2;
            // Bias slightly toward caster initially
            this.targetOffsetX = (attackerX * 0.6 + midX * 0.4) * this.actionFocusBias;
            this.targetOffsetY = (attackerY * 0.6 + midY * 0.4) * this.actionFocusBias * 0.5;
            this.targetZoom = this.actionZoomIn;
            this.panSpeed = 4.0;
        }
        this.actionTimer = 0;
    }

    /**
     * The impact moment of an action (damage applied)
     */
    onActionImpact() {
        if (!this.targetPos) return;

        this.actionState = 'focus_target';
        // Shift camera toward target
        this.targetOffsetX = (this.targetPos.x) * this.actionFocusBias;
        this.targetOffsetY = (this.targetPos.y) * this.actionFocusBias * 0.5;
        this.targetZoom = this.impactZoomIn;
        this.panSpeed = 6.0; // Quick snap on impact
    }

    /**
     * Action is complete — camera should ease back to neutral
     */
    onActionEnd() {
        this.actionState = 'returning';
        this.targetOffsetX = 0;
        this.targetOffsetY = 0;
        this.targetZoom = this.idleZoom;
        this.panSpeed = this.returnSpeed;
        this.attackerPos = null;
        this.targetPos = null;
    }

    /**
     * Damage was dealt — trigger screen shake
     * @param {number} damage - Raw damage number
     * @param {boolean} isCrit - Was it a critical hit?
     * @param {number} effectiveness - Type effectiveness multiplier
     */
    onDamage(damage, isCrit, effectiveness) {
        // Base shake from damage magnitude (logarithmic so it doesn't go crazy)
        let intensity = 3 + Math.log2(Math.max(1, damage)) * 1.5;

        // Bonus for crits
        if (isCrit) intensity *= 1.8;

        // Bonus for super effective
        if (effectiveness > 1) intensity *= 1.3;

        // Not very effective → dampen
        if (effectiveness < 1) intensity *= 0.6;

        // Cap at reasonable max
        intensity = Math.min(intensity, 25);

        // Only override if stronger than current shake
        if (intensity > this.shake.intensity) {
            this.shake.intensity = intensity;
        }
    }

    /**
     * A spirit was KO'd — dramatic camera moment
     * @param {number} worldX 
     * @param {number} worldY 
     * @param {boolean} isEnemy 
     */
    onKO(worldX, worldY, isEnemy) {
        this.koPos = { x: worldX, y: worldY };
        this.actionState = 'ko_zoom';
        this.targetOffsetX = worldX * 0.35;
        this.targetOffsetY = worldY * 0.35 * 0.5;
        this.targetZoom = this.koZoomIn;
        this.panSpeed = 5.0;
        this.actionTimer = 0;
        this.actionDuration = 1.0; // Hold for 1 second
    }

    /**
     * Battle ended in victory
     * @param {number} winnerX - World X of the winning spirit(s) center
     * @param {number} winnerY 
     */
    onVictory(winnerX, winnerY) {
        this.actionState = 'victory';
        this.targetOffsetX = winnerX * 0.3;
        this.targetOffsetY = winnerY * 0.3 * 0.5;
        this.targetZoom = this.victoryZoom;
        this.panSpeed = 1.5; // Slow dramatic drift
    }

    /**
     * Battle ended in defeat
     */
    onDefeat() {
        this.actionState = 'defeat';
        this.targetOffsetX = 0;
        this.targetOffsetY = 0;
        this.targetZoom = 0.96; // Slight zoom out — feeling of loss
        this.panSpeed = 1.0;
    }

    // ============================================================
    //  Update (called every frame from BattleState.update)
    // ============================================================

    update(deltaTime) {
        if (!this.isActive) return;

        // -- Update idle drift timer --
        this.idleDrift.time += deltaTime;

        // -- Determine base target offset from state --
        this._updateStateTargets(deltaTime);

        // -- Apply idle drift on top of target --
        let driftX = 0, driftY = 0;
        if (this.actionState === 'idle' || this.actionState === 'returning') {
            const drift = this.idleDrift;
            driftX = Math.sin(drift.time * drift.frequencyX * Math.PI * 2) * drift.amplitudeX;
            driftY = Math.sin(drift.time * drift.frequencyY * Math.PI * 2) * drift.amplitudeY;
        }

        // -- Smooth lerp offset toward target --
        const lerpFactor = 1 - Math.exp(-this.panSpeed * deltaTime);
        this.offsetX += ((this.targetOffsetX + driftX) - this.offsetX) * lerpFactor;
        this.offsetY += ((this.targetOffsetY + driftY) - this.offsetY) * lerpFactor;

        // -- Smooth lerp zoom --
        const zoomLerp = 1 - Math.exp(-this.zoomSpeed * deltaTime);
        this.zoom += (this.targetZoom - this.zoom) * zoomLerp;

        // -- Update screen shake --
        this._updateShake(deltaTime);
    }

    /**
     * Update state-specific target positions
     */
    _updateStateTargets(deltaTime) {
        switch (this.actionState) {
            case 'idle': {
                // Bias toward active spirit if one exists
                if (this.activePos) {
                    this.targetOffsetX = this.activePos.x * this.focusBias;
                    this.targetOffsetY = this.activePos.y * this.focusBias * 0.5;
                } else {
                    this.targetOffsetX = 0;
                    this.targetOffsetY = 0;
                }
                this.targetZoom = this.idleZoom;
                this.panSpeed = 2.0;
                break;
            }

            case 'focus_attacker':
            case 'focus_target':
                // Targets already set by event handlers
                break;

            case 'ko_zoom': {
                this.actionTimer += deltaTime;
                if (this.actionTimer >= this.actionDuration) {
                    this.onActionEnd();
                }
                break;
            }

            case 'returning': {
                // Check if we've basically arrived back at neutral
                const dist = Math.abs(this.offsetX) + Math.abs(this.offsetY);
                const zoomDist = Math.abs(this.zoom - this.idleZoom);
                if (dist < 0.5 && zoomDist < 0.002) {
                    this.actionState = 'idle';
                }
                break;
            }

            case 'victory':
            case 'defeat':
                // Targets already set; just hold steady
                break;
        }
    }

    /**
     * Update screen shake
     */
    _updateShake(deltaTime) {
        if (this.shake.intensity > 0.1) {
            this.shake.timer += deltaTime;
            // Perlin-ish shake using sin with different frequencies
            const t = this.shake.timer * this.shake.frequencyHz * Math.PI * 2;
            this.shakeX = Math.sin(t) * this.shake.intensity * (0.7 + Math.sin(t * 1.7) * 0.3);
            this.shakeY = Math.cos(t * 1.3) * this.shake.intensity * (0.7 + Math.cos(t * 0.9) * 0.3);
            
            // Decay
            this.shake.intensity *= Math.exp(-this.shake.decay * deltaTime);
        } else {
            this.shake.intensity = 0;
            this.shakeX = 0;
            this.shakeY = 0;
        }
    }

    // ============================================================
    //  Helpers — compute the final camera position for the render
    // ============================================================

    /**
     * Given the battle center in world coords, compute the final camera
     * position (screen-space coords) that should be set on the RenderSystem camera.
     * 
     * @param {number} battleCenterX - World-space battle center X
     * @param {number} battleCenterY - World-space battle center Y
     * @param {number} worldScale - game.worldScale
     * @param {number} canvasWidth - game.CANVAS_WIDTH
     * @param {number} canvasHeight - game.CANVAS_HEIGHT
     * @returns {{ cameraX: number, cameraY: number, zoom: number }}
     */
    computeCameraPosition(battleCenterX, battleCenterY, worldScale, canvasWidth, canvasHeight) {
        // The "look at" point in world coords
        const lookAtX = battleCenterX + this.offsetX;
        const lookAtY = battleCenterY + this.offsetY;

        // Convert to screen space
        const screenCenterX = lookAtX * worldScale;
        const screenCenterY = lookAtY * worldScale;

        // Camera position (top-left of viewport) so that lookAt is centered
        let cameraX = screenCenterX - canvasWidth / 2;
        let cameraY = screenCenterY - canvasHeight / 2;

        // Apply shake in screen space
        cameraX += this.shakeX;
        cameraY += this.shakeY;

        return {
            cameraX,
            cameraY,
            zoom: this.zoom
        };
    }
}

// Export
window.BattleCamera = BattleCamera;
