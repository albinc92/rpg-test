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
        
        // Grid settings
        this.gridEnabled = true;
        this.gridSize = 32;
        this.snapToGrid = false;
        
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
            
            // Tool shortcuts
            if (e.key === 'v' || e.key === 'V') {
                this.setTool('select');
            } else if (e.key === 'b' || e.key === 'B') {
                this.setTool('place');
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
            }
            
            // Toggle snap to grid
            else if (e.key === 'Shift') {
                this.snapToGrid = true;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') {
                this.snapToGrid = false;
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
        
        // Get mouse position from input manager (screen coordinates)
        const mouseScreenX = this.game.inputManager.mouse.x;
        const mouseScreenY = this.game.inputManager.mouse.y;
        
        // Convert to canvas coordinates
        const mouseCanvasX = mouseScreenX - rect.left;
        const mouseCanvasY = mouseScreenY - rect.top;
        
        // Convert canvas to world coordinates (add camera offset)
        this.mouseWorldX = mouseCanvasX + this.game.renderSystem.camera.x;
        this.mouseWorldY = mouseCanvasY + this.game.renderSystem.camera.y;
        
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
        // TODO: Render semi-transparent preview of object to be placed
        const camera = this.game.camera;
        const x = this.mouseWorldX - camera.x;
        const y = this.mouseWorldY - camera.y;
        
        ctx.save();
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.fillRect(x - 16, y - 16, 32, 32);
        ctx.restore();
    }

    /**
     * Render UI overlays (coordinates, etc.)
     */
    renderOverlays(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 280, 120);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px monospace';
        ctx.fillText(`Tool: ${this.selectedTool}`, 20, 30);
        ctx.fillText(`Mouse: (${Math.round(this.mouseWorldX)}, ${Math.round(this.mouseWorldY)})`, 20, 50);
        ctx.fillText(`Grid: ${this.gridEnabled ? 'ON' : 'OFF'} (G)`, 20, 70);
        ctx.fillText(`Snap: ${this.snapToGrid ? 'ON' : 'OFF'} (Shift)`, 20, 90);
        if (this.selectedObject) {
            ctx.fillText(`Selected: Drag to move, D to delete`, 20, 110);
        }
        
        ctx.restore();
    }

    /**
     * Setup mouse event listeners for dragging
     */
    setupMouseListeners() {
        this.mouseDownHandler = (e) => this.onMouseDown(e);
        this.mouseMoveHandler = (e) => this.onMouseMove(e);
        this.mouseUpHandler = (e) => this.onMouseUp(e);
        
        this.game.canvas.addEventListener('mousedown', this.mouseDownHandler);
        this.game.canvas.addEventListener('mousemove', this.mouseMoveHandler);
        this.game.canvas.addEventListener('mouseup', this.mouseUpHandler);
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
        
        // Create object at mouse position
        const objectData = {
            ...this.selectedPrefab,
            x: this.mouseWorldX,
            y: this.mouseWorldY
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
        const obj = this.game.objectManager.createObjectFromData(objectData);
        if (obj) {
            this.game.objectManager.addObject(this.game.currentMapId, obj);
            console.log('[EditorManager] Successfully placed:', obj.constructor.name, 'at', obj.x, obj.y);
            
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
}

// Export
window.EditorManager = EditorManager;
