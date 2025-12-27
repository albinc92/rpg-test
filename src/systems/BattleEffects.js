/**
 * BattleEffects.js
 * A library of reusable visual effects for battle abilities
 * Effects can be scaled by intensity and customized per-ability
 */

class BattleEffects {
    constructor() {
        // Effect library - each effect is a function that generates particles
        this.effects = {
            // === HEALING EFFECTS ===
            'heal_sparkle': (pos, options = {}) => {
                const intensity = options.intensity || 1.0;
                const count = Math.floor(12 * intensity);
                const spread = 60 * intensity;
                const particles = [];
                
                for (let i = 0; i < count; i++) {
                    particles.push({
                        x: pos.x + (Math.random() - 0.5) * spread,
                        y: pos.y + (Math.random() - 0.5) * spread * 0.8,
                        vx: (Math.random() - 0.5) * 30,
                        vy: -50 - Math.random() * 60 * intensity,
                        gravity: -15,
                        size: (3 + Math.random() * 4) * Math.sqrt(intensity),
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: 0.5,
                        baseAlpha: 0.8 + Math.random() * 0.2,
                        alpha: 1,
                        rotation: Math.random() * Math.PI * 2,
                        rotationSpeed: (Math.random() - 0.5) * 4,
                        color: options.color || `hsl(${120 + Math.random() * 40}, 80%, ${50 + Math.random() * 30}%)`
                    });
                }
                return { particles, duration: 0.8 + 0.2 * intensity };
            },
            
            'heal_ring': (pos, options = {}) => {
                const intensity = options.intensity || 1.0;
                const particles = [];
                const ringCount = Math.floor(16 * intensity);
                
                // Expanding ring of particles
                for (let i = 0; i < ringCount; i++) {
                    const angle = (i / ringCount) * Math.PI * 2;
                    const speed = 80 * intensity;
                    particles.push({
                        x: pos.x,
                        y: pos.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed * 0.5, // Elliptical
                        gravity: 0,
                        size: (4 + Math.random() * 3) * Math.sqrt(intensity),
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: 0.8,
                        baseAlpha: 0.9,
                        alpha: 1,
                        rotation: angle,
                        rotationSpeed: 2,
                        color: options.color || `hsl(${115 + Math.random() * 30}, 85%, ${55 + Math.random() * 25}%)`
                    });
                }
                
                // Center glow particles
                for (let i = 0; i < 8 * intensity; i++) {
                    particles.push({
                        x: pos.x + (Math.random() - 0.5) * 20,
                        y: pos.y + (Math.random() - 0.5) * 20,
                        vx: 0,
                        vy: -30 - Math.random() * 40,
                        gravity: -10,
                        size: (5 + Math.random() * 5) * intensity,
                        baseScale: 1.5,
                        scale: 1.5,
                        scaleGrowth: -0.5,
                        baseAlpha: 0.7,
                        alpha: 1,
                        rotation: 0,
                        rotationSpeed: 0,
                        color: 'rgba(200, 255, 200, 1)',
                        isGlow: true
                    });
                }
                
                return { particles, duration: 1.0 + 0.3 * intensity };
            },
            
            // === WIND EFFECTS ===
            'wind_slash': (pos, options = {}) => {
                const intensity = options.intensity || 1.0;
                const particles = [];
                const lineCount = Math.floor(8 * intensity);
                
                // Swooshing wind lines
                for (let i = 0; i < lineCount; i++) {
                    const angle = (Math.random() - 0.5) * 0.6;
                    const speed = (180 + Math.random() * 120) * intensity;
                    particles.push({
                        x: pos.x - 80 - Math.random() * 40,
                        y: pos.y + (Math.random() - 0.5) * 80,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        gravity: 0,
                        length: (25 + Math.random() * 40) * intensity,
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: -0.3,
                        baseAlpha: 0.5 + Math.random() * 0.4,
                        alpha: 1,
                        rotation: angle,
                        rotationSpeed: 0,
                        color: options.color || `hsla(${175 + Math.random() * 30}, 60%, ${70 + Math.random() * 20}%, 1)`,
                        isLine: true
                    });
                }
                
                // Swirl particles
                for (let i = 0; i < 6 * intensity; i++) {
                    particles.push({
                        x: pos.x + (Math.random() - 0.5) * 50,
                        y: pos.y + (Math.random() - 0.5) * 60,
                        vx: 80 + Math.random() * 80,
                        vy: (Math.random() - 0.5) * 50,
                        gravity: 0,
                        size: (2 + Math.random() * 3) * Math.sqrt(intensity),
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: 0.3,
                        baseAlpha: 0.6,
                        alpha: 1,
                        rotation: Math.random() * Math.PI * 2,
                        rotationSpeed: 8 + Math.random() * 6,
                        color: 'rgba(200, 255, 255, 1)'
                    });
                }
                
                return { particles, duration: 0.6 + 0.2 * intensity };
            },
            
            'wind_tornado': (pos, options = {}) => {
                const intensity = options.intensity || 1.0;
                const particles = [];
                
                // Spiral particles
                for (let i = 0; i < 30 * intensity; i++) {
                    const height = Math.random();
                    const angle = height * Math.PI * 4 + Math.random() * 0.5;
                    const radius = (20 + height * 40) * intensity;
                    particles.push({
                        x: pos.x + Math.cos(angle) * radius,
                        y: pos.y + 40 - height * 100 * intensity,
                        vx: Math.cos(angle + Math.PI/2) * 100,
                        vy: -60 - Math.random() * 40,
                        gravity: -20,
                        size: (2 + Math.random() * 3) * Math.sqrt(intensity),
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: 0.2,
                        baseAlpha: 0.4 + height * 0.4,
                        alpha: 1,
                        rotation: angle,
                        rotationSpeed: 10,
                        color: `hsla(${180 + Math.random() * 30}, 50%, ${75 + Math.random() * 20}%, 1)`
                    });
                }
                
                return { particles, duration: 1.0 + 0.3 * intensity };
            },
            
            // === FIRE EFFECTS ===
            'fire_burst': (pos, options = {}) => {
                const intensity = options.intensity || 1.0;
                const particles = [];
                const count = Math.floor(20 * intensity);
                
                for (let i = 0; i < count; i++) {
                    particles.push({
                        x: pos.x + (Math.random() - 0.5) * 50 * intensity,
                        y: pos.y + (Math.random() - 0.5) * 30,
                        vx: (Math.random() - 0.5) * 60,
                        vy: -70 - Math.random() * 90 * intensity,
                        gravity: -25,
                        size: (5 + Math.random() * 8) * Math.sqrt(intensity),
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: -0.4,
                        baseAlpha: 0.9,
                        alpha: 1,
                        rotation: Math.random() * Math.PI * 2,
                        rotationSpeed: (Math.random() - 0.5) * 6,
                        color: options.color || `hsl(${15 + Math.random() * 30}, 100%, ${50 + Math.random() * 30}%)`
                    });
                }
                
                // Ember particles
                for (let i = 0; i < 10 * intensity; i++) {
                    particles.push({
                        x: pos.x + (Math.random() - 0.5) * 40,
                        y: pos.y,
                        vx: (Math.random() - 0.5) * 80,
                        vy: -100 - Math.random() * 60,
                        gravity: 50,
                        size: 2 + Math.random() * 2,
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: 0,
                        baseAlpha: 1,
                        alpha: 1,
                        rotation: 0,
                        rotationSpeed: 0,
                        color: `hsl(${40 + Math.random() * 20}, 100%, ${60 + Math.random() * 30}%)`,
                        isEmber: true
                    });
                }
                
                return { particles, duration: 0.9 + 0.3 * intensity };
            },
            
            'fire_pillar': (pos, options = {}) => {
                const intensity = options.intensity || 1.0;
                const particles = [];
                
                // Rising flame column
                for (let i = 0; i < 40 * intensity; i++) {
                    const delay = Math.random() * 0.3;
                    particles.push({
                        x: pos.x + (Math.random() - 0.5) * 30,
                        y: pos.y + 30,
                        vx: (Math.random() - 0.5) * 20,
                        vy: -150 - Math.random() * 100 * intensity,
                        gravity: -50,
                        size: (6 + Math.random() * 10) * Math.sqrt(intensity),
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: -0.3,
                        baseAlpha: 0.85,
                        alpha: 1,
                        rotation: Math.random() * Math.PI * 2,
                        rotationSpeed: (Math.random() - 0.5) * 4,
                        color: `hsl(${10 + Math.random() * 35}, 100%, ${45 + Math.random() * 35}%)`,
                        delay: delay
                    });
                }
                
                return { particles, duration: 1.2 + 0.4 * intensity };
            },
            
            // === WATER EFFECTS ===
            'water_splash': (pos, options = {}) => {
                const intensity = options.intensity || 1.0;
                const particles = [];
                const count = Math.floor(18 * intensity);
                
                for (let i = 0; i < count; i++) {
                    const angle = -Math.PI/2 + (Math.random() - 0.5) * Math.PI * 0.8;
                    const speed = (60 + Math.random() * 80) * intensity;
                    particles.push({
                        x: pos.x,
                        y: pos.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        gravity: 180,
                        size: (3 + Math.random() * 5) * Math.sqrt(intensity),
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: 0,
                        baseAlpha: 0.8,
                        alpha: 1,
                        rotation: 0,
                        rotationSpeed: 0,
                        color: options.color || `hsl(${195 + Math.random() * 25}, 80%, ${50 + Math.random() * 30}%)`,
                        isDroplet: true
                    });
                }
                
                return { particles, duration: 0.9 + 0.2 * intensity };
            },
            
            'water_wave': (pos, options = {}) => {
                const intensity = options.intensity || 1.0;
                const particles = [];
                
                // Wave crest particles
                for (let i = 0; i < 25 * intensity; i++) {
                    const xOffset = (Math.random() - 0.5) * 120 * intensity;
                    particles.push({
                        x: pos.x + xOffset - 60,
                        y: pos.y + Math.abs(xOffset) * 0.2,
                        vx: 120 + Math.random() * 60,
                        vy: -20 + (Math.random() - 0.5) * 40,
                        gravity: 60,
                        size: (4 + Math.random() * 6) * Math.sqrt(intensity),
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: 0.2,
                        baseAlpha: 0.7,
                        alpha: 1,
                        rotation: Math.random() * Math.PI * 2,
                        rotationSpeed: 3,
                        color: `hsla(${200 + Math.random() * 20}, 75%, ${55 + Math.random() * 25}%, 1)`
                    });
                }
                
                return { particles, duration: 0.8 + 0.3 * intensity };
            },
            
            // === EARTH EFFECTS ===
            'earth_rocks': (pos, options = {}) => {
                const intensity = options.intensity || 1.0;
                const particles = [];
                const count = Math.floor(12 * intensity);
                
                for (let i = 0; i < count; i++) {
                    const angle = -Math.PI/2 + (Math.random() - 0.5) * 1.2;
                    const speed = (80 + Math.random() * 100) * intensity;
                    particles.push({
                        x: pos.x + (Math.random() - 0.5) * 40,
                        y: pos.y + 20,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        gravity: 280,
                        size: (5 + Math.random() * 10) * Math.sqrt(intensity),
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: 0,
                        baseAlpha: 0.9,
                        alpha: 1,
                        rotation: Math.random() * Math.PI * 2,
                        rotationSpeed: (Math.random() - 0.5) * 10,
                        color: options.color || `hsl(${25 + Math.random() * 25}, ${25 + Math.random() * 25}%, ${28 + Math.random() * 28}%)`,
                        isRock: true
                    });
                }
                
                // Dust particles
                for (let i = 0; i < 15 * intensity; i++) {
                    particles.push({
                        x: pos.x + (Math.random() - 0.5) * 60,
                        y: pos.y + 10 + Math.random() * 20,
                        vx: (Math.random() - 0.5) * 40,
                        vy: -20 - Math.random() * 30,
                        gravity: 10,
                        size: (3 + Math.random() * 4) * Math.sqrt(intensity),
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: 1.5,
                        baseAlpha: 0.4,
                        alpha: 1,
                        rotation: Math.random() * Math.PI * 2,
                        rotationSpeed: 1,
                        color: 'rgba(139, 119, 101, 1)',
                        isDust: true
                    });
                }
                
                return { particles, duration: 0.8 + 0.2 * intensity };
            },
            
            'earth_quake': (pos, options = {}) => {
                const intensity = options.intensity || 1.0;
                const particles = [];
                
                // Multiple rock eruptions
                for (let burst = 0; burst < 3; burst++) {
                    const burstX = pos.x + (burst - 1) * 50 * intensity;
                    for (let i = 0; i < 8 * intensity; i++) {
                        const angle = -Math.PI/2 + (Math.random() - 0.5) * 0.8;
                        const speed = (100 + Math.random() * 80) * intensity;
                        particles.push({
                            x: burstX + (Math.random() - 0.5) * 20,
                            y: pos.y + 30,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            gravity: 350,
                            size: (6 + Math.random() * 12) * Math.sqrt(intensity),
                            baseScale: 1,
                            scale: 1,
                            scaleGrowth: 0,
                            baseAlpha: 0.9,
                            alpha: 1,
                            rotation: Math.random() * Math.PI * 2,
                            rotationSpeed: (Math.random() - 0.5) * 12,
                            color: `hsl(${20 + Math.random() * 30}, ${20 + Math.random() * 30}%, ${25 + Math.random() * 30}%)`,
                            isRock: true,
                            delay: burst * 0.1
                        });
                    }
                }
                
                return { particles, duration: 1.0 + 0.4 * intensity };
            },
            
            // === DARK/CURSE EFFECTS ===
            'dark_miasma': (pos, options = {}) => {
                const intensity = options.intensity || 1.0;
                const particles = [];
                const count = Math.floor(20 * intensity);
                
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = Math.random() * 50 * intensity;
                    particles.push({
                        x: pos.x + Math.cos(angle) * radius,
                        y: pos.y + Math.sin(angle) * radius * 0.6,
                        vx: (Math.random() - 0.5) * 30,
                        vy: -15 - Math.random() * 25,
                        gravity: -5,
                        size: (6 + Math.random() * 10) * Math.sqrt(intensity),
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: 1.0,
                        baseAlpha: 0.6,
                        alpha: 1,
                        rotation: Math.random() * Math.PI * 2,
                        rotationSpeed: (Math.random() - 0.5) * 2,
                        color: options.color || `hsla(${270 + Math.random() * 40}, 60%, ${20 + Math.random() * 20}%, 1)`,
                        isDark: true
                    });
                }
                
                return { particles, duration: 1.2 + 0.3 * intensity };
            },
            
            'dark_chains': (pos, options = {}) => {
                const intensity = options.intensity || 1.0;
                const particles = [];
                
                // Chain link particles spiraling inward
                for (let i = 0; i < 24 * intensity; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    const radius = 80 * intensity;
                    particles.push({
                        x: pos.x + Math.cos(angle) * radius,
                        y: pos.y + Math.sin(angle) * radius * 0.5,
                        vx: -Math.cos(angle) * 60,
                        vy: -Math.sin(angle) * 30,
                        gravity: 0,
                        size: (4 + Math.random() * 3) * Math.sqrt(intensity),
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: -0.3,
                        baseAlpha: 0.8,
                        alpha: 1,
                        rotation: angle,
                        rotationSpeed: 0,
                        color: `hsla(${280 + Math.random() * 20}, 50%, ${30 + Math.random() * 20}%, 1)`,
                        isChain: true
                    });
                }
                
                return { particles, duration: 0.8 + 0.2 * intensity };
            },
            
            // === LIGHT/HOLY EFFECTS ===
            'light_rays': (pos, options = {}) => {
                const intensity = options.intensity || 1.0;
                const particles = [];
                
                // Descending light beams
                for (let i = 0; i < 8 * intensity; i++) {
                    const xOffset = (Math.random() - 0.5) * 80 * intensity;
                    particles.push({
                        x: pos.x + xOffset,
                        y: pos.y - 150,
                        vx: 0,
                        vy: 200,
                        gravity: 0,
                        length: 80 + Math.random() * 60,
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: 0.5,
                        baseAlpha: 0.6 + Math.random() * 0.3,
                        alpha: 1,
                        rotation: Math.PI / 2,
                        rotationSpeed: 0,
                        color: options.color || `hsla(${45 + Math.random() * 20}, 100%, ${80 + Math.random() * 15}%, 1)`,
                        isLine: true,
                        delay: i * 0.05
                    });
                }
                
                // Sparkle burst at impact
                for (let i = 0; i < 15 * intensity; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 40 + Math.random() * 60;
                    particles.push({
                        x: pos.x,
                        y: pos.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        gravity: 0,
                        size: (3 + Math.random() * 4) * Math.sqrt(intensity),
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: 0.8,
                        baseAlpha: 0.9,
                        alpha: 1,
                        rotation: Math.random() * Math.PI * 2,
                        rotationSpeed: 5,
                        color: `hsla(${50 + Math.random() * 20}, 100%, ${85 + Math.random() * 10}%, 1)`,
                        delay: 0.2
                    });
                }
                
                return { particles, duration: 1.0 + 0.3 * intensity };
            },
            
            // === ELECTRIC/LIGHTNING EFFECTS ===
            'electric_spark': (pos, options = {}) => {
                const intensity = options.intensity || 1.0;
                const particles = [];
                
                // Lightning bolts (zig-zag lines)
                for (let i = 0; i < 6 * intensity; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 150 + Math.random() * 100;
                    particles.push({
                        x: pos.x,
                        y: pos.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        gravity: 0,
                        length: (20 + Math.random() * 30) * intensity,
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: -0.5,
                        baseAlpha: 0.9,
                        alpha: 1,
                        rotation: angle,
                        rotationSpeed: (Math.random() - 0.5) * 20,
                        color: options.color || `hsla(${55 + Math.random() * 10}, 100%, ${70 + Math.random() * 25}%, 1)`,
                        isLine: true,
                        isLightning: true
                    });
                }
                
                // Spark particles
                for (let i = 0; i < 20 * intensity; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 80 + Math.random() * 120;
                    particles.push({
                        x: pos.x + (Math.random() - 0.5) * 30,
                        y: pos.y + (Math.random() - 0.5) * 30,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        gravity: 100,
                        size: 2 + Math.random() * 2,
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: 0,
                        baseAlpha: 1,
                        alpha: 1,
                        rotation: 0,
                        rotationSpeed: 0,
                        color: `hsl(${55 + Math.random() * 15}, 100%, ${75 + Math.random() * 20}%)`,
                        isEmber: true
                    });
                }
                
                return { particles, duration: 0.5 + 0.2 * intensity };
            },
            
            // === BUFF/STAT EFFECTS ===
            'buff_up': (pos, options = {}) => {
                const intensity = options.intensity || 1.0;
                const particles = [];
                const color = options.color || 'hsla(45, 100%, 60%, 1)'; // Default gold
                
                // Rising arrows/chevrons
                for (let i = 0; i < 8 * intensity; i++) {
                    particles.push({
                        x: pos.x + (Math.random() - 0.5) * 40,
                        y: pos.y + 30,
                        vx: 0,
                        vy: -80 - Math.random() * 40,
                        gravity: 0,
                        size: (8 + Math.random() * 6) * Math.sqrt(intensity),
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: 0.3,
                        baseAlpha: 0.8,
                        alpha: 1,
                        rotation: 0,
                        rotationSpeed: 0,
                        color: color,
                        isArrow: true,
                        delay: i * 0.08
                    });
                }
                
                return { particles, duration: 1.0 };
            },
            
            'debuff_down': (pos, options = {}) => {
                const intensity = options.intensity || 1.0;
                const particles = [];
                const color = options.color || 'hsla(0, 70%, 50%, 1)'; // Default red
                
                // Falling arrows
                for (let i = 0; i < 8 * intensity; i++) {
                    particles.push({
                        x: pos.x + (Math.random() - 0.5) * 40,
                        y: pos.y - 50,
                        vx: 0,
                        vy: 60 + Math.random() * 40,
                        gravity: 50,
                        size: (8 + Math.random() * 6) * Math.sqrt(intensity),
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: -0.2,
                        baseAlpha: 0.8,
                        alpha: 1,
                        rotation: Math.PI, // Point down
                        rotationSpeed: 0,
                        color: color,
                        isArrow: true,
                        delay: i * 0.08
                    });
                }
                
                return { particles, duration: 1.0 };
            },
            
            // === GENERIC/UTILITY EFFECTS ===  
            'magic_burst': (pos, options = {}) => {
                const intensity = options.intensity || 1.0;
                const particles = [];
                const color = options.color || 'hsla(280, 80%, 60%, 1)';
                
                for (let i = 0; i < 15 * intensity; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = (50 + Math.random() * 70) * intensity;
                    particles.push({
                        x: pos.x,
                        y: pos.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        gravity: 0,
                        size: (4 + Math.random() * 5) * Math.sqrt(intensity),
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: 0.6,
                        baseAlpha: 0.8,
                        alpha: 1,
                        rotation: Math.random() * Math.PI * 2,
                        rotationSpeed: (Math.random() - 0.5) * 5,
                        color: color
                    });
                }
                
                return { particles, duration: 0.8 + 0.2 * intensity };
            },
            
            'impact_hit': (pos, options = {}) => {
                const intensity = options.intensity || 1.0;
                const particles = [];
                
                // Impact lines radiating out
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    particles.push({
                        x: pos.x,
                        y: pos.y,
                        vx: Math.cos(angle) * 200,
                        vy: Math.sin(angle) * 200,
                        gravity: 0,
                        length: 15 + Math.random() * 20,
                        baseScale: 1,
                        scale: 1,
                        scaleGrowth: -0.8,
                        baseAlpha: 0.9,
                        alpha: 1,
                        rotation: angle,
                        rotationSpeed: 0,
                        color: options.color || 'rgba(255, 255, 255, 1)',
                        isLine: true
                    });
                }
                
                return { particles, duration: 0.3 };
            }
        };
    }
    
    /**
     * Get an effect by name with options
     * @param {string} effectName - Name of the effect from the library
     * @param {Object} pos - Position {x, y}
     * @param {Object} options - Options including intensity, color, etc.
     */
    createEffect(effectName, pos, options = {}) {
        const effectFn = this.effects[effectName];
        if (!effectFn) {
            console.warn(`[BattleEffects] Unknown effect: ${effectName}`);
            return null;
        }
        
        const result = effectFn(pos, options);
        return {
            type: effectName,
            x: pos.x,
            y: pos.y,
            timer: 0,
            duration: result.duration,
            particles: result.particles
        };
    }
    
    /**
     * Get list of all available effects
     */
    getAvailableEffects() {
        return Object.keys(this.effects);
    }
}

// Singleton instance
const battleEffects = new BattleEffects();

// Export
window.BattleEffects = BattleEffects;
window.battleEffects = battleEffects;
