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
 */
class WeatherSystem {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.ctx = game.ctx;
        this.webglRenderer = null; // Will be set when available
        
        // Current weather state
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
        
        const ctx = this.ctx;
        
        // Sun position (top right area)
        const sunX = width * 0.8;
        const sunY = height * 0.15;
        
        // Lens flare effect
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.15;
        
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
