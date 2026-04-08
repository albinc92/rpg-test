/**
 * BiomeEffectsSystem — Biome-driven post-process shader profiles and environmental particles.
 * 
 * Shader effects per biome:
 *   - Desert/Arid: heat haze UV distortion, warm temperature shift, slight desaturation
 *   - Snow/Tundra: cool temperature, slight desaturation, faint blue tint
 *   - Woodland/Dense-Forest: soft green tint, slight bloom, extra vignette
 *   - Lake/River: faint blue-green tint, mild bloom
 *   - Mountain/High-Mountain: slight desaturation, deeper vignette
 *   - Grassland/Plains/Meadow: warm temperature, saturated, slight bloom
 * 
 * Environmental particles per biome (driven by biome + time of day):
 *   - Fireflies: forest/grassland at night — soft glowing dots
 *   - Dust/Sand: desert/arid — drifting tan specks
 *   - Pollen: plains/meadow during day — small yellow-white floaters
 *   - Mist wisps: lake/river — translucent white wisps
 *   - Ice crystals: snow/tundra — shimmering ice sparkles
 */

// ─── Biome Visual Profiles ──────────────────────────────────────────────────
// Each profile defines additive/multiplicative offsets to the base shader params.
// Values are OFFSETS from default — applied on top of day/night + weather params.

const BIOME_PROFILES = {
    // ── Forests ──
    'woodland': {
        temperature: 0.0,
        saturationMult: 1.05,      // slightly more vivid
        bloomOffset: 0.02,
        vignetteOffset: 0.08,
        hazeIntensity: 0.0,
        tint: [0.02, 0.06, 0.0, 0.06], // soft green
        particles: ['firefly', 'leaf'],
    },
    'dense-forest': {
        temperature: -0.05,
        saturationMult: 0.95,
        bloomOffset: 0.01,
        vignetteOffset: 0.15,
        hazeIntensity: 0.0,
        tint: [0.0, 0.04, 0.02, 0.08], // dark green tint
        particles: ['firefly', 'leaf'],
    },

    // ── Grasslands ──
    'grassland': {
        temperature: 0.1,
        saturationMult: 1.08,
        bloomOffset: 0.02,
        vignetteOffset: 0.0,
        hazeIntensity: 0.0,
        tint: [0.0, 0.0, 0.0, 0.0],
        particles: ['firefly', 'pollen'],
    },
    'plains': {
        temperature: 0.08,
        saturationMult: 1.05,
        bloomOffset: 0.015,
        vignetteOffset: 0.0,
        hazeIntensity: 0.0,
        tint: [0.0, 0.0, 0.0, 0.0],
        particles: ['pollen'],
    },
    'meadow': {
        temperature: 0.12,
        saturationMult: 1.1,
        bloomOffset: 0.025,
        vignetteOffset: 0.0,
        hazeIntensity: 0.0,
        tint: [0.02, 0.01, 0.0, 0.03], // faint warm
        particles: ['pollen', 'firefly', 'dragonfly'],
    },

    // ── Desert / Arid ──
    'desert': {
        temperature: 0.3,
        saturationMult: 0.85,
        bloomOffset: 0.01,
        vignetteOffset: 0.05,
        hazeIntensity: 0.6,
        tint: [0.08, 0.04, 0.0, 0.06], // warm orange
        particles: ['dust', 'sand_wisp'],
    },
    'arid-desert': {
        temperature: 0.35,
        saturationMult: 0.80,
        bloomOffset: 0.015,
        vignetteOffset: 0.08,
        hazeIntensity: 0.8,
        tint: [0.10, 0.05, 0.0, 0.08], // hotter orange
        particles: ['dust', 'sand_wisp'],
    },

    // ── Cold / Snow ──
    'snow': {
        temperature: -0.25,
        saturationMult: 0.85,
        bloomOffset: 0.03,
        vignetteOffset: 0.05,
        hazeIntensity: 0.0,
        tint: [0.0, 0.02, 0.08, 0.06], // cold blue
        particles: ['ice'],
    },
    'tundra': {
        temperature: -0.35,
        saturationMult: 0.75,
        bloomOffset: 0.02,
        vignetteOffset: 0.1,
        hazeIntensity: 0.0,
        tint: [0.0, 0.01, 0.10, 0.08], // deeper blue
        particles: ['ice'],
    },

    // ── Mountains ──
    'mountain': {
        temperature: -0.08,
        saturationMult: 0.92,
        bloomOffset: 0.0,
        vignetteOffset: 0.12,
        hazeIntensity: 0.0,
        tint: [0.0, 0.0, 0.02, 0.03],
        particles: ['dust'],
    },
    'high-mountain': {
        temperature: -0.15,
        saturationMult: 0.85,
        bloomOffset: 0.0,
        vignetteOffset: 0.18,
        hazeIntensity: 0.0,
        tint: [0.0, 0.01, 0.04, 0.05],
        particles: ['ice'],
    },

    // ── Water ──
    'lake': {
        temperature: -0.05,
        saturationMult: 1.0,
        bloomOffset: 0.02,
        vignetteOffset: 0.0,
        hazeIntensity: 0.0,
        tint: [0.0, 0.04, 0.06, 0.05], // blue-green
        particles: ['mist', 'dragonfly'],
    },
    'river-valley': {
        temperature: 0.0,
        saturationMult: 1.02,
        bloomOffset: 0.015,
        vignetteOffset: 0.0,
        hazeIntensity: 0.0,
        tint: [0.0, 0.03, 0.04, 0.04],
        particles: ['mist', 'dragonfly'],
    },
};

// Default profile for unknown biomes
const DEFAULT_PROFILE = {
    temperature: 0.0,
    saturationMult: 1.0,
    bloomOffset: 0.0,
    vignetteOffset: 0.0,
    hazeIntensity: 0.0,
    tint: [0.0, 0.0, 0.0, 0.0],
    particles: [],
};

// ─── Particle type configs ──────────────────────────────────────────────────
const PARTICLE_CONFIGS = {
    firefly: {
        maxCount: 25,
        spawnRate: 2,          // per second
        timeOfDay: 'night',    // only at night (20:00 - 5:00)
        size: { min: 2, max: 4 },
        speed: { min: 0.2, max: 0.6 },
        lifetime: { min: 3, max: 8 },
        glow: true,
        colors: [
            [180, 255, 80],    // yellow-green
            [140, 230, 60],    // green
            [200, 255, 100],   // bright yellow-green
        ],
    },
    dust: {
        maxCount: 40,
        spawnRate: 5,
        timeOfDay: 'any',
        size: { min: 1, max: 3 },
        speed: { min: 0.3, max: 1.0 },
        lifetime: { min: 4, max: 10 },
        glow: false,
        colors: [
            [194, 178, 128],   // sand
            [210, 190, 140],   // tan
            [180, 165, 115],   // darker sand
        ],
    },
    pollen: {
        maxCount: 20,
        spawnRate: 3,
        timeOfDay: 'day',     // only daytime (7:00 - 18:00)
        size: { min: 1.5, max: 3 },
        speed: { min: 0.15, max: 0.4 },
        lifetime: { min: 5, max: 12 },
        glow: false,
        colors: [
            [255, 255, 180],   // pale yellow
            [255, 250, 200],   // cream
            [240, 240, 160],   // soft yellow
        ],
    },
    mist: {
        maxCount: 15,
        spawnRate: 1.5,
        timeOfDay: 'any',
        size: { min: 8, max: 20 },
        speed: { min: 0.1, max: 0.3 },
        lifetime: { min: 6, max: 15 },
        glow: false,
        colors: [
            [220, 230, 240],   // pale blue-white
            [210, 220, 235],   // light blue
            [230, 235, 245],   // near white
        ],
    },
    ice: {
        maxCount: 30,
        spawnRate: 4,
        timeOfDay: 'any',
        size: { min: 1, max: 3 },
        speed: { min: 0.2, max: 0.8 },
        lifetime: { min: 3, max: 7 },
        glow: true,
        colors: [
            [200, 230, 255],   // light blue ice
            [180, 220, 255],   // ice blue
            [220, 240, 255],   // near white-blue
        ],
    },
    dragonfly: {
        maxCount: 8,
        spawnRate: 0.8,        // slow spawn — they're large and noticeable
        timeOfDay: 'dawn_dusk', // dawn (5-7) and dusk (18-20) only
        size: { min: 3, max: 5 },
        speed: { min: 0.8, max: 1.8 },
        lifetime: { min: 6, max: 14 },
        glow: true,
        colors: [
            [80, 200, 220],    // iridescent teal
            [100, 180, 255],   // blue shimmer
            [120, 220, 160],   // green shimmer
            [160, 140, 255],   // purple-blue
        ],
    },
    sand_wisp: {
        maxCount: 12,
        spawnRate: 1.5,
        timeOfDay: 'any',
        size: { min: 4, max: 10 },
        speed: { min: 0.6, max: 1.5 },
        lifetime: { min: 4, max: 9 },
        glow: false,
        colors: [
            [210, 190, 140],   // tan
            [194, 178, 128],   // sand
            [220, 200, 155],   // light sand
        ],
    },
    leaf: {
        maxCount: 18,
        spawnRate: 2.5,
        timeOfDay: 'any',
        size: { min: 2, max: 4 },
        speed: { min: 0.2, max: 0.6 },
        lifetime: { min: 5, max: 12 },
        glow: false,
        colors: [
            [80, 140, 50],     // green
            [120, 160, 60],    // light green
            [160, 130, 40],    // yellow-brown
            [180, 100, 30],    // orange
            [140, 70, 30],     // brown
        ],
    },
};


class BiomeEffectsSystem {
    constructor(game) {
        this.game = game;

        // Current interpolated profile (smooth transitions)
        this.currentProfile = { ...DEFAULT_PROFILE, tint: [...DEFAULT_PROFILE.tint] };
        this.targetProfile = { ...DEFAULT_PROFILE, tint: [...DEFAULT_PROFILE.tint] };
        
        // Current biome tracking
        this.currentBiome = null;
        this.lerpSpeed = 0.4; // Profile transition speed (units/sec, ~2.5s full transition)
        
        // Biome particles (separate from weather particles)
        this.biomeParticles = []; // { type, x, y, vx, vy, size, age, lifetime, color, alpha, glow }
        this.spawnTimers = {};    // type → accumulator
        
        // Active particle types for current biome
        this.activeParticleTypes = [];

        console.log('✨ BiomeEffectsSystem initialized');
    }

    /**
     * Update biome effects — called every frame from GameEngine.
     * @param {number} deltaTime — seconds since last frame
     */
    update(deltaTime) {
        // ── Determine current biome from BiomeWeatherSystem ──
        const bws = this.game.biomeWeatherSystem;
        const mapId = this.game.currentMapId;
        
        if (bws && mapId) {
            const biome = bws.cellBiome?.get(mapId) || null;
            if (biome !== this.currentBiome) {
                this.currentBiome = biome;
                this._setTargetProfile(biome);
            }
        }
        
        // ── Lerp current profile toward target ──
        this._lerpProfile(deltaTime);
        
        // ── Update biome particles ──
        this._updateParticles(deltaTime);
    }

    /**
     * Get the current biome shader profile offsets for RenderSystem to apply.
     * Returns an object with additive/multiplicative fields.
     */
    getShaderOverrides() {
        return this.currentProfile;
    }

    /**
     * Render biome particles (called from GameEngine after weather render).
     * Uses Canvas2D since these are screen-space ambient particles.
     */
    render(ctx) {
        if (this.biomeParticles.length === 0) return;
        
        const camera = this.game.camera;
        const zoom = camera.zoom || 1.0;

        ctx.save();

        for (const p of this.biomeParticles) {
            const screenX = (p.x - camera.x) * zoom;
            const screenY = (p.y - camera.y) * zoom;
            
            // Skip if off-screen
            if (screenX < -30 || screenX > this.game.CANVAS_WIDTH + 30 ||
                screenY < -30 || screenY > this.game.CANVAS_HEIGHT + 30) continue;

            const fadeIn = Math.min(1, p.age / 0.5);       // 0.5s fade-in
            const fadeOut = Math.min(1, (p.lifetime - p.age) / 1.0); // 1s fade-out
            const alpha = p.alpha * fadeIn * fadeOut;
            if (alpha <= 0.01) continue;

            const [r, g, b] = p.color;

            if (p.glow) {
                // Glow effect — radial gradient
                const glowSize = p.size * 3 * zoom;
                const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, glowSize);
                gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`);
                gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`);
                gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                ctx.fillStyle = gradient;
                ctx.fillRect(screenX - glowSize, screenY - glowSize, glowSize * 2, glowSize * 2);
            }

            // Core dot
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.beginPath();

            if (p.type === 'mist') {
                // Mist: larger translucent ellipses
                ctx.save();
                ctx.translate(screenX, screenY);
                ctx.scale(1, 0.5);
                ctx.arc(0, 0, p.size * zoom, 0, Math.PI * 2);
                ctx.restore();
                ctx.globalAlpha = alpha * 0.25;
                ctx.fill();
            } else if (p.type === 'sand_wisp') {
                // Sand wisp: elongated translucent wisp
                ctx.save();
                ctx.translate(screenX, screenY);
                const angle = Math.atan2(p.vy, p.vx);
                ctx.rotate(angle);
                ctx.scale(2.5, 0.4);
                ctx.arc(0, 0, p.size * zoom, 0, Math.PI * 2);
                ctx.restore();
                ctx.globalAlpha = alpha;
                ctx.fill();
            } else if (p.type === 'dragonfly') {
                // Dragonfly: body + two wing lines
                const sz = p.size * zoom;
                // Body
                ctx.arc(screenX, screenY, sz * 0.5, 0, Math.PI * 2);
                ctx.fill();
                // Wings (two thin lines)
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`;
                ctx.lineWidth = 1;
                const wingSpread = sz * 1.5;
                const wingAngle = Math.sin(p.age * 15 + p.phase) * 0.4; // rapid flutter
                ctx.beginPath();
                ctx.moveTo(screenX - wingSpread * Math.cos(wingAngle), screenY - wingSpread * Math.sin(wingAngle) * 0.5);
                ctx.lineTo(screenX, screenY);
                ctx.lineTo(screenX + wingSpread * Math.cos(wingAngle), screenY - wingSpread * Math.sin(wingAngle) * 0.5);
                ctx.stroke();
            } else if (p.type === 'leaf') {
                // Leaf: small rotated ellipse
                ctx.save();
                ctx.translate(screenX, screenY);
                ctx.rotate(p.rotation || 0);
                ctx.scale(1, 0.5);
                ctx.arc(0, 0, p.size * zoom, 0, Math.PI * 2);
                ctx.restore();
                ctx.fill();
            } else {
                ctx.arc(screenX, screenY, p.size * zoom, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // ─── Internal Methods ───────────────────────────────────────────────────

    _setTargetProfile(biome) {
        const profile = BIOME_PROFILES[biome] || DEFAULT_PROFILE;
        this.targetProfile = {
            temperature: profile.temperature,
            saturationMult: profile.saturationMult,
            bloomOffset: profile.bloomOffset,
            vignetteOffset: profile.vignetteOffset,
            hazeIntensity: profile.hazeIntensity,
            tint: [...profile.tint],
            particles: profile.particles || [],
        };
        this.activeParticleTypes = [...(profile.particles || [])];
    }

    _lerpProfile(dt) {
        const speed = this.lerpSpeed * dt * 60; // normalize to ~60fps
        const t = Math.min(1, speed);
        const cur = this.currentProfile;
        const tgt = this.targetProfile;

        cur.temperature += (tgt.temperature - cur.temperature) * t;
        cur.saturationMult += (tgt.saturationMult - cur.saturationMult) * t;
        cur.bloomOffset += (tgt.bloomOffset - cur.bloomOffset) * t;
        cur.vignetteOffset += (tgt.vignetteOffset - cur.vignetteOffset) * t;
        cur.hazeIntensity += (tgt.hazeIntensity - cur.hazeIntensity) * t;

        // Lerp tint RGBA
        for (let i = 0; i < 4; i++) {
            cur.tint[i] += (tgt.tint[i] - cur.tint[i]) * t;
        }
    }

    _getTimeOfDay() {
        const dnc = this.game.dayNightCycle;
        if (!dnc) return 'day';
        const hour = dnc.timeOfDay; // 0-24 float
        if (hour >= 20 || hour < 5) return 'night';
        if (hour >= 5 && hour < 7) return 'dawn';
        if (hour >= 18 && hour < 20) return 'dusk';
        return 'day';
    }

    _isTimeActive(requiredTime) {
        if (requiredTime === 'any') return true;
        const current = this._getTimeOfDay();
        if (requiredTime === 'night') return current === 'night' || current === 'dusk';
        if (requiredTime === 'day') return current === 'day' || current === 'dawn';
        if (requiredTime === 'dawn_dusk') return current === 'dawn' || current === 'dusk';
        return current === requiredTime;
    }

    _updateParticles(dt) {
        const camera = this.game.camera;
        const zoom = camera?.zoom || 1.0;
        const vpW = (this.game.CANVAS_WIDTH || 800) / zoom;
        const vpH = (this.game.CANVAS_HEIGHT || 600) / zoom;
        const pad = 60;

        // Viewport bounds in world coords
        const vpLeft = camera.x - pad;
        const vpRight = camera.x + vpW + pad;
        const vpTop = camera.y - pad;
        const vpBottom = camera.y + vpH + pad;

        // ── Update existing particles ──
        for (let i = this.biomeParticles.length - 1; i >= 0; i--) {
            const p = this.biomeParticles[i];
            p.age += dt;
            
            if (p.age >= p.lifetime) {
                this.biomeParticles.splice(i, 1);
                continue;
            }
            
            // Movement
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;

            // Type-specific behavior
            if (p.type === 'firefly') {
                // Fireflies: gentle random wandering + pulsing glow
                p.vx += (Math.random() - 0.5) * 0.08;
                p.vy += (Math.random() - 0.5) * 0.06;
                p.vx *= 0.98; // friction
                p.vy *= 0.98;
                p.alpha = 0.5 + 0.5 * Math.sin(p.age * 2 + p.phase);
                p.size = p.baseSize * (0.8 + 0.4 * Math.sin(p.age * 3 + p.phase));
            } else if (p.type === 'dust') {
                // Dust: drift with wind
                const wind = this.game.weatherSystem?.windStrength || 0;
                p.vx += wind * 0.15;
                p.vx *= 0.99;
                p.vy *= 0.99;
            } else if (p.type === 'pollen') {
                // Pollen: very gentle float upward + sway
                p.vy -= 0.002;
                p.vx = Math.sin(p.age * 0.8 + p.phase) * 0.15;
            } else if (p.type === 'mist') {
                // Mist: slow drift, grow and fade
                p.size = p.baseSize * (1 + p.age * 0.1);
            } else if (p.type === 'ice') {
                // Ice crystals: shimmer + slight fall
                p.vy += 0.003;
                p.vx = Math.sin(p.age * 1.5 + p.phase) * 0.1;
                p.alpha = 0.4 + 0.4 * Math.sin(p.age * 4 + p.phase);
            } else if (p.type === 'dragonfly') {
                // Dragonflies: fast zigzag darting, hover then dash
                const dashCycle = Math.sin(p.age * 1.2 + p.phase);
                if (Math.abs(dashCycle) > 0.7) {
                    // Dash phase — quick direction change
                    p.vx += (Math.random() - 0.5) * 0.25;
                    p.vy += (Math.random() - 0.5) * 0.2;
                } else {
                    // Hover phase — slow down and drift
                    p.vx *= 0.95;
                    p.vy *= 0.95;
                }
                // Clamp speed
                const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                if (spd > 2.5) { p.vx *= 2.5 / spd; p.vy *= 2.5 / spd; }
                // Subtle wing shimmer
                p.alpha = 0.6 + 0.3 * Math.sin(p.age * 8 + p.phase);
            } else if (p.type === 'sand_wisp') {
                // Sand wisps: spiraling wind-driven tendrils
                const wind = this.game.weatherSystem?.windStrength || 0.3;
                const spiralT = p.age * 0.6 + p.phase;
                p.vx += wind * 0.2 + Math.cos(spiralT) * 0.06;
                p.vy += Math.sin(spiralT) * 0.04 - 0.01; // slight lift
                p.vx *= 0.97;
                p.vy *= 0.97;
                // Grow and fade as it dissipates
                p.size = p.baseSize * (1 + p.age * 0.08);
                p.alpha = 0.2 * (1 - p.age / p.lifetime); // fade out gradually
            } else if (p.type === 'leaf') {
                // Falling leaves: sway side-to-side while drifting down
                p.vy += 0.005; // gravity
                p.vx = Math.sin(p.age * 1.0 + p.phase) * 0.25; // sway
                p.vy *= 0.995;
                // Store rotation for rendering
                p.rotation = (p.rotation || 0) + dt * (1.5 + Math.sin(p.phase) * 0.8);
            }

            // Remove if far outside viewport
            if (p.x < vpLeft - 100 || p.x > vpRight + 100 ||
                p.y < vpTop - 100 || p.y > vpBottom + 100) {
                this.biomeParticles.splice(i, 1);
            }
        }

        // ── Spawn new particles ──
        for (const type of this.activeParticleTypes) {
            const config = PARTICLE_CONFIGS[type];
            if (!config) continue;

            // Check time-of-day
            if (!this._isTimeActive(config.timeOfDay)) continue;

            // Initialize spawn timer
            if (this.spawnTimers[type] === undefined) this.spawnTimers[type] = 0;
            this.spawnTimers[type] += dt;

            const interval = 1.0 / config.spawnRate;
            while (this.spawnTimers[type] >= interval) {
                this.spawnTimers[type] -= interval;

                // Don't exceed max
                const currentCount = this.biomeParticles.filter(p => p.type === type).length;
                if (currentCount >= config.maxCount) continue;

                this._spawnParticle(type, config, vpLeft, vpRight, vpTop, vpBottom);
            }
        }
    }

    _spawnParticle(type, config, vpLeft, vpRight, vpTop, vpBottom) {
        const size = config.size.min + Math.random() * (config.size.max - config.size.min);
        const speed = config.speed.min + Math.random() * (config.speed.max - config.speed.min);
        const lifetime = config.lifetime.min + Math.random() * (config.lifetime.max - config.lifetime.min);
        const color = config.colors[Math.floor(Math.random() * config.colors.length)];
        const phase = Math.random() * Math.PI * 2;

        // Spawn within viewport
        const x = vpLeft + Math.random() * (vpRight - vpLeft);
        const y = vpTop + Math.random() * (vpBottom - vpTop);

        // Initial velocity
        let vx = (Math.random() - 0.5) * speed;
        let vy = (Math.random() - 0.5) * speed;

        // Type-specific spawn adjustments
        if (type === 'dust') {
            vx = speed * 0.5 + Math.random() * speed * 0.5; // drift right-ish (wind)
            vy = (Math.random() - 0.5) * speed * 0.3;
        } else if (type === 'pollen') {
            vy = -speed * 0.5; // float upward
            vx = (Math.random() - 0.5) * speed * 0.3;
        } else if (type === 'mist') {
            vx = (Math.random() - 0.3) * speed;
            vy = -speed * 0.2; // gentle rise
        } else if (type === 'ice') {
            vy = speed * 0.3; // gentle fall
            vx = (Math.random() - 0.5) * speed * 0.5;
        } else if (type === 'dragonfly') {
            // Start with a random dash direction
            const angle = Math.random() * Math.PI * 2;
            vx = Math.cos(angle) * speed;
            vy = Math.sin(angle) * speed;
        } else if (type === 'sand_wisp') {
            vx = speed * 0.7 + Math.random() * speed * 0.5; // wind-driven
            vy = (Math.random() - 0.5) * speed * 0.2;
        } else if (type === 'leaf') {
            vy = speed * 0.4; // fall
            vx = (Math.random() - 0.5) * speed * 0.6; // lateral drift
        }

        this.biomeParticles.push({
            type,
            x, y,
            vx, vy,
            size,
            baseSize: size,
            age: 0,
            lifetime,
            color: [...color],
            alpha: type === 'mist' ? 0.15 : 0.7,
            glow: config.glow,
            phase,
        });
    }
}
