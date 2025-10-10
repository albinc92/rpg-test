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
        this.selectedTool = 'select'; // 'select', 'place', 'paint'
        this.selectedObject = null; // Currently selected object on map
        this.selectedObjects = []; // Multiple selected objects
        this.selectedPrefab = null; // Object type to place
        this.clipboard = null;
        this.previewSprite = null; // Cached sprite for placement preview
        
        // Multi-select state
        this.isMultiSelecting = false;
        this.multiSelectStart = { x: 0, y: 0 };
        this.multiSelectEnd = { x: 0, y: 0 };
        
        // Paint tool state
        this.isPainting = false;
        this.paintMode = 'texture'; // 'texture', 'collision', or 'spawn'
        this.toolAction = 'paint'; // 'paint', 'erase', or 'fill'
        this.selectedTexture = null; // Current texture to paint with
        this.brushSize = 64; // Brush radius in pixels
        this.brushStyle = 'soft'; // 'soft', 'hard', 'very-soft'
        this.brushShape = 'circle'; // 'circle' or 'square' (for collision/spawn mode)
        this.brushOpacity = 0.8;
        this.paintLayers = {}; // Store paint layers per map {mapId: canvas}
        this.collisionLayers = {}; // Store collision layers per map {mapId: canvas}
        this.spawnLayers = {}; // Store spawn zone layers per map {mapId: canvas}
        this.textures = []; // Available textures for painting
        this.loadedTextures = {}; // Cache of loaded texture images
        this.paintStartState = null; // Store canvas state before stroke for undo
        
        // Spawn zone visibility
        this.showSpawnZones = true; // Show spawn zones in editor
        
        // Drag state for moving objects
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        
        // Placement preview
        this.previewObject = null;
        this.mouseWorldX = 0; // Potentially grid-snapped
        this.mouseWorldY = 0;
        this.mouseWorldXUnsnapped = 0; // Always unsnapped (for multi-select)
        this.mouseWorldYUnsnapped = 0;
        this.rawMouseX = 0; // Raw screen mouse position
        this.rawMouseY = 0;
        
        // Grid settings
        this.gridEnabled = true;
        this.gridSize = 32;
        this.snapToGrid = false;
        this.showCollisionBoxes = true;
        this.showLightPreviews = true; // Show light preview sprites in editor
        
        // UI components
        this.ui = null;
        this.objectPalette = null;
        this.propertyPanel = null;
        this.templateEditor = null;
        this.lightEditor = null;
        this.placementPanel = null;
        
        // History for undo/redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        console.log('[EditorManager] Initialized');
    }

    /**
     * COORDINATE CONVERSION HELPERS
     * These ensure consistency across all editor operations
     */
    
    /**
     * Convert scaled world coordinates to unscaled storage coordinates
     * Use this when converting mouse position to object storage position
     */
    worldToUnscaled(worldX, worldY) {
        const resolutionScale = this.game.resolutionScale || 1.0;
        const mapScale = this.game.mapManager.maps[this.game.currentMapId]?.scale || 1.0;
        const totalScale = mapScale * resolutionScale;
        return {
            x: worldX / totalScale,
            y: worldY / totalScale
        };
    }
    
    /**
     * Convert unscaled storage coordinates to scaled world coordinates
     * Use this when converting object position to rendering position
     */
    unscaledToWorld(unscaledX, unscaledY) {
        const resolutionScale = this.game.resolutionScale || 1.0;
        const mapScale = this.game.mapManager.maps[this.game.currentMapId]?.scale || 1.0;
        const totalScale = mapScale * resolutionScale;
        return {
            x: unscaledX * totalScale,
            y: unscaledY * totalScale
        };
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
            
            // Escape cancels placement mode or light placement mode
            if (e.key === 'Escape') {
                e.preventDefault();
                
                // Cancel placement mode through ObjectPlacementPanel if it's open
                if (this.placementPanel && this.placementPanel.isVisible() && this.placementPanel.placementMode) {
                    this.placementPanel.deactivatePlacementMode();
                    console.log('[EditorManager] Placement cancelled via panel');
                }
                // Cancel light placement mode if active
                else if (this.lightEditor && this.lightEditor.placementMode) {
                    this.lightEditor.placementMode = false;
                    this.setTool('select');
                    console.log('[EditorManager] Light placement cancelled');
                }
                // Cancel object placement mode
                else if (this.selectedTool === 'place') {
                    this.selectedPrefab = null;
                    this.setTool('select');
                    console.log('[EditorManager] Placement cancelled');
                }
            }
            
            // Delete selected object(s) with 'D' or Delete key
            else if ((e.key === 'd' || e.key === 'D' || e.key === 'Delete') && (this.selectedObject || this.selectedObjects.length > 0)) {
                e.preventDefault();
                
                // Delete multiple selected objects
                if (this.selectedObjects.length > 0) {
                    console.log(`[EditorManager] Deleting ${this.selectedObjects.length} selected objects`);
                    for (const obj of this.selectedObjects) {
                        console.log('[DELETE] Multi-delete:', obj.name || obj.objectType, 'at', obj.x, obj.y);
                        this.deleteObject(obj);
                    }
                    this.selectedObjects = [];
                } 
                // Delete single selected object
                else if (this.selectedObject) {
                    console.log('[DELETE] Single delete:', this.selectedObject.name || this.selectedObject.objectType, 'at', this.selectedObject.x, this.selectedObject.y);
                    this.deleteObject(this.selectedObject);
                }
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
            
            // Toggle layer panel
            else if (e.key === 'l' || e.key === 'L') {
                if (this.layerPanel) {
                    this.layerPanel.toggle();
                    console.log('[EditorManager] Layer Panel:', this.layerPanel.isVisible() ? 'SHOWN' : 'HIDDEN');
                }
            }
            
            // Open placement panel
            else if (e.key === 'p' || e.key === 'P') {
                if (this.placementPanel) {
                    this.placementPanel.show();
                    console.log('[EditorManager] Placement Panel: SHOWN');
                }
            }
            
            // Quick tool shortcuts
            else if (e.key === 'v' || e.key === 'V') {
                this.setTool('select');
                console.log('[EditorManager] Tool: SELECT');
            }
            else if (e.key === 'b' || e.key === 'B') {
                this.setTool('paint');
                console.log('[EditorManager] Tool: PAINT');
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
                
                // Brush size controls for paint tool (only if not typing)
                else if (e.key === '[') {
                    e.preventDefault();
                    this.brushSize = Math.max(16, this.brushSize - 8);
                    console.log('[EditorManager] Brush size:', this.brushSize);
                } else if (e.key === ']') {
                    e.preventDefault();
                    this.brushSize = Math.min(256, this.brushSize + 8);
                    console.log('[EditorManager] Brush size:', this.brushSize);
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
            this.layerPanel = new LayerPanel(this);
            this.templateEditor = new TemplateEditor(this);
            this.lightEditor = new LightEditor(this.game);
            this.placementPanel = new ObjectPlacementPanel(this);
        }
        
        // Show UI (but not layer panel by default - user can open it with F4)
        this.ui.show();
        // this.layerPanel.show(); // Don't show by default
        
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
            this.layerPanel.hide();
            
            // Close all template editors
            this.ui.closeAllEditors();
        }
        
        // Close placement panel if open
        if (this.placementPanel) {
            this.placementPanel.hide();
        }
        
        // Close paint tool panel if open
        const paintPanel = document.getElementById('paint-tool-panel');
        if (paintPanel) {
            paintPanel.remove();
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
        
        // Initialize paint layer if entering paint mode
        if (tool === 'paint') {
            this.initializePaintLayer(this.game.currentMapId);
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
        
        // Get LOGICAL canvas dimensions (not physical pixels)
        // Physical pixels = logical * devicePixelRatio
        const canvasLogicalWidth = this.game.CANVAS_WIDTH;
        const canvasLogicalHeight = this.game.CANVAS_HEIGHT;

        // Get mouse position (use rawMouse to match preview rendering)
        const mouseScreenX = this.rawMouseX;
        const mouseScreenY = this.rawMouseY;

        // Calculate position relative to canvas element
        let relativeX = mouseScreenX - rect.left;
        let relativeY = mouseScreenY - rect.top;
        
        // Handle different rendering modes:
        // Mode 1: Small screens (≤1920x1080) - Canvas uses actual window size, CSS stretches to 100vw/vh
        // Mode 2: Large screens (>1920x1080) - Canvas capped at 1920x1080, CSS scales up with object-fit:contain
        
        const canvasAspect = canvasLogicalWidth / canvasLogicalHeight;
        const rectAspect = rect.width / rect.height;
        const aspectDiff = Math.abs(canvasAspect - rectAspect);
        
        let renderWidth, renderHeight, offsetX, offsetY;
        
        // Check CSS object-fit mode
        const computedStyle = window.getComputedStyle(canvas);
        const objectFit = computedStyle.objectFit || 'fill';
        
        if (objectFit === 'fill' || aspectDiff < 0.01) {
            // Mode 1: Fill mode (small screens use actual dimensions)
            // Canvas fills entire rect - no letterboxing
            renderWidth = rect.width;
            renderHeight = rect.height;
            offsetX = 0;
            offsetY = 0;
        } else {
            // Mode 2: Contain mode (large screens capped at 1920x1080)
            // Calculate actual rendered area and letterbox offsets
            if (rectAspect > canvasAspect) {
                // Window is wider than canvas - vertical black bars on sides
                renderWidth = rect.height * canvasAspect;
                renderHeight = rect.height;
                offsetX = (rect.width - renderWidth) / 2;
                offsetY = 0;
            } else {
                // Window is taller than canvas - horizontal black bars on top/bottom
                renderWidth = rect.width;
                renderHeight = rect.width / canvasAspect;
                offsetX = 0;
                offsetY = (rect.height - renderHeight) / 2;
            }
        }
        
        // Adjust for letterboxing offset (if any)
        relativeX = relativeX - offsetX;
        relativeY = relativeY - offsetY;
        
        // Scale from render area to LOGICAL canvas coordinates
        const mouseCanvasX = (relativeX / renderWidth) * canvasLogicalWidth;
        const mouseCanvasY = (relativeY / renderHeight) * canvasLogicalHeight;

        // Convert canvas to world coordinates (add camera offset)
        // The mouse canvas position needs to account for zoom to get the correct world position
        const camera = this.game.camera;
        const zoom = camera.zoom || 1.0;

        // To get world position, we need to reverse the zoom transformation
        let worldCanvasX = mouseCanvasX;
        let worldCanvasY = mouseCanvasY;

        if (zoom !== 1.0) {
            // Use logical canvas dimensions for zoom calculations
            const centerX = canvasLogicalWidth / 2;
            const centerY = canvasLogicalHeight / 2;

            // Reverse the zoom transformation: (point - center) / zoom + center
            worldCanvasX = (mouseCanvasX - centerX) / zoom + centerX;
            worldCanvasY = (mouseCanvasY - centerY) / zoom + centerY;
        }

        const worldX = worldCanvasX + camera.x;
        const worldY = worldCanvasY + camera.y;

        // Store unsnapped coordinates (always available for multi-select)
        this.mouseWorldXUnsnapped = worldX;
        this.mouseWorldYUnsnapped = worldY;

        // Apply grid snap if enabled (for placement/painting)
        if (this.snapToGrid) {
            this.mouseWorldX = Math.round(worldX / this.gridSize) * this.gridSize;
            this.mouseWorldY = Math.round(worldY / this.gridSize) * this.gridSize;
        } else {
            this.mouseWorldX = worldX;
            this.mouseWorldY = worldY;
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
        
        // Render multi-select highlights
        if (this.selectedObjects.length > 0) {
            this.renderMultiSelection(ctx);
        }
        
        // Render multi-select box while dragging
        if (this.isMultiSelecting) {
            this.renderMultiSelectBox(ctx);
        }
        
        // Render placement preview
        if (this.selectedTool === 'place' && this.selectedPrefab) {
            this.renderPlacementPreview(ctx);
        }
        
        // Render brush preview for paint tool
        if (this.selectedTool === 'paint') {
            this.renderBrushPreview(ctx);
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
        const zoom = camera.zoom || 1.0;
        const canvas = this.game.canvas;
        const bounds = this.selectedObject.getCollisionBounds(this.game);
        
        ctx.save();
        
        // Apply zoom transformation (same as renderMultiSelectBox)
        if (zoom !== 1.0) {
            const canvasWidth = this.game.CANVAS_WIDTH;
            const canvasHeight = this.game.CANVAS_HEIGHT;
            
            ctx.translate(canvasWidth / 2, canvasHeight / 2);
            ctx.scale(zoom, zoom);
            ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        }
        
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2 / zoom; // Adjust line width for zoom
        ctx.setLineDash([5 / zoom, 5 / zoom]); // Adjust dash pattern for zoom
        
        ctx.strokeRect(
            bounds.x - camera.x,
            bounds.y - camera.y,
            bounds.width,
            bounds.height
        );
        
        ctx.restore();
    }

    /**
     * Render multi-selection highlights
     */
    renderMultiSelection(ctx) {
        if (this.selectedObjects.length === 0) return;
        
        const camera = this.game.camera;
        const zoom = camera.zoom || 1.0;
        const canvas = this.game.canvas;
        
        ctx.save();
        
        // Apply zoom transformation (same as renderMultiSelectBox)
        if (zoom !== 1.0) {
            const canvasWidth = this.game.CANVAS_WIDTH;
            const canvasHeight = this.game.CANVAS_HEIGHT;
            
            ctx.translate(canvasWidth / 2, canvasHeight / 2);
            ctx.scale(zoom, zoom);
            ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        }
        
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2 / zoom; // Adjust line width for zoom
        ctx.setLineDash([5 / zoom, 5 / zoom]); // Adjust dash pattern for zoom
        
        // Draw dashed outline around each selected object
        for (const obj of this.selectedObjects) {
            const bounds = obj.getCollisionBounds(this.game);
            ctx.strokeRect(
                bounds.x - camera.x,
                bounds.y - camera.y,
                bounds.width,
                bounds.height
            );
        }
        
        ctx.restore();
    }

    /**
     * Render multi-select drag box
     */
    renderMultiSelectBox(ctx) {
        if (!this.isMultiSelecting || !this.multiSelectStart || !this.multiSelectEnd) return;
        
        const camera = this.game.camera;
        const zoom = camera.zoom || 1.0;
        const canvas = this.game.canvas;
        
        ctx.save();
        
        // Apply the same transformation that RenderSystem uses for the world
        if (zoom !== 1.0) {
            const canvasWidth = this.game.CANVAS_WIDTH;
            const canvasHeight = this.game.CANVAS_HEIGHT;
            
            // Scale around center point (same as RenderSystem)
            ctx.translate(canvasWidth / 2, canvasHeight / 2);
            ctx.scale(zoom, zoom);
            ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        }
        
        // Apply camera translation (same as RenderSystem)
        ctx.translate(-camera.x, -camera.y);
        
        // Now draw in world coordinates
        const x = Math.min(this.multiSelectStart.x, this.multiSelectEnd.x);
        const y = Math.min(this.multiSelectStart.y, this.multiSelectEnd.y);
        const width = Math.abs(this.multiSelectEnd.x - this.multiSelectStart.x);
        const height = Math.abs(this.multiSelectEnd.y - this.multiSelectStart.y);
        
        // Draw semi-transparent blue fill
        ctx.fillStyle = 'rgba(0, 120, 255, 0.2)';
        ctx.fillRect(x, y, width, height);
        
        // Draw blue border
        ctx.strokeStyle = '#0078ff';
        ctx.lineWidth = 2 / zoom; // Scale line width inversely with zoom
        ctx.setLineDash([5 / zoom, 5 / zoom]); // Scale dash pattern inversely with zoom
        ctx.strokeRect(x, y, width, height);
        
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
        const canvasLogicalWidth = this.game.CANVAS_WIDTH;
        const canvasLogicalHeight = this.game.CANVAS_HEIGHT;
        const canvasToDisplayX = canvasLogicalWidth / rect.width;
        const canvasToDisplayY = canvasLogicalHeight / rect.height;
        
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
            const canvasWidth = this.game.CANVAS_WIDTH;
            const canvasHeight = this.game.CANVAS_HEIGHT;
            
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
            
            // Get collision shape
            const collisionShape = this.selectedPrefab.collisionShape || 'circle';
            
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            
            // Draw circular/elliptical collision box
            if (collisionShape === 'circle') {
                const centerX = collisionX + collisionWidth / 2;
                const centerY = collisionY + collisionHeight / 2;
                const radiusX = collisionWidth / 2;
                const radiusY = collisionHeight / 2;
                
                // Draw collision ellipse/circle
                ctx.beginPath();
                ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
                ctx.stroke();
                
                // Fill with semi-transparent red
                ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
                ctx.fill();
            } else {
                // Draw rectangular collision box
                ctx.strokeRect(collisionX, collisionY, collisionWidth, collisionHeight);
                
                // Fill with semi-transparent red
                ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
                ctx.fillRect(collisionX, collisionY, collisionWidth, collisionHeight);
            }
            
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
        const padding = 15;
        const lineHeight = 28;
        const boxPadding = 15;
        
        // Build info lines
        const lines = [
            `Grid: ${this.gridEnabled ? 'ON' : 'OFF'} (G)`,
            `Snap: ${this.snapToGrid ? 'ON' : 'OFF'} (Shift)`,
            `Collision: ${this.showCollisionBoxes ? 'ON' : 'OFF'} (C)`,
            `Lights: ${this.showLightPreviews ? 'ON' : 'OFF'}`
        ];
        
        if (this.selectedObject) {
            lines.push(`Selected: Drag to move, D to delete`);
        }
        
        // Calculate box dimensions
        ctx.font = '18px monospace';
        const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
        const boxWidth = maxWidth + (boxPadding * 2);
        const boxHeight = (lines.length * lineHeight) + (boxPadding * 2);
        
        ctx.save();
        
        // Reset transform to screen coordinates for UI overlay
        const currentTransform = ctx.getTransform();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Get actual canvas pixel dimensions
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Position in bottom-right corner (use actual canvas dimensions)
        const boxX = canvasWidth - boxWidth - padding;
        const boxY = canvasHeight - boxHeight - padding;
        
        // Draw background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        
        // Draw border
        ctx.strokeStyle = 'rgba(74, 158, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        
        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        lines.forEach((line, index) => {
            ctx.fillText(line, boxX + boxPadding, boxY + boxPadding + (index * lineHeight));
        });
        
        // Restore original transform
        ctx.setTransform(currentTransform);
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
        
        // Update raw mouse position first
        this.rawMouseX = e.clientX;
        this.rawMouseY = e.clientY;
        this.updateMousePosition();
        
        const rect = this.game.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        console.log('[CLICK DEBUG] clientX/Y:', e.clientX, e.clientY);
        console.log('[CLICK DEBUG] rect.left/top:', rect.left, rect.top);
        console.log('[CLICK DEBUG] relative x/y:', x, y);
        console.log('[CLICK DEBUG] mouseWorld:', this.mouseWorldX, this.mouseWorldY);
        console.log('[CLICK DEBUG] camera:', this.game.camera.x, this.game.camera.y);
        
        // Handle paint tool
        if (this.selectedTool === 'paint') {
            this.startPainting(x, y);
            return;
        }
        
        this.handleClick(x, y, e.button);
    }
    
    /**
     * Handle mouse move (for dragging and painting)
     */
    onMouseMove(e) {
        if (!this.isActive) return;
        
        // Update raw mouse position and calculate world coordinates
        this.rawMouseX = e.clientX;
        this.rawMouseY = e.clientY;
        this.updateMousePosition();
        
        // Handle paint tool dragging - paint continuously while dragging
        if (this.selectedTool === 'paint' && e.buttons === 1) {
            if (this.isPainting) {
                this.paintAt(this.mouseWorldX, this.mouseWorldY);
            }
            return;
        }
        
        if (this.selectedTool === 'select' && e.buttons === 1) {
            // Update multi-select box if dragging from empty space (use unsnapped coords)
            if (this.isMultiSelecting) {
                this.multiSelectEnd = { x: this.mouseWorldXUnsnapped, y: this.mouseWorldYUnsnapped };
                return;
            }
            
            // Handle single object dragging
            if (this.selectedObject) {
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
                    
                    // Convert scaled mouse to unscaled storage coordinates
                    const unscaledMouse = this.worldToUnscaled(this.mouseWorldXUnsnapped, this.mouseWorldYUnsnapped);
                    
                    // Calculate new position (all in unscaled space: obj.x, dragOffset, unscaledMouse)
                    const newX = unscaledMouse.x - this.dragOffsetX;
                    const newY = unscaledMouse.y - this.dragOffsetY;
                    
                    if (Math.random() < 0.05) { // Log occasionally to avoid spam
                        console.log('[DRAG] mouse:', unscaledMouse.x.toFixed(1), unscaledMouse.y.toFixed(1),
                                    'offset:', this.dragOffsetX.toFixed(1), this.dragOffsetY.toFixed(1),
                                    'result:', newX.toFixed(1), newY.toFixed(1));
                    }
                    
                    this.selectedObject.x = newX;
                    this.selectedObject.y = newY;
                    
                    // Update property panel if visible
                    if (this.propertyPanel && this.propertyPanel.show) {
                        this.propertyPanel.show(this.selectedObject);
                    }
                }
            }
        }
    }
    
    /**
     * Handle mouse up (end drag and painting)
     */
    onMouseUp(e) {
        if (!this.isActive) return;
        
        // Handle paint tool
        if (this.selectedTool === 'paint') {
            this.stopPainting();
            return;
        }
        
        // Handle multi-select completion
        if (this.isMultiSelecting) {
            this.isMultiSelecting = false;
            this.performMultiSelect();
            return;
        }
        
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
     * Perform multi-select based on selection box
     */
    performMultiSelect() {
        // Selection box is in scaled coordinates, convert to unscaled
        const startUnscaled = this.worldToUnscaled(this.multiSelectStart.x, this.multiSelectStart.y);
        const endUnscaled = this.worldToUnscaled(this.multiSelectEnd.x, this.multiSelectEnd.y);
        
        const minX = Math.min(startUnscaled.x, endUnscaled.x);
        const maxX = Math.max(startUnscaled.x, endUnscaled.x);
        const minY = Math.min(startUnscaled.y, endUnscaled.y);
        const maxY = Math.max(startUnscaled.y, endUnscaled.y);
        
        console.log('[MULTISELECT] Box (unscaled):', minX.toFixed(1), minY.toFixed(1), 'to', maxX.toFixed(1), maxY.toFixed(1));
        console.log('[MULTISELECT] Size:', (maxX - minX).toFixed(1), 'x', (maxY - minY).toFixed(1));
        
        // Find all objects within selection box
        const objects = this.game.objectManager.getObjectsForMap(this.game.currentMapId);
        this.selectedObjects = [];
        
        console.log('[MULTISELECT] Total objects on map:', objects.length);
        
        for (const obj of objects) {
            // Check if object center is within selection box (both in unscaled coordinates)
            if (obj.x >= minX && obj.x <= maxX && obj.y >= minY && obj.y <= maxY) {
                this.selectedObjects.push(obj);
                console.log('[MULTISELECT] Selected:', obj.name || obj.objectType, 'at', obj.x.toFixed(1), obj.y.toFixed(1));
            }
        }
        
        console.log(`[EditorManager] Multi-selected ${this.selectedObjects.length} objects`);
        
        // If only one object selected, treat as single selection
        if (this.selectedObjects.length === 1) {
            this.selectObject(this.selectedObjects[0]);
            this.selectedObjects = [];
        } else if (this.selectedObjects.length > 1) {
            this.selectedObject = null; // Clear single selection
            if (this.propertyPanel) {
                this.propertyPanel.hide();
            }
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
        // Mouse world coordinates are SCALED (for rendering)
        const worldX = this.mouseWorldXUnsnapped;
        const worldY = this.mouseWorldYUnsnapped;
        
        console.log('[SELECT] Click - screen:', x, y, 'world (scaled):', worldX, worldY);
        
        // Check if light editor is in placement mode
        if (this.lightEditor && this.lightEditor.placementMode) {
            const handled = this.lightEditor.handleMapClick(worldX, worldY);
            if (handled) {
                return true;
            }
        }
        
        // Check for light selection
        const selectedLight = this.game.lightManager.findLightAtPosition(worldX, worldY);
        if (selectedLight) {
            console.log('[SELECT] Selected light:', selectedLight.id);
            if (this.lightEditor) {
                this.lightEditor.selectLight(selectedLight);
            }
            return true;
        }
        
        // Find object at click position
        const objects = this.game.objectManager.getObjectsForMap(this.game.currentMapId);
        
        // Check collision bounds (which return SCALED coordinates)
        // We compare SCALED mouse position with SCALED bounds
        for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            const bounds = obj.getCollisionBounds(this.game);
            
            console.log(`[SELECT] Checking object ${i}: ${obj.name || obj.objectType} at unscaled (${obj.x}, ${obj.y})`);
            console.log(`[SELECT]   Bounds (scaled): x=${bounds.x.toFixed(1)}, y=${bounds.y.toFixed(1)}, w=${bounds.width.toFixed(1)}, h=${bounds.height.toFixed(1)}`);
            console.log(`[SELECT]   Mouse (scaled): x=${worldX.toFixed(1)}, y=${worldY.toFixed(1)}`);
            console.log(`[SELECT]   Hit test: ${worldX >= bounds.x && worldX <= bounds.x + bounds.width && worldY >= bounds.y && worldY <= bounds.y + bounds.height}`);
            
            if (worldX >= bounds.x && worldX <= bounds.x + bounds.width &&
                worldY >= bounds.y && worldY <= bounds.y + bounds.height) {
                
                console.log('[SELECT] ✓ HIT! Selecting this object');
                this.selectObject(obj);
                
                // For dragging, we need unscaled offset (obj.x/y are unscaled)
                const unscaled = this.worldToUnscaled(worldX, worldY);
                this.dragStartX = unscaled.x;
                this.dragStartY = unscaled.y;
                this.dragOffsetX = unscaled.x - obj.x;
                this.dragOffsetY = unscaled.y - obj.y;
                
                // Not multi-selecting when clicking an object
                this.isMultiSelecting = false;
                
                console.log('[SELECT] Selected:', obj.name || obj.objectType, 'at unscaled:', obj.x, obj.y);
                
                return true;
            }
        }
        
        // Clicked empty space - start multi-select or deselect (use scaled coordinates for visual box)
        console.log('[MULTISELECT] Starting at world:', worldX, worldY);
        this.multiSelectStart = { x: worldX, y: worldY };
        this.multiSelectEnd = { x: worldX, y: worldY }; // Initialize to same position
        this.isMultiSelecting = true;
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
        
        // COMMON BEHAVIOR: Convert world coordinates to storage coordinates
        // This works the same for ALL object types (NPCs, Doodads, Spirits, Lights, etc.)
        const storageCoords = this.convertWorldToStorageCoordinates(this.mouseWorldX, this.mouseWorldY);
        
        console.log('[EditorManager] Storage position:', storageCoords.x, storageCoords.y);
        
        // Create object at mouse position (using storage coordinates)
        const objectData = {
            ...this.selectedPrefab,
            x: storageCoords.x,
            y: storageCoords.y
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
     * Convert world coordinates to storage coordinates (UNSCALED format)
     * ALL game objects store coordinates in unscaled format, then scale them during rendering.
     * This ensures consistent behavior across all object types.
     */
    convertWorldToStorageCoordinates(worldX, worldY) {
        const resolutionScale = this.game?.resolutionScale || 1.0;
        const mapScale = this.game?.currentMap?.scale || 1.0;
        const totalScale = mapScale * resolutionScale;
        
        return {
            x: worldX / totalScale,
            y: worldY / totalScale
        };
    }

    /**
     * Place a new object
     */
    placeObject(objectData) {
        console.log('[EditorManager] Placing object at:', objectData.x, objectData.y);
        
        let placedObject = null;
        
        // Handle lights - they're not GameObject instances, managed by LightManager
        if (objectData.category === 'Light' || objectData.objectType === 'light') {
            placedObject = this.game.lightManager.lightRegistry.createLightFromTemplate(
                objectData.templateName,
                objectData.x,
                objectData.y
            );
            
            if (placedObject) {
                this.game.lightManager.addLight(placedObject);
                console.log('[EditorManager] ✅ Placed light:', placedObject.templateName);
            }
        } 
        // Handle regular GameObjects
        else {
            const dataWithMap = {
                ...objectData,
                mapId: this.game.currentMapId
            };
            
            placedObject = this.game.objectManager.createObjectFromData(dataWithMap);
            
            if (placedObject) {
                this.game.objectManager.addObject(this.game.currentMapId, placedObject);
                console.log('[EditorManager] ✅ Placed:', placedObject.constructor.name);
            }
        }
        
        // Common success handling
        if (placedObject) {
            this.addHistory({
                type: 'place',
                object: placedObject,
                mapId: this.game.currentMapId
            });
            console.log('[EditorManager] Press Escape to exit placement mode');
        } else {
            console.error('[EditorManager] ❌ Failed to create object');
        }
    }

    /**
     * Delete an object
     */
    deleteObject(obj) {
        console.log('[DELETE] deleteObject called with:', obj.constructor.name, 'ID:', obj.id, 'pos:', obj.x, obj.y);
        
        // DEBUG: Check all objects with same ID
        const allObjects = this.game.objectManager.getObjectsForMap(this.game.currentMapId);
        const duplicates = allObjects.filter(o => o.id === obj.id);
        console.log('[DELETE] Found', duplicates.length, 'object(s) with ID:', obj.id);
        duplicates.forEach((dup, idx) => {
            console.log(`[DELETE]   Duplicate ${idx}: pos=(${dup.x}, ${dup.y}), same reference as selected? ${dup === obj}`);
        });
        
        // Add to history first
        this.addHistory({
            type: 'delete',
            object: obj,
            mapId: this.game.currentMapId
        });
        
        console.log('[DELETE] Calling removeObject with ID:', obj.id);
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
        
        // Enter placement mode with the clipboard data as the prefab
        this.selectedPrefab = {
            ...this.clipboard,
            id: undefined // Generate new ID
        };
        
        // Load preview sprite
        if (this.selectedPrefab.spriteSrc) {
            this.loadPreviewSprite(this.selectedPrefab.spriteSrc);
        }
        
        // Switch to place tool
        this.setTool('place');
        console.log('[EditorManager] Paste mode active - click to place, press Escape to exit');
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
        
        // Reverse the action
        if (action.type === 'place') {
            this.game.objectManager.removeObject(action.mapId, action.object.id);
        } else if (action.type === 'delete') {
            this.game.objectManager.addObject(action.mapId, action.object);
        } else if (action.type === 'move') {
            action.object.x = action.oldX;
            action.object.y = action.oldY;
        } else if (action.type === 'paint') {
            // Store current state for redo before restoring
            const canvas = this.paintLayers[action.mapId];
            if (canvas && action.imageData) {
                const ctx = canvas.getContext('2d');
                
                // Save current state for redo
                if (!action.redoImageData) {
                    action.redoImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                }
                
                // Restore previous state
                ctx.putImageData(action.imageData, 0, 0);
            }
        }
        
        this.historyIndex--;
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
        } else if (action.type === 'paint') {
            // Restore the "after" state
            const canvas = this.paintLayers[action.mapId];
            if (canvas && action.redoImageData) {
                const ctx = canvas.getContext('2d');
                ctx.putImageData(action.redoImageData, 0, 0);
            }
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
            if (obj.reverseFacing) data.reverseFacing = obj.reverseFacing;
            
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
        
        // Get lights data for current map
        const lightsData = this.game.lightManager.exportLights();
        
        // Combine into full map data
        const mapData = {
            objects: objectsData,
            lights: lightsData
        };
        
        // Display JSON for now (later we'll save to file)
        const json = JSON.stringify(mapData, null, 2);
        console.log('[EditorManager] Map data:', json);
        
        alert('Map data (objects + lights) saved to console. Check browser console (F12) to copy JSON.');
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

    // ==================== PAINT TOOL METHODS ====================

    /**
     * Initialize paint layer for a map
     */
    initializePaintLayer(mapId) {
        if (this.paintLayers[mapId]) return;
        
        const mapData = this.game.mapManager.maps[mapId];
        if (!mapData) return;
        
        // Calculate scaled dimensions to match how the map is rendered
        const mapScale = mapData.scale || 1.0;
        const resolutionScale = this.game.resolutionScale || 1.0;
        const scaledWidth = mapData.width * mapScale * resolutionScale;
        const scaledHeight = mapData.height * mapScale * resolutionScale;
        
        // Create canvas for paint layer with scaled dimensions
        const canvas = document.createElement('canvas');
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        
        this.paintLayers[mapId] = canvas;
        console.log(`[EditorManager] Initialized paint layer for map ${mapId}: ${scaledWidth}x${scaledHeight} (original: ${mapData.width}x${mapData.height}, mapScale: ${mapScale}, resScale: ${resolutionScale})`);
    }

    /**
     * Load a texture for painting
     */
    loadTexture(texturePath, textureName) {
        if (this.loadedTextures[texturePath]) {
            this.selectedTexture = texturePath;
            return;
        }
        
        const img = new Image();
        img.onload = () => {
            this.loadedTextures[texturePath] = img;
            this.selectedTexture = texturePath;
            console.log(`[EditorManager] Loaded texture: ${textureName}`);
        };
        img.onerror = () => {
            console.error(`[EditorManager] Failed to load texture: ${texturePath}`);
        };
        img.src = texturePath;
        
        // Add to textures list if not already there
        if (!this.textures.find(t => t.path === texturePath)) {
            this.textures.push({ path: texturePath, name: textureName });
        }
    }

    /**
     * Paint texture or collision at position
     */
    paintAt(worldX, worldY) {
        const mapId = this.game.currentMapId;
        
        // Handle erase action
        if (this.toolAction === 'erase') {
            this.eraseAt(worldX, worldY, mapId);
            return;
        }
        
        // For texture mode with paint action, we need a texture
        if (this.toolAction === 'paint' && this.paintMode === 'texture' && (!this.selectedTexture || !this.loadedTextures[this.selectedTexture])) {
            return;
        }
        
        // Handle collision painting
        if (this.paintMode === 'collision') {
            this.paintCollisionAt(worldX, worldY, mapId);
            return;
        }
        
        // Handle spawn zone painting
        if (this.paintMode === 'spawn') {
            this.paintSpawnZoneAt(worldX, worldY, mapId);
            return;
        }
        
        // Initialize paint canvas for active layer if needed
        if (this.game.layerManager && this.game.layerManager.hasLayers(mapId)) {
            const activeLayerId = this.game.layerManager.activeLayerId;
            if (activeLayerId) {
                const mapData = this.game.mapManager.maps[mapId];
                if (mapData) {
                    const mapScale = mapData.scale || 1.0;
                    const resolutionScale = this.game.resolutionScale || 1.0;
                    const scaledWidth = mapData.width * mapScale * resolutionScale;
                    const scaledHeight = mapData.height * mapScale * resolutionScale;
                    
                    // Ensure the active layer has a paint canvas
                    if (!this.game.layerManager.getPaintCanvas(mapId, activeLayerId)) {
                        this.game.layerManager.initializePaintCanvas(mapId, activeLayerId, scaledWidth, scaledHeight);
                    }
                }
            }
        }
        
        const canvas = this.getPaintLayer(mapId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const texture = this.loadedTextures[this.selectedTexture];
        
        // Create brush pattern/stamp
        const brushCanvas = document.createElement('canvas');
        const brushSize = this.brushSize;
        brushCanvas.width = brushSize * 2;
        brushCanvas.height = brushSize * 2;
        const brushCtx = brushCanvas.getContext('2d');
        
        // Create radial gradient for brush based on style
        let gradient;
        switch (this.brushStyle) {
            case 'hard':
                // Sharp edges
                gradient = brushCtx.createRadialGradient(brushSize, brushSize, brushSize * 0.8, brushSize, brushSize, brushSize);
                gradient.addColorStop(0, `rgba(255, 255, 255, ${this.brushOpacity})`);
                gradient.addColorStop(0.99, `rgba(255, 255, 255, ${this.brushOpacity})`);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                break;
            
            case 'very-soft':
                // Very gradual fade
                gradient = brushCtx.createRadialGradient(brushSize, brushSize, 0, brushSize, brushSize, brushSize);
                gradient.addColorStop(0, `rgba(255, 255, 255, ${this.brushOpacity})`);
                gradient.addColorStop(0.3, `rgba(255, 255, 255, ${this.brushOpacity * 0.8})`);
                gradient.addColorStop(0.6, `rgba(255, 255, 255, ${this.brushOpacity * 0.4})`);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                break;
            
            case 'soft':
            default:
                // Medium soft edges
                gradient = brushCtx.createRadialGradient(brushSize, brushSize, 0, brushSize, brushSize, brushSize);
                gradient.addColorStop(0, `rgba(255, 255, 255, ${this.brushOpacity})`);
                gradient.addColorStop(0.7, `rgba(255, 255, 255, ${this.brushOpacity * 0.5})`);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                break;
        }
        
        // Fill brush with gradient mask
        brushCtx.fillStyle = gradient;
        brushCtx.fillRect(0, 0, brushSize * 2, brushSize * 2);
        
        // Create a temporary canvas for this brush stroke
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = brushSize * 2;
        tempCanvas.height = brushSize * 2;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw texture pattern on temp canvas
        const pattern = tempCtx.createPattern(texture, 'repeat');
        tempCtx.fillStyle = pattern;
        tempCtx.fillRect(0, 0, brushSize * 2, brushSize * 2);
        
        // Apply brush mask using destination-in
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(brushCanvas, 0, 0);
        
        // Draw the masked texture onto the paint layer
        ctx.save();
        ctx.globalCompositeOperation = 'source-over'; // Accumulate paint
        ctx.drawImage(tempCanvas, worldX - brushSize, worldY - brushSize);
        ctx.restore();
    }

    /**
     * Paint collision area at position
     */
    paintCollisionAt(worldX, worldY, mapId) {
        // Initialize collision canvas if needed
        if (!this.collisionLayers[mapId]) {
            const mapData = this.game.mapManager.maps[mapId];
            if (!mapData) return;
            
            // Canvas sized for rendering (with resolution scale)
            const mapScale = mapData.scale || 1.0;
            const resolutionScale = this.game.resolutionScale || 1.0;
            const scaledWidth = mapData.width * mapScale * resolutionScale;
            const scaledHeight = mapData.height * mapScale * resolutionScale;
            
            const canvas = document.createElement('canvas');
            canvas.width = scaledWidth;
            canvas.height = scaledHeight;
            this.collisionLayers[mapId] = canvas;
            console.log(`[EditorManager] Initialized collision layer for map ${mapId}: ${scaledWidth}x${scaledHeight}`);
        }
        
        const canvas = this.collisionLayers[mapId];
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const brushSize = this.brushSize;
        
        // Draw collision area (solid red, no transparency)
        // Use worldX/worldY directly - canvas is sized to match world coordinates
        ctx.save();
        ctx.fillStyle = 'rgba(255, 0, 0, 1.0)'; // Solid red
        ctx.globalCompositeOperation = 'source-over';
        
        // Draw based on brush shape
        if (this.brushShape === 'square') {
            // Square brush
            ctx.fillRect(worldX - brushSize, worldY - brushSize, brushSize * 2, brushSize * 2);
        } else {
            // Circle brush (default)
            ctx.beginPath();
            ctx.arc(worldX, worldY, brushSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
        
        // Mark canvas as dirty so collision cache gets updated
        canvas._dataDirty = true;
    }

    /**
     * Paint spawn zone at world position
     */
    paintSpawnZoneAt(worldX, worldY, mapId) {
        // Initialize spawn zone canvas if needed
        if (!this.spawnLayers[mapId]) {
            const mapData = this.game.mapManager.maps[mapId];
            if (!mapData) return;
            
            // Canvas sized for rendering (with resolution scale)
            const mapScale = mapData.scale || 1.0;
            const resolutionScale = this.game.resolutionScale || 1.0;
            const scaledWidth = mapData.width * mapScale * resolutionScale;
            const scaledHeight = mapData.height * mapScale * resolutionScale;
            
            const canvas = document.createElement('canvas');
            canvas.width = scaledWidth;
            canvas.height = scaledHeight;
            this.spawnLayers[mapId] = canvas;
            console.log(`[EditorManager] 🎨 Initialized spawn zone layer for map ${mapId}:`);
            console.log(`  - Map dimensions: ${mapData.width}x${mapData.height}`);
            console.log(`  - Map scale: ${mapScale}, Resolution scale: ${resolutionScale}`);
            console.log(`  - Canvas size: ${scaledWidth}x${scaledHeight}`);
        }
        
        const canvas = this.spawnLayers[mapId];
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const brushSize = this.brushSize;
        
        // worldX/worldY are already in scaled world coordinates
        // The spawn layer canvas is also in scaled world coordinates (rendered at 0,0 with camera transform)
        // So we use worldX/worldY directly
        
        // DEBUG: Log painting to verify coordinates
        console.log(`[EditorManager] 🎨 Painting spawn zone at world(${Math.round(worldX)}, ${Math.round(worldY)}) on canvas ${canvas.width}x${canvas.height}, brush size: ${brushSize}`);
        
        // Draw spawn zone (solid blue for binary pixel detection)
        ctx.save();
        ctx.fillStyle = 'rgba(0, 100, 255, 1.0)'; // Solid blue, 100% opacity
        ctx.globalCompositeOperation = 'source-over';
        
        // Draw based on brush shape
        if (this.brushShape === 'square') {
            // Square brush
            ctx.fillRect(worldX - brushSize, worldY - brushSize, brushSize * 2, brushSize * 2);
        } else {
            // Circle brush (default)
            ctx.beginPath();
            ctx.arc(worldX, worldY, brushSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
        
        // Mark canvas as dirty so spawn zone cache gets updated
        canvas._dataDirty = true;
        
        // Invalidate spawn zone cache in spawn manager to force rebuild
        if (this.game.spawnManager) {
            this.game.spawnManager.invalidateSpawnZoneCache();
        }
    }

    /**
     * Erase texture or collision at position
     */
    eraseAt(worldX, worldY, mapId) {
        let canvas;
        
        // Get the appropriate canvas based on paint mode
        if (this.paintMode === 'collision') {
            canvas = this.collisionLayers[mapId];
        } else if (this.paintMode === 'spawn') {
            canvas = this.spawnLayers[mapId];
        } else {
            canvas = this.getPaintLayer(mapId);
        }
        
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const brushSize = this.brushSize;
        
        // For collision and spawn modes: simple hard erase
        if (this.paintMode === 'collision' || this.paintMode === 'spawn') {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
            
            // Erase based on brush shape
            if (this.brushShape === 'square') {
                ctx.fillRect(worldX - brushSize, worldY - brushSize, brushSize * 2, brushSize * 2);
            } else {
                ctx.beginPath();
                ctx.arc(worldX, worldY, brushSize, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
            
            // Mark canvas as dirty so collision cache gets updated
            canvas._dataDirty = true;
            
            // Invalidate spawn zone cache if erasing spawn zones
            if (this.paintMode === 'spawn' && this.game.spawnManager) {
                this.game.spawnManager.invalidateSpawnZoneCache();
            }
            
            return;
        }
        
        // For texture mode: support soft edges and opacity
        // Create brush with gradient based on style
        const brushCanvas = document.createElement('canvas');
        brushCanvas.width = brushSize * 2;
        brushCanvas.height = brushSize * 2;
        const brushCtx = brushCanvas.getContext('2d');
        
        // Create radial gradient for brush based on style
        let gradient;
        switch (this.brushStyle) {
            case 'hard':
                // Sharp edges
                gradient = brushCtx.createRadialGradient(brushSize, brushSize, brushSize * 0.8, brushSize, brushSize, brushSize);
                gradient.addColorStop(0, `rgba(255, 255, 255, ${this.brushOpacity})`);
                gradient.addColorStop(0.99, `rgba(255, 255, 255, ${this.brushOpacity})`);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                break;
            
            case 'very-soft':
                // Very gradual fade
                gradient = brushCtx.createRadialGradient(brushSize, brushSize, 0, brushSize, brushSize, brushSize);
                gradient.addColorStop(0, `rgba(255, 255, 255, ${this.brushOpacity})`);
                gradient.addColorStop(0.3, `rgba(255, 255, 255, ${this.brushOpacity * 0.8})`);
                gradient.addColorStop(0.6, `rgba(255, 255, 255, ${this.brushOpacity * 0.4})`);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                break;
            
            case 'soft':
            default:
                // Medium soft edges
                gradient = brushCtx.createRadialGradient(brushSize, brushSize, 0, brushSize, brushSize, brushSize);
                gradient.addColorStop(0, `rgba(255, 255, 255, ${this.brushOpacity})`);
                gradient.addColorStop(0.7, `rgba(255, 255, 255, ${this.brushOpacity * 0.5})`);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                break;
        }
        
        // Fill brush with gradient
        brushCtx.fillStyle = gradient;
        brushCtx.fillRect(0, 0, brushSize * 2, brushSize * 2);
        
        // Apply the eraser brush to the canvas
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(brushCanvas, worldX - brushSize, worldY - brushSize);
        ctx.restore();
    }

    /**
     * Fill entire layer with texture or collision
     */
    fillLayer(mapId) {
        let canvas;
        
        // Get the appropriate canvas based on paint mode
        if (this.paintMode === 'collision') {
            // Initialize collision canvas if needed
            if (!this.collisionLayers[mapId]) {
                const mapData = this.game.mapManager.maps[mapId];
                if (!mapData) return;
                
                const mapScale = mapData.scale || 1.0;
                const resolutionScale = this.game.resolutionScale || 1.0;
                const scaledWidth = mapData.width * mapScale * resolutionScale;
                const scaledHeight = mapData.height * mapScale * resolutionScale;
                
                canvas = document.createElement('canvas');
                canvas.width = scaledWidth;
                canvas.height = scaledHeight;
                this.collisionLayers[mapId] = canvas;
            } else {
                canvas = this.collisionLayers[mapId];
            }
            
            // Fill with solid red collision
            const ctx = canvas.getContext('2d');
            ctx.save();
            ctx.fillStyle = 'rgba(255, 0, 0, 1.0)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
            
            // Mark canvas as dirty so collision cache gets updated
            canvas._dataDirty = true;
            
            console.log(`[EditorManager] Filled collision layer for map ${mapId}`);
        } else if (this.paintMode === 'spawn') {
            // Initialize spawn zone canvas if needed
            if (!this.spawnLayers[mapId]) {
                const mapData = this.game.mapManager.maps[mapId];
                if (!mapData) return;
                
                const mapScale = mapData.scale || 1.0;
                const resolutionScale = this.game.resolutionScale || 1.0;
                const scaledWidth = mapData.width * mapScale * resolutionScale;
                const scaledHeight = mapData.height * mapScale * resolutionScale;
                
                canvas = document.createElement('canvas');
                canvas.width = scaledWidth;
                canvas.height = scaledHeight;
                this.spawnLayers[mapId] = canvas;
            } else {
                canvas = this.spawnLayers[mapId];
            }
            
            // Fill with solid blue spawn zone
            const ctx = canvas.getContext('2d');
            ctx.save();
            ctx.fillStyle = 'rgba(0, 100, 255, 1.0)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
            
            // Mark canvas as dirty and invalidate spawn zone cache
            canvas._dataDirty = true;
            if (this.game.spawnManager) {
                this.game.spawnManager.invalidateSpawnZoneCache();
            }
            
            console.log(`[EditorManager] Filled spawn zone layer for map ${mapId}`);
        } else {
            // Texture mode - require texture
            if (!this.selectedTexture || !this.loadedTextures[this.selectedTexture]) {
                console.warn('[EditorManager] Cannot fill: no texture selected');
                return;
            }
            
            canvas = this.getPaintLayer(mapId);
            if (!canvas) {
                // Initialize paint layer if needed
                this.initializePaintLayer(mapId);
                
                // Also initialize for active layer if using layer system
                if (this.game.layerManager && this.game.layerManager.hasLayers(mapId)) {
                    const activeLayerId = this.game.layerManager.activeLayerId;
                    if (activeLayerId !== null) {
                        const mapData = this.game.mapManager.maps[mapId];
                        if (mapData) {
                            const mapScale = mapData.scale || 1.0;
                            const resolutionScale = this.game.resolutionScale || 1.0;
                            const scaledWidth = mapData.width * mapScale * resolutionScale;
                            const scaledHeight = mapData.height * mapScale * resolutionScale;
                            
                            if (!this.game.layerManager.getPaintCanvas(mapId, activeLayerId)) {
                                this.game.layerManager.initializePaintCanvas(mapId, activeLayerId, scaledWidth, scaledHeight);
                            }
                        }
                    }
                }
                
                canvas = this.getPaintLayer(mapId);
                if (!canvas) return;
            }
            
            // Fill with texture pattern
            const ctx = canvas.getContext('2d');
            const texture = this.loadedTextures[this.selectedTexture];
            
            ctx.save();
            const pattern = ctx.createPattern(texture, 'repeat');
            ctx.fillStyle = pattern;
            ctx.globalAlpha = this.brushOpacity;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
            
            console.log(`[EditorManager] Filled texture layer for map ${mapId}`);
        }
    }

    /**
     * Get collision layer for a map (called by RenderSystem)
     */
    getCollisionLayer(mapId) {
        return this.collisionLayers[mapId];
    }

    /**
     * Bake collision canvas to image for better rendering performance
     */
    bakeCollisionLayer(mapId) {
        const canvas = this.collisionLayers[mapId];
        if (!canvas) return;
        
        // Convert canvas to data URL
        const dataURL = canvas.toDataURL('image/png');
        
        // Create an image from the canvas
        const img = new Image();
        img.onload = () => {
            canvas._bakedImage = img;
            canvas._imageReady = true;
            // IMPORTANT: Keep _dataDirty true so collision detection recaches ImageData
            // The rendering will use the baked image, but collision detection needs to update its cache
            canvas._dataDirty = true;
            console.log(`[EditorManager] Baked collision layer for map ${mapId} to image for better performance`);
        };
        img.src = dataURL;
    }

    /**
     * Get spawn zone layer for a map
     */
    getSpawnLayer(mapId) {
        return this.spawnLayers[mapId];
    }

    /**
     * Bake spawn zone canvas to image for better rendering performance
     */
    bakeSpawnLayer(mapId) {
        const canvas = this.spawnLayers[mapId];
        if (!canvas) return;
        
        // Convert canvas to data URL
        const dataURL = canvas.toDataURL('image/png');
        
        // Create an image from the canvas
        const img = new Image();
        img.onload = () => {
            canvas._bakedImage = img;
            canvas._imageReady = true;
            canvas._dataDirty = true;
            console.log(`[EditorManager] Baked spawn zone layer for map ${mapId} to image for better performance`);
        };
        img.src = dataURL;
    }

    /**
     * Start painting
     */
    startPainting(x, y) {
        if (this.selectedTool !== 'paint') return;
        
        const mapId = this.game.currentMapId;
        
        // Invalidate baked images when starting to paint
        if (this.paintMode === 'texture' && this.game.layerManager) {
            const activeLayerId = this.game.layerManager.activeLayerId;
            if (activeLayerId !== null) {
                const layer = this.game.layerManager.getLayer(mapId, activeLayerId);
                if (layer) {
                    layer.paintImageReady = false; // Fall back to canvas while painting
                }
            }
        } else if (this.paintMode === 'collision') {
            const canvas = this.collisionLayers[mapId];
            if (canvas) {
                canvas._imageReady = false; // Fall back to canvas while painting
            }
        } else if (this.paintMode === 'spawn') {
            const canvas = this.spawnLayers[mapId];
            if (canvas) {
                canvas._imageReady = false; // Fall back to canvas while painting
            }
        }
        
        // Handle fill action - execute immediately and return
        if (this.toolAction === 'fill') {
            // For texture mode with fill, require a texture
            if (this.paintMode === 'texture' && !this.selectedTexture) return;
            
            // Capture state before filling (for undo)
            let canvas;
            if (this.paintMode === 'collision') {
                canvas = this.collisionLayers[mapId];
            } else if (this.paintMode === 'spawn') {
                canvas = this.spawnLayers[mapId];
            } else {
                canvas = this.getPaintLayer(mapId);
            }
            if (canvas) {
                const ctx = canvas.getContext('2d');
                const beforeState = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // Store state for undo
                this.addHistory({
                    type: 'fill',
                    mapId: mapId,
                    imageData: beforeState
                });
            }
            
            // Execute fill
            this.fillLayer(mapId);
            return; // Don't set isPainting for fill action
        }
        
        // For texture mode with paint/erase, require a texture (except erase doesn't need it)
        if (this.toolAction === 'paint' && this.paintMode === 'texture' && !this.selectedTexture) return;
        
        // Capture paint layer state before painting starts (for undo)
        const canvas = this.paintMode === 'collision' ? this.collisionLayers[mapId] : this.getPaintLayer(mapId);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            this.paintStartState = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        
        this.isPainting = true;
        this.paintAt(this.mouseWorldX, this.mouseWorldY);
    }

    /**
     * Continue painting (while dragging)
     */
    continuePainting(x, y) {
        if (!this.isPainting) return;
        this.paintAt(this.mouseWorldX, this.mouseWorldY);
    }

    /**
     * Stop painting
     */
    stopPainting() {
        if (!this.isPainting) return;
        
        this.isPainting = false;
        
        // Add to history for undo (store the state from before the stroke)
        if (this.paintStartState) {
            this.addHistory({
                type: 'paint',
                mapId: this.game.currentMapId,
                imageData: this.paintStartState
            });
            this.paintStartState = null;
        }
        
        // Bake the paint canvas to an image for better performance
        if (this.paintMode === 'texture' && this.game.layerManager) {
            const activeLayerId = this.game.layerManager.activeLayerId;
            if (activeLayerId !== null) {
                this.game.layerManager.bakeLayerPaint(this.game.currentMapId, activeLayerId);
            }
        } else if (this.paintMode === 'collision') {
            // Bake collision layer to image
            this.bakeCollisionLayer(this.game.currentMapId);
        } else if (this.paintMode === 'spawn') {
            // Bake spawn zone layer to image
            this.bakeSpawnLayer(this.game.currentMapId);
        }
    }

    /**
     * Get paint layer for a map (called by RenderSystem)
     */
    getPaintLayer(mapId) {
        // If layer system is enabled, return the active layer's paint canvas
        if (this.game.layerManager && this.game.layerManager.hasLayers(mapId)) {
            const activeLayerId = this.game.layerManager.activeLayerId;
            if (activeLayerId) {
                return this.game.layerManager.getPaintCanvas(mapId, activeLayerId);
            }
        }
        
        // Fallback to legacy paint layer system
        return this.paintLayers[mapId];
    }

    /**
     * Render brush preview
     * NOTE: This is called AFTER RenderSystem restores camera transform,
     * so we need to manually apply the camera transform to draw the preview
     * in the correct screen position.
     */
    renderBrushPreview(ctx) {
        if (this.selectedTool !== 'paint') return;
        
        const camera = this.game.camera;
        const zoom = camera.zoom || 1.0;
        
        ctx.save();
        
        // Apply the same camera transform that RenderSystem uses
        const canvasWidth = this.game.CANVAS_WIDTH;
        const canvasHeight = this.game.CANVAS_HEIGHT;
        
        // Apply zoom (scale around canvas center)
        if (zoom !== 1.0) {
            ctx.translate(canvasWidth / 2, canvasHeight / 2);
            ctx.scale(zoom, zoom);
            ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        }
        
        // Apply camera translation
        ctx.translate(-camera.x, -camera.y);
        
        // Now draw in world coordinates
        const worldX = this.mouseWorldX;
        const worldY = this.mouseWorldY;
        
        // Draw brush preview
        ctx.strokeStyle = this.selectedTexture ? 'rgba(74, 158, 255, 0.8)' : 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([5 / zoom, 5 / zoom]);
        ctx.beginPath();
        
        if (this.brushShape === 'square') {
            const halfSize = this.brushSize;
            ctx.rect(worldX - halfSize, worldY - halfSize, halfSize * 2, halfSize * 2);
        } else {
            ctx.arc(worldX, worldY, this.brushSize, 0, Math.PI * 2);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw center dot
        ctx.fillStyle = this.selectedTexture ? 'rgba(74, 158, 255, 1)' : 'rgba(255, 0, 0, 1)';
        ctx.beginPath();
        ctx.arc(worldX, worldY, 3 / zoom, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// Export
window.EditorManager = EditorManager;
