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
        this.maxParticles = 200;
        
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
            return;
        }
        
        this.precipitation = weatherConfig.precipitation || 'none';
        this.wind = weatherConfig.wind || 'none';
        this.particles = weatherConfig.particles || 'none';
        
        // Initialize particles
        this.initializeParticles();
    }
    
    /**
     * Initialize particle pools based on current settings
     */
    initializeParticles() {
        // Clear existing particles
        this.rainParticles = [];
        this.snowParticles = [];
        this.leafParticles = [];
        
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Initialize rain particles
        if (this.precipitation.startsWith('rain')) {
            const count = this.getParticleCount('rain');
            for (let i = 0; i < count; i++) {
                this.rainParticles.push(this.createRainParticle(canvasWidth, canvasHeight));
            }
        }
        
        // Initialize snow particles
        if (this.precipitation.startsWith('snow')) {
            const count = this.getParticleCount('snow');
            for (let i = 0; i < count; i++) {
                this.snowParticles.push(this.createSnowParticle(canvasWidth, canvasHeight));
            }
        }
        
        // Initialize leaf particles
        if (this.particles !== 'none') {
            const count = Math.min(50, this.maxParticles);
            for (let i = 0; i < count; i++) {
                this.leafParticles.push(this.createLeafParticle(canvasWidth, canvasHeight));
            }
        }
    }
    
    /**
     * Get particle count based on intensity
     */
    getParticleCount(type) {
        if (type === 'rain') {
            if (this.precipitation === 'rain-light') return 100;
            if (this.precipitation === 'rain-medium') return 150;
            if (this.precipitation === 'rain-heavy') return 200;
        }
        if (type === 'snow') {
            if (this.precipitation === 'snow-light') return 50;
            if (this.precipitation === 'snow-medium') return 100;
            if (this.precipitation === 'snow-heavy') return 150;
        }
        return 0;
    }
    
    /**
     * Create a rain particle
     */
    createRainParticle(canvasWidth, canvasHeight) {
        return {
            x: Math.random() * canvasWidth,
            y: Math.random() * canvasHeight,
            speed: 10 + Math.random() * 5,
            length: 10 + Math.random() * 10
        };
    }
    
    /**
     * Create a snow particle
     */
    createSnowParticle(canvasWidth, canvasHeight) {
        return {
            x: Math.random() * canvasWidth,
            y: Math.random() * canvasHeight,
            speed: 1 + Math.random() * 2,
            size: 2 + Math.random() * 3,
            sway: Math.random() * Math.PI * 2,
            swaySpeed: 0.02 + Math.random() * 0.03
        };
    }
    
    /**
     * Create a leaf particle
     */
    createLeafParticle(canvasWidth, canvasHeight) {
        return {
            x: Math.random() * canvasWidth,
            y: Math.random() * -canvasHeight, // Start above screen
            speed: 0.5 + Math.random() * 1,
            size: 4 + Math.random() * 4,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.05,
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
            const weatherTypes = ['sun', 'rain-light', 'rain-medium'];
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
     * Update rain particles
     */
    updateRainParticles(deltaTime) {
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        for (let particle of this.rainParticles) {
            // Apply wind
            const windForce = Math.cos(this.windAngle) * this.windStrength * 5;
            
            particle.y += particle.speed * deltaTime * 60;
            particle.x += windForce * deltaTime * 60;
            
            // Reset if off screen
            if (particle.y > canvasHeight) {
                particle.y = -particle.length;
                particle.x = Math.random() * canvasWidth;
            }
            if (particle.x < -50) particle.x = canvasWidth + 50;
            if (particle.x > canvasWidth + 50) particle.x = -50;
        }
    }
    
    /**
     * Update snow particles
     */
    updateSnowParticles(deltaTime) {
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        for (let particle of this.snowParticles) {
            // Update sway
            particle.sway += particle.swaySpeed;
            
            // Apply wind and sway
            const windForce = Math.cos(this.windAngle) * this.windStrength * 3;
            const swayOffset = Math.sin(particle.sway) * 2;
            
            particle.y += particle.speed * deltaTime * 60;
            particle.x += (windForce + swayOffset) * deltaTime * 60;
            
            // Reset if off screen
            if (particle.y > canvasHeight) {
                particle.y = -10;
                particle.x = Math.random() * canvasWidth;
            }
            if (particle.x < -50) particle.x = canvasWidth + 50;
            if (particle.x > canvasWidth + 50) particle.x = -50;
        }
    }
    
    /**
     * Update leaf particles
     */
    updateLeafParticles(deltaTime) {
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        for (let particle of this.leafParticles) {
            // Update rotation and sway
            particle.rotation += particle.rotationSpeed;
            particle.sway += particle.swaySpeed;
            
            // Apply wind and sway
            const windForce = Math.cos(this.windAngle) * this.windStrength * 4;
            const swayOffset = Math.sin(particle.sway) * 3;
            
            particle.y += particle.speed * deltaTime * 60;
            particle.x += (windForce + swayOffset) * deltaTime * 60;
            
            // Reset if off screen
            if (particle.y > canvasHeight + 20) {
                particle.y = -20;
                particle.x = Math.random() * canvasWidth;
                particle.rotation = Math.random() * Math.PI * 2;
            }
            if (particle.x < -50) particle.x = canvasWidth + 50;
            if (particle.x > canvasWidth + 50) particle.x = -50;
        }
    }
    
    /**
     * Render weather effects
     */
    render() {
        const ctx = this.ctx;
        
        // Render sun effects (lens flare/god rays)
        if (this.precipitation === 'sun' || 
            (this.precipitation === 'dynamic' && this.currentDynamicWeather === 'sun')) {
            this.renderSunEffects();
        }
        
        // Render rain
        if (this.precipitation.startsWith('rain') || 
            (this.precipitation === 'dynamic' && this.currentDynamicWeather.startsWith('rain'))) {
            this.renderRain();
        }
        
        // Render snow
        if (this.precipitation.startsWith('snow') || 
            (this.precipitation === 'dynamic' && this.currentDynamicWeather.startsWith('snow'))) {
            this.renderSnow();
        }
        
        // Render falling particles (leaves, sakura)
        if (this.particles !== 'none') {
            this.renderLeaves();
        }
    }
    
    /**
     * Render sun effects (lens flare/god rays)
     */
    renderSunEffects() {
        // Only show during daytime
        if (this.game.dayNightCycle) {
            const time = this.game.dayNightCycle.time;
            if (time < 7 || time > 17) return; // Only during day (7-17)
        }
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
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
        ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        
        for (let particle of this.rainParticles) {
            const windForce = Math.cos(this.windAngle) * this.windStrength * 5;
            
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(particle.x + windForce, particle.y + particle.length);
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
