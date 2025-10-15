/**
 * DayNightShader - WebGL shader for realistic day/night lighting WITH LIGHT MASK SUPPORT
 * Light sources can offset the darkening effect through an alpha mask
 */
class DayNightShader {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = null;
        this.program = null;
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this.texture = null;
        this.lightMaskTexture = null;
        this.initialized = false;
        
        // Shader uniforms
        this.uniforms = {
            brightness: 1.0,
            saturation: 1.0,
            temperature: 0.0,
            tint: [0, 0, 0, 0]
        };
        
        this.initWebGL();
    }
    
    initWebGL() {
        try {
            if (!this.canvas) {
                console.error('❌ No canvas provided');
                return;
            }
            
            const canvasWidth = this.canvas.width;
            const canvasHeight = this.canvas.height;
            
            // Offscreen canvas for 2D content
            this.offscreenCanvas = document.createElement('canvas');
            this.offscreenCanvas.width = canvasWidth;
            this.offscreenCanvas.height = canvasHeight;
            this.offscreenCtx = this.offscreenCanvas.getContext('2d');
            this.offscreenCtx.imageSmoothingEnabled = true;
            this.offscreenCtx.imageSmoothingQuality = 'high';
            
            // WebGL canvas for shader
            this.webglCanvas = document.createElement('canvas');
            this.webglCanvas.width = canvasWidth;
            this.webglCanvas.height = canvasHeight;
            
            this.gl = this.webglCanvas.getContext('webgl2', { antialias: true, alpha: true }) || 
                      this.webglCanvas.getContext('webgl', { antialias: true, alpha: true });
            
            if (!this.gl) {
                console.error('❌ WebGL not supported');
                return;
            }
            
            // Vertex shader
            const vertexShaderSource = `
                attribute vec2 a_position;
                attribute vec2 a_texCoord;
                varying vec2 v_texCoord;
                
                void main() {
                    gl_Position = vec4(a_position, 0.0, 1.0);
                    v_texCoord = a_texCoord;
                }
            `;
            
            // Fragment shader WITH LIGHT MASK - OPTIMIZED
            const fragmentShaderSource = `
                precision mediump float;
                
                uniform sampler2D u_texture;
                uniform sampler2D u_lightMask;
                uniform bool u_hasLightMask;
                uniform vec3 u_darknessColor;
                uniform float u_brightness;
                uniform float u_saturation;
                uniform float u_temperature;
                uniform vec4 u_tint;
                
                varying vec2 v_texCoord;
                
                void main() {
                    vec4 texColor = texture2D(u_texture, v_texCoord);
                    
                    if (texColor.a < 0.001) {
                        gl_FragColor = texColor;
                        return;
                    }
                    
                    vec3 color = texColor.rgb;
                    vec3 originalColor = color; // Save original for light areas
                    
                    // Apply darkness color multiplier
                    color *= u_darknessColor;
                    
                    // Apply brightness reduction
                    color *= u_brightness;
                    
                    // Fast desaturation (mix with grayscale) - MUCH faster than HSL conversion
                    float gray = dot(color, vec3(0.299, 0.587, 0.114)); // Luminance
                    color = mix(vec3(gray), color, u_saturation);
                    
                    // Apply temperature shift
                    if (u_temperature > 0.0) {
                        // Warm (orange/red tint)
                        color.r = mix(color.r, 1.0, u_temperature * 0.15);
                        color.g = mix(color.g, color.g * 0.95, u_temperature * 0.1);
                        color.b = mix(color.b, color.b * 0.8, u_temperature * 0.2);
                    } else if (u_temperature < 0.0) {
                        // Cool (blue tint)
                        float coolness = abs(u_temperature);
                        color.r = mix(color.r, color.r * 0.8, coolness * 0.15);
                        color.g = mix(color.g, color.g * 0.9, coolness * 0.1);
                        color.b = mix(color.b, 1.0, coolness * 0.2);
                    }
                    
                    // APPLY LIGHT MASK LAST - lights completely bypass night effects
                    if (u_hasLightMask) {
                        vec4 lightMaskColor = texture2D(u_lightMask, v_texCoord);
                        float lightIntensity = lightMaskColor.r;
                        // Mix between night-affected color and original daylight color
                        color = mix(color, originalColor, lightIntensity);
                    }
                    
                    // Tint
                    if (u_tint.a > 0.0) {
                        color = mix(color, u_tint.rgb, u_tint.a);
                    }
                    
                    color = clamp(color, 0.0, 1.0);
                    gl_FragColor = vec4(color, texColor.a);
                }
            `;
            
            const vertexShader = this.compileShader(vertexShaderSource, this.gl.VERTEX_SHADER);
            const fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);
            
            if (!vertexShader || !fragmentShader) {
                console.error('❌ Shader compilation failed');
                return;
            }
            
            this.program = this.gl.createProgram();
            this.gl.attachShader(this.program, vertexShader);
            this.gl.attachShader(this.program, fragmentShader);
            this.gl.linkProgram(this.program);
            
            if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
                console.error('❌ Shader linking failed:', this.gl.getProgramInfoLog(this.program));
                return;
            }
            
            this.setupGeometry();
            
            // Create and configure main texture
            this.texture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            
            // Create and configure light mask texture
            this.lightMaskTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.lightMaskTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            
            // Cache uniform locations (CRITICAL for performance!)
            this.uniformLocations = {
                brightness: this.gl.getUniformLocation(this.program, 'u_brightness'),
                saturation: this.gl.getUniformLocation(this.program, 'u_saturation'),
                temperature: this.gl.getUniformLocation(this.program, 'u_temperature'),
                tint: this.gl.getUniformLocation(this.program, 'u_tint'),
                texture: this.gl.getUniformLocation(this.program, 'u_texture'),
                lightMask: this.gl.getUniformLocation(this.program, 'u_lightMask'),
                hasLightMask: this.gl.getUniformLocation(this.program, 'u_hasLightMask'),
                darknessColor: this.gl.getUniformLocation(this.program, 'u_darknessColor')
            };
            
            this.initialized = true;
            console.log('✅ WebGL day/night shader initialized WITH LIGHT MASK SUPPORT');
            
        } catch (error) {
            console.error('❌ WebGL initialization failed:', error);
            this.initialized = false;
        }
    }
    
    compileShader(source, type) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    setupGeometry() {
        const positions = new Float32Array([
            -1, -1,  1, -1,  -1,  1,  1,  1
        ]);
        
        const texCoords = new Float32Array([
            0, 1,  1, 1,  0, 0,  1, 0
        ]);
        
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        
        const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
        
        const texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
        
        const texCoordLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');
        this.gl.enableVertexAttribArray(texCoordLocation);
        this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);
    }
    
    updateFromTimeOfDay(timeOfDay, weatherState = null) {
        let weatherDarkening = 0;
        let weatherDesaturation = 0;
        if (weatherState && weatherState.precipitation) {
            if (weatherState.precipitation === 'rain-light' || weatherState.precipitation === 'snow-light') {
                weatherDarkening = 0.15;
                weatherDesaturation = 0.2;
            } else if (weatherState.precipitation === 'rain-medium' || weatherState.precipitation === 'snow-medium') {
                weatherDarkening = 0.3;
                weatherDesaturation = 0.35;
            } else if (weatherState.precipitation === 'rain-heavy' || weatherState.precipitation === 'snow-heavy') {
                weatherDarkening = 0.5;
                weatherDesaturation = 0.5;
            }
        }
        
        if ((timeOfDay >= 20 && timeOfDay < 24) || (timeOfDay >= 0 && timeOfDay < 5)) {
            // Lighter night - you can actually see now
            this.uniforms.brightness = 0.55;
            this.uniforms.saturation = 0.6;
            this.uniforms.temperature = -0.5;
        }
        else if (timeOfDay >= 5 && timeOfDay < 8) {
            const t = (timeOfDay - 5) / 3;
            this.uniforms.brightness = (0.55 + (t * 0.40)) * (1 - weatherDarkening);
            this.uniforms.saturation = (0.6 + (t * 0.4)) * (1 - weatherDesaturation);
            this.uniforms.temperature = -0.5 + (t * 0.6);
        }
        else if (timeOfDay >= 8 && timeOfDay < 17) {
            const noonFactor = 1.0 - Math.abs((timeOfDay - 12) / 5) * 0.15;
            this.uniforms.brightness = (0.95 + (noonFactor * 0.05)) * (1 - weatherDarkening);
            this.uniforms.saturation = 1.0 * (1 - weatherDesaturation);
            this.uniforms.temperature = 0.1;
        }
        else if (timeOfDay >= 17 && timeOfDay < 20) {
            const t = (timeOfDay - 17) / 3;
            this.uniforms.brightness = (0.90 - (t * 0.35)) * (1 - weatherDarkening);
            this.uniforms.saturation = (1.0 - (t * 0.4)) * (1 - weatherDesaturation);
            this.uniforms.temperature = 0.6 - (t * 1.1);
        }
    }
    
    apply(sourceCtx, lightMask = null, darknessColor = [1, 1, 1]) {
        if (!this.initialized || !this.gl) {
            return false;
        }
        
        try {
            const displayWidth = this.canvas.width;
            const displayHeight = this.canvas.height;
            
            // Performance: Log canvas size once to see how much data we're copying
            if (!this._loggedSize) {
                const mb = (displayWidth * displayHeight * 4 / 1024 / 1024).toFixed(2);
                console.log(`[DayNightShader] Processing ${displayWidth}x${displayHeight} (${mb}MB per frame)`);
                this._loggedSize = true;
            }
            
            // Copy 2D canvas to offscreen
            this.offscreenCtx.drawImage(this.canvas, 0, 0);
            
            // Upload main texture (texture parameters already set during initialization)
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.offscreenCanvas);
            
            // Upload light mask if provided (texture parameters already set during initialization)
            if (lightMask) {
                this.gl.activeTexture(this.gl.TEXTURE1);
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.lightMaskTexture);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, lightMask);
            }
            
            // Setup WebGL
            this.gl.viewport(0, 0, displayWidth, displayHeight);
            this.gl.clearColor(0, 0, 0, 0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            
            this.gl.useProgram(this.program);
            
            // Set uniforms (using cached locations for performance)
            this.gl.uniform1f(this.uniformLocations.brightness, this.uniforms.brightness);
            this.gl.uniform1f(this.uniformLocations.saturation, this.uniforms.saturation);
            this.gl.uniform1f(this.uniformLocations.temperature, this.uniforms.temperature);
            this.gl.uniform4fv(this.uniformLocations.tint, this.uniforms.tint);
            this.gl.uniform1i(this.uniformLocations.texture, 0);
            this.gl.uniform1i(this.uniformLocations.lightMask, 1);
            this.gl.uniform1i(this.uniformLocations.hasLightMask, lightMask ? 1 : 0);
            this.gl.uniform3fv(this.uniformLocations.darknessColor, darknessColor);
            
            // Draw
            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
            
            // Copy back to main canvas
            sourceCtx.save();
            sourceCtx.setTransform(1, 0, 0, 1, 0, 0);
            sourceCtx.globalCompositeOperation = 'copy';
            sourceCtx.drawImage(this.webglCanvas, 0, 0);
            sourceCtx.restore();
            
            return true;
            
        } catch (error) {
            console.error('Shader error:', error);
            return false;
        }
    }
    
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
    
    getDebugInfo() {
        return {
            initialized: this.initialized,
            brightness: this.uniforms.brightness.toFixed(2),
            saturation: this.uniforms.saturation.toFixed(2),
            temperature: this.uniforms.temperature.toFixed(2)
        };
    }
}
