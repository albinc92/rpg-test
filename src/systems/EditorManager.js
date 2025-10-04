/**
 * EditorManager - Main controller for the in-game map editor
 * Toggle with F2 or Ctrl+E
 */
class EditorManager {
    constructor(game) {
        this.game = game;
        this.isActive = false;
        this.isPaused = false;
        
        // Editor state
        this.selectedTool = 'select'; // 'select', 'place' (move/delete integrated into select)
        this.selectedObject = null; // Currently selected object on map
        this.selectedPrefab = null; // Object type to place
        this.clipboard = null;
        this.previewSprite = null; // Cached sprite for placement preview
        
        // Drag state for moving objects
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        
        // Placement preview
        this.previewObject = null;
        this.mouseWorldX = 0;
        this.mouseWorldY = 0;
        this.rawMouseX = 0; // Raw screen mouse position
        this.rawMouseY = 0;
        
        // Grid settings
        this.gridEnabled = true;
        this.gridSize = 32;
        this.snapToGrid = false;
        this.showCollisionBoxes = false;
        
        // UI components
        this.ui = null;
        this.objectPalette = null;
        this.propertyPanel = null;
        
        // History for undo/redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        console.log('[EditorManager] Initialized');
    }

    /**
     * Setup keyboard shortcuts for editor
     */
    setupKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            // Toggle editor with F2 or Ctrl+E
            if (e.key === 'F2' || (e.ctrlKey && e.key === 'e')) {
                e.preventDefault();
                this.toggle();
                return;
            }
            
            // Only process other shortcuts when editor is active
            if (!this.isActive) return;
            
            // Escape cancels placement mode
            if (e.key === 'Escape' && this.selectedTool === 'place') {
                e.preventDefault();
                this.selectedPrefab = null;
                this.setTool('select');
                console.log('[EditorManager] Placement cancelled');
            }
            
            // Delete selected object with 'D' or Delete key
            else if ((e.key === 'd' || e.key === 'D' || e.key === 'Delete') && this.selectedObject) {
                e.preventDefault();
                this.deleteObject(this.selectedObject);
            }
            
            // Copy/paste
            else if (e.ctrlKey && e.key === 'c' && this.selectedObject) {
                e.preventDefault();
                this.copyObject(this.selectedObject);
            } else if (e.ctrlKey && e.key === 'v' && this.clipboard) {
                e.preventDefault();
                this.pasteObject();
            }
            
            // Undo/redo
            else if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undo();
            } else if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                this.redo();
            }
            
            // Save
            else if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.save();
            }
            
            // Toggle grid
            else if (e.key === 'g' || e.key === 'G') {
                this.gridEnabled = !this.gridEnabled;
                console.log('[EditorManager] Grid:', this.gridEnabled ? 'ON' : 'OFF');
                if (this.ui) this.ui.updateViewMenu();
            }
            
            // Toggle collision boxes
            else if (e.key === 'c' || e.key === 'C') {
                this.showCollisionBoxes = !this.showCollisionBoxes;
                console.log('[EditorManager] Collision Boxes:', this.showCollisionBoxes ? 'ON' : 'OFF');
                if (this.ui) this.ui.updateViewMenu();
            }
            
            // Toggle snap to grid
            else if (e.key === 'Shift') {
                this.snapToGrid = true;
                if (this.ui) this.ui.updateViewMenu();
            }
            
            // Check if user is typing in a text field
            const isTyping = document.activeElement && 
                            (document.activeElement.tagName === 'INPUT' || 
                             document.activeElement.tagName === 'TEXTAREA' ||
                             document.activeElement.isContentEditable);
            
            // Zoom controls (only if not typing)
            if (!isTyping) {
                if (e.key === '+' || e.key === '=') {
                    e.preventDefault();
                    this.zoomIn();
                } else if (e.key === '-' || e.key === '_') {
                    e.preventDefault();
                    this.zoomOut();
                } else if (e.key === '0') {
                    e.preventDefault();
                    this.resetZoom();
                }
            }
        });
        
        window.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') {
                this.snapToGrid = false;
                if (this.ui) this.ui.updateViewMenu();
            }
        });
    }

    /**
     * Toggle editor on/off
     */
    toggle() {
        this.isActive = !this.isActive;
        
        if (this.isActive) {
            this.activate();
        } else {
            this.deactivate();
        }
    }

    /**
     * Activate editor mode
     */
    activate() {
        console.log('[EditorManager] Editor activated');
        
        // Pause game
        this.isPaused = this.game.isPaused;
        this.game.isPaused = true;
        
        // Always start in select mode
        this.selectedTool = 'select';
        this.selectedPrefab = null;
        
        // Create UI if not exists
        if (!this.ui) {
            this.ui = new EditorUI(this);
            this.propertyPanel = new PropertyPanel(this);
        }
        
        // Show UI
        this.ui.show();
        
        // Setup mouse event listeners for drag
        this.setupMouseListeners();
        
        // Change cursor
        this.game.canvas.style.cursor = 'crosshair';
    }

    /**
     * Deactivate editor mode
     */
    deactivate() {
        console.log('[EditorManager] Editor deactivated');
        
        // Reset zoom to normal gameplay
        this.game.camera.zoom = 1.0;
        
        // Restore game pause state
        this.game.isPaused = this.isPaused;
        
        // Hide UI
        if (this.ui) {
            this.ui.hide();
            this.propertyPanel.hide();
        }
        
        // Clear selection and drag state
        this.selectedObject = null;
        this.previewObject = null;
        this.isDragging = false;
        
        // Remove mouse listeners
        this.removeMouseListeners();
        
        // Restore cursor
        this.game.canvas.style.cursor = 'none';
    }

    /**
     * Set current tool
     */
    setTool(tool) {
        this.selectedTool = tool;
        console.log('[EditorManager] Tool:', tool);
        
        // Clear prefab if switching to select
        if (tool === 'select') {
            this.selectedPrefab = null;
            this.previewSprite = null;
        }
        
        // Load preview sprite when entering place mode
        if (tool === 'place' && this.selectedPrefab && this.selectedPrefab.spriteSrc) {
            this.loadPreviewSprite(this.selectedPrefab.spriteSrc);
        }
        
        // Update UI
        if (this.ui) {
            this.ui.updateToolButtons();
        }
        
        // Clear selection if not select tool
        if (tool !== 'select') {
            this.selectedObject = null;
            if (this.propertyPanel) {
                this.propertyPanel.hide();
            }
        }
    }
    
    /**
     * Load sprite for placement preview
     */
    loadPreviewSprite(src) {
        this.previewSprite = new Image();
        this.previewSprite.onload = () => {
            console.log('[EditorManager] Preview sprite loaded:', src);
            console.log('[EditorManager] Raw mouse at load:', this.rawMouseX, this.rawMouseY);
        };
        this.previewSprite.onerror = () => {
            console.error('[EditorManager] Failed to load preview sprite:', src);
            this.previewSprite = null;
        };
        this.previewSprite.src = src;
    }

    /**
     * Update editor (called from game loop)
     */
    update(deltaTime) {
        if (!this.isActive) return;
        
        // Update mouse world position
        this.updateMousePosition();
        
        // Update preview object position if in place mode
        if (this.selectedTool === 'place' && this.selectedPrefab) {
            this.updatePlacementPreview();
        }
    }

    /**
     * Update mouse world position
     */
    updateMousePosition() {
        const rect = this.game.canvas.getBoundingClientRect();
        const canvas = this.game.canvas;
        const ctx = this.game.ctx;
        
        // Get mouse position (use rawMouse to match preview rendering)
        const mouseScreenX = this.rawMouseX;
        const mouseScreenY = this.rawMouseY;
        
        // Calculate position relative to canvas element
        const relativeX = mouseScreenX - rect.left;
        const relativeY = mouseScreenY - rect.top;
        
        // Get the current context transform to see if there's additional scaling
        const transform = ctx.getTransform();
        const contextScaleX = transform.a; // X scale from context
        const contextScaleY = transform.d; // Y scale from context
        
        // Account for both canvas size difference AND context scale
        const canvasToDisplayX = canvas.width / rect.width;
        const canvasToDisplayY = canvas.height / rect.height;
        
        // The actual scale we need is: canvas-to-display / context-scale
        const finalScaleX = canvasToDisplayX / contextScaleX;
        const finalScaleY = canvasToDisplayY / contextScaleY;
        
        const mouseCanvasX = relativeX * finalScaleX;
        const mouseCanvasY = relativeY * finalScaleY;
        
        // Convert canvas to world coordinates (add camera offset)
        // The mouse canvas position needs to account for zoom to get the correct world position
        const camera = this.game.camera;
        const zoom = camera.zoom || 1.0;
        
        // To get world position, we need to reverse the zoom transformation
        let worldCanvasX = mouseCanvasX;
        let worldCanvasY = mouseCanvasY;
        
        if (zoom !== 1.0) {
            const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
            const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            
            // Reverse the zoom transformation: (point - center) / zoom + center
            worldCanvasX = (mouseCanvasX - centerX) / zoom + centerX;
            worldCanvasY = (mouseCanvasY - centerY) / zoom + centerY;
        }
        
        this.mouseWorldX = worldCanvasX + camera.x;
        this.mouseWorldY = worldCanvasY + camera.y;
        
        // Apply grid snap if enabled
        if (this.snapToGrid) {
            this.mouseWorldX = Math.round(this.mouseWorldX / this.gridSize) * this.gridSize;
            this.mouseWorldY = Math.round(this.mouseWorldY / this.gridSize) * this.gridSize;
        }
    }

    /**
     * Update placement preview
     */
    updatePlacementPreview() {
        // TODO: Create preview object at mouse position
    }

    /**
     * Render editor overlay
     */
    render(ctx) {
        if (!this.isActive) return;
        
        // Render grid
        if (this.gridEnabled) {
            this.renderGrid(ctx);
        }
        
        // Render selection highlight
        if (this.selectedObject) {
            this.renderSelection(ctx);
        }
        
        // Render placement preview
        if (this.selectedTool === 'place' && this.selectedPrefab) {
            this.renderPlacementPreview(ctx);
        }
        
        // Render UI overlays
        this.renderOverlays(ctx);
    }

    /**
     * Render grid
     */
    renderGrid(ctx) {
        const camera = this.game.camera;
        const startX = Math.floor(camera.x / this.gridSize) * this.gridSize;
        const startY = Math.floor(camera.y / this.gridSize) * this.gridSize;
        const endX = startX + this.game.CANVAS_WIDTH + this.gridSize;
        const endY = startY + this.game.CANVAS_HEIGHT + this.gridSize;
        
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = startX; x < endX; x += this.gridSize) {
            const screenX = x - camera.x;
            ctx.beginPath();
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, this.game.CANVAS_HEIGHT);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = startY; y < endY; y += this.gridSize) {
            const screenY = y - camera.y;
            ctx.beginPath();
            ctx.moveTo(0, screenY);
            ctx.lineTo(this.game.CANVAS_WIDTH, screenY);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    /**
     * Render selection highlight
     */
    renderSelection(ctx) {
        if (!this.selectedObject) return;
        
        const camera = this.game.camera;
        const bounds = this.selectedObject.getCollisionBounds(this.game);
        
        ctx.save();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        ctx.strokeRect(
            bounds.x - camera.x,
            bounds.y - camera.y,
            bounds.width,
            bounds.height
        );
        
        ctx.restore();
    }

    /**
     * Render placement preview
     */
    renderPlacementPreview(ctx) {
        if (!this.selectedPrefab) return;
        
        // The canvas has complex scaling:
        // 1. Canvas internal dimensions (e.g., 1546×1203)
        // 2. CSS display dimensions (e.g., 799×621)
        // 3. Context transform scale (devicePixelRatio on mobile)
        
        const rect = this.game.canvas.getBoundingClientRect();
        const canvas = this.game.canvas;
        
        // Get mouse position in screen/CSS pixels, relative to canvas element
        const mouseScreenX = this.rawMouseX;
        const mouseScreenY = this.rawMouseY;
        const relativeX = mouseScreenX - rect.left;
        const relativeY = mouseScreenY - rect.top;
        
        // Get the current context transform to see if there's additional scaling
        const transform = ctx.getTransform();
        const contextScaleX = transform.a; // X scale from context
        const contextScaleY = transform.d; // Y scale from context
        
        // Account for both canvas size difference AND context scale
        const canvasToDisplayX = canvas.width / rect.width;
        const canvasToDisplayY = canvas.height / rect.height;
        
        // The actual scale we need is: canvas-to-display / context-scale
        const finalScaleX = canvasToDisplayX / contextScaleX;
        const finalScaleY = canvasToDisplayY / contextScaleY;
        
        const screenX = relativeX * finalScaleX;
        const screenY = relativeY * finalScaleY;
        
        ctx.save();
        
        // Apply the same transformation that RenderSystem uses for the world
        const camera = this.game.camera;
        const zoom = camera.zoom || 1.0;
        
        if (zoom !== 1.0) {
            const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
            const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
            
            // Scale around center point (same as RenderSystem)
            ctx.translate(canvasWidth / 2, canvasHeight / 2);
            ctx.scale(zoom, zoom);
            ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        }
        
        // Apply camera translation (same as RenderSystem)
        ctx.translate(-camera.x, -camera.y);
        
        // Now we need to convert screenX/screenY to world coordinates for rendering
        // because we've applied the same transformation as the world
        const worldX = this.mouseWorldX;
        const worldY = this.mouseWorldY;
        
        // Get sprite and dimensions
        let sprite = this.previewSprite;
        let spriteWidth = 64;
        let spriteHeight = 64;
        let scale = this.selectedPrefab.scale || 1;
        
        // Use loaded preview sprite if available - USE naturalWidth/naturalHeight!
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            spriteWidth = sprite.naturalWidth;
            spriteHeight = sprite.naturalHeight;
        }
        
        // Calculate final dimensions with scaling (same as GameObject)
        const resolutionScale = this.game.resolutionScale || 1;
        const finalScale = scale * resolutionScale;
        const scaledWidth = spriteWidth * finalScale;
        const scaledHeight = spriteHeight * finalScale;
        
        // Calculate position in world space (GameObjects are rendered from center)
        const drawX = worldX - scaledWidth / 2;
        const drawY = worldY - scaledHeight / 2;
        
        // Draw semi-transparent sprite
        if (sprite) {
            ctx.globalAlpha = 0.5;
            ctx.drawImage(
                sprite,
                drawX,
                drawY,
                scaledWidth,
                scaledHeight
            );
            ctx.globalAlpha = 1.0;
        } else {
            // Fallback: draw placeholder box
            ctx.fillStyle = 'rgba(74, 158, 255, 0.5)';
            ctx.strokeStyle = 'rgba(74, 158, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.fillRect(drawX, drawY, scaledWidth, scaledHeight);
            ctx.strokeRect(drawX, drawY, scaledWidth, scaledHeight);
        }
        
        // Draw collision box if enabled
        if (this.showCollisionBoxes) {
            // Calculate collision bounds based on prefab settings (matching GameObject.getCollisionBounds)
            const expandTop = (this.selectedPrefab.collisionExpandTopPercent || 0) * scaledHeight;
            const expandBottom = (this.selectedPrefab.collisionExpandBottomPercent || 0) * scaledHeight;
            const expandLeft = (this.selectedPrefab.collisionExpandLeftPercent || 0) * scaledWidth;
            const expandRight = (this.selectedPrefab.collisionExpandRightPercent || 0) * scaledWidth;
            
            let collisionWidth = scaledWidth + expandLeft + expandRight;
            let collisionHeight = scaledHeight + expandTop + expandBottom;
            
            // Calculate base position (centered on sprite) in world space
            let collisionX = worldX - collisionWidth / 2;
            let collisionY = worldY - collisionHeight / 2;
            
            // Adjust for asymmetric expansion
            collisionX += (expandRight - expandLeft) / 2;
            collisionY += (expandBottom - expandTop) / 2;
            
            // Draw collision box
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.strokeRect(collisionX, collisionY, collisionWidth, collisionHeight);
            
            // Fill with semi-transparent red
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.fillRect(collisionX, collisionY, collisionWidth, collisionHeight);
            
            // Draw center point
            ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.beginPath();
            ctx.arc(worldX, worldY, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw crosshair at placement point
        ctx.strokeStyle = 'rgba(74, 158, 255, 0.8)';
        ctx.lineWidth = 2;
        const crosshairSize = 20;
        
        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(worldX - crosshairSize, worldY);
        ctx.lineTo(worldX + crosshairSize, worldY);
        ctx.stroke();
        
        // Vertical line
        ctx.beginPath();
        ctx.moveTo(worldX, worldY - crosshairSize);
        ctx.lineTo(worldX, worldY + crosshairSize);
        ctx.stroke();
        
        // Draw center dot to mark exact center
        ctx.fillStyle = 'rgba(255, 0, 0, 1.0)';
        ctx.beginPath();
        ctx.arc(worldX, worldY, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw text showing coordinates (in world space)
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.font = '14px monospace';
        const coordText = `World: (${Math.round(worldX)}, ${Math.round(worldY)})`;
        ctx.strokeText(coordText, worldX + 15, worldY - 15);
        ctx.fillText(coordText, worldX + 15, worldY - 15);
        
        ctx.restore();
    }

    /**
     * Render UI overlays (coordinates, etc.)
     */
    renderOverlays(ctx) {
        const canvas = this.game.canvas;
        const padding = 10;
        const lineHeight = 20;
        const boxPadding = 10;
        
        // Build info lines
        const lines = [
            `Grid: ${this.gridEnabled ? 'ON' : 'OFF'} (G)`,
            `Snap: ${this.snapToGrid ? 'ON' : 'OFF'} (Shift)`,
            `Collision: ${this.showCollisionBoxes ? 'ON' : 'OFF'} (C)`
        ];
        
        if (this.selectedObject) {
            lines.push(`Selected: Drag to move, D to delete`);
        }
        
        // Calculate box dimensions
        ctx.font = '14px monospace';
        const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
        const boxWidth = maxWidth + (boxPadding * 2);
        const boxHeight = (lines.length * lineHeight) + (boxPadding * 2);
        
        // Position in bottom-right corner
        const x = canvas.width - boxWidth - padding;
        const y = canvas.height - boxHeight - padding;
        
        ctx.save();
        
        // Draw background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x, y, boxWidth, boxHeight);
        
        // Draw border
        ctx.strokeStyle = 'rgba(74, 158, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, boxWidth, boxHeight);
        
        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px monospace';
        lines.forEach((line, index) => {
            ctx.fillText(line, x + boxPadding, y + boxPadding + (index + 1) * lineHeight - 5);
        });
        
        ctx.restore();
    }

    /**
     * Setup mouse event listeners for dragging
     */
    setupMouseListeners() {
        this.mouseDownHandler = (e) => this.onMouseDown(e);
        this.mouseMoveHandler = (e) => this.onMouseMove(e);
        this.mouseUpHandler = (e) => this.onMouseUp(e);
        
        // Track raw mouse position for preview rendering
        this.rawMouseMoveHandler = (e) => {
            this.rawMouseX = e.clientX;
            this.rawMouseY = e.clientY;
        };
        
        this.game.canvas.addEventListener('mousedown', this.mouseDownHandler);
        this.game.canvas.addEventListener('mousemove', this.mouseMoveHandler);
        this.game.canvas.addEventListener('mouseup', this.mouseUpHandler);
        window.addEventListener('mousemove', this.rawMouseMoveHandler);
    }
    
    /**
     * Remove mouse event listeners
     */
    removeMouseListeners() {
        if (this.mouseDownHandler) {
            this.game.canvas.removeEventListener('mousedown', this.mouseDownHandler);
            this.game.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
            this.game.canvas.removeEventListener('mouseup', this.mouseUpHandler);
        }
        if (this.rawMouseMoveHandler) {
            window.removeEventListener('mousemove', this.rawMouseMoveHandler);
        }
    }
    
    /**
     * Handle mouse down
     */
    onMouseDown(e) {
        if (!this.isActive) return;
        
        const rect = this.game.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.handleClick(x, y, e.button);
    }
    
    /**
     * Handle mouse move (for dragging)
     */
    onMouseMove(e) {
        if (!this.isActive) return;
        
        if (this.selectedTool === 'select' && this.selectedObject && e.buttons === 1) {
            // Start dragging if not already
            if (!this.isDragging) {
                const dragThreshold = 5; // Pixels before starting drag
                const dx = Math.abs(this.mouseWorldX - this.dragStartX);
                const dy = Math.abs(this.mouseWorldY - this.dragStartY);
                
                if (dx > dragThreshold || dy > dragThreshold) {
                    this.isDragging = true;
                    this.game.canvas.style.cursor = 'move';
                }
            }
            
            // Update object position while dragging
            if (this.isDragging) {
                // Store old position for history
                if (!this.dragOriginalX) {
                    this.dragOriginalX = this.selectedObject.x;
                    this.dragOriginalY = this.selectedObject.y;
                }
                
                this.selectedObject.x = this.mouseWorldX - this.dragOffsetX;
                this.selectedObject.y = this.mouseWorldY - this.dragOffsetY;
                
                // Update property panel if visible
                if (this.propertyPanel) {
                    this.propertyPanel.updatePosition(this.selectedObject);
                }
            }
        }
    }
    
    /**
     * Handle mouse up (end drag)
     */
    onMouseUp(e) {
        if (!this.isActive) return;
        
        if (this.isDragging) {
            // Add move action to history
            this.addHistory({
                type: 'move',
                object: this.selectedObject,
                oldX: this.dragOriginalX,
                oldY: this.dragOriginalY,
                newX: this.selectedObject.x,
                newY: this.selectedObject.y,
                mapId: this.game.currentMapId
            });
            
            console.log('[EditorManager] Moved object to:', this.selectedObject.x, this.selectedObject.y);
            
            // Reset drag state
            this.isDragging = false;
            this.dragOriginalX = undefined;
            this.dragOriginalY = undefined;
            this.game.canvas.style.cursor = 'crosshair';
        }
    }
    
    /**
     * Handle mouse click in editor
     */
    handleClick(x, y, button) {
        if (!this.isActive) return false;
        
        switch (this.selectedTool) {
            case 'select':
                return this.handleSelectClick(x, y);
            case 'place':
                return this.handlePlaceClick(x, y);
        }
        
        return true; // Consume click
    }

    /**
     * Handle select tool click
     */
    handleSelectClick(x, y) {
        const worldX = x + this.game.camera.x;
        const worldY = y + this.game.camera.y;
        
        // Find object at click position
        const objects = this.game.objectManager.getObjectsForMap(this.game.currentMapId);
        
        for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            const bounds = obj.getCollisionBounds(this.game);
            
            if (worldX >= bounds.x && worldX <= bounds.x + bounds.width &&
                worldY >= bounds.y && worldY <= bounds.y + bounds.height) {
                this.selectObject(obj);
                
                // Start drag preparation
                this.dragStartX = worldX;
                this.dragStartY = worldY;
                this.dragOffsetX = worldX - obj.x;
                this.dragOffsetY = worldY - obj.y;
                
                return true;
            }
        }
        
        // Clicked empty space - deselect
        this.selectObject(null);
        return true;
    }

    /**
     * Handle place tool click
     */
    handlePlaceClick(x, y) {
        console.log('[EditorManager] handlePlaceClick called at screen:', x, y);
        console.log('[EditorManager] Mouse world pos:', this.mouseWorldX, this.mouseWorldY);
        console.log('[EditorManager] Selected prefab:', this.selectedPrefab);
        
        if (!this.selectedPrefab) {
            console.log('[EditorManager] No prefab selected');
            return true;
        }
        
        // Convert scaled world position back to unscaled position for storage
        const resolutionScale = this.game.resolutionScale || 1.0;
        const mapScale = this.game.mapManager.maps[this.game.currentMapId]?.scale || 1.0;
        const unscaledX = this.mouseWorldX / (mapScale * resolutionScale);
        const unscaledY = this.mouseWorldY / (mapScale * resolutionScale);
        
        console.log('[EditorManager] Unscaled position:', unscaledX, unscaledY);
        
        // Create object at mouse position (using unscaled coordinates)
        const objectData = {
            ...this.selectedPrefab,
            x: unscaledX,
            y: unscaledY
        };
        
        console.log('[EditorManager] Creating object with data:', objectData);
        this.placeObject(objectData);
        return true;
    }



    /**
     * Select an object
     */
    selectObject(obj) {
        this.selectedObject = obj;
        
        if (obj) {
            console.log('[EditorManager] Selected:', obj.constructor.name, obj.id);
            if (this.propertyPanel) {
                this.propertyPanel.show(obj);
            }
        } else {
            if (this.propertyPanel) {
                this.propertyPanel.hide();
            }
        }
    }

    /**
     * Place a new object
     */
    placeObject(objectData) {
        console.log('[EditorManager] Attempting to place object:', objectData);
        console.log('[EditorManager] World position:', this.mouseWorldX, this.mouseWorldY);
        console.log('[EditorManager] Camera position:', this.game.camera.x, this.game.camera.y);
        const obj = this.game.objectManager.createObjectFromData(objectData);
        if (obj) {
            console.log('[EditorManager] Object created with position:', obj.x, obj.y);
            this.game.objectManager.addObject(this.game.currentMapId, obj);
            console.log('[EditorManager] Successfully placed:', obj.constructor.name, 'at', obj.x, obj.y);
            console.log('[EditorManager] Object in map objects array:', this.game.objectManager.objects[this.game.currentMapId].includes(obj));
            
            // Add to history
            this.addHistory({
                type: 'place',
                object: obj,
                mapId: this.game.currentMapId
            });
            
            // Auto-return to select mode after placing
            this.setTool('select');
            this.selectObject(obj); // Auto-select the newly placed object
        } else {
            console.error('[EditorManager] Failed to create object from data:', objectData);
        }
    }

    /**
     * Delete an object
     */
    deleteObject(obj) {
        // Add to history first
        this.addHistory({
            type: 'delete',
            object: obj,
            mapId: this.game.currentMapId
        });
        
        this.game.objectManager.removeObject(this.game.currentMapId, obj.id);
        console.log('[EditorManager] Deleted:', obj.constructor.name, obj.id);
        
        if (this.selectedObject === obj) {
            this.selectObject(null);
        }
    }

    /**
     * Copy object to clipboard
     */
    copyObject(obj) {
        this.clipboard = {
            category: obj.constructor.name,
            ...obj
        };
        console.log('[EditorManager] Copied:', obj.constructor.name);
    }

    /**
     * Paste object from clipboard
     */
    pasteObject() {
        if (!this.clipboard) return;
        
        const objectData = {
            ...this.clipboard,
            x: this.mouseWorldX,
            y: this.mouseWorldY,
            id: undefined // Generate new ID
        };
        
        this.placeObject(objectData);
    }

    /**
     * Add action to history
     */
    addHistory(action) {
        // Remove any actions after current index (if we went back)
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add new action
        this.history.push(action);
        this.historyIndex++;
        
        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.historyIndex < 0) {
            console.log('[EditorManager] Nothing to undo');
            return;
        }
        
        const action = this.history[this.historyIndex];
        this.historyIndex--;
        
        // Reverse the action
        if (action.type === 'place') {
            this.game.objectManager.removeObject(action.mapId, action.object.id);
        } else if (action.type === 'delete') {
            this.game.objectManager.addObject(action.mapId, action.object);
        } else if (action.type === 'move') {
            action.object.x = action.oldX;
            action.object.y = action.oldY;
        }
        
        console.log('[EditorManager] Undo:', action.type);
    }

    /**
     * Redo last undone action
     */
    redo() {
        if (this.historyIndex >= this.history.length - 1) {
            console.log('[EditorManager] Nothing to redo');
            return;
        }
        
        this.historyIndex++;
        const action = this.history[this.historyIndex];
        
        // Redo the action
        if (action.type === 'place') {
            this.game.objectManager.addObject(action.mapId, action.object);
        } else if (action.type === 'delete') {
            this.game.objectManager.removeObject(action.mapId, action.object.id);
        } else if (action.type === 'move') {
            action.object.x = action.newX;
            action.object.y = action.newY;
        }
        
        console.log('[EditorManager] Redo:', action.type);
    }

    /**
     * Save current map data
     */
    async save() {
        console.log('[EditorManager] Saving map data...');
        
        // Get all objects for current map
        const objects = this.game.objectManager.getObjectsForMap(this.game.currentMapId);
        
        // Convert to JSON format
        const objectsData = objects.map(obj => {
            // Extract only the data we need (remove methods, game references, etc.)
            const data = {
                category: obj.category || 'StaticObject',
                x: obj.x,
                y: obj.y,
                scale: obj.scale
            };
            
            // Add type-specific fields
            if (obj.spriteSrc) data.spriteSrc = obj.spriteSrc;
            if (obj.id) data.id = obj.id;
            if (obj.actorType) data.actorType = obj.actorType;
            if (obj.objectType) data.objectType = obj.objectType;
            if (obj.castsShadow === false) data.castsShadow = false;
            
            // Add collision customization if present
            if (obj.collisionExpandTopPercent) data.collisionExpandTopPercent = obj.collisionExpandTopPercent;
            if (obj.collisionExpandBottomPercent) data.collisionExpandBottomPercent = obj.collisionExpandBottomPercent;
            if (obj.collisionExpandLeftPercent) data.collisionExpandLeftPercent = obj.collisionExpandLeftPercent;
            if (obj.collisionExpandRightPercent) data.collisionExpandRightPercent = obj.collisionExpandRightPercent;
            
            // Add type-specific properties
            if (obj.name) data.name = obj.name;
            if (obj.dialogue) data.dialogue = obj.dialogue;
            if (obj.npcType) data.npcType = obj.npcType;
            if (obj.gold !== undefined) data.gold = obj.gold;
            if (obj.loot) data.loot = obj.loot;
            if (obj.chestType) data.chestType = obj.chestType;
            if (obj.targetMap) data.targetMap = obj.targetMap;
            if (obj.spawnPoint) data.spawnPoint = obj.spawnPoint;
            if (obj.portalType) data.portalType = obj.portalType;
            
            return data;
        });
        
        // Display JSON for now (later we'll save to file)
        const json = JSON.stringify(objectsData, null, 2);
        console.log('[EditorManager] Map data:', json);
        
        alert('Map data saved to console. Check browser console (F12) to copy JSON.');
    }

    /**
     * Zoom in camera
     */
    zoomIn() {
        const camera = this.game.camera;
        camera.zoom = Math.min(camera.maxZoom, camera.zoom + 0.25);
        console.log(`[EditorManager] Zoom: ${(camera.zoom * 100).toFixed(0)}%`);
    }

    /**
     * Zoom out camera
     */
    zoomOut() {
        const camera = this.game.camera;
        camera.zoom = Math.max(camera.minZoom, camera.zoom - 0.25);
        console.log(`[EditorManager] Zoom: ${(camera.zoom * 100).toFixed(0)}%`);
    }

    /**
     * Reset camera zoom to 100%
     */
    resetZoom() {
        this.game.camera.zoom = 1.0;
        console.log('[EditorManager] Zoom reset to 100%');
    }
}

// Export
window.EditorManager = EditorManager;
