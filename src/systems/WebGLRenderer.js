/**
 * WebGLRenderer - GPU-accelerated rendering system
 * 
 * Drop-in replacement for Canvas2D with EXACT same coordinate system.
 * Key fix: UNPACK_FLIP_Y_WEBGL makes WebGL match Canvas2D (0,0) = top-left, Y+ = down
 */
class WebGLRenderer {
    constructor(canvas, logicalWidth, logicalHeight) {
        this.canvas = canvas;
        this.gl = null;
        this.initialized = false;
        
        this.logicalWidth = logicalWidth || canvas.width;
        this.logicalHeight = logicalHeight || canvas.height;
        
        this.spriteProgram = null;
        this.vertexBuffer = null;
        this.texCoordBuffer = null;
        this.indexBuffer = null;
        this.textures = new Map();
        
        this.maxBatchSize = 1000;
        this.batchVertices = [];
        this.batchTexCoords = [];
        this.currentBatchSize = 0;
        this.currentTexture = null;
        this.currentAlpha = 1.0;
        
        this.viewMatrix = null;
        this.projectionMatrix = null;
        
        // Shadow framebuffer for non-stacking shadows
        this.shadowFramebuffer = null;
        this.shadowTexture = null;
        this.renderingShadows = false;
        
        // Scene framebuffer for post-processing (day/night cycle)
        this.sceneFramebuffer = null;
        this.sceneTexture = null;
        this.postProcessProgram = null;
        this.lightMaskTexture = null;
        this.dayNightParams = {
            brightness: 1.0,
            saturation: 1.0,
            temperature: 0.0,
            tint: [0, 0, 0, 0],
            darknessColor: [1, 1, 1],
            vignetteIntensity: 0.5, // Default vignette
            aberrationIntensity: 0.5 // Default chromatic aberration
        };
        
        this.circleTexture = null;
        this.glowTexture = null;
        
        this.initialize();
    }
    
    initialize() {
        try {
            // Request WebGL context with alpha channel enabled (required for transparency)
            const contextOptions = {
                alpha: true,
                premultipliedAlpha: false,
                antialias: true
            };
            this.gl = this.canvas.getContext('webgl2', contextOptions) || 
                      this.canvas.getContext('webgl', contextOptions);
            
            if (!this.gl) {
                console.error('WebGL not supported');
                return;
            }
            
            this.gl.disable(this.gl.DEPTH_TEST);
            this.gl.enable(this.gl.BLEND);
            // Use premultiplied alpha blending (source-over)
            // Since we load textures with UNPACK_PREMULTIPLY_ALPHA_WEBGL=true,
            // we must use ONE instead of SRC_ALPHA for the source factor.
            this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
            
            if (!this.createSpriteShader()) {
                return;
            }
            
            if (!this.createPostProcessShader()) {
                console.warn('Failed to create post-process shader');
            }
            
            this.createBuffers();
            this.createShadowFramebuffer();
            this.createSceneFramebuffer();
            this.updateProjection(this.logicalWidth, this.logicalHeight);
            this.initialized = true;
            
        } catch (error) {
            console.error('WebGL init failed:', error);
        }
    }
    
    createShadowFramebuffer() {
        // Create framebuffer for shadow rendering (prevents shadow stacking)
        if (this.shadowFramebuffer) {
            this.gl.deleteFramebuffer(this.shadowFramebuffer);
        }
        if (this.shadowTexture) {
            this.gl.deleteTexture(this.shadowTexture);
        }

        this.shadowFramebuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.shadowFramebuffer);
        
        // Create texture to render shadows to
        this.shadowTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.shadowTexture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D, 0, this.gl.RGBA,
            this.logicalWidth, this.logicalHeight, 0,
            this.gl.RGBA, this.gl.UNSIGNED_BYTE, null
        );
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        
        // Attach texture to framebuffer
        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0,
            this.gl.TEXTURE_2D, this.shadowTexture, 0
        );
        
        // Check framebuffer is complete
        if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) !== this.gl.FRAMEBUFFER_COMPLETE) {
            console.error('Shadow framebuffer incomplete');
        }
        
        // Unbind
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }
    
    createSceneFramebuffer() {
        // Create framebuffer for scene rendering (allows post-processing)
        if (this.sceneFramebuffer) {
            this.gl.deleteFramebuffer(this.sceneFramebuffer);
        }
        if (this.sceneTexture) {
            this.gl.deleteTexture(this.sceneTexture);
        }

        this.sceneFramebuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.sceneFramebuffer);
        
        // Create texture to render scene to
        this.sceneTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.sceneTexture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D, 0, this.gl.RGBA,
            this.logicalWidth, this.logicalHeight, 0,
            this.gl.RGBA, this.gl.UNSIGNED_BYTE, null
        );
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        
        // Attach texture to framebuffer
        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0,
            this.gl.TEXTURE_2D, this.sceneTexture, 0
        );
        
        // Check framebuffer is complete
        if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) !== this.gl.FRAMEBUFFER_COMPLETE) {
            console.error('Scene framebuffer incomplete');
        }
        
        // Unbind
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    createSpriteShader() {
        const vs = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            uniform mat4 u_projection;
            uniform mat4 u_view;
            varying vec2 v_texCoord;
            void main() {
                gl_Position = u_projection * u_view * vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;
        
        const fs = `
            precision mediump float;
            uniform sampler2D u_texture;
            uniform float u_alpha;
            uniform vec3 u_tint;
            varying vec2 v_texCoord;
            void main() {
                vec4 color = texture2D(u_texture, v_texCoord);
                // Since we use premultiplied alpha, we must multiply RGB by alpha as well
                // to maintain the premultiplied state when opacity changes
                gl_FragColor = vec4(color.rgb * u_tint * u_alpha, color.a * u_alpha);
            }
        `;
        
        const vertexShader = this.compileShader(vs, this.gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fs, this.gl.FRAGMENT_SHADER);
        
        if (!vertexShader || !fragmentShader) return false;
        
        this.spriteProgram = this.gl.createProgram();
        this.gl.attachShader(this.spriteProgram, vertexShader);
        this.gl.attachShader(this.spriteProgram, fragmentShader);
        this.gl.linkProgram(this.spriteProgram);
        
        if (!this.gl.getProgramParameter(this.spriteProgram, this.gl.LINK_STATUS)) {
            return false;
        }
        
        this.spriteProgram.locations = {
            position: this.gl.getAttribLocation(this.spriteProgram, 'a_position'),
            texCoord: this.gl.getAttribLocation(this.spriteProgram, 'a_texCoord'),
            projection: this.gl.getUniformLocation(this.spriteProgram, 'u_projection'),
            view: this.gl.getUniformLocation(this.spriteProgram, 'u_view'),
            texture: this.gl.getUniformLocation(this.spriteProgram, 'u_texture'),
            alpha: this.gl.getUniformLocation(this.spriteProgram, 'u_alpha'),
            tint: this.gl.getUniformLocation(this.spriteProgram, 'u_tint')
        };
        
        return true;
    }
    
    createPostProcessShader() {
        const vs = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;
        
        const fs = `
            precision mediump float;
            
            uniform sampler2D u_texture;
            uniform sampler2D u_lightMask;
            uniform bool u_hasLightMask;
            uniform vec3 u_darknessColor;
            uniform float u_brightness;
            uniform float u_saturation;
            uniform float u_temperature;
            uniform vec4 u_tint;
            uniform float u_vignetteIntensity;
            uniform float u_aberrationIntensity;
            
            varying vec2 v_texCoord;
            
            void main() {
                // Chromatic Aberration
                vec2 uv = v_texCoord;
                vec2 center = vec2(0.5, 0.5);
                vec2 dir = uv - center;
                float dist = length(dir);
                
                vec4 texColor;
                
                if (u_aberrationIntensity > 0.0) {
                    // Scale aberration by distance from center
                    float aberration = u_aberrationIntensity * 0.015 * dist;
                    
                    float r = texture2D(u_texture, uv - dir * aberration).r;
                    float g = texture2D(u_texture, uv).g;
                    float b = texture2D(u_texture, uv + dir * aberration).b;
                    float a = texture2D(u_texture, uv).a;
                    
                    texColor = vec4(r, g, b, a);
                } else {
                    texColor = texture2D(u_texture, uv);
                }
                
                // Skip processing for transparent pixels (background)
                if (texColor.a < 0.001) {
                    gl_FragColor = texColor;
                    return;
                }
                
                vec3 color = texColor.rgb;
                // Un-premultiply alpha for processing if needed, but usually we work on RGB directly
                // Assuming premultiplied alpha in texture
                if (texColor.a > 0.0) {
                    color = color / texColor.a;
                }
                
                vec3 originalColor = color; // Save original for light areas
                
                // Apply darkness color multiplier
                color *= u_darknessColor;
                
                // Apply brightness reduction
                color *= u_brightness;
                
                // Fast desaturation (mix with grayscale)
                float gray = dot(color, vec3(0.299, 0.587, 0.114));
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
                    // Flip Y coordinate for light mask because it's a Canvas2D upload (Top-Down)
                    // while WebGL texture coordinates are Bottom-Up
                    vec4 lightMaskColor = texture2D(u_lightMask, vec2(v_texCoord.x, 1.0 - v_texCoord.y));
                    
                    // Component-wise mix to allow colored lights
                    // If lightMask is (1,1,1), we get originalColor (full daylight)
                    // If lightMask is (0,0,0), we get color (darkness)
                    // If lightMask is (1,0,0), Red channel is original, G/B are darkness
                    
                    color.r = mix(color.r, originalColor.r, lightMaskColor.r);
                    color.g = mix(color.g, originalColor.g, lightMaskColor.g);
                    color.b = mix(color.b, originalColor.b, lightMaskColor.b);
                }
                
                // Tint
                if (u_tint.a > 0.0) {
                    color = mix(color, u_tint.rgb, u_tint.a);
                }
                
                // Vignette
                if (u_vignetteIntensity > 0.0) {
                    // Soft vignette that gets stronger at edges
                    float vignette = smoothstep(0.75, 0.25 * (1.0 - u_vignetteIntensity), dist);
                    // Mix based on intensity (allow some transparency)
                    color *= mix(1.0, vignette, u_vignetteIntensity);
                }
                
                color = clamp(color, 0.0, 1.0);
                
                // Re-premultiply alpha
                color *= texColor.a;
                
                gl_FragColor = vec4(color, texColor.a);
            }
        `;
        
        const vertexShader = this.compileShader(vs, this.gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fs, this.gl.FRAGMENT_SHADER);
        
        if (!vertexShader || !fragmentShader) return false;
        
        this.postProcessProgram = this.gl.createProgram();
        this.gl.attachShader(this.postProcessProgram, vertexShader);
        this.gl.attachShader(this.postProcessProgram, fragmentShader);
        this.gl.linkProgram(this.postProcessProgram);
        
        if (!this.gl.getProgramParameter(this.postProcessProgram, this.gl.LINK_STATUS)) {
            return false;
        }
        
        this.postProcessProgram.locations = {
            position: this.gl.getAttribLocation(this.postProcessProgram, 'a_position'),
            texCoord: this.gl.getAttribLocation(this.postProcessProgram, 'a_texCoord'),
            texture: this.gl.getUniformLocation(this.postProcessProgram, 'u_texture'),
            lightMask: this.gl.getUniformLocation(this.postProcessProgram, 'u_lightMask'),
            hasLightMask: this.gl.getUniformLocation(this.postProcessProgram, 'u_hasLightMask'),
            darknessColor: this.gl.getUniformLocation(this.postProcessProgram, 'u_darknessColor'),
            brightness: this.gl.getUniformLocation(this.postProcessProgram, 'u_brightness'),
            saturation: this.gl.getUniformLocation(this.postProcessProgram, 'u_saturation'),
            temperature: this.gl.getUniformLocation(this.postProcessProgram, 'u_temperature'),
            tint: this.gl.getUniformLocation(this.postProcessProgram, 'u_tint'),
            vignetteIntensity: this.gl.getUniformLocation(this.postProcessProgram, 'u_vignetteIntensity'),
            aberrationIntensity: this.gl.getUniformLocation(this.postProcessProgram, 'u_aberrationIntensity')
        };
        
        return true;
    }
    
    compileShader(source, type) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    createBuffers() {
        this.vertexBuffer = this.gl.createBuffer();
        this.texCoordBuffer = this.gl.createBuffer();
        this.indexBuffer = this.gl.createBuffer();
        
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        
        const indices = [];
        for (let i = 0; i < this.maxBatchSize; i++) {
            const offset = i * 4;
            indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
        }
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
    }
    
    updateProjection(width, height) {
        this.projectionMatrix = this.createOrthoMatrix(0, width, height, 0, -1, 1);
        if (this.gl) {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    setCamera(x, y, zoom = 1.0, canvasWidth = null, canvasHeight = null) {
        // If zoom is not 1.0 and canvas dimensions provided, zoom around center
        if (zoom !== 1.0 && canvasWidth && canvasHeight) {
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            
            // Translate to center, scale, translate back, then apply camera offset
            // This matches Canvas2D's zoom behavior
            const tx = centerX - centerX * zoom - x * zoom;
            const ty = centerY - centerY * zoom - y * zoom;
            
            this.viewMatrix = [
                zoom, 0, 0, 0,
                0, zoom, 0, 0,
                0, 0, 1, 0,
                tx, ty, 0, 1
            ];
        } else {
            // Simple camera with no zoom-around-center
            this.viewMatrix = [
                zoom, 0, 0, 0,
                0, zoom, 0, 0,
                0, 0, 1, 0,
                -x * zoom, -y * zoom, 0, 1
            ];
        }
    }
    
    createOrthoMatrix(left, right, bottom, top, near, far) {
        const lr = 1 / (left - right);
        const bt = 1 / (bottom - top);
        const nf = 1 / (near - far);
        
        return [
            -2 * lr, 0, 0, 0,
            0, -2 * bt, 0, 0,
            0, 0, 2 * nf, 0,
            (left + right) * lr, (top + bottom) * bt, (far + near) * nf, 1
        ];
    }
    
    beginFrame(clearColor = [0, 0, 0, 0]) {
        if (!this.initialized) return;
        
        // Bind scene framebuffer for off-screen rendering
        if (this.sceneFramebuffer) {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.sceneFramebuffer);
            this.gl.viewport(0, 0, this.logicalWidth, this.logicalHeight);
        }
        
        this.gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        
        this.batchVertices = [];
        this.batchTexCoords = [];
        this.currentBatchSize = 0;
        this.currentTexture = null;
        this.currentAlpha = 1.0;
    }
    
    beginShadowPass() {
        if (!this.initialized || !this.shadowFramebuffer) return;
        
        // Flush any pending draws
        this.flush();
        
        // Switch to shadow framebuffer
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.shadowFramebuffer);
        
        // Set viewport to match shadow framebuffer size
        // This is CRITICAL: if we don't do this, it uses the screen viewport
        // which might be larger (High DPI) or different, causing shadows to drift or clip
        this.gl.viewport(0, 0, this.logicalWidth, this.logicalHeight);
        
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        
        // Use separate blend equations for RGB and Alpha
        // RGB: Normal alpha blending
        // Alpha: MAX blending to prevent shadow stacking
        if (this.gl.blendEquationSeparate && this.gl.blendFuncSeparate) {
            // RGB channels: normal alpha blend (FUNC_ADD with ONE, ONE_MINUS_SRC_ALPHA)
            // Alpha channel: MAX blend (take maximum alpha, don't add)
            this.gl.blendEquationSeparate(this.gl.FUNC_ADD, this.gl.MAX);
            this.gl.blendFuncSeparate(
                this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA,        // RGB: premultiplied alpha blend
                this.gl.ONE, this.gl.ONE                          // Alpha: MAX blend (ignored when using MAX equation)
            );
        } else {
            // Fallback: use standard blending (will have stacking)
            console.warn('Separate blend equations not supported, shadows may stack');
            this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
        }
        
        this.renderingShadows = true;
    }
    
    endShadowPass() {
        if (!this.initialized || !this.shadowFramebuffer) return;
        
        // Flush shadow draws
        this.flush();
        
        // Restore normal alpha blending for both RGB and Alpha
        this.gl.blendEquation(this.gl.FUNC_ADD);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
        
        // Switch back to scene framebuffer (if active) or screen
        if (this.sceneFramebuffer) {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.sceneFramebuffer);
            this.gl.viewport(0, 0, this.logicalWidth, this.logicalHeight);
        } else {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
        
        this.renderingShadows = false;
        
        // Composite shadow texture to main framebuffer
        this.compositeShadows();
    }
    
    compositeShadows() {
        // Draw the shadow texture to the main framebuffer
        // This composites all shadows at once, preventing stacking
        const texture = this.shadowTexture;
        if (!texture) return;
        
        // Save current state
        const prevTexture = this.currentTexture;
        const prevViewMatrix = this.viewMatrix;
        
        // Use identity view matrix (no camera transform for full-screen quad)
        this.viewMatrix = this.createIdentityMatrix();
        this.currentTexture = texture;
        
        // Draw full-screen quad with shadow texture
        // IMPORTANT: Flip Y coordinates because framebuffer textures are upside down
        this.batchVertices.push(
            0, 0,
            this.logicalWidth, 0,
            this.logicalWidth, this.logicalHeight,
            0, this.logicalHeight
        );
        this.batchTexCoords.push(
            0, 1,  // Bottom-left (flipped from 0,0)
            1, 1,  // Bottom-right (flipped from 1,0)
            1, 0,  // Top-right (flipped from 1,1)
            0, 0   // Top-left (flipped from 0,1)
        );
        this.currentBatchSize = 1;
        
        this.flush();
        
        // Restore state
        this.currentTexture = prevTexture;
        this.viewMatrix = prevViewMatrix;
    }
    
    endFrame() {
        if (!this.initialized) return;
        
        // Flush any remaining sprites to the scene framebuffer
        this.flush();
        
        // If we don't have post-processing set up, just copy to screen (or we're already on screen if setup failed)
        if (!this.sceneFramebuffer || !this.postProcessProgram) {
            return;
        }

        const p = this.dayNightParams;
        
        // Switch to default framebuffer (screen)
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        
        // Use post-process shader
        this.gl.useProgram(this.postProcessProgram);
        
        // Bind scene texture to unit 0
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.sceneTexture);
        this.gl.uniform1i(this.postProcessProgram.locations.texture, 0);
        
        // Bind light mask to unit 1 (if available)
        if (this.lightMaskTexture) {
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.lightMaskTexture);
            this.gl.uniform1i(this.postProcessProgram.locations.lightMask, 1);
            this.gl.uniform1i(this.postProcessProgram.locations.hasLightMask, 1);
        } else {
            this.gl.uniform1i(this.postProcessProgram.locations.hasLightMask, 0);
        }
        
        // Set day/night uniforms
        this.gl.uniform3fv(this.postProcessProgram.locations.darknessColor, p.darknessColor || [1, 1, 1]);
        this.gl.uniform1f(this.postProcessProgram.locations.brightness, p.brightness !== undefined ? p.brightness : 1.0);
        this.gl.uniform1f(this.postProcessProgram.locations.saturation, p.saturation !== undefined ? p.saturation : 1.0);
        this.gl.uniform1f(this.postProcessProgram.locations.temperature, p.temperature || 0.0);
        this.gl.uniform4fv(this.postProcessProgram.locations.tint, p.tint || [0, 0, 0, 0]);
        this.gl.uniform1f(this.postProcessProgram.locations.vignetteIntensity, p.vignetteIntensity !== undefined ? p.vignetteIntensity : 0.5);
        this.gl.uniform1f(this.postProcessProgram.locations.aberrationIntensity, p.aberrationIntensity !== undefined ? p.aberrationIntensity : 0.5);
        
        // Draw full-screen quad
        // We reuse the vertex buffer from sprite rendering, but we need to fill it with a quad
        // Since we're not using the sprite batching system here, we'll just manually set up attributes
        // or simpler: just use the batch system but with a special "draw immediate" mode?
        // No, let's just push a quad to the batch buffers and draw it using a custom draw call
        // Wait, the sprite shader attributes might be different from post-process shader attributes?
        // Let's check:
        // Sprite: a_position, a_texCoord
        // PostProcess: a_position, a_texCoord
        // They match! So we can use the same buffers.
        
        const vertices = [
            -1, -1,
             1, -1,
             1,  1,
            -1,  1
        ];
        
        const texCoords = [
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ];
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.postProcessProgram.locations.position);
        this.gl.vertexAttribPointer(this.postProcessProgram.locations.position, 2, this.gl.FLOAT, false, 0, 0);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(texCoords), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.postProcessProgram.locations.texCoord);
        this.gl.vertexAttribPointer(this.postProcessProgram.locations.texCoord, 2, this.gl.FLOAT, false, 0, 0);
        
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        // We need to make sure index buffer has at least 6 indices (0,1,2, 0,2,3)
        // The initialize() creates enough indices for maxBatchSize, so we are good.
        
        this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
    }
    
    setDayNightParams(params) {
        this.dayNightParams = { ...this.dayNightParams, ...params };
    }
    
    setLightMask(texture) {
        this.lightMaskTexture = texture;
    }

    loadTexture(image, url) {
        if (this.textures.has(url)) {
            return this.textures.get(url);
        }
        
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        
        // DON'T flip Y - images are already in correct orientation
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);
        
        // Use premultiplied alpha for paint textures to avoid dark edges
        this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        
        this.textures.set(url, texture);
        return texture;
    }
    
    drawSprite(x, y, width, height, image, imageUrl, alpha = 1.0, flipX = false, flipY = false) {
        if (!this.initialized) return;
        
        const texture = this.textures.get(imageUrl) || this.loadTexture(image, imageUrl);
        
        if (this.currentTexture !== texture || 
            this.currentBatchSize >= this.maxBatchSize ||
            Math.abs(this.currentAlpha - alpha) > 0.001) {
            this.flush();
            this.currentTexture = texture;
            this.currentAlpha = alpha;
        }
        
        // Vertex positions
        this.batchVertices.push(x, y, x + width, y, x + width, y + height, x, y + height);
        
        // Texture coordinates with optional flipping
        const u0 = flipX ? 1 : 0;
        const u1 = flipX ? 0 : 1;
        const v0 = flipY ? 1 : 0;
        const v1 = flipY ? 0 : 1;
        this.batchTexCoords.push(u0, v0, u1, v0, u1, v1, u0, v1);
        
        this.currentBatchSize++;
    }
    
    /**
     * Draw shadow with skew transform for sun direction
     * @param {number} x - Shadow center X (base of sprite)
     * @param {number} y - Shadow center Y (base of sprite)
     * @param {number} width - Shadow width
     * @param {number} height - Shadow height
     * @param {Image} silhouetteImage - Pre-rendered black silhouette (already flipped if needed)
     * @param {string} imageUrl - Cache key for texture
     * @param {number} opacity - Shadow opacity (0-1)
     * @param {number} skewX - Horizontal skew factor for sun direction
     * @param {number} scaleY - Vertical scale (flatten shadow)
     * @param {boolean} flipX - Whether sprite is flipped (for reference, silhouette already flipped)
     */
    drawShadow(x, y, width, height, silhouetteImage, imageUrl, opacity, skewX, scaleY, flipX = false) {
        if (!this.initialized || opacity <= 0.01) return;
        
        const texture = this.textures.get(imageUrl) || this.loadTexture(silhouetteImage, imageUrl);
        
        if (this.currentTexture !== texture || this.currentBatchSize >= this.maxBatchSize) {
            this.flush();
            this.currentTexture = texture;
            this.currentAlpha = opacity;
        }
        
        // Calculate transformed vertices
        // Base position is at (x, y) - bottom center of sprite
        // Apply transforms: scale Y, then skew X
        const halfWidth = width / 2;
        
        // Bottom-left corner: (-halfWidth, 0) after centering
        let x0 = x - halfWidth;
        let y0 = y;
        
        // Bottom-right corner: (halfWidth, 0) after centering
        let x1 = x + halfWidth;
        let y1 = y;
        
        // Top-left corner: (-halfWidth, -height) after centering, then apply transforms
        let x2 = x - halfWidth + (skewX * -height); // skew shifts based on Y distance from base
        let y2 = y + (-height * scaleY); // scale Y
        
        // Top-right corner: (halfWidth, -height) after centering, then apply transforms
        let x3 = x + halfWidth + (skewX * -height); // skew shifts based on Y distance from base
        let y3 = y + (-height * scaleY); // scale Y
        
        // Push vertices: bottom-left, bottom-right, top-right, top-left
        this.batchVertices.push(x0, y0, x1, y1, x3, y3, x2, y2);
        
        // Texture coordinates - silhouette is already flipped in the cache, so use normal coords
        this.batchTexCoords.push(0, 1, 1, 1, 1, 0, 0, 0);
        
        this.currentBatchSize++;
        
        // Flush immediately with custom alpha
        this.flushWithAlpha(opacity);
    }

    flush() {
        this.flushWithAlpha(this.currentAlpha);
    }
    
    flushWithAlpha(alpha = 1.0) {
        if (this.currentBatchSize === 0) return;
        
        this.gl.useProgram(this.spriteProgram);
        
        if (this.currentTexture) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.currentTexture);
            this.gl.uniform1i(this.spriteProgram.locations.texture, 0);
        }
        
        this.gl.uniformMatrix4fv(this.spriteProgram.locations.projection, false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.spriteProgram.locations.view, false, this.viewMatrix || this.createIdentityMatrix());
        this.gl.uniform1f(this.spriteProgram.locations.alpha, alpha);
        this.gl.uniform3f(this.spriteProgram.locations.tint, 1.0, 1.0, 1.0);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.batchVertices), this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.spriteProgram.locations.position);
        this.gl.vertexAttribPointer(this.spriteProgram.locations.position, 2, this.gl.FLOAT, false, 0, 0);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.batchTexCoords), this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.spriteProgram.locations.texCoord);
        this.gl.vertexAttribPointer(this.spriteProgram.locations.texCoord, 2, this.gl.FLOAT, false, 0, 0);
        
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.drawElements(this.gl.TRIANGLES, this.currentBatchSize * 6, this.gl.UNSIGNED_SHORT, 0);
        
        this.batchVertices = [];
        this.batchTexCoords = [];
        this.currentBatchSize = 0;
    }
    
    createIdentityMatrix() {
        return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    }
    
    /**
     * Draw a line (for rain particles)
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {number} thickness - Line width
     * @param {Array} color - RGBA color [r, g, b, a] (0-1 range)
     */
    drawLine(x1, y1, x2, y2, thickness, color) {
        if (!this.initialized) return;
        
        // Flush current batch if needed
        this.flush();
        
        // Use a simple colored rectangle shader (we'll use sprite shader with white texture)
        // Calculate line direction and perpendicular
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length < 0.1) return; // Skip zero-length lines
        
        // Perpendicular vector (normalized)
        const perpX = -dy / length * (thickness / 2);
        const perpY = dx / length * (thickness / 2);
        
        // Four corners of the line rectangle
        const corners = [
            [x1 - perpX, y1 - perpY], // Start bottom
            [x1 + perpX, y1 + perpY], // Start top
            [x2 + perpX, y2 + perpY], // End top
            [x2 - perpX, y2 - perpY]  // End bottom
        ];
        
        // Use solid color (create 1x1 white texture if not exists)
        if (!this.whiteTexture) {
            const whitePixel = new ImageData(1, 1);
            whitePixel.data[0] = 255;
            whitePixel.data[1] = 255;
            whitePixel.data[2] = 255;
            whitePixel.data[3] = 255;
            
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext('2d');
            ctx.putImageData(whitePixel, 0, 0);
            
            this.whiteTexture = this.loadTexture(canvas, '__white__');
        }
        
        this.currentTexture = this.whiteTexture;
        
        // Push vertices
        this.batchVertices.push(
            corners[0][0], corners[0][1],
            corners[1][0], corners[1][1],
            corners[2][0], corners[2][1],
            corners[3][0], corners[3][1]
        );
        
        // Texture coordinates (doesn't matter for solid color)
        this.batchTexCoords.push(0, 0, 0, 1, 1, 1, 1, 0);
        
        this.currentBatchSize++;
        
        // Flush with color as alpha (hack: use uniform alpha for color)
        // For proper color, we'd need a different shader, but for now we'll just use alpha
        this.flushWithColor(color);
    }
    
    /**
     * Draw a circle (for snow particles)
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Circle radius
     * @param {Array} color - RGBA color [r, g, b, a] (0-1 range)
     */
    drawCircle(x, y, radius, color) {
        if (!this.initialized) return;
        
        this.flush();
        
        // Use generated circle texture instead of white square
        this.currentTexture = this.getCircleTexture();
        
        // Draw as a square (good enough for small particles)
        const halfSize = radius;
        this.batchVertices.push(
            x - halfSize, y - halfSize,
            x + halfSize, y - halfSize,
            x + halfSize, y + halfSize,
            x - halfSize, y + halfSize
        );
        
        this.batchTexCoords.push(0, 0, 1, 0, 1, 1, 0, 1);
        
        this.currentBatchSize++;
        
        this.flushWithColor(color);
    }
    
    /**
     * Draw an ellipse (for leaf particles)
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {number} rotation - Rotation in radians
     * @param {Array} color - RGBA color [r, g, b, a] (0-1 range)
     */
    drawEllipse(x, y, width, height, rotation, color) {
        if (!this.initialized) return;
        
        this.flush();
        
        // Use circle texture for roundness
        this.currentTexture = this.getCircleTexture();
        
        // Calculate rotated corners
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const halfW = width / 2;
        const halfH = height / 2;
        
        // Four corners (unrotated)
        const corners = [
            [-halfW, -halfH],
            [halfW, -halfH],
            [halfW, halfH],
            [-halfW, halfH]
        ];
        
        // Rotate and translate
        for (let corner of corners) {
            const rx = corner[0] * cos - corner[1] * sin + x;
            const ry = corner[0] * sin + corner[1] * cos + y;
            this.batchVertices.push(rx, ry);
        }
        
        this.batchTexCoords.push(0, 0, 1, 0, 1, 1, 0, 1);
        
        this.currentBatchSize++;
        
        this.flushWithColor(color);
    }
    
    /**
     * Flush with custom color (multiplies with texture)
     */
    flushWithColor(color) {
        if (this.currentBatchSize === 0) return;
        
        this.gl.useProgram(this.spriteProgram);
        
        if (this.currentTexture) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.currentTexture);
            this.gl.uniform1i(this.spriteProgram.locations.texture, 0);
        }
        
        this.gl.uniformMatrix4fv(this.spriteProgram.locations.projection, false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.spriteProgram.locations.view, false, this.viewMatrix || this.createIdentityMatrix());
        this.gl.uniform1f(this.spriteProgram.locations.alpha, color[3]); // Use alpha from color
        this.gl.uniform3f(this.spriteProgram.locations.tint, color[0], color[1], color[2]); // Use RGB from color
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.batchVertices), this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.spriteProgram.locations.position);
        this.gl.vertexAttribPointer(this.spriteProgram.locations.position, 2, this.gl.FLOAT, false, 0, 0);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.batchTexCoords), this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.spriteProgram.locations.texCoord);
        this.gl.vertexAttribPointer(this.spriteProgram.locations.texCoord, 2, this.gl.FLOAT, false, 0, 0);
        
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.drawElements(this.gl.TRIANGLES, this.currentBatchSize * 6, this.gl.UNSIGNED_SHORT, 0);
        
        this.batchVertices = [];
        this.batchTexCoords = [];
        this.currentBatchSize = 0;
    }
    
    resize(logicalWidth, logicalHeight) {
        this.logicalWidth = logicalWidth;
        this.logicalHeight = logicalHeight;
        this.updateProjection(logicalWidth, logicalHeight);
        
        // Recreate framebuffers to match new dimensions
        if (this.initialized) {
            this.createShadowFramebuffer();
            this.createSceneFramebuffer();
        }
    }

    updateTexture(url, image) {
        let texture = this.textures.get(url);
        if (!texture) {
            return this.loadTexture(image, url);
        }
        
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        // DON'T flip Y - images are already in correct orientation
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
        
        return texture;
    }

    invalidateTexture(url) {
        let texture = this.textures.get(url);
        if (texture) {
            this.gl.deleteTexture(texture);
            this.textures.delete(url);
        }
    }

    /**
     * Draw lens flare effect
     * @param {number} sunX - Sun screen X (0-1)
     * @param {number} sunY - Sun screen Y (0-1)
     * @param {number} globalIntensity - Overall intensity multiplier (0-1)
     */
    drawLensFlare(sunX, sunY, globalIntensity = 1.0) {
        if (!this.initialized) return;
        
        // Convert normalized coordinates to screen space
        const sx = sunX * this.logicalWidth;
        const sy = sunY * this.logicalHeight;
        
        // Center of screen
        const cx = this.logicalWidth / 2;
        const cy = this.logicalHeight / 2;
        
        // Vector from sun to center
        const dx = cx - sx;
        const dy = cy - sy;
        
        const intensity = globalIntensity;
        if (intensity <= 0.01) return;
        
        this.flush();

        // 1. Draw Sun Disk (Normal Blending - visible against bright background)
        // This ensures we see the sun itself even if additive blending washes out
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
        
        // Bright white/yellow center
        this.drawGlow(sx, sy, 60, [1.0, 1.0, 0.9, 0.8 * intensity]);
        this.flush();
        
        // 2. Draw Flares (Additive Blending - glows)
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        
        // Helper to premultiply alpha for additive blending
        const c = (r, g, b, a) => [r * a, g * a, b * a, a];
        
        // Large soft glow around sun
        this.drawGlow(sx, sy, 200, c(1.0, 0.8, 0.4, 0.6 * intensity));
        
        // Artifacts along the line - Extended for realistic lens flare
        // 1. Close to sun (small, intense)
        this.drawGlow(sx + dx * 0.3, sy + dy * 0.3, 40, c(1.0, 0.9, 0.7, 0.4 * intensity));
        
        // 2. Mid range (greenish/yellowish)
        this.drawGlow(sx + dx * 0.8, sy + dy * 0.8, 60, c(0.8, 1.0, 0.8, 0.2 * intensity));
        this.drawGlow(sx + dx * 1.1, sy + dy * 1.1, 30, c(1.0, 0.8, 0.9, 0.25 * intensity)); // Pinkish ring
        
        // 3. Near center (blue/purple)
        this.drawGlow(sx + dx * 1.5, sy + dy * 1.5, 20, c(0.5, 0.5, 1.0, 0.4 * intensity)); // Small blue dot
        
        // 4. Far side (past center) - Elongated tail extending far out
        this.drawGlow(sx + dx * 2.0, sy + dy * 2.0, 100, c(0.7, 0.6, 1.0, 0.15 * intensity)); // Large purple soft
        this.drawGlow(sx + dx * 2.5, sy + dy * 2.5, 50, c(0.6, 1.0, 0.9, 0.2 * intensity)); // Cyan
        this.drawGlow(sx + dx * 3.2, sy + dy * 3.2, 140, c(0.9, 0.8, 1.0, 0.1 * intensity)); // Very large faint violet
        this.drawGlow(sx + dx * 4.0, sy + dy * 4.0, 80, c(1.0, 0.9, 0.5, 0.15 * intensity)); // Distant yellow
        
        this.flush();
        
        // Restore normal blending
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
    }

    getCircleTexture() {
        if (this.circleTexture) return this.circleTexture;
        
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(32, 32, 30, 0, Math.PI * 2);
        ctx.fill();
        
        this.circleTexture = this.loadTexture(canvas, '__circle__');
        return this.circleTexture;
    }

    getGlowTexture() {
        if (this.glowTexture) return this.glowTexture;
        
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        
        this.glowTexture = this.loadTexture(canvas, '__glow__');
        return this.glowTexture;
    }

    drawGlow(x, y, radius, color) {
        if (!this.initialized) return;
        
        this.flush();
        this.currentTexture = this.getGlowTexture();
        
        const halfSize = radius;
        this.batchVertices.push(
            x - halfSize, y - halfSize,
            x + halfSize, y - halfSize,
            x + halfSize, y + halfSize,
            x - halfSize, y + halfSize
        );
        
        this.batchTexCoords.push(0, 0, 1, 0, 1, 1, 0, 1);
        this.currentBatchSize++;
        this.flushWithColor(color);
    }
}
