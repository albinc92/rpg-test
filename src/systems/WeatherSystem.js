/**
 * Global configuration for map transitions
 * Used by WeatherSystem, AudioManager, and other systems for consistent crossfade timing
 */
const MAP_TRANSITION_CONFIG = {
    DURATION_SECONDS: 5.0,      // Duration in seconds (for WeatherSystem)
    DURATION_MS: 5000,          // Duration in milliseconds (for AudioManager)
};

/**
 * WeatherSystem - Manages weather effects (precipitation, wind, particles)
 * 
 * Supports two modes:
 *   1. Legacy string-based: setWeather({ precipitation: 'rain-medium', wind: 'light', particles: 'leaf-green' })
 *   2. Channel-based (from BiomeWeatherSystem): applyChannels({ rain: 0.6, snow: 0, wind: 0.4, fog: 0, cloud: 0.8 })
 */
class WeatherSystem {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.ctx = game.ctx;
        this.webglRenderer = null; // Will be set when available
        
        // Current weather state (legacy string mode)
        this.precipitation = 'none'; // none, dynamic, sun, rain-light, rain-medium, rain-heavy, snow-light, snow-medium, snow-heavy
        this.wind = 'none'; // none, dynamic, light, medium, heavy
        this.particles = 'none'; // none, leaf-green, leaf-orange, leaf-red, leaf-brown, sakura
        
        // Target weather state (for transitions)
        this.targetPrecipitation = 'none';
        this.targetWind = 'none';
        this.targetParticles = 'none';
        
        // Transition state
        this.transitionProgress = 1.0; // 0 = start of transition, 1 = complete
        this.transitionDuration = MAP_TRANSITION_CONFIG.DURATION_SECONDS;
        this.isTransitioning = false;
        
        // Intensity multiplier for smooth particle fade (0-1)
        this.particleIntensity = 1.0;
        this.targetParticleIntensity = 1.0;
        
        // Lighting transition (brightness, saturation, darkness color)
        this.currentLightingParams = {
            brightness: 1.0,
            saturation: 1.0,
            darknessColor: [1.0, 1.0, 1.0]
        };
        this.targetLightingParams = {
            brightness: 1.0,
            saturation: 1.0,
            darknessColor: [1.0, 1.0, 1.0]
        };
        // "From" values for interpolation (captured when transition starts)
        this.fromLightingParams = {
            brightness: 1.0,
            saturation: 1.0,
            darknessColor: [1.0, 1.0, 1.0]
        };
        this.fromShadowMultiplier = 1.0;
        this.fromPrecipitation = 'none';
        
        // Shadow transition
        this.shadowMultiplier = 1.0;
        this.targetShadowMultiplier = 1.0;
        
        // Dynamic weather
        this.dynamicTimer = 0;
        this.dynamicDuration = 300; // 5 minutes default
        this.currentDynamicWeather = 'sun';
        
        // Particle pools
        this.rainParticles = [];
        this.snowParticles = [];
        this.leafParticles = [];
        this.maxParticles = 500;
        
        // Wind properties
        this.windStrength = 0; // 0-1
        this.windAngle = 0; // radians
        
        // Time accumulator
        this.time = 0;
        
        // Track if this is first weather set (no transition on first load)
        this.hasInitialWeather = false;
        
        // ─── Channel-based weather state (from BiomeWeatherSystem) ───
        this.channelMode = false;  // true when driven by BiomeWeatherSystem
        this.weatherChannels = { rain: 0, snow: 0, wind: 0, fog: 0, cloud: 0 };
        this._targetChannels = { rain: 0, snow: 0, wind: 0, fog: 0, cloud: 0 };
        this._channelLerpRate = 1.2;  // per-second exponential lerp factor (~2s full crossfade)
        this._channelsInitialized = false; // first applyChannels should snap, not lerp
        this.prevWeatherChannels = { rain: 0, snow: 0, wind: 0, fog: 0, cloud: 0 };
        this._lastAudioTier = { rain: 'none', wind: 'none' };  // track to avoid redundant audio calls
        
        // Fog overlay alpha (driven by channel)
        this.fogAlpha = 0;
        
        // ─── World-Space Fog Wisps ───
        // Persistent fog wisp blobs in world coordinates (don't follow camera)
        this.fogWisps = [];
        this._fogWispTimer = 0;
        this._fogWispsInitialized = false;
        
        // ─── Thunder & Lightning System ───
        this._thunderTimer = 0;          // countdown to next thunder event
        this._thunderInterval = 0;       // seconds between thunder events
        this._lightningFlash = 0;        // current flash brightness (0-1)
        this._lightningPhase = 0;        // flash animation phase
        this._lightningActive = false;   // is a flash in progress?
        this._thunderSounds = ['thunder-01.mp3', 'thunder-02.mp3', 'thunder-03.mp3', 'thunder-04.mp3', 'thunder-05.mp3'];
        this._scheduleNextThunder();
        
        // ─── Cloud Shadow System ───
        // Persistent cloud shadow blobs that drift across the ground
        this.cloudShadows = [];
        this._cloudShadowTimer = 0;
        this._cloudShadowsInitialized = false;
    }
    
    /**
     * Set weather from map configuration (with smooth transition)
     * @param {Object} weatherConfig - Weather configuration object
     * @param {boolean} immediate - If true, skip transition and apply immediately
     */
    setWeather(weatherConfig, immediate = false) {
        const newPrecip = weatherConfig ? (weatherConfig.precipitation || 'none') : 'none';
        const newWind = weatherConfig ? (weatherConfig.wind || 'none') : 'none';
        const newParticles = weatherConfig ? (weatherConfig.particles || 'none') : 'none';
        
        // Check if weather is actually changing
        const isChanging = newPrecip !== this.precipitation || 
                          newWind !== this.wind || 
                          newParticles !== this.particles;
        
        if (!isChanging && this.hasInitialWeather) {
            console.log('🌤️ Weather unchanged, skipping transition');
            return;
        }
        
        // First time setting weather - apply immediately, no transition
        if (!this.hasInitialWeather || immediate) {
            console.log(`🌤️ Weather set immediately: ${newPrecip}/${newWind}/${newParticles}`);
            this.hasInitialWeather = true;
            
            this.precipitation = newPrecip;
            this.wind = newWind;
            this.particles = newParticles;
            this.targetPrecipitation = newPrecip;
            this.targetWind = newWind;
            this.targetParticles = newParticles;
            
            // Set lighting immediately
            const params = this.calculateLightingParams(newPrecip);
            this.currentLightingParams = { ...params, darknessColor: [...params.darknessColor] };
            this.targetLightingParams = { ...params, darknessColor: [...params.darknessColor] };
            this.fromLightingParams = { ...params, darknessColor: [...params.darknessColor] };
            
            // Set shadow immediately
            this.shadowMultiplier = this.calculateShadowMultiplier(newPrecip);
            this.targetShadowMultiplier = this.shadowMultiplier;
            this.fromShadowMultiplier = this.shadowMultiplier;
            
            this.particleIntensity = 1.0;
            this.isTransitioning = false;
            
            // Initialize particles
            this.initializeParticles();
            
            // Start weather sounds
            this.updateWeatherSounds();
            return;
        }
        
        console.log(`🌤️ Weather transitioning - From: ${this.precipitation}/${this.wind}/${this.particles} To: ${newPrecip}/${newWind}/${newParticles}`);
        
        // IMPORTANT: Capture current state as "from" values BEFORE changing anything
        // This ensures smooth interpolation from current state
        this.fromLightingParams = {
            brightness: this.currentLightingParams.brightness,
            saturation: this.currentLightingParams.saturation,
            darknessColor: [...this.currentLightingParams.darknessColor]
        };
        this.fromShadowMultiplier = this.shadowMultiplier;
        this.fromPrecipitation = this.precipitation;
        
        // Set target state
        this.targetPrecipitation = newPrecip;
        this.targetWind = newWind;
        this.targetParticles = newParticles;
        
        // Calculate target lighting params based on new weather
        this.targetLightingParams = this.calculateLightingParams(newPrecip);
        
        // Calculate target shadow multiplier
        this.targetShadowMultiplier = this.calculateShadowMultiplier(newPrecip);
        
        // Start transition
        this.isTransitioning = true;
        this.transitionProgress = 0;
        
        // If we're transitioning TO particles (not from none), initialize them immediately
        // but keep intensity at 0 so they fade in
        if (newPrecip !== 'none' && newPrecip !== this.precipitation) {
            // Store current precipitation temporarily
            const oldPrecip = this.precipitation;
            this.precipitation = newPrecip;
            this.initializeParticles();
            this.precipitation = oldPrecip; // Restore for fade-out
            this.targetParticleIntensity = 1.0;
        }
        
        // Handle sound transition
        this.updateWeatherSounds();
    }
    
    /**
     * Calculate lighting parameters for a given precipitation type
     */
    calculateLightingParams(precip) {
        if (precip === 'rain-light' || precip === 'snow-light') {
            return {
                brightness: 0.85,
                saturation: 0.8,
                darknessColor: [0.93, 0.93, 0.94]
            };
        } else if (precip === 'rain-medium' || precip === 'snow-medium') {
            return {
                brightness: 0.7,
                saturation: 0.65,
                darknessColor: [0.86, 0.86, 0.88]
            };
        } else if (precip === 'rain-heavy' || precip === 'snow-heavy') {
            return {
                brightness: 0.5,
                saturation: 0.5,
                darknessColor: [0.76, 0.76, 0.80]
            };
        }
        return {
            brightness: 1.0,
            saturation: 1.0,
            darknessColor: [1.0, 1.0, 1.0]
        };
    }
    
    /**
     * Calculate shadow multiplier for a given precipitation type
     */
    calculateShadowMultiplier(precip) {
        if (precip === 'rain-light' || precip === 'snow-light') {
            return 0.75;
        } else if (precip === 'rain-medium' || precip === 'snow-medium') {
            return 0.5;
        } else if (precip === 'rain-heavy' || precip === 'snow-heavy') {
            return 0.25;
        }
        return 1.0;
    }
    
    /**
     * Get current interpolated lighting params (for RenderSystem)
     */
    getInterpolatedLightingParams() {
        return {
            brightness: this.currentLightingParams.brightness,
            saturation: this.currentLightingParams.saturation,
            darknessColor: [...this.currentLightingParams.darknessColor]
        };
    }
    
    /**
     * Get current shadow multiplier (for GameEngine shadow calculation)
     */
    getShadowMultiplier() {
        return this.shadowMultiplier;
    }
    
    /**
     * Update weather sound effects based on current weather
     */
    updateWeatherSounds() {
        if (!this.game.audioManager) return;
        
        // Use target precipitation if transitioning, otherwise use current
        // This ensures sound starts immediately when entering a map with weather
        const effectivePrecip = this.isTransitioning ? this.targetPrecipitation : this.precipitation;
        const effectiveWind = this.isTransitioning ? this.targetWind : this.wind;
        
        // Determine precipitation sound (rain channel)
        let precipSound = 'none';
        if (effectivePrecip.startsWith('rain')) {
            precipSound = effectivePrecip; // rain-light, rain-medium, rain-heavy
        }
        // Snow doesn't have its own sound - it uses wind
        
        // Determine wind sound (wind channel - separate from rain)
        let windSound = 'none';
        if (effectiveWind !== 'none' && effectiveWind !== 'dynamic') {
            windSound = `wind-${effectiveWind}`; // wind-light, wind-medium, wind-heavy
        } else if (effectivePrecip.startsWith('snow')) {
            // Snow gets default gentle wind if no explicit wind
            windSound = 'wind-light';
        }
        
        // Play both sounds on separate channels (they can layer)
        this.game.audioManager.playWeatherSound(precipSound);
        this.game.audioManager.playWindSound(windSound);
    }
    
    /**
     * Stop weather sounds
     */
    stopWeatherSounds() {
        if (this.game.audioManager) {
            this.game.audioManager.stopWeatherSound();
            this.game.audioManager.stopWindSound();
        }
    }
    
    // ─── Channel-Based Weather API (from BiomeWeatherSystem) ────────────────
    
    /**
     * Apply weather from continuous 0-1 channel intensities.
     * Called by GameEngine when BiomeWeatherSystem is active.
     * Smoothly adjusts particles, lighting, shadows, fog, and audio.
     * 
     * @param {{ rain: number, snow: number, wind: number, fog: number, cloud: number }} channels
     */
    applyChannels(channels) {
        this.channelMode = true;
        
        // Store raw target channels (from biome or debug)
        this._targetChannels = {
            rain: channels.rain || 0,
            snow: channels.snow || 0,
            wind: channels.wind || 0,
            fog: channels.fog || 0,
            cloud: channels.cloud || 0,
        };
        
        // On first call, snap directly; afterwards, lerp smoothly
        if (!this._channelsInitialized) {
            this.weatherChannels = { ...this._targetChannels };
            this._channelsInitialized = true;
        } else {
            // Exponential lerp each channel toward target
            const dt = this.game?.lastDeltaTime || 0.016;
            const rate = this._channelLerpOverride || this._channelLerpRate;
            const t = Math.min(1, rate * dt);
            for (const key of ['rain', 'snow', 'wind', 'fog', 'cloud']) {
                this.weatherChannels[key] += (this._targetChannels[key] - this.weatherChannels[key]) * t;
                // Snap to target when very close (avoid perpetual tiny drift)
                if (Math.abs(this.weatherChannels[key] - this._targetChannels[key]) < 0.001) {
                    this.weatherChannels[key] = this._targetChannels[key];
                }
            }
        }
        
        // ── Map smoothed channels to legacy particle system ──
        // Determine dominant precipitation type
        const rain = this.weatherChannels.rain;
        const snow = this.weatherChannels.snow;
        const wind = this.weatherChannels.wind;
        const fog  = this.weatherChannels.fog;
        const cloud = this.weatherChannels.cloud;
        
        // Determine precipitation string for particle system
        let newPrecip = 'none';
        if (rain > 0.05 && rain >= snow) {
            if (rain < 0.35) newPrecip = 'rain-light';
            else if (rain < 0.7) newPrecip = 'rain-medium';
            else newPrecip = 'rain-heavy';
        } else if (snow > 0.05) {
            if (snow < 0.35) newPrecip = 'snow-light';
            else if (snow < 0.7) newPrecip = 'snow-medium';
            else newPrecip = 'snow-heavy';
        }
        
        // Determine wind string
        let newWind = 'none';
        if (wind > 0.05) {
            if (wind < 0.35) newWind = 'light';
            else if (wind < 0.7) newWind = 'medium';
            else newWind = 'heavy';
        }
        
        // ── Smoothly adjust wind strength (continuous, no need for string) ──
        this.windStrength = wind;
        
        // ── Update fog overlay ──
        this.fogAlpha = fog;
        
        // ── Update lighting from channel intensity ──
        // Cloud cover and precipitation darken the scene
        const precipIntensity = Math.max(rain, snow);
        const darkening = Math.max(precipIntensity, cloud * 0.5);
        
        this.currentLightingParams.brightness = 1.0 - darkening * 0.5;  // 1.0 → 0.5
        this.currentLightingParams.saturation = 1.0 - darkening * 0.5;  // 1.0 → 0.5
        this.currentLightingParams.darknessColor = [
            1.0 - darkening * 0.24,
            1.0 - darkening * 0.24,
            1.0 - darkening * 0.20,
        ];
        
        // ── Update shadow multiplier ──
        this.shadowMultiplier = 1.0 - precipIntensity * 0.75;   // 1.0 → 0.25
        
        // ── Update precipitation type WITHOUT re-initializing particles ──
        // In channel mode we never nuke the pool — _scaleParticlesToIntensity
        // grows / shrinks it smoothly each frame.
        if (newPrecip !== this.precipitation) {
            const wasRain = this.precipitation.startsWith('rain');
            const wasSnow = this.precipitation.startsWith('snow');
            const isRain = newPrecip.startsWith('rain');
            const isSnow = newPrecip.startsWith('snow');
            
            // Only clear the OTHER type's pool when switching between rain ↔ snow
            if (isRain && wasSnow) this.snowParticles = [];
            if (isSnow && wasRain) this.rainParticles = [];
            // Going to 'none' — pools will be drained by _scaleParticlesToIntensity
            
            const isFirstSet = !this.hasInitialWeather;
            this.precipitation = newPrecip;
            this.targetPrecipitation = newPrecip;
            this.hasInitialWeather = true;
            
            if (!isFirstSet) {
                console.log(`🌤️ Channel weather → particles: ${newPrecip}, wind: ${newWind}`);
            }
        }
        this.wind = newWind;
        this.targetWind = newWind;
        this.particleIntensity = 1.0;
        
        // ── Scale particle count to match continuous intensity ──
        this._scaleParticlesToIntensity(rain, snow);
        
        // ── Update audio tiers ──
        this._updateAudioFromChannels(rain, snow, wind);
    }
    
    /**
     * Scale particle pool size to match continuous channel intensity.
     * E.g. rain=0.45 (rain-medium tier) but fewer particles than rain=0.65 (also medium).
     */
    _scaleParticlesToIntensity(rain, snow) {
        if (rain > 0.05 && rain >= snow) {
            // Map rain 0-1 to particle count 50-1200
            const targetCount = Math.floor(50 + rain * 1150);
            this._adjustParticlePool(this.rainParticles, targetCount, 'rain');
        } else if (this.rainParticles.length > 0) {
            // Rain below threshold — drain pool to 0
            this._adjustParticlePool(this.rainParticles, 0, 'rain');
        }
        if (snow > 0.05 && snow > rain) {
            // Map snow 0-1 to particle count 20-400
            const targetCount = Math.floor(20 + snow * 380);
            this._adjustParticlePool(this.snowParticles, targetCount, 'snow');
        } else if (this.snowParticles.length > 0) {
            // Snow below threshold — drain pool to 0
            this._adjustParticlePool(this.snowParticles, 0, 'snow');
        }
    }
    
    /**
     * Grow or shrink a particle pool toward a target count.
     * New particles are spread across the full viewport height so they
     * don't all shower down from the top as a visible chunk.
     */
    _adjustParticlePool(pool, targetCount, type) {
        const viewport = this.getCameraViewport();
        const diff = targetCount - pool.length;
        
        if (diff > 0) {
            // Add particles — allow larger batches so rain fills in quickly
            // but cap to avoid massive single-frame allocation lag
            const toAdd = Math.min(diff, 80);
            for (let i = 0; i < toAdd; i++) {
                const p = type === 'rain' 
                    ? this.createRainParticle(viewport)
                    : this.createSnowParticle(viewport);
                // Distribute across full viewport height (not just top row)
                // so new particles appear at staggered fall positions
                p.y = viewport.top + Math.random() * viewport.height;
                pool.push(p);
            }
        } else if (diff < -5) {
            // Remove particles gradually
            const toRemove = Math.min(-diff, 40);
            pool.splice(pool.length - toRemove, toRemove);
        }
    }
    
    /**
     * Map channel intensities to rain/wind audio tiers.
     * Only triggers AudioManager calls when the tier actually changes.
     */
    _updateAudioFromChannels(rain, snow, wind) {
        if (!this.game.audioManager) return;
        
        // Determine rain audio tier
        let rainTier = 'none';
        if (rain > 0.05) {
            if (rain < 0.35) rainTier = 'rain-light';
            else if (rain < 0.7) rainTier = 'rain-medium';
            else rainTier = 'rain-heavy';
        }
        
        // Determine wind audio tier (snow also drives wind audio)
        let windTier = 'none';
        const effectiveWind = Math.max(wind, snow * 0.5);  // snow adds some wind
        if (effectiveWind > 0.05) {
            if (effectiveWind < 0.35) windTier = 'wind-light';
            else if (effectiveWind < 0.7) windTier = 'wind-medium';
            else windTier = 'wind-heavy';
        }
        
        // Only update if tier changed
        if (rainTier !== this._lastAudioTier.rain) {
            this._lastAudioTier.rain = rainTier;
            this.game.audioManager.playWeatherSound(rainTier);
        }
        if (windTier !== this._lastAudioTier.wind) {
            this._lastAudioTier.wind = windTier;
            this.game.audioManager.playWindSound(windTier);
        }
    }
    
    /**
     * Initialize particle pools based on current settings
     * Now particles are positioned in world space around the camera
     */
    initializeParticles() {
        // Clear existing particles
        this.rainParticles = [];
        this.snowParticles = [];
        this.leafParticles = [];
        
        // Get camera viewport with padding
        const viewport = this.getCameraViewport();
        
        console.log(`🌤️ Initializing weather particles in world space`);
        
        // Initialize rain particles
        if (this.precipitation.startsWith('rain')) {
            const count = this.getParticleCount('rain');
            console.log(`🌧️ Creating ${count} rain particles for ${this.precipitation}`);
            for (let i = 0; i < count; i++) {
                this.rainParticles.push(this.createRainParticle(viewport));
            }
        }
        
        // Initialize snow particles
        if (this.precipitation.startsWith('snow')) {
            const count = this.getParticleCount('snow');
            console.log(`❄️ Creating ${count} snow particles for ${this.precipitation}`);
            for (let i = 0; i < count; i++) {
                this.snowParticles.push(this.createSnowParticle(viewport));
            }
        }
        
        // Initialize leaf particles
        if (this.particles !== 'none') {
            const count = Math.min(20, this.maxParticles);  // Reduced from 50 to 20
            for (let i = 0; i < count; i++) {
                this.leafParticles.push(this.createLeafParticle(viewport));
            }
        }
    }
    
    /**
     * Shift all weather particles by a world-coordinate offset.
     * Called during seamless map transitions so particles stay in sync
     * with the camera instead of being recycled all at once.
     */
    shiftParticles(dx, dy) {
        for (const p of this.rainParticles)  { p.x += dx; p.y += dy; }
        for (const p of this.snowParticles)  { p.x += dx; p.y += dy; }
        for (const p of this.leafParticles)  { p.x += dx; p.y += dy; }
        // Cloud shadows and fog wisps also live in world space
        for (const s of this.cloudShadows)   { s.x += dx; s.y += dy; }
        for (const w of this.fogWisps)       { w.x += dx; w.y += dy; }
    }
    
    /**
     * Get camera viewport in world coordinates with padding
     */
    getCameraViewport() {
        const camera = this.game.camera;
        const canvasWidth = this.game.CANVAS_WIDTH;
        const canvasHeight = this.game.CANVAS_HEIGHT;
        const zoom = camera.zoom || 1.0;
        
        // Calculate viewport size in world coordinates
        const viewportWidth = canvasWidth / zoom;
        const viewportHeight = canvasHeight / zoom;
        
        // Add padding (50% extra on each side)
        const padding = 0.5;
        const paddedWidth = viewportWidth * (1 + padding * 2);
        const paddedHeight = viewportHeight * (1 + padding * 2);
        
        return {
            left: camera.x - paddedWidth / 2,
            right: camera.x + paddedWidth / 2,
            top: camera.y - paddedHeight / 2,
            bottom: camera.y + paddedHeight / 2,
            width: paddedWidth,
            height: paddedHeight
        };
    }
    
    /**
     * Get particle count based on intensity
     */
    getParticleCount(type) {
        if (type === 'rain') {
            if (this.precipitation === 'rain-light') return 200;
            if (this.precipitation === 'rain-medium') return 600;
            if (this.precipitation === 'rain-heavy') return 1000;
        }
        if (type === 'snow') {
            if (this.precipitation === 'snow-light') return 50;
            if (this.precipitation === 'snow-medium') return 150;
            if (this.precipitation === 'snow-heavy') return 300;
        }
        return 0;
    }
    
    /**
     * Create a rain particle in world coordinates
     */
    createRainParticle(viewport) {
        return {
            x: viewport.left + Math.random() * viewport.width,
            y: viewport.top + Math.random() * viewport.height,
            speed: 18 + Math.random() * 8,
            length: 10 + Math.random() * 10
        };
    }
    
    /**
     * Create a snow particle in world coordinates
     */
    createSnowParticle(viewport) {
        return {
            x: viewport.left + Math.random() * viewport.width,
            y: viewport.top + Math.random() * viewport.height,
            speed: 3 + Math.random() * 3,
            size: 2 + Math.random() * 3,
            sway: Math.random() * Math.PI * 2,
            swaySpeed: 0.02 + Math.random() * 0.03
        };
    }
    
    /**
     * Create a leaf particle in world coordinates
     */
    createLeafParticle(viewport) {
        return {
            x: viewport.left + Math.random() * viewport.width,
            y: viewport.top - Math.random() * 200, // Start above viewport
            speed: 0.5 + Math.random() * 1,
            size: 4 + Math.random() * 4,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.015,  // Reduced from 0.05 to 0.015
            sway: Math.random() * Math.PI * 2,
            swaySpeed: 0.01 + Math.random() * 0.02,
            color: this.getLeafColor()
        };
    }
    
    /**
     * Get leaf color based on particle type
     */
    getLeafColor() {
        switch (this.particles) {
            case 'leaf-green':
                return `rgb(${50 + Math.random() * 50}, ${150 + Math.random() * 50}, ${30 + Math.random() * 30})`;
            case 'leaf-orange':
                return `rgb(${200 + Math.random() * 55}, ${100 + Math.random() * 50}, ${0 + Math.random() * 30})`;
            case 'leaf-red':
                return `rgb(${180 + Math.random() * 75}, ${20 + Math.random() * 30}, ${0 + Math.random() * 20})`;
            case 'leaf-brown':
                return `rgb(${100 + Math.random() * 50}, ${60 + Math.random() * 30}, ${20 + Math.random() * 20})`;
            case 'sakura':
                return `rgb(${255 - Math.random() * 30}, ${180 + Math.random() * 50}, ${200 + Math.random() * 55})`;
            default:
                return '#90EE90';
        }
    }
    
    /**
     * Update weather system
     */
    update(deltaTime) {
        this.time += deltaTime;
        
        // Update cloud shadows every frame (works in both modes)
        this._updateCloudShadows(deltaTime);
        
        // Update fog wisps every frame
        this._updateFogWisps(deltaTime);
        
        // Update thunder & lightning
        this._updateThunderLightning(deltaTime);
        
        // In channel mode, BiomeWeatherSystem drives everything via applyChannels()
        // We only need to update particles (movement physics) — no string transitions or dynamic rolling
        if (this.channelMode) {
            this.updateRainParticles(deltaTime);
            this.updateSnowParticles(deltaTime);
            this.updateLeafParticles(deltaTime);
            return;
        }
        
        // ── Legacy string-based mode below ──
        
        // Update transition
        if (this.isTransitioning) {
            this.updateTransition(deltaTime);
        }
        
        // Update wind strength
        this.updateWind();
        
        // Handle dynamic weather
        if (this.precipitation === 'dynamic') {
            this.updateDynamicWeather(deltaTime);
        }
        
        // Update particles
        this.updateRainParticles(deltaTime);
        this.updateSnowParticles(deltaTime);
        this.updateLeafParticles(deltaTime);
    }
    
    /**
     * Update weather transition (smooth crossfade)
     */
    updateTransition(deltaTime) {
        this.transitionProgress += deltaTime / this.transitionDuration;
        
        if (this.transitionProgress >= 1.0) {
            // Transition complete
            this.transitionProgress = 1.0;
            this.isTransitioning = false;
            
            // Finalize weather state
            this.precipitation = this.targetPrecipitation;
            this.wind = this.targetWind;
            this.particles = this.targetParticles;
            this.particleIntensity = 1.0;
            
            // Finalize lighting
            this.currentLightingParams = { 
                brightness: this.targetLightingParams.brightness,
                saturation: this.targetLightingParams.saturation,
                darknessColor: [...this.targetLightingParams.darknessColor]
            };
            this.shadowMultiplier = this.targetShadowMultiplier;
            
            // Re-initialize particles with final state
            this.initializeParticles();
            
            console.log(`🌤️ Weather transition complete: ${this.precipitation}`);
        } else {
            // Linear interpolation for gradual crossfade
            const t = this.transitionProgress;
            
            // Interpolate lighting params using stored "from" values
            this.currentLightingParams.brightness = this.lerp(
                this.fromLightingParams.brightness,
                this.targetLightingParams.brightness,
                t
            );
            this.currentLightingParams.saturation = this.lerp(
                this.fromLightingParams.saturation,
                this.targetLightingParams.saturation,
                t
            );
            
            this.currentLightingParams.darknessColor = [
                this.lerp(this.fromLightingParams.darknessColor[0], this.targetLightingParams.darknessColor[0], t),
                this.lerp(this.fromLightingParams.darknessColor[1], this.targetLightingParams.darknessColor[1], t),
                this.lerp(this.fromLightingParams.darknessColor[2], this.targetLightingParams.darknessColor[2], t)
            ];
            
            // Interpolate shadow multiplier using stored "from" value
            this.shadowMultiplier = this.lerp(this.fromShadowMultiplier, this.targetShadowMultiplier, t);
            
            // Interpolate particle intensity
            // Fade out old, fade in new
            if (this.transitionProgress < 0.5) {
                // First half: fade out old particles
                this.particleIntensity = 1.0 - (this.transitionProgress * 2);
            } else {
                // Second half: fade in new particles
                this.particleIntensity = (this.transitionProgress - 0.5) * 2;
                
                // Switch to new precipitation type at midpoint
                if (this.precipitation !== this.targetPrecipitation) {
                    this.precipitation = this.targetPrecipitation;
                    this.wind = this.targetWind;
                    this.particles = this.targetParticles;
                    this.initializeParticles();
                }
            }
        }
    }
    
    /**
     * Linear interpolation
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    /**
     * Smoothstep for eased transitions
     */
    smoothstep(t) {
        return t * t * (3 - 2 * t);
    }
    
    /**
     * Update wind properties
     */
    updateWind() {
        switch (this.wind) {
            case 'none':
                this.windStrength = 0;
                break;
            case 'light':
                this.windStrength = 0.3;
                break;
            case 'medium':
                this.windStrength = 0.6;
                break;
            case 'heavy':
                this.windStrength = 1.0;
                break;
            case 'dynamic':
                // Oscillating wind
                this.windStrength = 0.3 + Math.sin(this.time * 0.5) * 0.3;
                break;
        }
        
        // Wind angle (mostly horizontal, slight variation)
        this.windAngle = Math.PI / 2 + Math.sin(this.time * 0.3) * 0.2;
    }
    
    /**
     * Update dynamic weather transitions
     */
    updateDynamicWeather(deltaTime) {
        this.dynamicTimer += deltaTime;
        
        if (this.dynamicTimer >= this.dynamicDuration) {
            this.dynamicTimer = 0;
            
            // Randomly choose next weather
            const weatherTypes = ['none', 'rain-light', 'rain-medium'];
            const randomIndex = Math.floor(Math.random() * weatherTypes.length);
            const newWeather = weatherTypes[randomIndex];
            
            if (newWeather !== this.currentDynamicWeather) {
                this.currentDynamicWeather = newWeather;
                
                // Temporarily set precipitation to new weather
                const oldPrecip = this.precipitation;
                this.precipitation = newWeather;
                this.initializeParticles();
                this.precipitation = oldPrecip; // Restore 'dynamic'
            }
            
            // Random duration for next weather (2-5 minutes)
            this.dynamicDuration = 120 + Math.random() * 180;
        }
    }
    
    /**
     * Update rain particles in world coordinates
     */
    updateRainParticles(deltaTime) {
        const viewport = this.getCameraViewport();
        
        for (let particle of this.rainParticles) {
            // Wind affects horizontal movement (stronger effect for rain)
            const windForceX = this.windStrength * 15;
            
            particle.y += particle.speed * deltaTime * 60;
            particle.x += windForceX * deltaTime * 60;
            
            // Reset if outside viewport bounds
            if (particle.y > viewport.bottom) {
                particle.y = viewport.top - particle.length;
                particle.x = viewport.left + Math.random() * viewport.width;
            }
            if (particle.x < viewport.left - 50) particle.x = viewport.right + 50;
            if (particle.x > viewport.right + 50) particle.x = viewport.left - 50;
        }
    }
    
    /**
     * Update snow particles in world coordinates
     */
    updateSnowParticles(deltaTime) {
        const viewport = this.getCameraViewport();
        
        for (let particle of this.snowParticles) {
            // Update sway
            particle.sway += particle.swaySpeed;
            
            // Apply wind and sway (wind has stronger effect)
            const windForce = this.windStrength * 8;
            const swayOffset = Math.sin(particle.sway) * 2;
            
            particle.y += particle.speed * deltaTime * 60;
            particle.x += (windForce + swayOffset) * deltaTime * 60;
            
            // Reset if outside viewport bounds
            if (particle.y > viewport.bottom) {
                particle.y = viewport.top - particle.size;
                particle.x = viewport.left + Math.random() * viewport.width;
            }
            if (particle.x < viewport.left - 50) particle.x = viewport.right + 50;
            if (particle.x > viewport.right + 50) particle.x = viewport.left - 50;
        }
    }
    
    /**
     * Update leaf particles in world coordinates
     */
    updateLeafParticles(deltaTime) {
        const viewport = this.getCameraViewport();
        
        for (let particle of this.leafParticles) {
            // Update rotation and sway
            particle.rotation += particle.rotationSpeed;
            particle.sway += particle.swaySpeed;
            
            // Wind has strong effect on leaves - they blow sideways
            const windForce = this.windStrength * 12;
            const swayOffset = Math.sin(particle.sway) * 3;
            
            // Wind also affects fall speed slightly (updrafts)
            const windVerticalEffect = this.windStrength * -0.5;
            
            particle.y += (particle.speed + windVerticalEffect) * deltaTime * 60;
            particle.x += (windForce + swayOffset) * deltaTime * 60;
            
            // Increase rotation speed with wind (but keep it controlled)
            particle.rotationSpeed += this.windStrength * 0.0003;  // Reduced from 0.001
            // Clamp rotation speed to prevent uncontrolled spinning
            particle.rotationSpeed = Math.max(-0.02, Math.min(0.02, particle.rotationSpeed));
            
            // Reset if outside viewport bounds
            if (particle.y > viewport.bottom + 20) {
                particle.y = viewport.top - 20;
                particle.x = viewport.left + Math.random() * viewport.width;
                particle.rotation = Math.random() * Math.PI * 2;
                particle.rotationSpeed = (Math.random() - 0.5) * 0.015;  // Reduced from 0.05
            }
            if (particle.x < viewport.left - 50) particle.x = viewport.right + 50;
            if (particle.x > viewport.right + 50) particle.x = viewport.left - 50;
        }
    }
    
    /**
     * Set WebGL renderer reference (called from GameEngine)
     */
    setWebGLRenderer(webglRenderer) {
        this.webglRenderer = webglRenderer;
        console.log('🌤️ WeatherSystem: WebGL renderer set');
    }
    
    /**
     * Render weather effects in world space
     * Particles are now positioned in world coordinates and move with the map
     */
    render() {
        const useWebGL = this.webglRenderer && this.webglRenderer.initialized;
        
        // Note: Sun effects are skipped in world-space rendering as they should be screen-space
        // TODO: Render sun effects in screen space separately if needed
        
        // Render cloud shadows on the ground (world-space, before particles)
        this.renderCloudShadows();
        
        // Render rain (world coordinates)
        if (this.precipitation.startsWith('rain') || 
            (this.precipitation === 'dynamic' && this.currentDynamicWeather.startsWith('rain'))) {
            this.renderRain(useWebGL);
        }
        
        // Render snow (world coordinates)
        if (this.precipitation.startsWith('snow') || 
            (this.precipitation === 'dynamic' && this.currentDynamicWeather.startsWith('snow'))) {
            this.renderSnow(useWebGL);
        }
        
        // Render falling particles (leaves, sakura) (world coordinates)
        if (this.particles !== 'none') {
            this.renderLeaves(useWebGL);
        }
        
        // Render fog overlay (screen-space vignette + world-space wisps)
        if (this.fogAlpha > 0.01) {
            this.renderFogWisps();  // world-space wisps FIRST (under camera transform)
            this.renderFog();       // screen-space vignette on top
        }
        
        // Render lightning flash (screen-space, on top of everything)
        if (this._lightningFlash > 0.01) {
            this.renderLightningFlash();
        }
    }
    
    /**
     * Render fog overlay (screen-space radial vignette).
     * Fog is thick at screen edges, fading to clear in the center.
     * Color shifts by time-of-day: warm at dawn, cool at night, neutral by day.
     */
    renderFog() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const fog = this.fogAlpha; // 0-1 intensity
        
        ctx.save();
        
        // Reset to screen coordinates (fog is a screen-space overlay)
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // ── Time-of-day fog color ──
        let fogR = 200, fogG = 210, fogB = 220; // default neutral grey
        
        if (this.game.dayNightCycle) {
            const hour = this.game.dayNightCycle.timeOfDay;
            if (hour >= 5 && hour < 8) {
                // Dawn — warm golden
                fogR = 235; fogG = 218; fogB = 190;
            } else if (hour >= 18 && hour < 21) {
                // Dusk — warm amber
                fogR = 225; fogG = 200; fogB = 180;
            } else if (hour >= 21 || hour < 5) {
                // Night — cool blue-grey
                fogR = 160; fogG = 175; fogB = 210;
            }
        }
        
        // ── Radial vignette fog ──
        // Single radial gradient: clear center → thick edges
        const cx = width / 2;
        const cy = height / 2;
        // Inner clear radius — how much of the center is fog-free
        // At low fog, large clear area; at high fog, small clear area
        const innerRadius = Math.max(0, (1 - fog) * 0.5) * Math.min(width, height);
        // Outer radius covers the corners
        const outerRadius = Math.sqrt(cx * cx + cy * cy);
        
        const edgeAlpha = fog * 0.55; // max edge opacity
        
        const grad = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, outerRadius);
        grad.addColorStop(0, `rgba(${fogR}, ${fogG}, ${fogB}, 0)`);
        grad.addColorStop(0.3, `rgba(${fogR}, ${fogG}, ${fogB}, ${edgeAlpha * 0.2})`);
        grad.addColorStop(0.6, `rgba(${fogR}, ${fogG}, ${fogB}, ${edgeAlpha * 0.55})`);
        grad.addColorStop(0.85, `rgba(${fogR}, ${fogG}, ${fogB}, ${edgeAlpha * 0.85})`);
        grad.addColorStop(1, `rgba(${fogR}, ${fogG}, ${fogB}, ${edgeAlpha})`);
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        
        // ── Light overall haze at higher fog levels ──
        // A very subtle uniform tint so the center isn't completely untouched
        if (fog > 0.3) {
            const hazeAlpha = (fog - 0.3) * 0.12;
            ctx.fillStyle = `rgba(${fogR}, ${fogG}, ${fogB}, ${hazeAlpha})`;
            ctx.fillRect(0, 0, width, height);
        }
        
        ctx.restore();
    }
    
    // ─── World-Space Fog Wisp System ────────────────────────────────────────
    
    /**
     * Update fog wisp blobs. Called every frame.
     * Manages a pool of translucent fog patches that exist in world coordinates.
     * They drift slowly with wind, pulse in size, and fade in/out.
     * @param {number} dt - delta time in seconds
     */
    _updateFogWisps(dt) {
        const fog = this.fogAlpha;
        
        // Target wisp count scales with fog intensity
        const wispActive = fog > 0.08;
        // More wisps with heavier fog: 4 at low fog, up to 18 at max fog
        const targetCount = wispActive ? Math.floor(4 + fog * 14) : 0;
        
        // Slow drift direction (mostly horizontal, slight vertical)
        const windX = (this.windStrength || 0.05) * 0.4;
        const windY = (this.windStrength || 0.05) * 0.1;
        
        // Map bounds for spawning (wisps live across the entire map, not just viewport)
        const mapW = this.game.MAP_WIDTH || 3840;
        const mapH = this.game.MAP_HEIGHT || 3840;
        
        // Camera info for culling far-away wisps from update
        const camera = this.game.camera || { x: 0, y: 0, zoom: 1 };
        const zoom = camera.zoom || 1.0;
        const vpW = (this.game.CANVAS_WIDTH || 800) / zoom;
        const vpH = (this.game.CANVAS_HEIGHT || 600) / zoom;
        const cullDist = Math.max(vpW, vpH) * 1.5; // render/update radius
        
        // Time-of-day fog color (same as vignette)
        let fogR = 200, fogG = 210, fogB = 220;
        if (this.game.dayNightCycle) {
            const hour = this.game.dayNightCycle.timeOfDay;
            if (hour >= 5 && hour < 8) {
                fogR = 235; fogG = 218; fogB = 190;
            } else if (hour >= 18 && hour < 21) {
                fogR = 225; fogG = 200; fogB = 180;
            } else if (hour >= 21 || hour < 5) {
                fogR = 160; fogG = 175; fogB = 210;
            }
        }
        this._fogWispColor = { r: fogR, g: fogG, b: fogB };
        
        // Update existing wisps
        for (let i = this.fogWisps.length - 1; i >= 0; i--) {
            const w = this.fogWisps[i];
            
            // Drift with wind (very slow — fog barely moves)
            w.x += windX * w.driftSpeed * dt * 30;
            w.y += windY * w.driftSpeed * dt * 30;
            // Add gentle sinusoidal wander
            w.wanderPhase += dt * w.wanderSpeed;
            w.x += Math.sin(w.wanderPhase) * dt * 4;
            w.y += Math.cos(w.wanderPhase * 0.7 + w.seed) * dt * 2;
            
            // Organic pulsing of size and alpha
            w.pulsePhase += dt * w.pulseSpeed;
            w.currentScale = w.baseScale * (1 + Math.sin(w.pulsePhase) * 0.15);
            
            // Lifecycle: fade in, sustain, eventually fade out and respawn
            w.age += dt;
            w.lifetime -= dt;
            
            if (w.age < w.fadeIn) {
                // Fade in
                w.alpha = (w.age / w.fadeIn) * w.maxAlpha;
            } else if (w.lifetime < w.fadeOut) {
                // Fade out when approaching end of life
                w.alpha = Math.max(0, (w.lifetime / w.fadeOut) * w.maxAlpha);
            } else if (!wispActive) {
                // Fog turned off — fade out
                w.alpha = Math.max(0, w.alpha - dt * w.maxAlpha * 0.4);
            } else {
                w.alpha = w.maxAlpha;
            }
            
            // Remove if faded out or lifetime expired
            if (w.alpha <= 0 || w.lifetime <= 0) {
                this.fogWisps.splice(i, 1);
                continue;
            }
            
            // Wrap around map edges so wisps reappear on the other side
            if (w.x < -200) w.x += mapW + 400;
            if (w.x > mapW + 200) w.x -= mapW + 400;
            if (w.y < -200) w.y += mapH + 400;
            if (w.y > mapH + 200) w.y -= mapH + 400;
        }
        
        // Spawn new wisps to reach target count
        if (wispActive && this.fogWisps.length < targetCount) {
            this._fogWispTimer += dt;
            const spawnInterval = 0.8; // seconds between spawns
            
            while (this._fogWispTimer >= spawnInterval && this.fogWisps.length < targetCount) {
                this._fogWispTimer -= spawnInterval;
                this._spawnFogWisp(mapW, mapH, camera, vpW, vpH, fog);
            }
            
            // On first init, spread wisps across the map immediately
            if (!this._fogWispsInitialized && this.fogWisps.length > 0) {
                this._fogWispsInitialized = true;
                for (const w of this.fogWisps) {
                    w.age = w.fadeIn + 1; // skip fade-in
                    w.alpha = w.maxAlpha;
                }
            }
        }
        
        if (!wispActive && this.fogWisps.length === 0) {
            this._fogWispsInitialized = false;
        }
    }
    
    /**
     * Spawn a single fog wisp at a random position on the map.
     */
    _spawnFogWisp(mapW, mapH, camera, vpW, vpH, fog) {
        const seed = Math.random() * 1000;
        
        // Spawn anywhere on the map (not just viewport)
        const x = Math.random() * mapW;
        const y = Math.random() * mapH;
        
        // Each wisp is an elongated ellipse with multiple sub-blobs for organic shape
        const blobCount = 2 + Math.floor(Math.random() * 2); // 2-3 sub-blobs
        const blobs = [];
        const baseRadius = 100 + Math.random() * 200; // 100-300px world units
        
        for (let b = 0; b < blobCount; b++) {
            blobs.push({
                offsetX: (Math.random() - 0.5) * baseRadius * 1.2,
                offsetY: (Math.random() - 0.5) * baseRadius * 0.5,
                radiusX: baseRadius * (0.6 + Math.random() * 0.8),  // wide
                radiusY: baseRadius * (0.2 + Math.random() * 0.3),  // short (ground-hugging)
                rotation: (Math.random() - 0.5) * 0.5, // slight angle variation
            });
        }
        
        const fadeIn = 3 + Math.random() * 4;        // 3-7s fade in
        const fadeOut = 4 + Math.random() * 4;        // 4-8s fade out
        const lifetime = fadeIn + 15 + Math.random() * 30 + fadeOut; // 22-49s total
        
        this.fogWisps.push({
            x, y,
            blobs,
            seed,
            driftSpeed: 0.3 + Math.random() * 0.5,
            wanderPhase: Math.random() * Math.PI * 2,
            wanderSpeed: 0.2 + Math.random() * 0.3,
            baseScale: 0.7 + Math.random() * 0.6,
            currentScale: 1.0,
            pulsePhase: Math.random() * Math.PI * 2,
            pulseSpeed: 0.15 + Math.random() * 0.2,
            alpha: 0,
            maxAlpha: 0.06 + fog * 0.12 + Math.random() * 0.04, // 0.06-0.22 based on fog
            fadeIn,
            fadeOut,
            lifetime,
            age: 0,
        });
    }
    
    /**
     * Render fog wisps in world space.
     * Canvas context has camera transform active, so we draw in world coordinates.
     * Wisps are translucent elliptical blobs that sit on the ground.
     */
    renderFogWisps() {
        if (this.fogWisps.length === 0) return;
        
        const ctx = this.ctx;
        const color = this._fogWispColor || { r: 200, g: 210, b: 220 };
        
        // Quick viewport check for culling
        const camera = this.game.camera || { x: 0, y: 0, zoom: 1 };
        const zoom = camera.zoom || 1.0;
        const vpW = (this.game.CANVAS_WIDTH || 800) / zoom;
        const vpH = (this.game.CANVAS_HEIGHT || 600) / zoom;
        const pad = 300;
        const viewLeft = camera.x - vpW / 2 - pad;
        const viewRight = camera.x + vpW / 2 + pad;
        const viewTop = camera.y - vpH / 2 - pad;
        const viewBottom = camera.y + vpH / 2 + pad;
        
        ctx.save();
        
        for (const wisp of this.fogWisps) {
            if (wisp.alpha <= 0.005) continue;
            
            // Viewport culling — skip wisps far from camera
            if (wisp.x < viewLeft || wisp.x > viewRight ||
                wisp.y < viewTop || wisp.y > viewBottom) continue;
            
            const scale = wisp.currentScale;
            
            for (const blob of wisp.blobs) {
                const worldX = wisp.x + blob.offsetX * scale;
                const worldY = wisp.y + blob.offsetY * scale;
                const rx = blob.radiusX * scale;
                const ry = blob.radiusY * scale;
                
                // Soft radial gradient for the wisp blob
                const maxR = Math.max(rx, ry);
                const gradient = ctx.createRadialGradient(worldX, worldY, 0, worldX, worldY, maxR);
                gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${wisp.alpha})`);
                gradient.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, ${wisp.alpha * 0.6})`);
                gradient.addColorStop(0.7, `rgba(${color.r}, ${color.g}, ${color.b}, ${wisp.alpha * 0.25})`);
                gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
                
                ctx.fillStyle = gradient;
                ctx.save();
                ctx.translate(worldX, worldY);
                ctx.rotate(blob.rotation);
                ctx.scale(rx / maxR, ry / maxR); // squash into wide ellipse
                ctx.beginPath();
                ctx.arc(0, 0, maxR, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
        
        ctx.restore();
    }
    
    // ─── Thunder & Lightning System ──────────────────────────────────────────
    
    /**
     * Schedule next thunder event with random interval.
     * Heavier rain = more frequent thunder.
     */
    _scheduleNextThunder() {
        // Base interval 8-25 seconds, shorter when rain is heavier
        const rain = this.weatherChannels?.rain || 0;
        const minInterval = Math.max(4, 8 - rain * 5);   // 4-8s at heavy rain
        const maxInterval = Math.max(10, 25 - rain * 12); // 10-25s
        this._thunderInterval = minInterval + Math.random() * (maxInterval - minInterval);
        this._thunderTimer = this._thunderInterval;
    }
    
    /**
     * Update thunder & lightning system.
     * Active when rain >= 0.85 (thunderstorm conditions).
     */
    _updateThunderLightning(dt) {
        const rain = this.weatherChannels?.rain || 0;
        const isThunderstorm = rain >= 0.85;
        
        // Update existing flash animation (always, even if storm ends mid-flash)
        if (this._lightningActive) {
            this._lightningPhase += dt;
            
            // Multi-pulse flash pattern: bright flash, dim, second flash, fade out
            // Total duration ~0.6s
            if (this._lightningPhase < 0.05) {
                // Initial bright flash
                this._lightningFlash = 0.7 + this._lightningPhase * 6; // ramp to ~1.0
            } else if (this._lightningPhase < 0.1) {
                // Quick dim
                this._lightningFlash = 1.0 - (this._lightningPhase - 0.05) * 12; // drop to ~0.4
            } else if (this._lightningPhase < 0.15) {
                // Second flash (sometimes brighter, sometimes dimmer)
                this._lightningFlash = 0.4 + (this._lightningPhase - 0.1) * 8; // up to ~0.8
            } else if (this._lightningPhase < 0.6) {
                // Gradual fade out
                const t = (this._lightningPhase - 0.15) / 0.45;
                this._lightningFlash = 0.8 * (1 - t * t); // quadratic fade
            } else {
                // Done
                this._lightningFlash = 0;
                this._lightningActive = false;
            }
        }
        
        if (!isThunderstorm) {
            // Reset timer when not storming
            this._thunderTimer = this._thunderInterval;
            return;
        }
        
        // Countdown to next thunder
        this._thunderTimer -= dt;
        if (this._thunderTimer <= 0) {
            this._triggerLightning();
            this._scheduleNextThunder();
        }
    }
    
    /**
     * Trigger a lightning flash + thunder sound.
     */
    _triggerLightning() {
        // Start flash animation
        this._lightningActive = true;
        this._lightningPhase = 0;
        this._lightningFlash = 0.7;
        
        // Play thunder sound with slight delay (light travels faster than sound)
        // Delay 0.3-1.5s simulates distance
        const soundDelay = 300 + Math.random() * 1200;
        const soundFile = this._thunderSounds[Math.floor(Math.random() * this._thunderSounds.length)];
        const volume = 0.8 + Math.random() * 0.2; // 0.8-1.0 volume — thunder must cut through wind
        
        setTimeout(() => {
            if (this.game.audioManager) {
                this.game.audioManager.playEffect(soundFile, volume);
            }
        }, soundDelay);
    }
    
    /**
     * Render lightning flash overlay (screen-space white flash).
     */
    renderLightningFlash() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // White flash with current intensity
        const alpha = this._lightningFlash * 0.6; // cap max opacity
        ctx.fillStyle = `rgba(220, 225, 255, ${alpha})`;
        ctx.fillRect(0, 0, width, height);
        
        ctx.restore();
    }
    
    // ─── Cloud Shadow System ────────────────────────────────────────────────
    
    /**
     * Update cloud shadow blobs. Called every frame.
     * Manages a pool of shadow "clouds" that drift across the world.
     * @param {number} dt - delta time in seconds
     */
    _updateCloudShadows(dt) {
        const cloud = this.weatherChannels?.cloud || 0;
        
        // Cloud shadows only during daytime with partial cloud cover (0.15–0.75)
        let isDaytime = true;
        if (this.game.dayNightCycle) {
            const hour = this.game.dayNightCycle.timeOfDay;
            isDaytime = hour >= 6 && hour < 19;
        }
        
        // Determine target shadow count based on cloud coverage
        // Partial clouds (0.15-0.75) → distinct shadow patches
        // Above 0.75 → uniform overcast, no distinct shadows
        const shadowActive = isDaytime && cloud >= 0.15 && cloud < 0.75;
        const targetCount = shadowActive ? Math.floor(3 + (cloud - 0.15) * 12) : 0;
        
        // Wind direction for drift
        const windX = (this.windStrength || 0.1) * 1.2;
        const windY = (this.windStrength || 0.1) * 0.3;
        
        // Camera and viewport info
        const camera = this.game.camera || { x: 0, y: 0, zoom: 1 };
        const zoom = camera.zoom || 1.0;
        const vpW = (this.game.CANVAS_WIDTH || 800) / zoom;
        const vpH = (this.game.CANVAS_HEIGHT || 600) / zoom;
        const pad = 400; // spawn padding outside viewport
        
        // Update existing shadows
        for (let i = this.cloudShadows.length - 1; i >= 0; i--) {
            const s = this.cloudShadows[i];
            
            // Drift with wind
            s.x += windX * s.speed * dt * 60;
            s.y += windY * s.speed * dt * 60;
            
            // Subtle organic pulsing of size
            s.scalePhase += dt * s.pulseSpeed;
            s.currentScale = s.baseScale + Math.sin(s.scalePhase) * s.baseScale * 0.08;
            
            // Fade in/out lifecycle
            s.age += dt;
            if (s.age < s.fadeIn) {
                s.alpha = (s.age / s.fadeIn) * s.maxAlpha;
            } else if (!shadowActive || this.cloudShadows.length > targetCount * 1.5) {
                // Fade out if weather changed or too many
                s.alpha = Math.max(0, s.alpha - dt * s.maxAlpha * 0.3);
                if (s.alpha <= 0) {
                    this.cloudShadows.splice(i, 1);
                    continue;
                }
            } else {
                s.alpha = s.maxAlpha;
            }
            
            // Remove if drifted far past viewport
            const dx = s.x - camera.x;
            const dy = s.y - camera.y;
            if (dx > vpW + pad * 2 || dx < -pad * 2 ||
                dy > vpH + pad * 2 || dy < -pad * 2) {
                this.cloudShadows.splice(i, 1);
            }
        }
        
        // Spawn new shadows to reach target
        if (shadowActive && this.cloudShadows.length < targetCount) {
            this._cloudShadowTimer += dt;
            const spawnInterval = 1.5; // seconds between spawns
            
            while (this._cloudShadowTimer >= spawnInterval && this.cloudShadows.length < targetCount) {
                this._cloudShadowTimer -= spawnInterval;
                
                // Spawn at left/top edge of viewport (upwind) so they drift across
                const spawnX = camera.x - pad + Math.random() * (vpW + pad);
                const spawnY = camera.y - pad * 0.5 + Math.random() * (vpH + pad);
                
                // Each shadow is an irregular blob defined by multiple overlapping ellipses
                const blobCount = 2 + Math.floor(Math.random() * 3); // 2-4 sub-blobs
                const blobs = [];
                const baseRadius = 80 + Math.random() * 120; // 80-200px world units
                
                for (let b = 0; b < blobCount; b++) {
                    blobs.push({
                        offsetX: (Math.random() - 0.5) * baseRadius * 0.8,
                        offsetY: (Math.random() - 0.5) * baseRadius * 0.4,
                        radiusX: baseRadius * (0.5 + Math.random() * 0.6),
                        radiusY: baseRadius * (0.3 + Math.random() * 0.4),
                        rotation: Math.random() * Math.PI,
                    });
                }
                
                this.cloudShadows.push({
                    x: spawnX,
                    y: spawnY,
                    blobs,
                    speed: 0.3 + Math.random() * 0.4,   // drift speed multiplier
                    baseScale: 0.8 + Math.random() * 0.4,
                    currentScale: 1.0,
                    scalePhase: Math.random() * Math.PI * 2,
                    pulseSpeed: 0.3 + Math.random() * 0.2,
                    alpha: 0,
                    maxAlpha: 0.08 + Math.random() * 0.06, // 0.08-0.14 opacity
                    fadeIn: 2 + Math.random() * 2,          // 2-4s fade in
                    age: 0,
                });
            }
            
            // On first initialization, spread shadows across the whole viewport immediately
            if (!this._cloudShadowsInitialized && this.cloudShadows.length > 0) {
                this._cloudShadowsInitialized = true;
                for (const s of this.cloudShadows) {
                    s.x = camera.x - pad * 0.5 + Math.random() * (vpW + pad);
                    s.y = camera.y - pad * 0.3 + Math.random() * (vpH + pad * 0.6);
                    s.age = s.fadeIn + 1; // skip fade-in
                    s.alpha = s.maxAlpha;
                }
            }
        }
        
        if (!shadowActive && this.cloudShadows.length === 0) {
            this._cloudShadowsInitialized = false;
        }
    }
    
    /**
     * Render cloud shadows on the ground (world-space).
     * Subtle dark patches that drift across terrain — the shadow cast by clouds above.
     * NOTE: Canvas context has camera transform active, so we draw in world coordinates.
     */
    renderCloudShadows() {
        if (this.cloudShadows.length === 0) return;
        
        const ctx = this.ctx;
        
        ctx.save();
        
        for (const shadow of this.cloudShadows) {
            if (shadow.alpha <= 0.01) continue;
            
            const scale = shadow.currentScale;
            
            for (const blob of shadow.blobs) {
                const worldX = shadow.x + blob.offsetX * scale;
                const worldY = shadow.y + blob.offsetY * scale;
                const rx = blob.radiusX * scale;
                const ry = blob.radiusY * scale;
                
                // Soft-edged dark ellipse — just a subtle shadow on the ground
                const maxR = Math.max(rx, ry);
                const gradient = ctx.createRadialGradient(worldX, worldY, 0, worldX, worldY, maxR);
                gradient.addColorStop(0, `rgba(0, 0, 0, ${shadow.alpha * 0.7})`);
                gradient.addColorStop(0.55, `rgba(0, 0, 0, ${shadow.alpha * 0.4})`);
                gradient.addColorStop(0.85, `rgba(0, 0, 0, ${shadow.alpha * 0.1})`);
                gradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
                
                ctx.fillStyle = gradient;
                ctx.save();
                ctx.translate(worldX, worldY);
                ctx.rotate(blob.rotation);
                ctx.scale(rx / maxR, ry / maxR);
                ctx.beginPath();
                ctx.arc(0, 0, maxR, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
        
        ctx.restore();
    }
    
    /**
     * Render sun effects (lens flare/god rays)
     */
    renderSunEffects(width, height) {
        // Only show during daytime
        if (this.game.dayNightCycle) {
            const time = this.game.dayNightCycle.time;
            if (time < 7 || time > 17) return; // Only during day (7-17)
        }
        
        // Suppress when weather channels indicate rain/fog/cloud/snow
        let weatherDim = 1.0;
        if (this.channelMode) {
            const ch = this.weatherChannels;
            const obscure = Math.max(ch.rain, ch.snow, ch.fog, ch.cloud * 0.8);
            weatherDim = Math.max(0, 1 - obscure * 2.5);
            if (weatherDim < 0.01) return;
        }
        
        const ctx = this.ctx;
        
        // Sun position (top right area)
        const sunX = width * 0.8;
        const sunY = height * 0.15;
        
        // Lens flare effect
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.15 * weatherDim;
        
        const gradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 300);
        gradient.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
        gradient.addColorStop(0.3, 'rgba(255, 240, 150, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        ctx.restore();
    }
    
    /**
     * Render rain particles
     */
    renderRain(useWebGL = false) {
        // Apply particle intensity for transitions
        const alpha = 0.8 * this.particleIntensity;
        if (alpha <= 0) return;
        
        if (useWebGL) {
            // WebGL rendering
            const color = [174/255, 194/255, 224/255, alpha];
            
            for (let particle of this.rainParticles) {
                // Wind affects horizontal displacement
                const windOffsetX = this.windStrength * 15;
                
                this.webglRenderer.drawLine(
                    particle.x, particle.y,
                    particle.x + windOffsetX, particle.y + particle.length,
                    2, // thickness
                    color
                );
            }
        } else {
            // Canvas2D fallback
            const ctx = this.ctx;
            
            ctx.save();
            ctx.strokeStyle = `rgba(174, 194, 224, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            
            for (let particle of this.rainParticles) {
                // Wind affects horizontal displacement
                const windOffsetX = this.windStrength * 15;
                
                ctx.beginPath();
                ctx.moveTo(particle.x, particle.y);
                ctx.lineTo(particle.x + windOffsetX, particle.y + particle.length);
                ctx.stroke();
            }
            
            ctx.restore();
        }
    }
    
    /**
     * Render snow particles
     */
    renderSnow(useWebGL = false) {
        // Apply particle intensity for transitions
        const alpha = 0.8 * this.particleIntensity;
        if (alpha <= 0) return;
        
        if (useWebGL) {
            // WebGL rendering
            const color = [1.0, 1.0, 1.0, alpha];
            
            for (let particle of this.snowParticles) {
                this.webglRenderer.drawCircle(
                    particle.x, particle.y,
                    particle.size,
                    color
                );
            }
        } else {
            // Canvas2D fallback
            const ctx = this.ctx;
            
            ctx.save();
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            
            for (let particle of this.snowParticles) {
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        }
    }
    
    /**
     * Render leaf particles
     */
    renderLeaves(useWebGL = false) {
        // Apply particle intensity for transitions
        const alpha = 0.8 * this.particleIntensity;
        if (alpha <= 0) return;
        
        if (useWebGL) {
            // WebGL rendering
            for (let particle of this.leafParticles) {
                // Parse RGB color string to array
                const colorMatch = particle.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                if (colorMatch) {
                    const color = [
                        parseInt(colorMatch[1]) / 255,
                        parseInt(colorMatch[2]) / 255,
                        parseInt(colorMatch[3]) / 255,
                        alpha
                    ];
                    
                    // Draw leaf ellipse
                    this.webglRenderer.drawEllipse(
                        particle.x, particle.y,
                        particle.size * 2, particle.size * 3, // width, height
                        particle.rotation,
                        color
                    );
                    
                    // Draw leaf vein (dark line through center) - rotated with leaf
                    const veinColor = [0, 0, 0, 0.2 * this.particleIntensity];
                    const cos = Math.cos(particle.rotation);
                    const sin = Math.sin(particle.rotation);
                    const veinLength = particle.size * 1.5;
                    
                    this.webglRenderer.drawLine(
                        particle.x - sin * veinLength, particle.y + cos * veinLength,
                        particle.x + sin * veinLength, particle.y - cos * veinLength,
                        0.5,
                        veinColor
                    );
                }
            }
        } else {
            // Canvas2D fallback
            const ctx = this.ctx;
            
            ctx.save();
            
            for (let particle of this.leafParticles) {
                ctx.save();
                ctx.translate(particle.x, particle.y);
                ctx.rotate(particle.rotation);
                
                // Draw leaf shape (simple ellipse)
                ctx.fillStyle = particle.color;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.ellipse(0, 0, particle.size, particle.size * 1.5, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Add leaf vein
                ctx.strokeStyle = `rgba(0, 0, 0, ${0.2 * this.particleIntensity})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(0, -particle.size * 1.5);
                ctx.lineTo(0, particle.size * 1.5);
                ctx.stroke();
                
                ctx.restore();
            }
            
            ctx.restore();
        }
    }
}
