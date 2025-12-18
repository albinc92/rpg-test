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
        
        // Perspective strength for fake 3D effect (0.0 = disabled)
        this.perspectiveStrength = 0.0;
        
        // Texture filtering mode ('smooth' = LINEAR, 'sharp' = NEAREST)
        this.currentFilterMode = 'smooth';
        
        // Anti-aliasing mode ('none' or 'msaa')
        this.currentAA = 'msaa';
        
        this.initialize();
    }
    
    /**
     * Initialize with settings
     */
    initializeWithSettings(settings = {}) {
        this.currentFilterMode = settings.textureFiltering || 'smooth';
        this.currentAA = settings.antiAliasing || 'msaa';
    }
    
    initialize() {
        try {
            // Request WebGL context with alpha channel and stencil buffer enabled
            // Note: antialias must be set at context creation time
            const contextOptions = {
                alpha: true,
                premultipliedAlpha: false,
                antialias: this.currentAA === 'msaa',
                stencil: true  // Required for polygon fill without overlap artifacts
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
            
            if (!this.createColorShader()) {
                console.warn('Failed to create color shader');
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
        // Make it larger to account for perspective expansion (shadows at top converge inward,
        // but shadows at bottom can extend beyond normal screen bounds)
        const shadowScale = 1.5; // 50% larger to catch edge shadows
        this.shadowWidth = Math.ceil(this.logicalWidth * shadowScale);
        this.shadowHeight = Math.ceil(this.logicalHeight * shadowScale);
        
        this.shadowTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.shadowTexture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D, 0, this.gl.RGBA,
            this.shadowWidth, this.shadowHeight, 0,
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
            uniform float u_perspectiveStrength; // 0.0 = none, 0.3-0.5 = typical
            uniform float u_billboardMode; // 0.0 = normal (distort shape), 1.0 = billboard (pre-transformed on CPU)
            
            varying vec2 v_texCoord;
            
            void main() {
                gl_Position = u_projection * u_view * vec4(a_position, 0.0, 1.0);
                
                // Fake 3D Perspective Distortion (only for non-billboard sprites)
                // Billboard sprites are pre-transformed on CPU to stay rectangular
                if (u_perspectiveStrength > 0.0 && u_billboardMode < 0.5) {
                    // depth: 0 at bottom, 1 at top (in NDC space)
                    float depth = (gl_Position.y + 1.0) * 0.5;
                    
                    // Calculate the W value for perspective
                    float perspectiveW = 1.0 + (depth * u_perspectiveStrength);
                    
                    // Apply perspective via W component (creates trapezoid)
                    gl_Position.w = perspectiveW;
                }
                
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
            tint: this.gl.getUniformLocation(this.spriteProgram, 'u_tint'),
            perspectiveStrength: this.gl.getUniformLocation(this.spriteProgram, 'u_perspectiveStrength'),
            billboardMode: this.gl.getUniformLocation(this.spriteProgram, 'u_billboardMode')
        };
        
        // Initialize billboard mode to off (normal perspective for map)
        this.billboardMode = false;
        
        return true;
    }
    
    createColorShader() {
        // Simple colored polygon shader with perspective support
        const vs = `
            attribute vec2 a_position;
            uniform mat4 u_projection;
            uniform mat4 u_view;
            uniform float u_perspectiveStrength;
            
            void main() {
                gl_Position = u_projection * u_view * vec4(a_position, 0.0, 1.0);
                
                // Apply same perspective as ground/map
                if (u_perspectiveStrength > 0.0) {
                    float depth = (gl_Position.y + 1.0) * 0.5;
                    float perspectiveW = 1.0 + (depth * u_perspectiveStrength);
                    gl_Position.w = perspectiveW;
                }
            }
        `;
        
        const fs = `
            precision mediump float;
            uniform vec4 u_color;
            void main() {
                gl_FragColor = u_color;
            }
        `;
        
        const vertexShader = this.compileShader(vs, this.gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fs, this.gl.FRAGMENT_SHADER);
        
        if (!vertexShader || !fragmentShader) return false;
        
        this.colorProgram = this.gl.createProgram();
        this.gl.attachShader(this.colorProgram, vertexShader);
        this.gl.attachShader(this.colorProgram, fragmentShader);
        this.gl.linkProgram(this.colorProgram);
        
        if (!this.gl.getProgramParameter(this.colorProgram, this.gl.LINK_STATUS)) {
            return false;
        }
        
        this.colorProgram.locations = {
            position: this.gl.getAttribLocation(this.colorProgram, 'a_position'),
            projection: this.gl.getUniformLocation(this.colorProgram, 'u_projection'),
            view: this.gl.getUniformLocation(this.colorProgram, 'u_view'),
            color: this.gl.getUniformLocation(this.colorProgram, 'u_color'),
            perspectiveStrength: this.gl.getUniformLocation(this.colorProgram, 'u_perspectiveStrength')
        };
        
        return true;
    }
    
    /**
     * Draw a colored polygon with perspective (for debug zones)
     * Uses ear-clipping triangulation for proper handling of concave polygons
     * @param {Array} points - Array of {x, y} points in world coordinates
     * @param {Array} fillColor - [r, g, b, a] fill color (0-1 range, premultiplied)
     * @param {Array} strokeColor - [r, g, b, a] stroke color (0-1 range, premultiplied), or null for no stroke
     * @param {number} strokeWidth - Stroke width in pixels
     */
    drawPolygon(points, fillColor, strokeColor = null, strokeWidth = 2) {
        if (!this.initialized || !this.colorProgram || points.length < 3) return;
        if (!this.viewMatrix || !this.projectionMatrix) return;
        
        // Flush any pending sprite draws
        this.flush();
        
        // Use color program
        this.gl.useProgram(this.colorProgram);
        
        // Set uniforms
        this.gl.uniformMatrix4fv(this.colorProgram.locations.projection, false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.colorProgram.locations.view, false, this.viewMatrix);
        this.gl.uniform1f(this.colorProgram.locations.perspectiveStrength, this.perspectiveStrength);
        
        // Create line vertices for the polygon outline
        const lineVertices = [];
        for (const point of points) {
            lineVertices.push(point.x, point.y);
        }
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(lineVertices), this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.colorProgram.locations.position);
        this.gl.vertexAttribPointer(this.colorProgram.locations.position, 2, this.gl.FLOAT, false, 0, 0);
        
        // For debug zones, just draw outlines - avoids all fill artifacts
        // Draw with fill color as a thicker background line
        if (fillColor) {
            this.gl.uniform4fv(this.colorProgram.locations.color, fillColor);
            this.gl.lineWidth(6); // Thick line to show the zone area
            this.gl.drawArrays(this.gl.LINE_LOOP, 0, points.length);
        }
        
        // Draw stroke on top
        if (strokeColor && strokeWidth > 0) {
            this.gl.uniform4fv(this.colorProgram.locations.color, strokeColor);
            this.gl.lineWidth(strokeWidth);
            this.gl.drawArrays(this.gl.LINE_LOOP, 0, points.length);
        }
        
        // Switch back to sprite program
        this.gl.useProgram(this.spriteProgram);
    }
    
    /**
     * Triangulate a polygon using simple fan triangulation
     * For debug rendering, this is sufficient - concave polygons may have minor visual artifacts
     * but this is fast and won't freeze
     */
    triangulatePolygon(points) {
        if (points.length < 3) return [];
        if (points.length === 3) return [[points[0], points[1], points[2]]];
        
        // Simple fan triangulation from first vertex
        const triangles = [];
        for (let i = 1; i < points.length - 1; i++) {
            triangles.push([points[0], points[i], points[i + 1]]);
        }
        return triangles;
    }
    
    /**
     * Draw a colored rectangle with perspective (for collision boxes)
     * @param {number} x - X position
     * @param {number} y - Y position  
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {Array} fillColor - [r, g, b, a] fill color (0-1 range, premultiplied)
     * @param {Array} strokeColor - [r, g, b, a] stroke color (0-1 range, premultiplied)
     */
    drawRect(x, y, width, height, fillColor, strokeColor = null, strokeWidth = 2) {
        const points = [
            { x: x, y: y },
            { x: x + width, y: y },
            { x: x + width, y: y + height },
            { x: x, y: y + height }
        ];
        this.drawPolygon(points, fillColor, strokeColor, strokeWidth);
    }
    
    /**
     * Draw a colored ellipse with perspective (for circular collision boxes)
     * @param {number} cx - Center X
     * @param {number} cy - Center Y
     * @param {number} rx - Radius X
     * @param {number} ry - Radius Y
     * @param {Array} fillColor - [r, g, b, a] fill color
     * @param {Array} strokeColor - [r, g, b, a] stroke color
     */
    drawEllipse(cx, cy, rx, ry, fillColor, strokeColor = null, strokeWidth = 2) {
        // Approximate ellipse with polygon - fewer segments for small radii
        const maxRadius = Math.max(rx, ry);
        const segments = maxRadius < 10 ? 8 : (maxRadius < 50 ? 12 : 16);
        const points = [];
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push({
                x: cx + Math.cos(angle) * rx,
                y: cy + Math.sin(angle) * ry
            });
        }
        this.drawPolygon(points, fillColor, strokeColor, strokeWidth);
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
    
    /**
     * Set the perspective strength for fake 3D effect
     * @param {number} strength - 0.0 = disabled, 0.3-0.5 = subtle, 1.0 = strong
     */
    setPerspective(strength) {
        this.perspectiveStrength = strength || 0.0;
    }
    
    /**
     * Begin billboard/sprite pass - sprites render upright (Pin-Up Projection)
     * Position is transformed by perspective, but shape is not distorted
     */
    beginSpritePass() {
        if (!this.initialized) return;
        
        // Flush any pending ground/background draws with normal perspective
        this.flush();
        
        // Enable billboard mode
        this.billboardMode = true;
        
        // Update shader uniform immediately
        this.gl.useProgram(this.spriteProgram);
        this.gl.uniform1f(this.spriteProgram.locations.billboardMode, 1.0);
    }
    
    /**
     * End billboard/sprite pass - return to normal perspective mode
     */
    endSpritePass() {
        if (!this.initialized) return;
        
        // Flush any sprites drawn in billboard mode
        this.flush();
        
        // Disable billboard mode
        this.billboardMode = false;
        
        // Update shader uniform immediately
        this.gl.useProgram(this.spriteProgram);
        this.gl.uniform1f(this.spriteProgram.locations.billboardMode, 0.0);
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
        
        this.gl.useProgram(this.spriteProgram);
        
        // Set uniforms
        if (this.projectionMatrix) {
            this.gl.uniformMatrix4fv(this.spriteProgram.locations.projection, false, this.projectionMatrix);
        }
        
        // Set perspective strength for fake 3D effect
        if (this.spriteProgram.locations.perspectiveStrength) {
            this.gl.uniform1f(this.spriteProgram.locations.perspectiveStrength, this.perspectiveStrength || 0.0);
        }
        
        // Start in normal mode (not billboard) - map/ground gets full perspective distortion
        this.billboardMode = false;
        if (this.spriteProgram.locations.billboardMode) {
            this.gl.uniform1f(this.spriteProgram.locations.billboardMode, 0.0);
        }
        
        this.batchVertices = [];
        this.batchTexCoords = [];
        this.currentBatchSize = 0;
        this.currentTexture = null;
        this.currentAlpha = 1.0;
    }
    
    /**
     * Begin shadow rendering pass
     * Shadows are rendered to shadow buffer with same projection as scene (for perspective)
     * Uses MAX blending on alpha to prevent stacking
     */
    beginShadowPass() {
        if (!this.initialized) return;
        
        // Flush any pending draws
        this.flush();
        
        // Switch to shadow framebuffer
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.shadowFramebuffer);
        
        // Set viewport with offset so shadows render in the center of the larger buffer
        const offsetX = (this.shadowWidth - this.logicalWidth) / 2;
        const offsetY = (this.shadowHeight - this.logicalHeight) / 2;
        this.gl.viewport(offsetX, offsetY, this.logicalWidth, this.logicalHeight);
        
        // Clear the entire shadow buffer to transparent
        this.gl.viewport(0, 0, this.shadowWidth, this.shadowHeight);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        
        // Set viewport back to centered region for rendering
        this.gl.viewport(offsetX, offsetY, this.logicalWidth, this.logicalHeight);
        
        // Keep using the same projection matrix so perspective works identically
        // The viewport offset handles centering in the larger buffer
        
        // Use MAX blending - shadows won't stack, we just take the maximum alpha
        this.gl.blendEquation(this.gl.MAX);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        
        this.renderingShadows = true;
    }
    
    endShadowPass() {
        if (!this.initialized) return;
        
        // Flush shadow draws
        this.flush();
        
        // Switch back to scene framebuffer
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.sceneFramebuffer);
        this.gl.viewport(0, 0, this.logicalWidth, this.logicalHeight);
        
        // Restore normal alpha blending for scene
        this.gl.blendEquation(this.gl.FUNC_ADD);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
        
        this.renderingShadows = false;
        
        // Now composite the shadow buffer onto the scene with darken blend
        this.compositeShadows();
    }
    
    /**
     * Composite the shadow buffer onto the scene
     * Uses a darkening blend: dst = dst * (1 - shadow.a)
     */
    compositeShadows() {
        // Darken destination based on shadow alpha
        // blend: result.rgb = dst.rgb * (1 - src.a)
        this.gl.blendEquation(this.gl.FUNC_ADD);
        this.gl.blendFunc(this.gl.ZERO, this.gl.ONE_MINUS_SRC_ALPHA);
        
        // Draw shadow texture as full-screen quad
        this.gl.useProgram(this.spriteProgram);
        
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.shadowTexture);
        this.gl.uniform1i(this.spriteProgram.locations.texture, 0);
        
        // Use identity view and simple ortho projection for screen-space quad
        const identityMatrix = this.createIdentityMatrix();
        const quadProjection = new Float32Array([
            2 / this.logicalWidth, 0, 0, 0,
            0, -2 / this.logicalHeight, 0, 0,
            0, 0, 1, 0,
            -1, 1, 0, 1
        ]);
        
        this.gl.uniformMatrix4fv(this.spriteProgram.locations.projection, false, quadProjection);
        this.gl.uniformMatrix4fv(this.spriteProgram.locations.view, false, identityMatrix);
        this.gl.uniform1f(this.spriteProgram.locations.alpha, 1.0);
        this.gl.uniform3f(this.spriteProgram.locations.tint, 1.0, 1.0, 1.0);
        this.gl.uniform1f(this.spriteProgram.locations.billboardMode, 1.0); // No perspective on composite
        this.gl.uniform1f(this.spriteProgram.locations.perspectiveStrength, 0.0);
        
        // Shadow buffer is larger, so we need to sample the center portion
        // But since we used same projection, shadows are in same position as scene
        // The viewport offset during rendering placed them correctly
        const offsetX = (this.shadowWidth - this.logicalWidth) / 2;
        const offsetY = (this.shadowHeight - this.logicalHeight) / 2;
        
        // Full-screen quad vertices
        const vertices = new Float32Array([
            0, 0,
            this.logicalWidth, 0,
            this.logicalWidth, this.logicalHeight,
            0, this.logicalHeight
        ]);
        
        // Texture coords - sample center of shadow buffer
        // WebGL textures have Y=0 at bottom, but our rendering has Y=0 at top
        // So we need to flip: v = 1 - v
        const u0 = offsetX / this.shadowWidth;
        const u1 = (offsetX + this.logicalWidth) / this.shadowWidth;
        const v0 = 1.0 - (offsetY + this.logicalHeight) / this.shadowHeight;  // top of screen = bottom of texture
        const v1 = 1.0 - offsetY / this.shadowHeight;  // bottom of screen = top of texture
        
        const texCoords = new Float32Array([
            u0, v1,  // top-left of screen
            u1, v1,  // top-right of screen
            u1, v0,  // bottom-right of screen  
            u0, v0   // bottom-left of screen
        ]);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.spriteProgram.locations.position);
        this.gl.vertexAttribPointer(this.spriteProgram.locations.position, 2, this.gl.FLOAT, false, 0, 0);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.spriteProgram.locations.texCoord);
        this.gl.vertexAttribPointer(this.spriteProgram.locations.texCoord, 2, this.gl.FLOAT, false, 0, 0);
        
        // Draw quad
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
        
        // Restore normal blending
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
    }
    
    /**
     * Transform a world position using billboard perspective (same as sprites)
     * This is used by LightManager to position lights correctly in fake 3D mode
     * @param {number} worldX - World X position (center of light)
     * @param {number} worldY - World Y position (ground level, where the light sits)
     * @param {number} cameraX - Camera X offset (used only in fallback 2D mode)
     * @param {number} cameraY - Camera Y offset (used only in fallback 2D mode)
     * @returns {Object} { screenX, screenY, scale } - Transformed screen position and scale factor
     */
    transformWorldToScreen(worldX, worldY, cameraX, cameraY) {
        let screenX, screenY;
        let scale = 1.0;
        
        // Always use viewMatrix if available (handles zoom + camera)
        if (this.viewMatrix && this.projectionMatrix) {
            const vm = this.viewMatrix;
            const pm = this.projectionMatrix;
            
            // Transform world point to clip space (same as vertex shader)
            // Note: viewMatrix already includes camera translation and zoom!
            const viewX = worldX * vm[0] + worldY * vm[4] + vm[12];
            const viewY = worldX * vm[1] + worldY * vm[5] + vm[13];
            
            const clipX = viewX * pm[0] + viewY * pm[4] + pm[12];
            const clipY = viewX * pm[1] + viewY * pm[5] + pm[13];
            
            // Apply perspective transformation if enabled
            if (this.perspectiveStrength > 0) {
                // Calculate depth and perspective W (matching shader EXACTLY)
                const depth = (clipY + 1.0) * 0.5;
                const perspectiveW = 1.0 + (depth * this.perspectiveStrength);
                
                // === Calculate screen position WITH and WITHOUT perspective ===
                // WITHOUT perspective (billboard's natural behavior with W=1):
                const screenX_noPerspective = (clipX + 1.0) * 0.5 * this.logicalWidth;
                const screenY_noPerspective = (1.0 - clipY) * 0.5 * this.logicalHeight;
                
                // WITH perspective (where ground/shadows land):
                const clipX_persp = clipX / perspectiveW;
                const clipY_persp = clipY / perspectiveW;
                const screenX_withPerspective = (clipX_persp + 1.0) * 0.5 * this.logicalWidth;
                const screenY_withPerspective = (1.0 - clipY_persp) * 0.5 * this.logicalHeight;
                
                // === Calculate the delta in screen space ===
                const deltaScreenX = screenX_withPerspective - screenX_noPerspective;
                const deltaScreenY = screenY_withPerspective - screenY_noPerspective;
                
                // The final screen position:
                screenX = screenX_noPerspective + deltaScreenX;
                screenY = screenY_noPerspective + deltaScreenY;
                
                // Scale factor for light radius
                scale = 1.0 / perspectiveW;
            } else {
                // No perspective - just convert clip space to screen space
                screenX = (clipX + 1.0) * 0.5 * this.logicalWidth;
                screenY = (1.0 - clipY) * 0.5 * this.logicalHeight;
            }
        } else {
            // Fallback: no matrices available - simple camera offset (no zoom)
            screenX = worldX - cameraX;
            screenY = worldY - cameraY;
        }
        
        return { screenX, screenY, scale };
    }
    
    /**
     * Transform a screen position back to world coordinates (inverse of transformWorldToScreen)
     * This is used for mouse picking in fake 3D mode
     * @param {number} screenX - Screen X position (0 to logicalWidth)
     * @param {number} screenY - Screen Y position (0 to logicalHeight)
     * @param {number} cameraX - Camera X offset
     * @param {number} cameraY - Camera Y offset
     * @returns {Object} { worldX, worldY } - Approximate world position
     */
    transformScreenToWorld(screenX, screenY, cameraX, cameraY) {
        // Default result (no perspective) - simple camera addition
        let worldX = screenX + cameraX;
        let worldY = screenY + cameraY;
        
        // Apply inverse perspective transformation if enabled
        if (this.perspectiveStrength > 0 && this.viewMatrix && this.projectionMatrix) {
            // This is an iterative approximation since the perspective transform
            // is not easily invertible (depth depends on Y which changes with perspective)
            
            // Start with a guess: the non-perspective world position
            // screenX/Y are already zoom-adjusted canvas coords, so add camera to get world
            let guessWorldX = screenX + cameraX;
            let guessWorldY = screenY + cameraY;
            
            // Iterate to refine the guess (usually converges in 3-5 iterations)
            for (let i = 0; i < 10; i++) {
                // Transform our guess to screen space
                const transformed = this.transformWorldToScreen(guessWorldX, guessWorldY, cameraX, cameraY);
                
                // Calculate error - compare against zoom-adjusted screen position
                const errorX = screenX - transformed.screenX;
                const errorY = screenY - transformed.screenY;
                
                // If error is small enough, we're done
                if (Math.abs(errorX) < 0.5 && Math.abs(errorY) < 0.5) {
                    break;
                }
                
                // Adjust guess based on error
                guessWorldX += errorX;
                guessWorldY += errorY;
            }
            
            worldX = guessWorldX;
            worldY = guessWorldY;
        }
        
        return { worldX, worldY };
    }
    
    /**
     * Calculate the world position to store so that after billboard transformation,
     * the sprite CENTER appears at the target screen position.
     * This is the inverse of the billboard position shift applied in drawSprite.
     * 
     * In billboard mode, drawSprite does:
     * 1. Calculate base position: baseX = drawX + width/2, baseY = drawY + height
     * 2. Calculate delta based on perspective at base position
     * 3. Calculate correctedBase = base + delta
     * 4. Scale sprite: scaledW = width/perspectiveW, scaledH = height/perspectiveW
     * 5. Draw sprite CENTERED on correctedBaseX, extending UP from correctedBaseY
     * 
     * So final center of rendered sprite is:
     *   finalCenterX = correctedBaseX = baseX + deltaX = (drawX + width/2) + deltaX
     *   finalCenterY = correctedBaseY - scaledHeight/2 = (drawY + height + deltaY) - scaledHeight/2
     * 
     * Since objects store CENTER position and StaticObject converts to draw coords:
     *   drawX = centerX - width/2, drawY = centerY - height/2
     * 
     * Therefore:
     *   finalCenterX = centerX + deltaX
     *   finalCenterY = centerY + height/2 + deltaY - scaledHeight/2
     * 
     * @param {number} targetCenterX - Where we want sprite CENTER to appear (world coords)
     * @param {number} targetCenterY - Where we want sprite CENTER to appear (world coords)
     * @param {number} spriteWidth - Width of sprite after resolutionScale
     * @param {number} spriteHeight - Height of sprite after resolutionScale
     * @returns {Object} { x, y } - World CENTER position to store so sprite renders at target
     */
    inverseBillboardTransform(targetCenterX, targetCenterY, spriteWidth, spriteHeight) {
        // If no perspective, no transformation needed
        if (this.perspectiveStrength <= 0 || !this.viewMatrix || !this.projectionMatrix) {
            console.log('[INVERSE] No perspective, returning target as-is');
            return { x: targetCenterX, y: targetCenterY };
        }
        
        console.log('[INVERSE] Input target CENTER:', targetCenterX, targetCenterY, 'sprite:', spriteWidth, 'x', spriteHeight);
        console.log('[INVERSE] perspectiveStrength:', this.perspectiveStrength);
        
        const vm = this.viewMatrix;
        const pm = this.projectionMatrix;
        
        // Iteratively find what center position to store
        let guessCenterX = targetCenterX;
        let guessCenterY = targetCenterY;
        
        for (let i = 0; i < 10; i++) {
            // Convert guess center to draw coords (top-left) - this is what StaticObject does
            const guessDrawX = guessCenterX - spriteWidth / 2;
            const guessDrawY = guessCenterY - spriteHeight / 2;
            
            // Calculate base position (as drawSprite does)
            const baseX = guessDrawX + spriteWidth / 2;  // = guessCenterX
            const baseY = guessDrawY + spriteHeight;     // = guessCenterY + height/2
            
            // Transform base to get delta and perspectiveW
            const viewX = baseX * vm[0] + baseY * vm[4] + vm[12];
            const viewY = baseX * vm[1] + baseY * vm[5] + vm[13];
            const clipX = viewX * pm[0] + viewY * pm[4] + pm[12];
            const clipY = viewX * pm[1] + viewY * pm[5] + pm[13];
            
            const depth = (clipY + 1.0) * 0.5;
            const perspectiveW = 1.0 + (depth * this.perspectiveStrength);
            const zoom = vm[0];
            
            // Screen positions
            const screenX_noPersp = (clipX + 1.0) * 0.5 * this.logicalWidth;
            const screenY_noPersp = (1.0 - clipY) * 0.5 * this.logicalHeight;
            const clipX_persp = clipX / perspectiveW;
            const clipY_persp = clipY / perspectiveW;
            const screenX_withPersp = (clipX_persp + 1.0) * 0.5 * this.logicalWidth;
            const screenY_withPersp = (1.0 - clipY_persp) * 0.5 * this.logicalHeight;
            
            // Delta in world coords
            const deltaX = (screenX_withPersp - screenX_noPersp) / zoom;
            const deltaY = (screenY_withPersp - screenY_noPersp) / zoom;
            
            // Scaled height after billboard
            const scaledHeight = spriteHeight / perspectiveW;
            
            // Calculate where the final CENTER would appear
            // correctedBaseX = baseX + deltaX = guessCenterX + deltaX
            // correctedBaseY = baseY + deltaY = guessCenterY + height/2 + deltaY
            // finalCenterY = correctedBaseY - scaledHeight/2
            const resultCenterX = guessCenterX + deltaX;
            const resultCenterY = guessCenterY + spriteHeight/2 + deltaY - scaledHeight/2;
            
            // Error from target
            const errorX = targetCenterX - resultCenterX;
            const errorY = targetCenterY - resultCenterY;
            
            if (i === 0) {
                console.log('[INVERSE] Iteration 0: guessCenter=', guessCenterX.toFixed(1), guessCenterY.toFixed(1), 
                    'deltaX=', deltaX.toFixed(1), 'deltaY=', deltaY.toFixed(1),
                    'perspectiveW=', perspectiveW.toFixed(3), 'scaledH=', scaledHeight.toFixed(1),
                    'resultCenter=', resultCenterX.toFixed(1), resultCenterY.toFixed(1),
                    'error=', errorX.toFixed(1), errorY.toFixed(1));
            }
            
            // If close enough, done
            if (Math.abs(errorX) < 0.5 && Math.abs(errorY) < 0.5) {
                console.log('[INVERSE] Converged at iteration', i);
                break;
            }
            
            // Adjust guess
            guessCenterX += errorX;
            guessCenterY += errorY;
        }
        
        console.log('[INVERSE] Final result CENTER:', guessCenterX, guessCenterY);
        return { x: guessCenterX, y: guessCenterY };
    }
    
    /**
     * Calculate the billboard position delta that drawSprite applies
     * This mirrors the logic in drawSprite's billboard mode
     * 
     * @param {number} drawX - Top-left X of sprite (as passed to drawSprite)
     * @param {number} drawY - Top-left Y of sprite (as passed to drawSprite)  
     * @param {number} spriteWidth - Width of sprite after scale
     * @param {number} spriteHeight - Height of sprite after scale
     */
    calculateBillboardDelta(drawX, drawY, spriteWidth, spriteHeight) {
        if (this.perspectiveStrength <= 0 || !this.viewMatrix || !this.projectionMatrix) {
            return { x: 0, y: 0 };
        }
        
        const vm = this.viewMatrix;
        const pm = this.projectionMatrix;
        const zoom = vm[0];
        
        // Sprite base position - EXACTLY matching drawSprite:
        // const baseX = x + width / 2;  // Center X of sprite base
        // const baseY = y + height;     // Bottom Y of sprite = ground contact point
        const baseX = drawX + spriteWidth / 2;
        const baseY = drawY + spriteHeight;
        
        // Transform base point to clip space
        const viewX = baseX * vm[0] + baseY * vm[4] + vm[12];
        const viewY = baseX * vm[1] + baseY * vm[5] + vm[13];
        
        const clipX = viewX * pm[0] + viewY * pm[4] + pm[12];
        const clipY = viewX * pm[1] + viewY * pm[5] + pm[13];
        
        // Calculate depth and perspective W
        const depth = (clipY + 1.0) * 0.5;
        const perspectiveW = 1.0 + (depth * this.perspectiveStrength);
        
        // Screen position without perspective
        const screenX_noPerspective = (clipX + 1.0) * 0.5 * this.logicalWidth;
        const screenY_noPerspective = (1.0 - clipY) * 0.5 * this.logicalHeight;
        
        // Screen position with perspective
        const clipX_persp = clipX / perspectiveW;
        const clipY_persp = clipY / perspectiveW;
        const screenX_withPerspective = (clipX_persp + 1.0) * 0.5 * this.logicalWidth;
        const screenY_withPerspective = (1.0 - clipY_persp) * 0.5 * this.logicalHeight;
        
        // Delta in screen space
        const deltaScreenX = screenX_withPerspective - screenX_noPerspective;
        const deltaScreenY = screenY_withPerspective - screenY_noPerspective;
        
        // Convert to world delta
        const deltaWorldX = deltaScreenX / zoom;
        const deltaWorldY = deltaScreenY / zoom;
        
        return { x: deltaWorldX, y: deltaWorldY };
    }
    
    /**
     * Get current perspective parameters for external systems (like LightManager)
     * @returns {Object} { enabled, strength, viewMatrix, projectionMatrix, logicalWidth, logicalHeight }
     */
    getPerspectiveParams() {
        return {
            enabled: this.perspectiveStrength > 0,
            strength: this.perspectiveStrength || 0,
            viewMatrix: this.viewMatrix,
            projectionMatrix: this.projectionMatrix,
            logicalWidth: this.logicalWidth,
            logicalHeight: this.logicalHeight
        };
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
        
        // Use current filter mode setting (default to LINEAR for smooth)
        const filterMode = this.currentFilterMode === 'sharp' ? this.gl.NEAREST : this.gl.LINEAR;
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, filterMode);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, filterMode);
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
        
        // Calculate vertex positions
        let x0 = x, y0 = y;                    // top-left
        let x1 = x + width, y1 = y;            // top-right  
        let x2 = x + width, y2 = y + height;   // bottom-right
        let x3 = x, y3 = y + height;           // bottom-left
        
        // BILLBOARD MODE: Pre-apply perspective transformation on CPU
        // Goal: The sprite's BASE (bottom) should land exactly where the ground would be
        // after perspective transformation, then the sprite extends upward keeping its shape
        if (this.billboardMode && this.perspectiveStrength > 0 && this.viewMatrix && this.projectionMatrix) {
            // Sprite base position (where feet touch ground)
            const baseX = x + width / 2;  // Center X of sprite base
            const baseY = y + height;     // Bottom Y of sprite = ground contact point
            
            const vm = this.viewMatrix;
            const pm = this.projectionMatrix;
            const zoom = vm[0];
            
            // === Transform base point to clip space (same as vertex shader) ===
            const viewX = baseX * vm[0] + baseY * vm[4] + vm[12];
            const viewY = baseX * vm[1] + baseY * vm[5] + vm[13];
            
            const clipX = viewX * pm[0] + viewY * pm[4] + pm[12];
            const clipY = viewX * pm[1] + viewY * pm[5] + pm[13];
            
            // === Calculate depth and perspective W (matching shader EXACTLY - NO CLAMPING!) ===
            // Shader: depth = (gl_Position.y + 1.0) * 0.5
            // Shader does NOT clamp, so neither should we!
            const depth = (clipY + 1.0) * 0.5;
            const perspectiveW = 1.0 + (depth * this.perspectiveStrength);
            
            // === Calculate screen position WITH and WITHOUT perspective ===
            // Convert clip to screen pixels for easier reasoning
            // Screen X = (clipX + 1) * 0.5 * logicalWidth
            // Screen Y = (1 - clipY) * 0.5 * logicalHeight (flipped for screen coords)
            
            // WITHOUT perspective (billboard's natural behavior with W=1):
            const screenX_noPerspective = (clipX + 1.0) * 0.5 * this.logicalWidth;
            const screenY_noPerspective = (1.0 - clipY) * 0.5 * this.logicalHeight;
            
            // WITH perspective (where ground/shadows land):
            const clipX_persp = clipX / perspectiveW;
            const clipY_persp = clipY / perspectiveW;
            const screenX_withPerspective = (clipX_persp + 1.0) * 0.5 * this.logicalWidth;
            const screenY_withPerspective = (1.0 - clipY_persp) * 0.5 * this.logicalHeight;
            
            // === Calculate the delta in screen space ===
            const deltaScreenX = screenX_withPerspective - screenX_noPerspective;
            const deltaScreenY = screenY_withPerspective - screenY_noPerspective;
            
            // === Convert screen delta back to world delta ===
            // screen = world * zoom (simplified, ignoring translation since it's a delta)
            const deltaWorldX = deltaScreenX / zoom;
            const deltaWorldY = deltaScreenY / zoom;
            
            // === Apply delta to get corrected base position ===
            const correctedBaseX = baseX + deltaWorldX;
            const correctedBaseY = baseY + deltaWorldY;
            
            // === Build sprite from corrected base position ===
            const scale = 1.0 / perspectiveW;
            const scaledWidth = width * scale;
            const scaledHeight = height * scale;
            
            // Sprite base is at corrected position, extends upward
            x0 = correctedBaseX - scaledWidth / 2;
            y0 = correctedBaseY - scaledHeight;
            x1 = correctedBaseX + scaledWidth / 2;
            y1 = correctedBaseY - scaledHeight;
            x2 = correctedBaseX + scaledWidth / 2;
            y2 = correctedBaseY;
            x3 = correctedBaseX - scaledWidth / 2;
            y3 = correctedBaseY;
        }
        
        // Push vertex positions (top-left, top-right, bottom-right, bottom-left)
        this.batchVertices.push(x0, y0, x1, y1, x2, y2, x3, y3);
        
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
        
        // Set billboard mode uniform - controls whether sprites get shape distortion
        this.gl.uniform1f(this.spriteProgram.locations.billboardMode, this.billboardMode ? 1.0 : 0.0);
        
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
     * Draw a line in screen space (bypasses camera and perspective)
     * Coordinates are in screen/canvas pixels
     */
    drawLineScreenSpace(x1, y1, x2, y2, thickness, color) {
        if (!this.initialized) return;
        
        this.flush();
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length < 0.1) return;
        
        const perpX = -dy / length * (thickness / 2);
        const perpY = dx / length * (thickness / 2);
        
        const corners = [
            [x1 - perpX, y1 - perpY],
            [x1 + perpX, y1 + perpY],
            [x2 + perpX, y2 + perpY],
            [x2 - perpX, y2 - perpY]
        ];
        
        if (!this.whiteTexture) {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, 1, 1);
            this.whiteTexture = this.loadTexture(canvas, '__white__');
        }
        
        this.currentTexture = this.whiteTexture;
        
        this.batchVertices.push(
            corners[0][0], corners[0][1],
            corners[1][0], corners[1][1],
            corners[2][0], corners[2][1],
            corners[3][0], corners[3][1]
        );
        
        this.batchTexCoords.push(0, 0, 0, 1, 1, 1, 1, 0);
        this.currentBatchSize++;
        
        // Flush in screen space (no view matrix, no perspective)
        this.flushWithColor(color, true);
    }
    
    /**
     * Draw a circle in screen space (bypasses camera and perspective)
     */
    drawCircleScreenSpace(x, y, radius, color) {
        if (!this.initialized) return;
        
        this.flush();
        
        this.currentTexture = this.getCircleTexture();
        
        const left = x - radius;
        const right = x + radius;
        const top = y - radius;
        const bottom = y + radius;
        
        this.batchVertices.push(
            left, top,
            left, bottom,
            right, bottom,
            right, top
        );
        
        this.batchTexCoords.push(0, 0, 0, 1, 1, 1, 1, 0);
        this.currentBatchSize++;
        
        this.flushWithColor(color, true);
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
     * @param {Array} color - RGBA color
     * @param {boolean} useScreenSpace - If true, bypass view matrix (draw directly in screen coords)
     */
    flushWithColor(color, useScreenSpace = false) {
        if (this.currentBatchSize === 0) return;
        
        this.gl.useProgram(this.spriteProgram);
        
        if (this.currentTexture) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.currentTexture);
            this.gl.uniform1i(this.spriteProgram.locations.texture, 0);
        }
        
        this.gl.uniformMatrix4fv(this.spriteProgram.locations.projection, false, this.projectionMatrix);
        
        // Use identity matrix for screen space, view matrix for world space
        if (useScreenSpace) {
            this.gl.uniformMatrix4fv(this.spriteProgram.locations.view, false, this.createIdentityMatrix());
            // No perspective in screen space
            if (this.spriteProgram.locations.perspectiveStrength) {
                this.gl.uniform1f(this.spriteProgram.locations.perspectiveStrength, 0.0);
            }
        } else {
            this.gl.uniformMatrix4fv(this.spriteProgram.locations.view, false, this.viewMatrix || this.createIdentityMatrix());
            // Apply perspective transform (not billboard mode - we want the 3D effect)
            if (this.spriteProgram.locations.perspectiveStrength) {
                this.gl.uniform1f(this.spriteProgram.locations.perspectiveStrength, this.perspectiveStrength || 0.0);
            }
        }
        
        if (this.spriteProgram.locations.billboardMode) {
            this.gl.uniform1f(this.spriteProgram.locations.billboardMode, 0.0);
        }
        
        this.gl.uniform1f(this.spriteProgram.locations.alpha, color[3]);
        this.gl.uniform3f(this.spriteProgram.locations.tint, color[0], color[1], color[2]);
        
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
        
        // IMPORTANT: Disable perspective for lens flare - it's a screen-space effect
        // rendered "on the camera lens", not in the 3D world
        const savedPerspective = this.perspectiveStrength;
        this.perspectiveStrength = 0;
        this.gl.useProgram(this.spriteProgram);
        this.gl.uniform1f(this.spriteProgram.locations.perspectiveStrength, 0);

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
        this.drawGlow(sx + dx * 0.2, sy + dy * 0.2, 50, c(1.0, 0.5, 0.0, 0.5 * intensity)); // Deep Orange
        
        // 2. Mid range (greenish) - Pushed closer to sun (away from center)
        this.drawGlow(sx + dx * 0.4, sy + dy * 0.4, 70, c(0.0, 1.0, 0.2, 0.3 * intensity)); // Bright Green
        
        // GAP AROUND CENTER (0.5 - 3.0) - HUGE GAP to keep player clear
        
        // 3. Past center (blue/purple) - Pushed WAY further out
        this.drawGlow(sx + dx * 3.0, sy + dy * 3.0, 40, c(0.0, 0.2, 1.0, 0.6 * intensity)); // Deep Blue
        this.drawGlow(sx + dx * 4.5, sy + dy * 4.5, 60, c(1.0, 0.0, 1.0, 0.4 * intensity)); // Magenta
        
        // 4. Far side (past center) - Elongated tail extending EXTREMELY far out
        this.drawGlow(sx + dx * 7.0, sy + dy * 7.0, 120, c(0.5, 0.0, 0.8, 0.3 * intensity)); // Purple
        this.drawGlow(sx + dx * 10.0, sy + dy * 10.0, 80, c(0.0, 1.0, 1.0, 0.4 * intensity)); // Cyan
        this.drawGlow(sx + dx * 15.0, sy + dy * 15.0, 160, c(0.8, 0.8, 0.0, 0.25 * intensity)); // Yellow
        this.drawGlow(sx + dx * 22.0, sy + dy * 22.0, 100, c(1.0, 0.0, 0.0, 0.2 * intensity)); // Red Distant

        this.flush();
        
        // Restore normal blending
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
        
        // Restore perspective strength
        this.perspectiveStrength = savedPerspective;
        this.gl.uniform1f(this.spriteProgram.locations.perspectiveStrength, savedPerspective);
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
    
    /**
     * Set texture filtering mode for all textures
     * @param {string} mode - 'smooth' (LINEAR) or 'sharp' (NEAREST)
     */
    setTextureFiltering(mode) {
        if (!this.gl) return;
        
        const gl = this.gl;
        const filterMode = mode === 'sharp' ? gl.NEAREST : gl.LINEAR;
        
        // Update all cached textures
        for (const [url, texture] of this.textures.entries()) {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filterMode);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filterMode);
        }
        
        this.currentFilterMode = mode;
        console.log(`[WebGLRenderer] Texture filtering set to: ${mode} (${mode === 'sharp' ? 'NEAREST' : 'LINEAR'})`);
    }
    
    /**
     * Get current texture filtering mode
     */
    getTextureFiltering() {
        return this.currentFilterMode || 'smooth';
    }
}
