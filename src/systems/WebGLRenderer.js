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
        
        this.viewMatrix = null;
        this.projectionMatrix = null;
        
        this.initialize();
    }
    
    initialize() {
        try {
            this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
            
            if (!this.gl) {
                console.error('WebGL not supported');
                return;
            }
            
            this.gl.disable(this.gl.DEPTH_TEST);
            this.gl.enable(this.gl.BLEND);
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
            
            if (!this.createSpriteShader()) {
                return;
            }
            
            this.createBuffers();
            this.updateProjection(this.logicalWidth, this.logicalHeight);
            this.initialized = true;
            
        } catch (error) {
            console.error('WebGL init failed:', error);
        }
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
            varying vec2 v_texCoord;
            void main() {
                vec4 color = texture2D(u_texture, v_texCoord);
                gl_FragColor = vec4(color.rgb, color.a * u_alpha);
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
            alpha: this.gl.getUniformLocation(this.spriteProgram, 'u_alpha')
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
        
        this.gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        
        this.batchVertices = [];
        this.batchTexCoords = [];
        this.currentBatchSize = 0;
        this.currentTexture = null;
    }
    
    endFrame() {
        if (!this.initialized) return;
        this.flush();
    }
    
    loadTexture(image, url) {
        if (this.textures.has(url)) {
            return this.textures.get(url);
        }
        
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        
        // DON'T flip Y - images are already in correct orientation
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);
        
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
        
        if (this.currentTexture !== texture || this.currentBatchSize >= this.maxBatchSize) {
            this.flush();
            this.currentTexture = texture;
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
     * @param {Image} silhouetteImage - Pre-rendered black silhouette
     * @param {string} imageUrl - Cache key for texture
     * @param {number} opacity - Shadow opacity (0-1)
     * @param {number} skewX - Horizontal skew factor for sun direction
     * @param {number} scaleY - Vertical scale (flatten shadow)
     */
    drawShadow(x, y, width, height, silhouetteImage, imageUrl, opacity, skewX, scaleY) {
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
        
        // Texture coordinates (normal, no flipping for shadows)
        this.batchTexCoords.push(0, 1, 1, 1, 1, 0, 0, 0);
        
        this.currentBatchSize++;
        
        // Flush immediately with custom alpha
        this.flushWithAlpha(opacity);
    }
    
    flush() {
        this.flushWithAlpha(1.0);
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
    
    resize(logicalWidth, logicalHeight) {
        this.logicalWidth = logicalWidth;
        this.logicalHeight = logicalHeight;
        this.updateProjection(logicalWidth, logicalHeight);
    }
}
