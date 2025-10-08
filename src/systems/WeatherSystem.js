/**
 * WeatherSystem - Manages weather effects (precipitation, wind, particles)
 */
class WeatherSystem {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.ctx = game.ctx;
        
        // Current weather state
        this.precipitation = 'none'; // none, dynamic, sun, rain-light, rain-medium, rain-heavy, snow-light, snow-medium, snow-heavy
        this.wind = 'none'; // none, dynamic, light, medium, heavy
        this.particles = 'none'; // none, leaf-green, leaf-orange, leaf-red, leaf-brown, sakura
        
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
    }
    
    /**
     * Set weather from map configuration
     */
    setWeather(weatherConfig) {
        if (!weatherConfig) {
            this.precipitation = 'none';
            this.wind = 'none';
            this.particles = 'none';
            console.log('🌤️ Weather system disabled (no config)');
            this.stopWeatherSounds();
            return;
        }
        
        this.precipitation = weatherConfig.precipitation || 'none';
        this.wind = weatherConfig.wind || 'none';
        this.particles = weatherConfig.particles || 'none';
        
        console.log(`🌤️ Weather set - Precipitation: ${this.precipitation}, Wind: ${this.wind}, Particles: ${this.particles}`);
        
        // Initialize particles
        this.initializeParticles();
        
        // Start weather sounds
        this.updateWeatherSounds();
    }
    
    /**
     * Update weather sound effects based on current weather
     */
    updateWeatherSounds() {
        if (!this.game.audioManager) return;
        
        // Determine which sound to play
        // Priority: Rain/Snow > Wind
        let weatherSound = 'none';
        
        if (this.precipitation.startsWith('rain')) {
            weatherSound = this.precipitation; // rain-light, rain-medium, rain-heavy
        } else if (this.precipitation.startsWith('snow')) {
            // Snow uses wind sounds (wind with snow visual)
            if (this.wind !== 'none' && this.wind !== 'dynamic') {
                weatherSound = `wind-${this.wind}`; // wind-light, wind-medium, wind-heavy
            } else {
                weatherSound = 'wind-light'; // Default gentle wind for snow
            }
        } else if (this.wind !== 'none' && this.wind !== 'dynamic') {
            weatherSound = `wind-${this.wind}`; // wind-light, wind-medium, wind-heavy
        }
        
        this.game.audioManager.playWeatherSound(weatherSound);
    }
    
    /**
     * Stop weather sounds
     */
    stopWeatherSounds() {
        if (this.game.audioManager) {
            this.game.audioManager.stopWeatherSound();
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
            for (let i = 0; i < count; i++) {
                this.rainParticles.push(this.createRainParticle(viewport));
            }
        }
        
        // Initialize snow particles
        if (this.precipitation.startsWith('snow')) {
            const count = this.getParticleCount('snow');
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
        const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
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
            if (this.precipitation === 'rain-medium') return 350;
            if (this.precipitation === 'rain-heavy') return 500;
        }
        if (type === 'snow') {
            if (this.precipitation === 'snow-light') return 50;
            if (this.precipitation === 'snow-medium') return 100;
            if (this.precipitation === 'snow-heavy') return 150;
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
            speed: 10 + Math.random() * 5,
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
            speed: 1 + Math.random() * 2,
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
            const weatherTypes = ['clear', 'rain-light', 'rain-medium'];
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
     * Render weather effects in world space
     * Particles are now positioned in world coordinates and move with the map
     */
    render() {
        const ctx = this.ctx;
        
        // Note: Sun effects are skipped in world-space rendering as they should be screen-space
        // TODO: Render sun effects in screen space separately if needed
        
        // Render rain (world coordinates)
        if (this.precipitation.startsWith('rain') || 
            (this.precipitation === 'dynamic' && this.currentDynamicWeather.startsWith('rain'))) {
            this.renderRain();
        }
        
        // Render snow (world coordinates)
        if (this.precipitation.startsWith('snow') || 
            (this.precipitation === 'dynamic' && this.currentDynamicWeather.startsWith('snow'))) {
            this.renderSnow();
        }
        
        // Render falling particles (leaves, sakura) (world coordinates)
        if (this.particles !== 'none') {
            this.renderLeaves();
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
    renderRain() {
        const ctx = this.ctx;
        
        ctx.save();
        ctx.strokeStyle = 'rgba(174, 194, 224, 0.8)';
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
    
    /**
     * Render snow particles
     */
    renderSnow() {
        const ctx = this.ctx;
        
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        for (let particle of this.snowParticles) {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    /**
     * Render leaf particles
     */
    renderLeaves() {
        const ctx = this.ctx;
        
        ctx.save();
        
        for (let particle of this.leafParticles) {
            ctx.save();
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation);
            
            // Draw leaf shape (simple ellipse)
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.ellipse(0, 0, particle.size, particle.size * 1.5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Add leaf vein
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
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
