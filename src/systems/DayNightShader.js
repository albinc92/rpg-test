/**
 * DayNightShader - WebGL shader for realistic day/night lighting
 * Uses color desaturation, brightness adjustment, and color temperature shifts
 * to simulate natural lighting conditions throughout the day
 */
class DayNightShader {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = null;
        this.program = null;
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this.texture = null;
        this.initialized = false;
        
        // Shader uniforms
        this.uniforms = {
            brightness: 1.0,
            saturation: 1.0,
            temperature: 0.0, // -1 (cool/blue) to +1 (warm/orange)
            tint: [0, 0, 0, 0] // RGBA tint overlay
        };
        
        this.initWebGL();
    }
    
    /**
     * Initialize WebGL context and shaders
     */
    initWebGL() {
        try {
            // IMPORTANT: Canvas can only have ONE context type (2D OR WebGL, not both)
            // Since the main canvas is already 2D, we create a separate WebGL canvas
            
            // Create offscreen canvas for capturing 2D rendered content
            this.offscreenCanvas = document.createElement('canvas');
            this.offscreenCanvas.width = this.canvas.width;
            this.offscreenCanvas.height = this.canvas.height;
            this.offscreenCtx = this.offscreenCanvas.getContext('2d');
            
            // Create separate WebGL canvas for shader processing
            this.webglCanvas = document.createElement('canvas');
            this.webglCanvas.width = this.canvas.width;
            this.webglCanvas.height = this.canvas.height;
            
            // Get WebGL context from separate canvas (try WebGL2 first, fallback to WebGL1)
            this.gl = this.webglCanvas.getContext('webgl2', { premultipliedAlpha: false }) || 
                     this.webglCanvas.getContext('webgl', { premultipliedAlpha: false });
            
            if (!this.gl) {
                console.warn('WebGL not supported, falling back to 2D overlay');
                return;
            }
            
            // Vertex shader (simple pass-through for full-screen quad)
            const vertexShaderSource = `
                attribute vec2 a_position;
                attribute vec2 a_texCoord;
                varying vec2 v_texCoord;
                
                void main() {
                    gl_Position = vec4(a_position, 0.0, 1.0);
                    v_texCoord = a_texCoord;
                }
            `;
            
            // Fragment shader (applies lighting effects)
            const fragmentShaderSource = `
                precision mediump float;
                
                uniform sampler2D u_texture;
                uniform float u_brightness;
                uniform float u_saturation;
                uniform float u_temperature;
                uniform vec4 u_tint;
                
                varying vec2 v_texCoord;
                
                // Convert RGB to HSL
                vec3 rgb2hsl(vec3 color) {
                    float maxVal = max(max(color.r, color.g), color.b);
                    float minVal = min(min(color.r, color.g), color.b);
                    float delta = maxVal - minVal;
                    
                    float h = 0.0;
                    float s = 0.0;
                    float l = (maxVal + minVal) / 2.0;
                    
                    if (delta > 0.0001) {
                        s = l < 0.5 ? delta / (maxVal + minVal) : delta / (2.0 - maxVal - minVal);
                        
                        if (maxVal == color.r) {
                            h = (color.g - color.b) / delta + (color.g < color.b ? 6.0 : 0.0);
                        } else if (maxVal == color.g) {
                            h = (color.b - color.r) / delta + 2.0;
                        } else {
                            h = (color.r - color.g) / delta + 4.0;
                        }
                        h /= 6.0;
                    }
                    
                    return vec3(h, s, l);
                }
                
                // Convert HSL back to RGB
                float hue2rgb(float p, float q, float t) {
                    if (t < 0.0) t += 1.0;
                    if (t > 1.0) t -= 1.0;
                    if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
                    if (t < 1.0/2.0) return q;
                    if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
                    return p;
                }
                
                vec3 hsl2rgb(vec3 hsl) {
                    float h = hsl.x;
                    float s = hsl.y;
                    float l = hsl.z;
                    
                    if (s == 0.0) {
                        return vec3(l, l, l);
                    }
                    
                    float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
                    float p = 2.0 * l - q;
                    
                    float r = hue2rgb(p, q, h + 1.0/3.0);
                    float g = hue2rgb(p, q, h);
                    float b = hue2rgb(p, q, h - 1.0/3.0);
                    
                    return vec3(r, g, b);
                }
                
                void main() {
                    vec4 texColor = texture2D(u_texture, v_texCoord);
                    
                    // Skip processing for fully transparent pixels
                    if (texColor.a < 0.001) {
                        gl_FragColor = texColor;
                        return;
                    }
                    
                    vec3 color = texColor.rgb;
                    
                    // 1. Apply brightness adjustment
                    color *= u_brightness;
                    
                    // 2. Apply saturation adjustment
                    vec3 hsl = rgb2hsl(color);
                    hsl.y *= u_saturation;
                    color = hsl2rgb(hsl);
                    
                    // 3. Apply color temperature shift
                    // Positive temperature = warmer (more red/orange)
                    // Negative temperature = cooler (more blue)
                    if (u_temperature > 0.0) {
                        // Warm shift (dawn/dusk)
                        color.r = mix(color.r, 1.0, u_temperature * 0.15);
                        color.g = mix(color.g, color.g * 0.95, u_temperature * 0.1);
                        color.b = mix(color.b, color.b * 0.8, u_temperature * 0.2);
                    } else if (u_temperature < 0.0) {
                        // Cool shift (moonlight)
                        float coolness = abs(u_temperature);
                        color.r = mix(color.r, color.r * 0.8, coolness * 0.15);
                        color.g = mix(color.g, color.g * 0.9, coolness * 0.1);
                        color.b = mix(color.b, 1.0, coolness * 0.2);
                    }
                    
                    // 4. Apply tint overlay (for special effects)
                    if (u_tint.a > 0.0) {
                        color = mix(color, u_tint.rgb, u_tint.a);
                    }
                    
                    // Clamp to valid range
                    color = clamp(color, 0.0, 1.0);
                    
                    gl_FragColor = vec4(color, texColor.a);
                }
            `;
            
            // Compile shaders
            const vertexShader = this.compileShader(vertexShaderSource, this.gl.VERTEX_SHADER);
            const fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);
            
            if (!vertexShader || !fragmentShader) {
                console.warn('Failed to compile shaders, falling back to 2D overlay');
                return;
            }
            
            // Create program
            this.program = this.gl.createProgram();
            this.gl.attachShader(this.program, vertexShader);
            this.gl.attachShader(this.program, fragmentShader);
            this.gl.linkProgram(this.program);
            
            if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
                console.error('Failed to link shader program:', this.gl.getProgramInfoLog(this.program));
                return;
            }
            
            // Set up geometry (full-screen quad)
            this.setupGeometry();
            
            // Create texture for holding the 2D canvas content
            this.texture = this.gl.createTexture();
            
            this.initialized = true;
            console.log('✅ Day/Night shader initialized successfully');
            
        } catch (error) {
            console.warn('WebGL initialization failed, falling back to 2D overlay:', error);
            this.initialized = false;
        }
    }
    
    /**
     * Compile a shader
     */
    compileShader(source, type) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    /**
     * Set up full-screen quad geometry
     */
    setupGeometry() {
        // Full-screen quad vertices (clip space: -1 to 1)
        const positions = new Float32Array([
            -1, -1,  // Bottom-left
             1, -1,  // Bottom-right
            -1,  1,  // Top-left
             1,  1   // Top-right
        ]);
        
        // Texture coordinates (flipped Y for WebGL)
        const texCoords = new Float32Array([
            0, 1,  // Bottom-left
            1, 1,  // Bottom-right
            0, 0,  // Top-left
            1, 0   // Top-right
        ]);
        
        // Position buffer
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        
        const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
        
        // Texture coordinate buffer
        const texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
        
        const texCoordLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');
        this.gl.enableVertexAttribArray(texCoordLocation);
        this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);
    }
    
    /**
     * Update shader uniforms based on time of day
     */
    updateFromTimeOfDay(timeOfDay) {
        // Night (20-24 and 0-5): Complete darkness - stays constant from 8 PM to 5 AM
        if ((timeOfDay >= 20 && timeOfDay < 24) || (timeOfDay >= 0 && timeOfDay < 5)) {
            // Darkest settings - no gradual changes during night
            this.uniforms.brightness = 0.30;
            this.uniforms.saturation = 0.4;
            this.uniforms.temperature = -0.6; // Cool moonlight
        }
        // Dawn (5-7): Gradual brightening, warm orange/pink glow
        else if (timeOfDay >= 5 && timeOfDay < 7) {
            const t = (timeOfDay - 5) / 2;
            this.uniforms.brightness = 0.30 + (t * 0.55); // 0.30 → 0.85
            this.uniforms.saturation = 0.4 + (t * 0.5); // 0.4 → 0.9
            this.uniforms.temperature = -0.6 + (t * 1.4); // -0.6 → 0.8
        }
        // Day (7-17): Full brightness, normal saturation
        else if (timeOfDay >= 7 && timeOfDay < 17) {
            const t = (timeOfDay - 7) / 10;
            // Peak at noon (12:00)
            const noonFactor = 1.0 - Math.abs((timeOfDay - 12) / 5) * 0.15;
            this.uniforms.brightness = 0.95 + (noonFactor * 0.05);
            this.uniforms.saturation = 1.0;
            this.uniforms.temperature = 0.1; // Slight warm tint
        }
        // Dusk (17-20): Golden hour transitioning to complete darkness by 8 PM
        else if (timeOfDay >= 17 && timeOfDay < 20) {
            const t = (timeOfDay - 17) / 3; // 0 (5 PM) to 1 (8 PM)
            // Smooth transition to complete darkness by 8 PM (when shadows disappear)
            this.uniforms.brightness = 0.85 - (t * 0.55); // 0.85 → 0.30 by 8 PM
            this.uniforms.saturation = 1.0 - (t * 0.6); // 1.0 → 0.4 by 8 PM
            this.uniforms.temperature = 0.8 - (t * 1.4); // Warm orange → cool blue
        }
    }
    
    /**
     * Apply shader to the canvas - SIMPLIFIED APPROACH
     * Instead of copying pixels, we use Canvas 2D filters which are GPU-accelerated
     * This is much faster and doesn't break the camera transform
     */
    applyAsFilter(ctx) {
        // Build CSS filter string based on shader uniforms
        const filters = [];
        
        // Brightness filter
        if (this.uniforms.brightness !== 1.0) {
            filters.push(`brightness(${this.uniforms.brightness})`);
        }
        
        // Saturation filter
        if (this.uniforms.saturation !== 1.0) {
            filters.push(`saturate(${this.uniforms.saturation})`);
        }
        
        // Color temperature via hue rotation (approximate)
        // Positive temp = warmer (shift towards red/orange)
        // Negative temp = cooler (shift towards blue)
        if (this.uniforms.temperature !== 0) {
            const hueShift = this.uniforms.temperature * 20; // -20 to +20 degrees
            filters.push(`hue-rotate(${hueShift}deg)`);
        }
        
        return filters.join(' ');
    }
    
    /**
     * Apply shader to the canvas
     * Call this AFTER all 2D rendering is complete
     */
    apply(sourceCtx) {
        if (!this.initialized || !this.gl) {
            // Fallback: No shader available
            return false;
        }
        
        try {
            // Get the actual displayed canvas dimensions
            const displayWidth = this.canvas.width;
            const displayHeight = this.canvas.height;
            
            // 1. Copy the 2D canvas content to offscreen canvas
            this.offscreenCtx.clearRect(0, 0, displayWidth, displayHeight);
            this.offscreenCtx.drawImage(this.canvas, 0, 0, displayWidth, displayHeight);
            
            // 2. Upload offscreen canvas as texture to WebGL
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
            this.gl.texImage2D(
                this.gl.TEXTURE_2D,
                0,
                this.gl.RGBA,
                this.gl.RGBA,
                this.gl.UNSIGNED_BYTE,
                this.offscreenCanvas
            );
            
            // Set texture parameters
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            
            // 3. Set up WebGL state (render to separate WebGL canvas)
            this.gl.viewport(0, 0, displayWidth, displayHeight);
            this.gl.clearColor(0, 0, 0, 0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            
            // 4. Use shader program
            this.gl.useProgram(this.program);
            
            // 5. Set uniforms
            const brightnessLocation = this.gl.getUniformLocation(this.program, 'u_brightness');
            const saturationLocation = this.gl.getUniformLocation(this.program, 'u_saturation');
            const temperatureLocation = this.gl.getUniformLocation(this.program, 'u_temperature');
            const tintLocation = this.gl.getUniformLocation(this.program, 'u_tint');
            const textureLocation = this.gl.getUniformLocation(this.program, 'u_texture');
            
            this.gl.uniform1f(brightnessLocation, this.uniforms.brightness);
            this.gl.uniform1f(saturationLocation, this.uniforms.saturation);
            this.gl.uniform1f(temperatureLocation, this.uniforms.temperature);
            this.gl.uniform4fv(tintLocation, this.uniforms.tint);
            this.gl.uniform1i(textureLocation, 0);
            
            // 6. Draw the quad (applies shader to entire screen on WebGL canvas)
            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
            
            // 7. Copy the shader result back to the main 2D canvas
            sourceCtx.clearRect(0, 0, displayWidth, displayHeight);
            sourceCtx.drawImage(this.webglCanvas, 0, 0, displayWidth, displayHeight);
            
            return true;
            
        } catch (error) {
            console.error('Shader application failed:', error);
            return false;
        }
    }
    
    /**
     * Resize shader to match canvas
     */
    resize(width, height) {
        if (this.offscreenCanvas) {
            this.offscreenCanvas.width = width;
            this.offscreenCanvas.height = height;
        }
        if (this.webglCanvas) {
            this.webglCanvas.width = width;
            this.webglCanvas.height = height;
        }
    }
    
    /**
     * Get current shader settings for debugging
     */
    getDebugInfo() {
        return {
            initialized: this.initialized,
            brightness: this.uniforms.brightness.toFixed(2),
            saturation: this.uniforms.saturation.toFixed(2),
            temperature: this.uniforms.temperature.toFixed(2)
        };
    }
}
