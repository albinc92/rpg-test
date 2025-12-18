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
        this.paintMode = 'texture'; // Only textures are paintable (collision/spawn use vector zones)
        this.toolAction = 'paint'; // 'paint', 'erase', or 'fill'
        this.selectedTexture = null; // Current texture to paint with
        this.brushSize = 64; // Brush radius in pixels
        this.brushStyle = 'soft'; // 'soft', 'hard', 'very-soft'
        this.brushShape = 'circle'; // 'circle' or 'square' (for all paint modes)
        this.brushOpacity = 1.0; // Default to 100% opacity
        this.paintLayers = {}; // Store paint layers per map {mapId: canvas}
        this.collisionLayers = {}; // Store collision layers per map {mapId: canvas}
        this.spawnLayers = {}; // Store spawn zone layers per map {mapId: canvas}
        this.textures = []; // Available textures for painting
        this.loadedTextures = {}; // Cache of loaded texture images
        this.paintStartState = null; // Store canvas state before stroke for undo
        
        // Vector Zone state
        this.currentZonePoints = []; // Points for the zone currently being drawn
        this.zones = []; // List of completed zones { points: [], type: 'spawn'|'collision' }
        this.zoneType = 'collision'; // Default zone type
        this.selectedZone = null; // Currently selected zone

        
        // Spawn zone visibility
        this.showSpawnZones = true; // Show spawn zones in editor
        
        // Zone Editor state
        this.currentZonePoints = [];
        this.zones = []; // Array of {points: [{x,y}, ...]}
        
        // Drag state for moving objects
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        
        // Placement preview
        this.previewObject = null;
        this.mouseWorldX = 0; // Potentially grid-snapped (perspective-corrected for placement)
        this.mouseWorldY = 0;
        this.mouseWorldXUnsnapped = 0; // Always unsnapped (for multi-select)
        this.mouseWorldYUnsnapped = 0;
        this.mouseScreenWorldX = 0; // Screen-relative world coords (for preview rendering)
        this.mouseScreenWorldY = 0;
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
        return {
            x: worldX / resolutionScale,
            y: worldY / resolutionScale
        };
    }
    
    /**
     * Convert unscaled storage coordinates to scaled world coordinates
     * Use this when converting object position to rendering position
     */
    unscaledToWorld(unscaledX, unscaledY) {
        const resolutionScale = this.game.resolutionScale || 1.0;
        return {
            x: unscaledX * resolutionScale,
            y: unscaledY * resolutionScale
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
            else if ((e.key === 'd' || e.key === 'D' || e.key === 'Delete')) {
                if (this.selectedZone) {
                    e.preventDefault();
                    this.deleteZone(this.selectedZone);
                } else if (this.selectedObject || this.selectedObjects.length > 0) {
                    e.preventDefault();
                    
                    // Delete multiple selected objects
                    if (this.selectedObjects.length > 0) {
                        for (const obj of this.selectedObjects) {
                            this.deleteObject(obj);
                        }
                        this.selectedObjects = [];
                    } 
                    // Delete single selected object
                    else if (this.selectedObject) {
                        this.deleteObject(this.selectedObject);
                    }
                }
            }
            
            // Copy/paste
            else if (e.ctrlKey && e.key === 'c') {
                if (this.selectedZone) {
                    e.preventDefault();
                    this.copyZone(this.selectedZone);
                } else if (this.selectedObject) {
                    e.preventDefault();
                    this.copyObject(this.selectedObject);
                }
            } else if (e.ctrlKey && e.key === 'v' && (this.clipboard || this.zoneClipboard)) {
                e.preventDefault();
                if (this.zoneClipboard) {
                    this.pasteZone();
                } else {
                    this.pasteObject();
                }
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
            
            // Toggle spawn zones visibility
            else if (e.key === 'z' || e.key === 'Z') {
                this.showSpawnZones = !this.showSpawnZones;
                console.log('[EditorManager] Spawn Zones:', this.showSpawnZones ? 'ON' : 'OFF');
                if (this.ui) this.ui.updateViewMenu();
            }
            
            // Toggle layer panel
            else if (e.key === 'l' || e.key === 'L') {
                if (this.layerPanel) {
                    this.layerPanel.toggle();
                    console.log('[EditorManager] Layer Panel:', this.layerPanel.isVisible() ? 'SHOWN' : 'HIDDEN');
                }
            }
            
            // Toggle placement panel
            else if (e.key === 'p' || e.key === 'P') {
                if (this.placementPanel) {
                    if (this.placementPanel.isVisible()) {
                        this.placementPanel.hide();
                        console.log('[EditorManager] Placement Panel: HIDDEN');
                    } else {
                        this.placementPanel.show();
                        console.log('[EditorManager] Placement Panel: SHOWN');
                    }
                }
            }
            
            // Quick tool shortcuts
            else if (e.key === 'v' || e.key === 'V') {
                this.setTool('select');
                console.log('[EditorManager] Tool: SELECT');
            }
            else if (e.key === 'b' || e.key === 'B') {
                this.setTool('paint');
                if (this.ui) this.ui.showPaintToolPanel();
                console.log('[EditorManager] Tool: PAINT');
            }
            else if (e.key === 'k' || e.key === 'K') {
                this.setTool('zone');
                if (this.ui) this.ui.showZoneToolPanel();
                console.log('[EditorManager] Tool: ZONE');
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
                    this.brushSize = Math.min(512, this.brushSize + 8);
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
        
        // Load zones for current map
        const mapData = this.game.mapManager.maps[this.game.currentMapId];
        if (!mapData.zones) {
            mapData.zones = [];
        }
        this.zones = mapData.zones;
        
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
        console.log('=== EDITOR DEACTIVATE ===');
        console.log('[EDITOR] Objects on map before deactivate:', this.game.objectManager.getObjectsForMap(this.game.currentMapId).length);
        this.game.objectManager.getObjectsForMap(this.game.currentMapId).forEach((obj, idx) => {
            console.log(`[EDITOR] Object ${idx}: ${obj.constructor.name} id=${obj.id} pos=(${obj.x}, ${obj.y})`);
        });
        
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

        // Close zone tool panel if open
        const zonePanel = document.getElementById('zone-tool-panel');
        if (zonePanel) {
            zonePanel.remove();
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

        let worldX = worldCanvasX + camera.x;
        let worldY = worldCanvasY + camera.y;
        
        // Store the screen-relative world position BEFORE perspective transform
        // This is used for preview rendering and placement (so preview appears at cursor position)
        this.mouseScreenWorldX = worldX;
        this.mouseScreenWorldY = worldY;

        // If perspective mode is active, use inverse perspective transform
        // This allows clicking on objects where they visually appear
        const webglRenderer = this.game.renderSystem?.webglRenderer;
        if (webglRenderer) {
            const perspectiveParams = webglRenderer.getPerspectiveParams();
            if (perspectiveParams.enabled) {
                // Transform screen click position to world coordinates accounting for perspective
                // IMPORTANT: Pass zoom-adjusted worldCanvasX/Y, not raw mouseCanvasX/Y
                // The WebGL viewMatrix includes zoom, so we need coords that match
                const worldPos = webglRenderer.transformScreenToWorld(
                    worldCanvasX, worldCanvasY,
                    camera.x, camera.y
                );
                worldX = worldPos.worldX;
                worldY = worldPos.worldY;
            }
        }

        // Store unsnapped coordinates (always available for multi-select)
        this.mouseWorldXUnsnapped = worldX;
        this.mouseWorldYUnsnapped = worldY;

        // Store canvas coordinates for drag selection (logical canvas space, no zoom/camera)
        this.mouseCanvasX = mouseCanvasX;
        this.mouseCanvasY = mouseCanvasY;

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
     * Get the visual sprite bounds for an object (matches exactly how it's rendered)
     */
    getVisualBounds(obj) {
        const game = this.game;
        const resolutionScale = game?.resolutionScale || 1.0;
        
        // Position: uses resolutionScale (same as getScaledX/Y)
        const scaledX = obj.x * resolutionScale;
        const scaledY = obj.y * resolutionScale;
        
        // Size: uses scale * resolutionScale (same as getFinalScale)
        const finalScale = (obj.scale || 1.0) * resolutionScale;
        const baseWidth = obj.spriteWidth || obj.fallbackWidth || 64;
        const baseHeight = obj.spriteHeight || obj.fallbackHeight || 64;
        const width = baseWidth * finalScale;
        const height = baseHeight * finalScale;
        
        // Altitude offset
        const altitudeOffset = (obj.altitude || 0) * resolutionScale;
        
        // Same as StaticObject.renderSprite positioning
        return {
            x: scaledX - width / 2,
            y: scaledY - height / 2 - altitudeOffset,
            width: width,
            height: height
        };
    }
    
    /**
     * Create or get a selection box texture for a given size
     */
    getSelectionBoxTexture(width, height) {
        // Round to avoid creating too many textures
        const w = Math.ceil(width);
        const h = Math.ceil(height);
        const key = `selection_${w}x${h}`;
        
        if (!this.selectionTextures) {
            this.selectionTextures = new Map();
        }
        
        if (this.selectionTextures.has(key)) {
            return { canvas: this.selectionTextures.get(key), key };
        }
        
        // Create a canvas with a dashed border
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        
        // Draw dashed rectangle border
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(2, 2, w - 4, h - 4);
        
        this.selectionTextures.set(key, canvas);
        return { canvas, key };
    }
    
    /**
     * Render selection boxes to WebGL (called from RenderSystem)
     */
    renderSelectionToWebGL(webglRenderer, cameraX, cameraY) {
        if (!this.isActive) return;
        if (!webglRenderer || !webglRenderer.initialized) return;
        
        // Render single selection
        if (this.selectedObject) {
            const isLight = this.selectedObject.templateName && this.game.lightManager?.lights.includes(this.selectedObject);
            
            if (!isLight) {
                const bounds = this.getVisualBounds(this.selectedObject);
                const { canvas, key } = this.getSelectionBoxTexture(bounds.width, bounds.height);
                
                // Draw the selection box through the same sprite pipeline
                webglRenderer.drawSprite(
                    bounds.x,
                    bounds.y,
                    bounds.width,
                    bounds.height,
                    canvas,
                    key,
                    0.9  // slightly transparent
                );
            }
        }
        
        // Render multi-selection
        if (this.selectedObjects.length > 0) {
            for (const obj of this.selectedObjects) {
                const isLight = obj.templateName && this.game.lightManager?.lights.includes(obj);
                if (!isLight) {
                    const bounds = this.getVisualBounds(obj);
                    const { canvas, key } = this.getSelectionBoxTexture(bounds.width, bounds.height);
                    
                    webglRenderer.drawSprite(
                        bounds.x,
                        bounds.y,
                        bounds.width,
                        bounds.height,
                        canvas,
                        key,
                        0.9
                    );
                }
            }
        }
    }
    
    /**
     * Render preview sprite to WebGL (called from RenderSystem during sprite pass)
     * This is rendered with billboardMode ON, so it gets the same perspective as placed objects
     */
    renderPreviewToWebGL(webglRenderer, cameraX, cameraY) {
        if (!this.isActive) return;
        if (this.selectedTool !== 'place' || !this.selectedPrefab) return;

        const sprite = this.previewSprite;
        if (!sprite || !sprite.complete) return;

        // Use screen-relative world position for POSITION (so preview stays at cursor)
        let posWorldX = this.mouseScreenWorldX;
        let posWorldY = this.mouseScreenWorldY;
        
        // Apply grid snap to position if enabled
        if (this.snapToGrid) {
            posWorldX = Math.round(posWorldX / this.gridSize) * this.gridSize;
            posWorldY = Math.round(posWorldY / this.gridSize) * this.gridSize;
        }
        
        // Get sprite and dimensions
        const scale = this.selectedPrefab.scale || 1;
        let spriteWidth = this.selectedPrefab.width || sprite.naturalWidth || sprite.width || 64;
        let spriteHeight = this.selectedPrefab.height || sprite.naturalHeight || sprite.height || 64;
        
        // Calculate sprite dimensions (matching GameObject.getFinalScale)
        const resolutionScale = this.game.resolutionScale || 1;
        const finalScale = scale * resolutionScale;
        let scaledWidth = spriteWidth * finalScale;
        let scaledHeight = spriteHeight * finalScale;
        
        // Apply perspective scale to SIZE (so preview shows how big the object will look)
        // But keep position at cursor (don't shift it)
        const perspectiveParams = webglRenderer.getPerspectiveParams();
        if (perspectiveParams.enabled && perspectiveParams.viewMatrix && perspectiveParams.projectionMatrix) {
            const vm = perspectiveParams.viewMatrix;
            const pm = perspectiveParams.projectionMatrix;
            
            // Calculate depth-based scale at this world position
            // Use the sprite base position for depth calculation
            const baseX = posWorldX;
            const baseY = posWorldY + scaledHeight / 2; // Bottom of sprite
            
            const viewX = baseX * vm[0] + baseY * vm[4] + vm[12];
            const viewY = baseX * vm[1] + baseY * vm[5] + vm[13];
            const clipY = viewX * pm[1] + viewY * pm[5] + pm[13];
            
            const depth = (clipY + 1.0) * 0.5;
            const perspectiveW = 1.0 + (depth * perspectiveParams.strength);
            const perspectiveScale = 1.0 / perspectiveW;
            
            scaledWidth *= perspectiveScale;
            scaledHeight *= perspectiveScale;
        }
        
        // Position from center (at cursor position)
        const drawX = posWorldX - scaledWidth / 2;
        const drawY = posWorldY - scaledHeight / 2;
        
        // Draw semi-transparent sprite to WebGL
        const imageUrl = sprite.src || 'preview_sprite';
        webglRenderer.drawSprite(
            drawX,
            drawY,
            scaledWidth,
            scaledHeight,
            sprite,
            imageUrl,
            0.5 // semi-transparent
        );
    }

    /**
     * Render editor overlay (Canvas2D UI only - preview sprite rendered via WebGL)
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
        
        // Render placement preview (CANVAS2D ONLY - collision box, no sprite)
        if (this.selectedTool === 'place' && this.selectedPrefab) {
            this.renderPlacementPreviewUI(ctx);
        }
        
        // Render brush preview for paint tool
        if (this.selectedTool === 'paint') {
            this.renderBrushPreview(ctx);
        }

        // Render zone editor
        if (this.selectedTool === 'zone' || this.zones.length > 0) {
            this.renderZones(ctx);
        }

        // Render UI overlays
        this.renderOverlays(ctx);
    }

    /**
     * Render grid with fake 3D perspective support
     */
    renderGrid(ctx) {
        const camera = this.game.camera;
        const webglRenderer = this.game.renderSystem?.webglRenderer;
        
        // Must have WebGL renderer for grid
        if (!webglRenderer || !webglRenderer.transformWorldToScreen) {
            return;
        }
        
        // Get resolution scale for world-to-screen conversion
        const resolutionScale = this.game.resolutionScale || 1.0;
        
        // Map dimensions in WORLD units
        const mapWorldWidth = this.game.MAP_WIDTH;
        const mapWorldHeight = this.game.MAP_HEIGHT;
        
        // Grid covers the ENTIRE map, from (0,0) to (mapWidth, mapHeight)
        const gridStartX = 0;
        const gridStartY = 0;
        const gridEndX = mapWorldWidth;
        const gridEndY = mapWorldHeight;
        
        ctx.save();
        
        // Reset transform to draw in screen space - WebGL handles all transforms
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = gridStartX; x <= gridEndX; x += this.gridSize) {
            const topScreen = webglRenderer.transformWorldToScreen(
                x * resolutionScale, gridStartY * resolutionScale, camera.x, camera.y
            );
            const bottomScreen = webglRenderer.transformWorldToScreen(
                x * resolutionScale, gridEndY * resolutionScale, camera.x, camera.y
            );
            
            ctx.beginPath();
            ctx.moveTo(topScreen.screenX, topScreen.screenY);
            ctx.lineTo(bottomScreen.screenX, bottomScreen.screenY);
            ctx.stroke();
        }
        
        // Horizontal lines - sample multiple points for perspective curves
        for (let y = gridStartY; y <= gridEndY; y += this.gridSize) {
            ctx.beginPath();
            
            const steps = Math.ceil((gridEndX - gridStartX) / this.gridSize) + 1;
            let firstPoint = true;
            
            for (let i = 0; i <= steps; i++) {
                const worldX = gridStartX + (i * this.gridSize);
                const screenPos = webglRenderer.transformWorldToScreen(
                    worldX * resolutionScale, y * resolutionScale, camera.x, camera.y
                );
                
                if (firstPoint) {
                    ctx.moveTo(screenPos.screenX, screenPos.screenY);
                    firstPoint = false;
                } else {
                    ctx.lineTo(screenPos.screenX, screenPos.screenY);
                }
            }
            
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
        
        // Check if selected object is a light
        const isLight = this.selectedObject.templateName && this.game.lightManager.lights.includes(this.selectedObject);
        
        // Check if perspective is active
        const webglRenderer = this.game.renderSystem?.webglRenderer;
        const perspectiveParams = webglRenderer?.getPerspectiveParams?.() || { enabled: false };
        const perspectiveActive = perspectiveParams.enabled && perspectiveParams.strength > 0;
        
        ctx.save();
        
        // For lights with perspective, reset to identity transform 
        // because we use absolute screen coordinates
        if (perspectiveActive && isLight) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        } else {
            // Apply zoom transformation (same as renderMultiSelectBox)
            if (zoom !== 1.0) {
                const canvasWidth = this.game.CANVAS_WIDTH;
                const canvasHeight = this.game.CANVAS_HEIGHT;
                
                ctx.translate(canvasWidth / 2, canvasHeight / 2);
                ctx.scale(zoom, zoom);
                ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
            }
        }
        
        if (isLight) {
            // Draw selection indicator for lights (circle around light position)
            const light = this.selectedObject;
            
            // COMMON BEHAVIOR: Scale storage coordinates to world coordinates
            const resolutionScale = this.game?.resolutionScale || 1.0;
            
            const worldX = light.x * resolutionScale;
            const worldY = light.y * resolutionScale;
            
            // Apply altitude offset if present
            const altitudeOffset = (light.altitude || 0) * resolutionScale;
            
            let screenX, screenY;
            let perspectiveScale = 1.0;
            
            if (perspectiveActive && webglRenderer.transformWorldToScreen) {
                // Get the absolute screen position where the light renders
                const transformed = webglRenderer.transformWorldToScreen(
                    worldX, 
                    worldY - altitudeOffset, 
                    camera.x, 
                    camera.y
                );
                screenX = transformed.screenX;
                screenY = transformed.screenY;
                perspectiveScale = transformed.scale;
            } else {
                // No perspective - apply camera offset manually
                screenX = worldX - camera.x;
                screenY = worldY - camera.y - altitudeOffset;
            }
            
            // Adjust line widths - when perspective is active, don't divide by zoom
            // since we're not using the zoom transform
            const lineWidthScale = perspectiveActive ? 1 : zoom;
            
            // Draw pulsing circle around light
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3 / lineWidthScale;
            ctx.setLineDash([8 / lineWidthScale, 4 / lineWidthScale]);
            
            // Draw outer circle (at light radius, scaled by perspective)
            ctx.beginPath();
            ctx.arc(screenX, screenY, light.radius * perspectiveScale, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw inner circle (selection marker, scaled by perspective)
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2 / lineWidthScale;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(screenX, screenY, 30 * perspectiveScale, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw crosshair at center (scaled by perspective)
            const crosshairSize = 15 * perspectiveScale;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2 / lineWidthScale;
            ctx.beginPath();
            ctx.moveTo(screenX - crosshairSize, screenY);
            ctx.lineTo(screenX + crosshairSize, screenY);
            ctx.moveTo(screenX, screenY - crosshairSize);
            ctx.lineTo(screenX, screenY + crosshairSize);
            ctx.stroke();
        } else {
            // Draw selection box for regular game objects
            // Skip Canvas2D rendering if WebGL is active (renderSelectionToWebGL handles it)
            if (!this.game.renderSystem?.useWebGL) {
                const bounds = this.getVisualBounds(this.selectedObject);
                
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2 / zoom;
                ctx.setLineDash([5 / zoom, 5 / zoom]);
                
                ctx.strokeRect(
                    bounds.x - camera.x,
                    bounds.y - camera.y,
                    bounds.width,
                    bounds.height
                );
            }
        }
        
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
        
        // Check if perspective is active
        const webglRenderer = this.game.renderSystem?.webglRenderer;
        const perspectiveParams = webglRenderer?.getPerspectiveParams?.() || { enabled: false };
        const perspectiveActive = perspectiveParams.enabled && perspectiveParams.strength > 0;
        
        // Check if any selected objects are lights (for perspective handling)
        const hasLights = this.selectedObjects.some(obj => 
            obj.templateName && this.game.lightManager.lights.includes(obj)
        );
        
        ctx.save();
        
        // If perspective is active and we have lights, we need to handle them separately
        // because lights use absolute screen coords but objects use transformed coords
        
        // First pass: render non-light objects with zoom transform
        if (zoom !== 1.0) {
            const canvasWidth = this.game.CANVAS_WIDTH;
            const canvasHeight = this.game.CANVAS_HEIGHT;
            
            ctx.translate(canvasWidth / 2, canvasHeight / 2);
            ctx.scale(zoom, zoom);
            ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        }
        
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([5 / zoom, 5 / zoom]);
        
        for (const obj of this.selectedObjects) {
            const isLight = obj.templateName && this.game.lightManager.lights.includes(obj);
            
            if (!isLight) {
                // Draw box for regular objects
                if (!this.game.renderSystem?.useWebGL) {
                    const bounds = this.getVisualBounds(obj);
                    ctx.strokeRect(
                        bounds.x - camera.x,
                        bounds.y - camera.y,
                        bounds.width,
                        bounds.height
                    );
                }
            }
        }
        
        ctx.restore();
        
        // Second pass: render lights (with perspective if active)
        ctx.save();
        
        // For lights with perspective, reset to identity (use absolute screen coords)
        if (perspectiveActive) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        } else if (zoom !== 1.0) {
            const canvasWidth = this.game.CANVAS_WIDTH;
            const canvasHeight = this.game.CANVAS_HEIGHT;
            
            ctx.translate(canvasWidth / 2, canvasHeight / 2);
            ctx.scale(zoom, zoom);
            ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        }
        
        const lineWidthScale = perspectiveActive ? 1 : zoom;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2 / lineWidthScale;
        ctx.setLineDash([5 / lineWidthScale, 5 / lineWidthScale]);
        
        for (const obj of this.selectedObjects) {
            const isLight = obj.templateName && this.game.lightManager.lights.includes(obj);
            
            if (isLight) {
                const resolutionScale = this.game?.resolutionScale || 1.0;
                
                const worldX = obj.x * resolutionScale;
                const worldY = obj.y * resolutionScale;
                const altitudeOffset = (obj.altitude || 0) * resolutionScale;
                
                let screenX, screenY;
                let perspectiveScale = 1.0;
                
                if (perspectiveActive && webglRenderer.transformWorldToScreen) {
                    const transformed = webglRenderer.transformWorldToScreen(
                        worldX, 
                        worldY - altitudeOffset, 
                        camera.x, 
                        camera.y
                    );
                    screenX = transformed.screenX;
                    screenY = transformed.screenY;
                    perspectiveScale = transformed.scale;
                } else {
                    screenX = worldX - camera.x;
                    screenY = worldY - camera.y - altitudeOffset;
                }
                
                ctx.beginPath();
                ctx.arc(screenX, screenY, 30 * perspectiveScale, 0, Math.PI * 2);
                ctx.stroke();
            }
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
        
        ctx.save();
        
        // Selection box coordinates are already in canvas space (after zoom adjustment)
        // So we draw directly without any transforms
        const x = Math.min(this.multiSelectStart.x, this.multiSelectEnd.x);
        const y = Math.min(this.multiSelectStart.y, this.multiSelectEnd.y);
        const width = Math.abs(this.multiSelectEnd.x - this.multiSelectStart.x);
        const height = Math.abs(this.multiSelectEnd.y - this.multiSelectStart.y);
        
        // Draw semi-transparent blue fill
        ctx.fillStyle = 'rgba(0, 120, 255, 0.2)';
        ctx.fillRect(x, y, width, height);
        
        // Draw blue border
        ctx.strokeStyle = '#0078ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x, y, width, height);
        
        ctx.restore();
    }

    /**
     * Render placement preview UI (collision box only - sprite rendered via WebGL)
     */
    renderPlacementPreviewUI(ctx) {
        if (!this.selectedPrefab) return;
        if (!this.showCollisionBoxes) return; // Only draw if collision boxes enabled

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
        
        // Use screen-relative world position for POSITION (so preview stays at cursor)
        let posWorldX = this.mouseScreenWorldX;
        let posWorldY = this.mouseScreenWorldY;
        
        // Apply grid snap to position if enabled
        if (this.snapToGrid) {
            posWorldX = Math.round(posWorldX / this.gridSize) * this.gridSize;
            posWorldY = Math.round(posWorldY / this.gridSize) * this.gridSize;
        }
        
        // Get sprite and dimensions
        let sprite = this.previewSprite;
        let spriteWidth = 64;
        let spriteHeight = 64;
        let scale = this.selectedPrefab.scale || 1;
        
        // Use loaded preview sprite if available
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            spriteWidth = sprite.naturalWidth;
            spriteHeight = sprite.naturalHeight;
        }
        
        // Calculate sprite dimensions - use SAME perspective-scaled size as the sprite preview
        const resolutionScale = this.game.resolutionScale || 1;
        const finalScale = scale * resolutionScale;
        let scaledWidth = spriteWidth * finalScale;
        let scaledHeight = spriteHeight * finalScale;
        
        // Apply perspective scale to match the sprite preview (which also scales)
        const webglRenderer = this.game.renderSystem?.webglRenderer;
        if (webglRenderer) {
            const perspectiveParams = webglRenderer.getPerspectiveParams();
            if (perspectiveParams.enabled && perspectiveParams.viewMatrix && perspectiveParams.projectionMatrix) {
                const vm = perspectiveParams.viewMatrix;
                const pm = perspectiveParams.projectionMatrix;
                
                // Calculate depth-based scale at this world position (same as renderPreviewToWebGL)
                const baseX = posWorldX;
                const baseY = posWorldY + scaledHeight / 2; // Bottom of sprite
                
                const viewX = baseX * vm[0] + baseY * vm[4] + vm[12];
                const viewY = baseX * vm[1] + baseY * vm[5] + vm[13];
                const clipY = viewX * pm[1] + viewY * pm[5] + pm[13];
                
                const depth = (clipY + 1.0) * 0.5;
                const perspectiveW = 1.0 + (depth * perspectiveParams.strength);
                const perspectiveScale = 1.0 / perspectiveW;
                
                scaledWidth *= perspectiveScale;
                scaledHeight *= perspectiveScale;
            }
        }
        
        // Calculate collision bounds using perspective-scaled size
        const expandTop = (this.selectedPrefab.collisionExpandTopPercent || 0) * scaledHeight;
        const expandBottom = (this.selectedPrefab.collisionExpandBottomPercent || 0) * scaledHeight;
        const expandLeft = (this.selectedPrefab.collisionExpandLeftPercent || 0) * scaledWidth;
        const expandRight = (this.selectedPrefab.collisionExpandRightPercent || 0) * scaledWidth;
        
        let collisionWidth = scaledWidth + expandLeft + expandRight;
        let collisionHeight = scaledHeight + expandTop + expandBottom;
        
        // Calculate base position (centered on sprite) at cursor position
        let collisionX = posWorldX - collisionWidth / 2;
        let collisionY = posWorldY - collisionHeight / 2;
        
        // Adjust for asymmetric expansion
        collisionX += (expandRight - expandLeft) / 2;
        collisionY += (expandBottom - expandTop) / 2;
        
        // Get collision shape
        const collisionShape = this.selectedPrefab.collisionShape || 'circle';
        
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        
        // Draw collision box based on shape
        if (collisionShape === 'circle') {
            const centerX = collisionX + collisionWidth / 2;
            const centerY = collisionY + collisionHeight / 2;
            const radiusX = collisionWidth / 2;
            const radiusY = collisionHeight / 2;
            
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // Rectangle collision box
            ctx.strokeRect(collisionX, collisionY, collisionWidth, collisionHeight);
        }
        
        ctx.restore();
    }

    /**
     * Render placement preview (LEGACY - now split into WebGL + Canvas2D methods)
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
        
        // COMMON BEHAVIOR: Calculate sprite dimensions (same as GameObject.getFinalScale)
        // Sprite size = base size × object scale × resolutionScale (NO mapScale)
        const resolutionScale = this.game.resolutionScale || 1;
        const finalScale = scale * resolutionScale;
        const scaledWidth = spriteWidth * finalScale;
        const scaledHeight = spriteHeight * finalScale;
        
        // COMMON BEHAVIOR: Position uses worldX/worldY (already scaled with mapScale × resolutionScale)
        // GameObjects render from center, so subtract half width/height
        const drawX = worldX - scaledWidth / 2;
        const drawY = worldY - scaledHeight / 2;
        
        // Draw semi-transparent sprite using WebGL (to avoid trailing on Canvas2D)
        const webglRenderer = this.game.renderSystem.webglRenderer;
        if (sprite && webglRenderer && webglRenderer.initialized) {
            const imageUrl = sprite.src || 'preview_sprite';
            webglRenderer.drawSprite(
                drawX,
                drawY,
                scaledWidth,
                scaledHeight,
                sprite,
                imageUrl,
                0.5 // semi-transparent
            );
        } else if (sprite) {
            // Fallback to Canvas2D if WebGL not available
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
        
        // Prevent context menu for right-click in zone editor
        this.contextMenuHandler = (e) => {
            if (this.isActive && this.selectedTool === 'zone_create') {
                e.preventDefault();
            }
        };
        this.game.canvas.addEventListener('contextmenu', this.contextMenuHandler);
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
        if (this.contextMenuHandler) {
            this.game.canvas.removeEventListener('contextmenu', this.contextMenuHandler);
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
                this.paintAt(this.mouseScreenWorldX, this.mouseScreenWorldY);
            }
            return;
        }
        
        if (this.selectedTool === 'select' && e.buttons === 1) {
            // Update multi-select box if dragging from empty space (use canvas coords)
            if (this.isMultiSelecting) {
                this.multiSelectEnd = { x: this.mouseCanvasX, y: this.mouseCanvasY };
                return;
            }
            
            // Handle single object dragging
            if (this.selectedObject || this.selectedZone) {
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
                    if (this.selectedZone) {
                        const unscaledMouse = this.worldToUnscaled(this.mouseWorldXUnsnapped, this.mouseWorldYUnsnapped);
                        const dx = unscaledMouse.x - this.dragStartX;
                        const dy = unscaledMouse.y - this.dragStartY;
                        
                        // Move all points
                        this.selectedZone.points = this.dragOriginalPoints.map(p => ({
                            x: p.x + dx,
                            y: p.y + dy
                        }));
                    } else if (this.selectedObject) {
                        // Store old position for history
                        if (!this.dragOriginalX) {
                            this.dragOriginalX = this.selectedObject.x;
                            this.dragOriginalY = this.selectedObject.y;
                        }
                        
                        // Check if perspective is active
                        const webglRenderer = this.game.renderSystem?.webglRenderer;
                        const perspectiveParams = webglRenderer?.getPerspectiveParams?.() || { enabled: false };
                        const perspectiveActive = perspectiveParams.enabled && perspectiveParams.strength > 0;
                        
                        let newX, newY;
                        
                        if (perspectiveActive) {
                            // In perspective mode, use SCREEN-RELATIVE movement
                            // mouseScreenWorldX/Y is the pre-perspective world position (screen + camera)
                            const unscaledScreenMouse = this.worldToUnscaled(this.mouseScreenWorldX, this.mouseScreenWorldY);
                            
                            // Calculate new position using screen-relative offset
                            newX = unscaledScreenMouse.x - this.dragOffsetX;
                            newY = unscaledScreenMouse.y - this.dragOffsetY;
                        } else {
                            // In 2D mode, use the regular world coordinates
                            const unscaledMouse = this.worldToUnscaled(this.mouseWorldXUnsnapped, this.mouseWorldYUnsnapped);
                            newX = unscaledMouse.x - this.dragOffsetX;
                            newY = unscaledMouse.y - this.dragOffsetY;
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
            if (this.selectedZone) {
                // Add zone move action to history
                this.addHistory({
                    type: 'move_zone',
                    zone: this.selectedZone,
                    oldPoints: this.dragOriginalPoints,
                    newPoints: this.selectedZone.points.map(p => ({...p})),
                    mapId: this.game.currentMapId
                });
                console.log('[EditorManager] Moved zone');
            } else if (this.selectedObject) {
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
            }
            
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
        const camera = this.game.camera;
        const zoom = camera.zoom || 1.0;
        const canvasWidth = this.game.CANVAS_WIDTH;
        const canvasHeight = this.game.CANVAS_HEIGHT;
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        const webglRenderer = this.game.renderSystem?.webglRenderer;
        const perspectiveParams = webglRenderer?.getPerspectiveParams();
        const perspectiveEnabled = perspectiveParams?.enabled;
        
        // Selection box is in logical canvas coordinates
        const minCanvasX = Math.min(this.multiSelectStart.x, this.multiSelectEnd.x);
        const maxCanvasX = Math.max(this.multiSelectStart.x, this.multiSelectEnd.x);
        const minCanvasY = Math.min(this.multiSelectStart.y, this.multiSelectEnd.y);
        const maxCanvasY = Math.max(this.multiSelectStart.y, this.multiSelectEnd.y);
        
        // Find all objects within selection box
        const objects = this.game.objectManager.getObjectsForMap(this.game.currentMapId);
        this.selectedObjects = [];
        
        for (const obj of objects) {
            // Get object's canvas position (where it appears on screen)
            let objCanvasX, objCanvasY;
            
            // Get scaled world position (same as getVisualBounds)
            const resolutionScale = this.game.resolutionScale || 1.0;
            const scaledX = obj.x * resolutionScale;
            const scaledY = obj.y * resolutionScale;
            
            if (perspectiveEnabled && webglRenderer) {
                // Transform object's world position to canvas position using perspective
                const screenPos = webglRenderer.transformWorldToScreen(
                    scaledX, scaledY,
                    camera.x, camera.y
                );
                objCanvasX = screenPos.screenX;
                objCanvasY = screenPos.screenY;
            } else {
                // Convert world position to canvas position (with camera offset)
                const rawCanvasX = scaledX - camera.x;
                const rawCanvasY = scaledY - camera.y;
                
                // Apply zoom transformation (zoom around center)
                objCanvasX = (rawCanvasX - centerX) * zoom + centerX;
                objCanvasY = (rawCanvasY - centerY) * zoom + centerY;
            }
            
            // Check if object's canvas position is within selection box
            if (objCanvasX >= minCanvasX && objCanvasX <= maxCanvasX && 
                objCanvasY >= minCanvasY && objCanvasY <= maxCanvasY) {
                this.selectedObjects.push(obj);
            }
        }
        
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
            case 'zone':
                return this.handleZoneClick(x, y, button);
            case 'paint':
                return true;
        }
        
        return true; // Consume click
    }

    /**
     * Check if a point is inside a polygon
     */
    pointInPolygon(point, vs) {
        var x = point.x, y = point.y;
        var inside = false;
        for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            var xi = vs[i].x, yi = vs[i].y;
            var xj = vs[j].x, yj = vs[j].y;
            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    /**
     * Select a zone
     */
    selectZone(zone) {
        this.selectedZone = zone;
        this.selectedObject = null; // Deselect other objects
        this.selectedObjects = []; // Clear multi-select
        
        if (zone) {
            console.log('[EditorManager] Selected Zone:', zone.type);
            // Calculate center for dragging
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            zone.points.forEach(p => {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y);
                maxY = Math.max(maxY, p.y);
            });
            this.selectedZoneCenter = {
                x: (minX + maxX) / 2,
                y: (minY + maxY) / 2
            };
        }
    }

    /**
     * Delete a zone
     */
    deleteZone(zone) {
        const index = this.zones.indexOf(zone);
        if (index > -1) {
            this.zones.splice(index, 1);
            
            // Invalidate spawn cache if needed
            if (zone.type === 'spawn' && this.game.spawnManager) {
                this.game.spawnManager.invalidateSpawnZoneCache();
            }
            
            this.selectZone(null);
        }
    }

    /**
     * Handle select tool click
     */
    handleSelectClick(x, y) {
        // Mouse world coordinates are SCALED (for rendering)
        const worldX = this.mouseWorldXUnsnapped;
        const worldY = this.mouseWorldYUnsnapped;
        
        // Get screen coordinates for perspective-aware selection
        const screenX = this.mouseCanvasX;
        const screenY = this.mouseCanvasY;
        
        // Check if perspective is active
        const webglRenderer = this.game.renderSystem?.webglRenderer;
        const perspectiveParams = webglRenderer?.getPerspectiveParams?.() || { enabled: false };
        const perspectiveActive = perspectiveParams.enabled && perspectiveParams.strength > 0;
        const camera = this.game.camera;
        
        // Check if light editor is in placement mode
        if (this.lightEditor && this.lightEditor.placementMode) {
            const handled = this.lightEditor.handleMapClick(worldX, worldY);
            if (handled) {
                return true;
            }
        }
        
        // Check for light selection (check lights BEFORE regular objects)
        const selectedLight = this.game.lightManager.findLightAtPosition(worldX, worldY);
        if (selectedLight) {
            // Treat light as selected object
            this.selectObject(selectedLight);
            
            // Setup drag offsets (lights store coordinates in unscaled format)
            const unscaled = this.worldToUnscaled(worldX, worldY);
            this.dragStartX = unscaled.x;
            this.dragStartY = unscaled.y;
            this.dragOffsetX = unscaled.x - selectedLight.x;
            this.dragOffsetY = unscaled.y - selectedLight.y;
            
            // Not multi-selecting when clicking a light
            this.isMultiSelecting = false;
            
            return true;
        }
        
        // Find object at click position
        const objects = this.game.objectManager.getObjectsForMap(this.game.currentMapId);
        
        // When perspective is active, compare in SCREEN SPACE
        // Transform object bounds to screen, then compare with screen click position
        for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            
            // Use VISUAL bounds for editor selection (where the sprite is rendered)
            // This works even for objects without collision boxes
            const bounds = this.getVisualBounds(obj);
            
            // Skip objects with no valid bounds
            if (!bounds || bounds.width <= 0 || bounds.height <= 0) continue;
            
            let hitTest = false;
            
            if (perspectiveActive && webglRenderer.transformWorldToScreen) {
                // Transform object's bounding box corners to screen space
                const topLeft = webglRenderer.transformWorldToScreen(bounds.x, bounds.y, camera.x, camera.y);
                const topRight = webglRenderer.transformWorldToScreen(bounds.x + bounds.width, bounds.y, camera.x, camera.y);
                const bottomLeft = webglRenderer.transformWorldToScreen(bounds.x, bounds.y + bounds.height, camera.x, camera.y);
                const bottomRight = webglRenderer.transformWorldToScreen(bounds.x + bounds.width, bounds.y + bounds.height, camera.x, camera.y);
                
                // Get screen-space bounding box (perspective may skew the box)
                const screenMinX = Math.min(topLeft.screenX, topRight.screenX, bottomLeft.screenX, bottomRight.screenX);
                const screenMaxX = Math.max(topLeft.screenX, topRight.screenX, bottomLeft.screenX, bottomRight.screenX);
                const screenMinY = Math.min(topLeft.screenY, topRight.screenY, bottomLeft.screenY, bottomRight.screenY);
                const screenMaxY = Math.max(topLeft.screenY, topRight.screenY, bottomLeft.screenY, bottomRight.screenY);
                
                // Check if click is within screen-space bounds
                hitTest = screenX >= screenMinX && screenX <= screenMaxX &&
                          screenY >= screenMinY && screenY <= screenMaxY;
            } else {
                // Standard 2D comparison in world space
                hitTest = worldX >= bounds.x && worldX <= bounds.x + bounds.width &&
                          worldY >= bounds.y && worldY <= bounds.y + bounds.height;
            }
            
            if (hitTest) {
                this.selectObject(obj);
                
                // For dragging, calculate offset based on mode
                // In perspective mode, use screen-relative coords for consistent dragging
                if (perspectiveActive) {
                    const unscaledScreen = this.worldToUnscaled(this.mouseScreenWorldX, this.mouseScreenWorldY);
                    this.dragStartX = unscaledScreen.x;
                    this.dragStartY = unscaledScreen.y;
                    this.dragOffsetX = unscaledScreen.x - obj.x;
                    this.dragOffsetY = unscaledScreen.y - obj.y;
                } else {
                    const unscaled = this.worldToUnscaled(worldX, worldY);
                    this.dragStartX = unscaled.x;
                    this.dragStartY = unscaled.y;
                    this.dragOffsetX = unscaled.x - obj.x;
                    this.dragOffsetY = unscaled.y - obj.y;
                }
                
                // Not multi-selecting when clicking an object
                this.isMultiSelecting = false;
                
                return true;
            }
        }
        
        // Check for zone selection
        if (this.zones && this.zones.length > 0) {
            // Convert mouse to unscaled for checking against stored zones
            const unscaledMouse = this.worldToUnscaled(worldX, worldY);
            
            for (const zone of this.zones) {
                if (this.pointInPolygon({x: unscaledMouse.x, y: unscaledMouse.y}, zone.points)) {
                    this.selectZone(zone);
                    
                    // Setup drag offsets using unscaled coordinates
                    this.dragStartX = unscaledMouse.x;
                    this.dragStartY = unscaledMouse.y;
                    
                    // Store original points for dragging
                    this.dragOriginalPoints = zone.points.map(p => ({...p}));
                    
                    return true;
                }
            }
        }
        
        // Clicked empty space - start multi-select or deselect
        // Use canvas coordinates for the selection box (drawn directly on canvas)
        this.multiSelectStart = { x: this.mouseCanvasX, y: this.mouseCanvasY };
        this.multiSelectEnd = { x: this.mouseCanvasX, y: this.mouseCanvasY }; // Initialize to same position
        this.isMultiSelecting = true;
        this.selectObject(null);
        return true;
    }

    /**
     * Handle place tool click
     */
    handlePlaceClick(x, y) {
        if (!this.selectedPrefab) {
            return true;
        }
        
        // Target position is where cursor is (pre-perspective world coords)
        let targetX = this.mouseScreenWorldX;
        let targetY = this.mouseScreenWorldY;
        
        // Apply grid snap if enabled
        if (this.snapToGrid) {
            targetX = Math.round(targetX / this.gridSize) * this.gridSize;
            targetY = Math.round(targetY / this.gridSize) * this.gridSize;
        }
        
        // Calculate sprite dimensions to pass to inverse transform
        const sprite = this.previewSprite;
        const scale = this.selectedPrefab.scale || 1;
        const spriteWidth = this.selectedPrefab.width || sprite?.naturalWidth || sprite?.width || 64;
        const spriteHeight = this.selectedPrefab.height || sprite?.naturalHeight || sprite?.height || 64;
        const resolutionScale = this.game.resolutionScale || 1;
        const finalScale = scale * resolutionScale;
        const scaledWidth = spriteWidth * finalScale;
        const scaledHeight = spriteHeight * finalScale;
        
        console.log('[PLACE] Target (cursor):', targetX, targetY);
        console.log('[PLACE] Sprite size (scaled):', scaledWidth, scaledHeight);
        
        // Use inverse billboard transform to find what position to store
        // so that after billboard rendering, sprite appears at target
        let placeX = targetX;
        let placeY = targetY;
        
        const webglRenderer = this.game.renderSystem?.webglRenderer;
        if (webglRenderer && webglRenderer.inverseBillboardTransform) {
            const corrected = webglRenderer.inverseBillboardTransform(targetX, targetY, scaledWidth, scaledHeight);
            console.log('[PLACE] Inverse transform result:', corrected.x, corrected.y);
            console.log('[PLACE] Delta applied:', corrected.x - targetX, corrected.y - targetY);
            placeX = corrected.x;
            placeY = corrected.y;
        }
        
        // Convert to storage coordinates (unscaled)
        const storageCoords = this.worldToUnscaled(placeX, placeY);
        console.log('[PLACE] Storage coords (unscaled):', storageCoords.x, storageCoords.y);
        
        // Create object at corrected position (using storage coordinates)
        const objectData = {
            ...this.selectedPrefab,
            x: storageCoords.x,
            y: storageCoords.y
        };
        
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
        
        return {
            x: worldX / resolutionScale,
            y: worldY / resolutionScale
        };
    }

    /**
     * Place a new object
     */
    placeObject(objectData) {
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
            }
        }
        
        // Common success handling
        if (placedObject) {
            this.addHistory({
                type: 'place',
                object: placedObject,
                mapId: this.game.currentMapId
            });
        }
    }

    /**
     * Delete an object
     */
    deleteObject(obj) {
        // Check if this is a light (has templateName and is in lightManager)
        const isLight = obj.templateName && this.game.lightManager.lights.includes(obj);
        
        if (isLight) {
            // Delete light from LightManager
            this.game.lightManager.removeLight(obj.id);
        } else {
            // Delete regular game object
            this.game.objectManager.removeObject(this.game.currentMapId, obj.id);
        }
        
        // Add to history
        this.addHistory({
            type: 'delete',
            object: obj,
            objectType: isLight ? 'Light' : obj.constructor.name,
            mapId: this.game.currentMapId
        });
        
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
     * Copy a zone
     */
    copyZone(zone) {
        this.zoneClipboard = {
            points: zone.points.map(p => ({...p})),
            type: zone.type
        };
        this.clipboard = null; // Clear object clipboard
        console.log('[EditorManager] Copied zone');
    }

    /**
     * Paste a zone
     */
    pasteZone() {
        if (!this.zoneClipboard) return;
        
        // Offset by 32 pixels
        const offset = 32;
        const newPoints = this.zoneClipboard.points.map(p => ({
            x: p.x + offset,
            y: p.y + offset
        }));
        
        const newZone = {
            points: newPoints,
            type: this.zoneClipboard.type
        };
        
        this.zones.push(newZone);
        this.selectZone(newZone);
        console.log('[EditorManager] Pasted zone');
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
        } else if (action.type === 'move_zone') {
            action.zone.points = action.oldPoints.map(p => ({...p}));
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
        } else if (action.type === 'move_zone') {
            action.zone.points = action.newPoints.map(p => ({...p}));
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
     * Serialize a single game object to JSON-ready format
     */
    serializeObject(obj) {
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
    }

    /**
     * Sync current live data back to managers
     */
    syncGameData() {
        // 0. Sync Zones for current map
        if (this.game.mapManager.maps[this.game.currentMapId]) {
            this.game.mapManager.maps[this.game.currentMapId].zones = this.zones;
        }

        // 1. Sync Lights for current map
        const lightsData = this.game.lightManager.exportLights();
        if (this.game.mapManager.maps[this.game.currentMapId]) {
            this.game.mapManager.maps[this.game.currentMapId].lights = lightsData;
            console.log(`[EditorManager] Synced ${lightsData.length} lights for map ${this.game.currentMapId}`);
        }

        // 2. Sync Objects for all loaded maps
        // We iterate over initializedMaps to get the live objects
        for (const mapId of this.game.objectManager.initializedMaps) {
            const objects = this.game.objectManager.getObjectsForMap(mapId);
            
            // Filter out dynamic spawns (spirits from spawn zones)
            const saveableObjects = objects.filter(obj => !obj.isDynamicSpawn);
            
            const serializedObjects = saveableObjects.map(obj => this.serializeObject(obj));
            
            // Update the definitions in ObjectManager
            this.game.objectManager.objectDefinitions[mapId] = serializedObjects;
            console.log(`[EditorManager] Synced ${serializedObjects.length} objects for map ${mapId} (filtered ${objects.length - serializedObjects.length} dynamic spawns)`);
        }
    }

    /**
     * Save all game data to a folder (using File System Access API)
     */
    async save() {
        console.log('[EditorManager] Starting save process...');
        
        // Sync live data first
        this.syncGameData();
        
        // Create a deep copy of maps data and add paint layer data
        const mapsData = JSON.parse(JSON.stringify(this.game.mapManager.maps));
        for (const mapId of Object.keys(mapsData)) {
            const paintData = this.exportPaintLayerData(mapId);
            if (paintData) {
                mapsData[mapId].paintLayerData = paintData;
            }
        }
        
        // Prepare data strings
        const mapsJson = JSON.stringify(mapsData, null, 2);
        const objectsJson = JSON.stringify(this.game.objectManager.objectDefinitions, null, 2);
        const itemsJson = JSON.stringify(this.game.itemManager.itemTypes || {}, null, 2);
        
        // Prepare template data strings
        const lightsJson = JSON.stringify(this.game.lightManager.lightRegistry.exportToJSON(), null, 2);
        const spiritsJson = this.game.spiritRegistry.exportTemplates(); // Already returns string
        
        try {
            // Check if running in Electron with file saving API
            if (window.electronAPI && window.electronAPI.saveAllDataFiles) {
                console.log('[EditorManager] Using Electron API for saving...');
                
                const files = {
                    'maps.json': mapsJson,
                    'objects.json': objectsJson,
                    'items.json': itemsJson,
                    'lights.json': lightsJson,
                    'spirits.json': spiritsJson
                };
                
                const results = await window.electronAPI.saveAllDataFiles(files);
                
                // Check results
                const failed = Object.entries(results).filter(([_, r]) => !r.success);
                if (failed.length > 0) {
                    const errors = failed.map(([name, r]) => `${name}: ${r.error}`).join('\n');
                    throw new Error(`Some files failed to save:\n${errors}`);
                }
                
                alert('✅ All game data (maps, objects, items, lights, spirits) saved successfully!');
                console.log('[EditorManager] Save complete via Electron API.');
            }
            // Check for File System Access API support (browser)
            else if ('showDirectoryPicker' in window) {
                const handle = await window.showDirectoryPicker({
                    mode: 'readwrite',
                    startIn: 'documents'
                });
                
                // Write maps.json
                const mapsFile = await handle.getFileHandle('maps.json', { create: true });
                const mapsWritable = await mapsFile.createWritable();
                await mapsWritable.write(mapsJson);
                await mapsWritable.close();
                
                // Write objects.json
                const objectsFile = await handle.getFileHandle('objects.json', { create: true });
                const objectsWritable = await objectsFile.createWritable();
                await objectsWritable.write(objectsJson);
                await objectsWritable.close();
                
                // Write items.json
                const itemsFile = await handle.getFileHandle('items.json', { create: true });
                const itemsWritable = await itemsFile.createWritable();
                await itemsWritable.write(itemsJson);
                await itemsWritable.close();
                
                // Write lights.json
                const lightsFile = await handle.getFileHandle('lights.json', { create: true });
                const lightsWritable = await lightsFile.createWritable();
                await lightsWritable.write(lightsJson);
                await lightsWritable.close();
                
                // Write spirits.json
                const spiritsFile = await handle.getFileHandle('spirits.json', { create: true });
                const spiritsWritable = await spiritsFile.createWritable();
                await spiritsWritable.write(spiritsJson);
                await spiritsWritable.close();
                
                alert('✅ All game data (maps, objects, items, lights, spirits) saved successfully!');
                console.log('[EditorManager] Save complete.');
            } else {
                // Fallback: Download files individually
                console.warn('[EditorManager] File System Access API not supported. Falling back to downloads.');
                this.downloadFile('maps.json', mapsJson);
                this.downloadFile('objects.json', objectsJson);
                this.downloadFile('items.json', itemsJson);
                this.downloadFile('lights.json', lightsJson);
                this.downloadFile('spirits.json', spiritsJson);
                alert('Saved via download. Please move the 5 JSON files to your data folder.');
            }
        } catch (error) {
            console.error('[EditorManager] Save failed:', error);
            if (error.name !== 'AbortError') {
                alert('❌ Save failed: ' + error.message);
            }
        }
    }

    /**
     * Helper to download a file
     */
    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    /**
     * Zoom in camera
     */
    zoomIn() {
        const camera = this.game.camera;
        camera.zoom = Math.min(camera.maxZoom, camera.zoom + 0.25);
        console.log(`[EditorManager] Zoom: ${(camera.zoom * 100).toFixed(0)}%`);
        
        // Invalidate light mask when zoom changes
        if (this.game.lightManager) {
            this.game.lightManager.invalidateMask();
        }
    }

    /**
     * Zoom out camera
     */
    zoomOut() {
        const camera = this.game.camera;
        camera.zoom = Math.max(camera.minZoom, camera.zoom - 0.25);
        console.log(`[EditorManager] Zoom: ${(camera.zoom * 100).toFixed(0)}%`);
        
        // Invalidate light mask when zoom changes
        if (this.game.lightManager) {
            this.game.lightManager.invalidateMask();
        }
    }

    /**
     * Reset camera zoom to 100%
     */
    resetZoom() {
        this.game.camera.zoom = 1.0;
        console.log('[EditorManager] Zoom reset to 100%');
        
        // Invalidate light mask when zoom changes
        if (this.game.lightManager) {
            this.game.lightManager.invalidateMask();
        }
    }

    // ==================== PAINT TOOL METHODS ====================

    /**
     * Initialize paint layer for a map
     */
    initializePaintLayer(mapId) {
        if (this.paintLayers[mapId]) return;
        
        const mapData = this.game.mapManager.maps[mapId];
        if (!mapData) return;
        
        // Calculate scaled dimensions using standard 4K map size
        const resolutionScale = this.game.resolutionScale || 1.0;
        const scaledWidth = this.game.MAP_WIDTH * resolutionScale;
        const scaledHeight = this.game.MAP_HEIGHT * resolutionScale;
        
        // Create canvas for paint layer with scaled dimensions
        const canvas = document.createElement('canvas');
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        
        this.paintLayers[mapId] = canvas;
        console.log(`[EditorManager] Initialized paint layer for map ${mapId}: ${scaledWidth}x${scaledHeight}`);
    }

    /**
     * Clear paint layer for a map
     */
    clearPaintLayer(mapId, mode = 'texture') {
        let layer;
        if (mode === 'texture') {
            layer = this.paintLayers[mapId];
        } else if (mode === 'collision') {
            layer = this.collisionLayers[mapId];
        } else if (mode === 'spawn') {
            layer = this.spawnLayers[mapId];
        }
        
        if (layer) {
            const ctx = layer.getContext('2d');
            ctx.clearRect(0, 0, layer.width, layer.height);
            console.log(`[EditorManager] Cleared ${mode} layer for map ${mapId}`);
        }
    }

    /**
     * Load a texture for painting
     */
    loadTexture(texturePath, textureName) {
        // Always select the texture immediately (even if it's still loading)
        this.selectedTexture = texturePath;
        
        if (this.loadedTextures[texturePath]) {
            // Already loaded
            return;
        }
        
        const img = new Image();
        img.onload = () => {
            this.loadedTextures[texturePath] = img;
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
        
        // Initialize paint canvas if needed (use legacy paint layer system)
        if (!this.paintLayers[mapId]) {
            this.initializePaintLayer(mapId);
        }
        
        const canvas = this.getPaintLayer(mapId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const texture = this.loadedTextures[this.selectedTexture];
        
        // Create brush alpha mask
        const brushCanvas = document.createElement('canvas');
        const brushSize = this.brushSize;
        brushCanvas.width = brushSize * 2;
        brushCanvas.height = brushSize * 2;
        const brushCtx = brushCanvas.getContext('2d');
        
        // Create brush mask based on shape and style
        // We use grayscale values where white = fully visible, black = fully transparent
        if (this.brushShape === 'square') {
            // Square brush - uniform alpha
            brushCtx.fillStyle = `rgba(255, 255, 255, ${this.brushOpacity})`;
            brushCtx.fillRect(0, 0, brushSize * 2, brushSize * 2);
        } else {
            // Circle brush - create radial gradient for soft edges
            let gradient;
            switch (this.brushStyle) {
                case 'hard':
                    // Sharp edges - solid center with small fade at edge
                    gradient = brushCtx.createRadialGradient(brushSize, brushSize, brushSize * 0.85, brushSize, brushSize, brushSize);
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${this.brushOpacity})`);
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    // Fill the center solid
                    brushCtx.fillStyle = `rgba(255, 255, 255, ${this.brushOpacity})`;
                    brushCtx.beginPath();
                    brushCtx.arc(brushSize, brushSize, brushSize * 0.85, 0, Math.PI * 2);
                    brushCtx.fill();
                    // Add edge gradient
                    brushCtx.fillStyle = gradient;
                    brushCtx.fillRect(0, 0, brushSize * 2, brushSize * 2);
                    break;
                
                case 'very-soft':
                    // Very gradual fade from center
                    gradient = brushCtx.createRadialGradient(brushSize, brushSize, 0, brushSize, brushSize, brushSize);
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${this.brushOpacity})`);
                    gradient.addColorStop(0.3, `rgba(255, 255, 255, ${this.brushOpacity * 0.7})`);
                    gradient.addColorStop(0.6, `rgba(255, 255, 255, ${this.brushOpacity * 0.3})`);
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    brushCtx.fillStyle = gradient;
                    brushCtx.fillRect(0, 0, brushSize * 2, brushSize * 2);
                    break;
                
                case 'soft':
                default:
                    // Medium soft edges
                    gradient = brushCtx.createRadialGradient(brushSize, brushSize, 0, brushSize, brushSize, brushSize);
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${this.brushOpacity})`);
                    gradient.addColorStop(0.5, `rgba(255, 255, 255, ${this.brushOpacity * 0.6})`);
                    gradient.addColorStop(0.8, `rgba(255, 255, 255, ${this.brushOpacity * 0.2})`);
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    brushCtx.fillStyle = gradient;
                    brushCtx.fillRect(0, 0, brushSize * 2, brushSize * 2);
                    break;
            }
        }
        
        // Create a temporary canvas for this brush stroke
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = brushSize * 2;
        tempCanvas.height = brushSize * 2;
        const tempCtx = tempCanvas.getContext('2d');
        
        // First draw the texture pattern at full opacity
        const pattern = tempCtx.createPattern(texture, 'repeat');
        tempCtx.fillStyle = pattern;
        tempCtx.fillRect(0, 0, brushSize * 2, brushSize * 2);
        
        // Then apply the brush mask using destination-in
        // This keeps the texture pixels but applies the alpha from the brush mask
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(brushCanvas, 0, 0);
        
        // Draw the masked texture onto the paint layer
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(tempCanvas, worldX - brushSize, worldY - brushSize);
        ctx.restore();
        
        // Invalidate WebGL texture cache so the updated canvas renders immediately
        if (this.game?.renderSystem?.webglRenderer) {
            const paintCanvasKey = `paint_layer_${mapId}`;
            this.game.renderSystem.webglRenderer.invalidateTexture(paintCanvasKey);
        }
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
            const resolutionScale = this.game.resolutionScale || 1.0;
            const scaledWidth = this.game.MAP_WIDTH * resolutionScale;
            const scaledHeight = this.game.MAP_HEIGHT * resolutionScale;
            
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
        
        console.log(`🎨 [Collision Paint] world:(${worldX.toFixed(1)}, ${worldY.toFixed(1)}) brush:${brushSize} canvas:${canvas.width}x${canvas.height}`);
        
        // Draw collision area (solid red, no transparency)
        ctx.save();
        ctx.fillStyle = 'rgba(255, 0, 0, 1.0)'; // Solid red
        ctx.globalCompositeOperation = 'source-over';
        
        // Draw based on brush shape
        if (this.brushShape === 'square') {
            // Square brush
            ctx.fillRect(worldX - brushSize, worldY - brushSize, brushSize * 2, brushSize * 2);
            console.log(`🎨 [Collision] Drew square at (${worldX}, ${worldY}) size ${brushSize * 2}x${brushSize * 2}`);
        } else {
            // Circle brush (default)
            ctx.beginPath();
            ctx.arc(worldX, worldY, brushSize, 0, Math.PI * 2);
            ctx.fill();
            console.log(`🎨 [Collision] Drew circle at (${worldX}, ${worldY}) radius ${brushSize}`);
        }
        
        ctx.restore();
        
        // Mark canvas as dirty so collision cache gets updated
        canvas._dataDirty = true;
        
        // Invalidate WebGL texture cache so the updated canvas renders immediately
        if (this.game?.renderSystem?.webglRenderer) {
            const collisionKey = `collision_layer_${mapId}`;
            this.game.renderSystem.webglRenderer.invalidateTexture(collisionKey);
        }
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
            const resolutionScale = this.game.resolutionScale || 1.0;
            const scaledWidth = this.game.MAP_WIDTH * resolutionScale;
            const scaledHeight = this.game.MAP_HEIGHT * resolutionScale;
            
            const canvas = document.createElement('canvas');
            canvas.width = scaledWidth;
            canvas.height = scaledHeight;
            this.spawnLayers[mapId] = canvas;
            console.log(`[EditorManager] Initialized spawn zone layer for map ${mapId}: ${scaledWidth}x${scaledHeight}`);
        }
        
        const canvas = this.spawnLayers[mapId];
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const brushSize = this.brushSize;
        
        // EXACT SAME BEHAVIOR AS TEXTURE PAINTING: Use worldX/worldY directly
        console.log(`🎨 [Spawn Paint] world:(${worldX.toFixed(1)}, ${worldY.toFixed(1)}) brush:${brushSize} canvas:${canvas.width}x${canvas.height}`);
        
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
        
        // Invalidate WebGL texture cache so the updated canvas renders immediately
        if (this.game?.renderSystem?.webglRenderer) {
            const spawnKey = `spawn_layer_${mapId}`;
            this.game.renderSystem.webglRenderer.invalidateTexture(spawnKey);
        }
        
        // NOTE: We do NOT invalidate spawn zone cache here anymore because it's too expensive
        // to do on every mouse move. It is now handled in stopPainting() (onMouseUp).
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
            
            // Invalidate WebGL texture cache
            if (this.game?.renderSystem?.webglRenderer) {
                if (this.paintMode === 'collision') {
                    const collisionKey = `collision_layer_${mapId}`;
                    this.game.renderSystem.webglRenderer.invalidateTexture(collisionKey);
                } else if (this.paintMode === 'spawn') {
                    const spawnKey = `spawn_layer_${mapId}`;
                    this.game.renderSystem.webglRenderer.invalidateTexture(spawnKey);
                }
            }
            
            // NOTE: We do NOT invalidate spawn zone cache here anymore because it's too expensive
            // to do on every mouse move. It is now handled in stopPainting() (onMouseUp).
            
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
     * Smooth painted layer - rounds sharp edges and corners
     */
    smoothLayer(mapId) {
        console.log('[EditorManager] smoothLayer called with mapId:', mapId, 'paintMode:', this.paintMode);
        
        let canvas;
        let layerType;
        
        // Get the appropriate canvas based on paint mode
        if (this.paintMode === 'collision') {
            canvas = this.collisionLayers[mapId];
            layerType = 'collision';
            console.log('[EditorManager] Collision canvas:', canvas ? 'FOUND' : 'NOT FOUND');
        } else if (this.paintMode === 'spawn') {
            canvas = this.spawnLayers[mapId];
            layerType = 'spawn';
            console.log('[EditorManager] Spawn canvas:', canvas ? 'FOUND' : 'NOT FOUND');
        } else {
            canvas = this.getPaintLayer(mapId);
            layerType = 'texture';
            console.log('[EditorManager] Texture canvas:', canvas ? 'FOUND' : 'NOT FOUND');
        }
        
        if (!canvas) {
            console.error('[EditorManager] ❌ No canvas to smooth! Paint mode:', this.paintMode, 'MapId:', mapId);
            alert('No painted layer found to smooth. Make sure you have painted something first!');
            return;
        }
        
        console.log(`[EditorManager] ✅ Starting smoothing on ${layerType} layer (${canvas.width}x${canvas.height})...`);
        this.showFillSpinner('Smoothing Edges...');
        
        // Use setTimeout to allow spinner to render
        setTimeout(() => {
            try {
                const ctx = canvas.getContext('2d');
                const width = canvas.width;
                const height = canvas.height;
                
                // VERY AGGRESSIVE SMOOTHING - multiple passes with large kernel
                const kernelSize = 15; // MUCH larger kernel (15x15 = averaging 225 pixels!)
                const numPasses = 3; // Multiple passes for extreme smoothing
                const halfKernel = Math.floor(kernelSize / 2);
                
                console.log(`[Smooth] AGGRESSIVE smoothing: ${numPasses} passes with ${kernelSize}x${kernelSize} kernel`);
                
                let currentData = ctx.getImageData(0, 0, width, height);
                
                // Apply multiple blur passes for EXTREME smoothing
                for (let pass = 0; pass < numPasses; pass++) {
                    console.log(`[Smooth] Pass ${pass + 1}/${numPasses}...`);
                    
                    const inputData = currentData.data;
                    const outputData = ctx.createImageData(width, height);
                    const output = outputData.data;
                    
                    // Apply box blur
                    for (let y = 0; y < height; y++) {
                        for (let x = 0; x < width; x++) {
                            let r = 0, g = 0, b = 0, a = 0;
                            let count = 0;
                            
                            // Sample large kernel area
                            for (let ky = -halfKernel; ky <= halfKernel; ky++) {
                                for (let kx = -halfKernel; kx <= halfKernel; kx++) {
                                    const px = x + kx;
                                    const py = y + ky;
                                    
                                    // Check bounds
                                    if (px >= 0 && px < width && py >= 0 && py < height) {
                                        const i = (py * width + px) * 4;
                                        r += inputData[i];
                                        g += inputData[i + 1];
                                        b += inputData[i + 2];
                                        a += inputData[i + 3];
                                        count++;
                                    }
                                }
                            }
                            
                            // Average
                            const outIndex = (y * width + x) * 4;
                            output[outIndex] = r / count;
                            output[outIndex + 1] = g / count;
                            output[outIndex + 2] = b / count;
                            output[outIndex + 3] = a / count;
                        }
                        
                        // Progress feedback every 10%
                        if (y % Math.floor(height / 10) === 0) {
                            console.log(`[Smooth] Pass ${pass + 1} - ${Math.floor((y / height) * 100)}%`);
                        }
                    }
                    
                    currentData = outputData;
                }
                
                // Put final smoothed data back
                ctx.putImageData(currentData, 0, 0);
                
                console.log('[Smooth] All blur passes complete');
                
                // For collision and spawn zones, re-threshold to maintain solid colors
                // (but keep the smooth edges from the blur)
                if (this.paintMode === 'collision' || this.paintMode === 'spawn') {
                    console.log('[Smooth] Applying threshold to maintain solid colors');
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const pixels = imageData.data;
                    
                    // Threshold at 50% to maintain the shape but with smoothed edges
                    const threshold = 128;
                    
                    for (let i = 0; i < pixels.length; i += 4) {
                        const alpha = pixels[i + 3];
                        
                        // Threshold: if alpha > 50%, make it fully opaque with target color
                        if (alpha > threshold) {
                            if (this.paintMode === 'collision') {
                                pixels[i] = 255;     // R
                                pixels[i + 1] = 0;   // G
                                pixels[i + 2] = 0;   // B
                            } else if (this.paintMode === 'spawn') {
                                pixels[i] = 0;       // R
                                pixels[i + 1] = 100; // G
                                pixels[i + 2] = 255; // B
                            }
                            pixels[i + 3] = 255; // A
                        } else {
                            // Make fully transparent
                            pixels[i + 3] = 0;
                        }
                    }
                    
                    ctx.putImageData(imageData, 0, 0);
                    console.log('[Smooth] Threshold applied');
                    
                    // Mark as dirty for collision/spawn cache updates
                    canvas._dataDirty = true;
                    
                    if (this.paintMode === 'spawn' && this.game.spawnManager) {
                        this.game.spawnManager.invalidateSpawnZoneCache();
                    }
                }
                
                // Invalidate baked images so it re-renders from canvas
                if (this.paintMode === 'collision') {
                    canvas._imageReady = false;
                    canvas._bakedImage = null;
                    console.log('[Smooth] Invalidated collision baked image');
                } else if (this.paintMode === 'spawn') {
                    canvas._imageReady = false;
                    canvas._bakedImage = null;
                    console.log('[Smooth] Invalidated spawn baked image');
                }
                
                // Invalidate WebGL texture cache
                if (this.game?.renderSystem?.webglRenderer) {
                    if (this.paintMode === 'collision') {
                        const key = `collision_layer_${mapId}`;
                        this.game.renderSystem.webglRenderer.invalidateTexture(key);
                        console.log('[Smooth] Invalidated WebGL texture:', key);
                    } else if (this.paintMode === 'spawn') {
                        const key = `spawn_layer_${mapId}`;
                        this.game.renderSystem.webglRenderer.invalidateTexture(key);
                        console.log('[Smooth] Invalidated WebGL texture:', key);
                    } else {
                        const key = `paint_layer_${mapId}`;
                        this.game.renderSystem.webglRenderer.invalidateTexture(key);
                        console.log('[Smooth] Invalidated WebGL texture:', key);
                    }
                }
                
                console.log(`[EditorManager] ✅ Smoothed ${layerType} layer - complete!`);
                
                // Optionally re-bake the layer for performance
                if (this.paintMode === 'collision') {
                    console.log('[Smooth] Re-baking collision layer...');
                    this.bakeCollisionLayer(mapId);
                } else if (this.paintMode === 'spawn') {
                    console.log('[Smooth] Re-baking spawn layer...');
                    this.bakeSpawnLayer(mapId);
                } else {
                    const activeLayerId = this.game.layerManager?.activeLayerId;
                    if (activeLayerId) {
                        console.log('[Smooth] Re-baking texture layer...');
                        this.game.layerManager.bakeLayerPaint(mapId, activeLayerId);
                    }
                }
                
                alert(`Smoothing complete! The ${layerType} layer has been smoothed.`);
            } catch (error) {
                console.error('[EditorManager] ❌ Error smoothing layer:', error);
                alert(`Error during smoothing: ${error.message}`);
            } finally {
                console.log('[EditorManager] Hiding spinner...');
                this.hideFillSpinner();
            }
        }, 50);
    }

    /**
     * Show loading spinner for fill operations
     */
    showFillSpinner(message = 'Processing Fill...') {
        // Remove any existing spinner
        this.hideFillSpinner();
        
        const spinner = document.createElement('div');
        spinner.id = 'fill-spinner';
        spinner.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                flex-direction: column;
                gap: 16px;
            ">
                <div style="
                    width: 60px;
                    height: 60px;
                    border: 6px solid rgba(74, 158, 255, 0.3);
                    border-top-color: #4a9eff;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                "></div>
                <div style="
                    color: white;
                    font-family: Arial, sans-serif;
                    font-size: 18px;
                    font-weight: bold;
                ">${message}</div>
            </div>
        `;
        
        // Add keyframe animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(spinner);
    }
    
    /**
     * Hide loading spinner
     */
    hideFillSpinner() {
        const spinner = document.getElementById('fill-spinner');
        if (spinner) {
            spinner.remove();
        }
    }

    /**
     * Flood fill algorithm - fills connected unpainted area
     */
    floodFill(canvas, startX, startY, fillColor) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        // Get target color (the color we're replacing)
        const startIndex = (Math.floor(startY) * canvas.width + Math.floor(startX)) * 4;
        const targetR = pixels[startIndex];
        const targetG = pixels[startIndex + 1];
        const targetB = pixels[startIndex + 2];
        const targetA = pixels[startIndex + 3];
        
        // Parse fill color
        const fillR = fillColor.r;
        const fillG = fillColor.g;
        const fillB = fillColor.b;
        const fillA = fillColor.a;
        
        // If target color is the same as fill color, don't fill
        if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) {
            console.log('[FloodFill] Target color matches fill color, skipping');
            return;
        }
        
        // Stack-based flood fill (faster than recursion, prevents stack overflow)
        const stack = [[Math.floor(startX), Math.floor(startY)]];
        const visited = new Set();
        
        const matchesTarget = (x, y) => {
            if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return false;
            const i = (y * canvas.width + x) * 4;
            return pixels[i] === targetR && 
                   pixels[i + 1] === targetG && 
                   pixels[i + 2] === targetB && 
                   pixels[i + 3] === targetA;
        };
        
        const setPixel = (x, y) => {
            const i = (y * canvas.width + x) * 4;
            pixels[i] = fillR;
            pixels[i + 1] = fillG;
            pixels[i + 2] = fillB;
            pixels[i + 3] = fillA;
        };
        
        let pixelsFilled = 0;
        const maxPixels = 10000000; // Safety limit (10 million pixels, enough for large maps)
        
        while (stack.length > 0 && pixelsFilled < maxPixels) {
            const [x, y] = stack.pop();
            const key = `${x},${y}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            if (!matchesTarget(x, y)) continue;
            
            setPixel(x, y);
            pixelsFilled++;
            
            // Add neighbors
            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
        }
        
        // Put modified image data back
        ctx.putImageData(imageData, 0, 0);
        
        console.log(`[FloodFill] Filled ${pixelsFilled} pixels`);
        return pixelsFilled;
    }

    /**
     * Fill area or entire layer with texture or collision
     */
    fillArea(worldX, worldY, mapId) {
        let canvas;
        
        // Get the appropriate canvas based on paint mode
        if (this.paintMode === 'collision') {
            // Initialize collision canvas if needed
            if (!this.collisionLayers[mapId]) {
                const mapData = this.game.mapManager.maps[mapId];
                if (!mapData) return;
                
                const resolutionScale = this.game.resolutionScale || 1.0;
                const scaledWidth = this.game.MAP_WIDTH * resolutionScale;
                const scaledHeight = this.game.MAP_HEIGHT * resolutionScale;
                
                canvas = document.createElement('canvas');
                canvas.width = scaledWidth;
                canvas.height = scaledHeight;
                this.collisionLayers[mapId] = canvas;
            } else {
                canvas = this.collisionLayers[mapId];
            }
            
            // Flood fill with red collision color
            const pixelsFilled = this.floodFill(canvas, worldX, worldY, { r: 255, g: 0, b: 0, a: 255 });
            
            if (pixelsFilled > 0) {
                // Mark canvas as dirty so collision cache gets updated
                canvas._dataDirty = true;
                
                // Invalidate WebGL texture cache
                if (this.game?.renderSystem?.webglRenderer) {
                    this.game.renderSystem.webglRenderer.invalidateTexture(`collision_layer_${mapId}`);
                }
                
                console.log(`[EditorManager] Flood filled collision area for map ${mapId}: ${pixelsFilled} pixels`);
            }
        } else if (this.paintMode === 'spawn') {
            // Initialize spawn zone canvas if needed
            if (!this.spawnLayers[mapId]) {
                const mapData = this.game.mapManager.maps[mapId];
                if (!mapData) return;
                
                const resolutionScale = this.game.resolutionScale || 1.0;
                const scaledWidth = this.game.MAP_WIDTH * resolutionScale;
                const scaledHeight = this.game.MAP_HEIGHT * resolutionScale;
                
                canvas = document.createElement('canvas');
                canvas.width = scaledWidth;
                canvas.height = scaledHeight;
                this.spawnLayers[mapId] = canvas;
            } else {
                canvas = this.spawnLayers[mapId];
            }
            
            // Flood fill with blue spawn zone color
            const pixelsFilled = this.floodFill(canvas, worldX, worldY, { r: 0, g: 100, b: 255, a: 255 });
            
            if (pixelsFilled > 0) {
                // Mark canvas as dirty and invalidate spawn zone cache
                canvas._dataDirty = true;
                if (this.game.spawnManager) {
                    this.game.spawnManager.invalidateSpawnZoneCache();
                }
                
                // Invalidate WebGL texture cache so the updated canvas renders immediately
                if (this.game?.renderSystem?.webglRenderer) {
                    this.game.renderSystem.webglRenderer.invalidateTexture(`spawn_layer_${mapId}`);
                }
                
                console.log(`[EditorManager] Flood filled spawn zone for map ${mapId}: ${pixelsFilled} pixels`);
            }
        } else {
            // Texture mode - require texture
            if (!this.selectedTexture || !this.loadedTextures[this.selectedTexture]) {
                console.warn('[EditorManager] Cannot fill: no texture selected');
                return;
            }
            
            canvas = this.getPaintLayer(mapId);
            if (!canvas) {
                return;
            }
            
            // Texture flood fill: find connected transparent/matching pixels and paint texture
            const ctx = canvas.getContext('2d');
            const texture = this.loadedTextures[this.selectedTexture];
            
            // Get the target color at click position
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            const startIndex = (Math.floor(worldY) * canvas.width + Math.floor(worldX)) * 4;
            const targetR = pixels[startIndex];
            const targetG = pixels[startIndex + 1];
            const targetB = pixels[startIndex + 2];
            const targetA = pixels[startIndex + 3];
            
            console.log(`[TextureFill] Target color at (${worldX}, ${worldY}): rgba(${targetR}, ${targetG}, ${targetB}, ${targetA})`);
            
            // Create mask canvas for flood fill area
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = canvas.width;
            maskCanvas.height = canvas.height;
            const maskCtx = maskCanvas.getContext('2d');
            
            // Flood fill the mask with white where we want texture
            const stack = [[Math.floor(worldX), Math.floor(worldY)]];
            const visited = new Set();
            const maskData = maskCtx.createImageData(canvas.width, canvas.height);
            
            const matchesTarget = (x, y) => {
                if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return false;
                const i = (y * canvas.width + x) * 4;
                return pixels[i] === targetR && 
                       pixels[i + 1] === targetG && 
                       pixels[i + 2] === targetB && 
                       pixels[i + 3] === targetA;
            };
            
            let pixelsFilled = 0;
            const maxPixels = 10000000; // Safety limit (10 million pixels, enough for large maps)
            
            while (stack.length > 0 && pixelsFilled < maxPixels) {
                const [x, y] = stack.pop();
                const key = `${x},${y}`;
                
                if (visited.has(key)) continue;
                visited.add(key);
                
                if (!matchesTarget(x, y)) continue;
                
                // Mark this pixel in the mask
                const i = (y * canvas.width + x) * 4;
                maskData.data[i] = 255;     // R
                maskData.data[i + 1] = 255; // G
                maskData.data[i + 2] = 255; // B
                maskData.data[i + 3] = 255; // A
                pixelsFilled++;
                
                // Add neighbors
                stack.push([x + 1, y]);
                stack.push([x - 1, y]);
                stack.push([x, y + 1]);
                stack.push([x, y - 1]);
            }
            
            if (pixelsFilled === 0) {
                console.log('[TextureFill] No pixels to fill');
                return;
            }
            
            // Put mask data on mask canvas
            maskCtx.putImageData(maskData, 0, 0);
            
            // Create temp canvas with texture pattern
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Fill with texture pattern
            const pattern = tempCtx.createPattern(texture, 'repeat');
            tempCtx.fillStyle = pattern;
            tempCtx.globalAlpha = this.brushOpacity;
            tempCtx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Apply mask using destination-in
            tempCtx.globalCompositeOperation = 'destination-in';
            tempCtx.globalAlpha = 1.0;
            tempCtx.drawImage(maskCanvas, 0, 0);
            
            // Draw masked texture onto main canvas
            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.restore();
            
            // Invalidate WebGL texture cache
            if (this.game?.renderSystem?.webglRenderer) {
                const activeLayerId = this.game.layerManager?.activeLayerId;
                if (activeLayerId) {
                    this.game.renderSystem.webglRenderer.invalidateTexture(`paint_canvas_${activeLayerId}`);
                }
            }
            
            console.log(`[EditorManager] Flood filled texture area for map ${mapId}: ${pixelsFilled} pixels`);
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
     * Handle window resize - rescale collision and spawn layers to match new resolution
     * This fixes the issue where painted zones move around when window is resized
     */
    handleResize() {
        const mapId = this.game.currentMapId;
        if (!mapId) return;
        
        const mapData = this.game.mapManager.maps[mapId];
        if (!mapData) return;
        
        const resolutionScale = this.game.resolutionScale || 1.0;
        const newWidth = this.game.MAP_WIDTH * resolutionScale;
        const newHeight = this.game.MAP_HEIGHT * resolutionScale;
        
        // Rescale collision layer if it exists
        if (this.collisionLayers[mapId]) {
            const oldCanvas = this.collisionLayers[mapId];
            const oldWidth = oldCanvas.width;
            const oldHeight = oldCanvas.height;
            
            // Only resize if dimensions changed
            if (oldWidth !== newWidth || oldHeight !== newHeight) {
                const newCanvas = document.createElement('canvas');
                newCanvas.width = newWidth;
                newCanvas.height = newHeight;
                
                const ctx = newCanvas.getContext('2d');
                // Scale the old canvas content to fit new size
                ctx.drawImage(oldCanvas, 0, 0, oldWidth, oldHeight, 0, 0, newWidth, newHeight);
                
                // Copy over metadata
                newCanvas._dataDirty = oldCanvas._dataDirty;
                newCanvas._imageReady = oldCanvas._imageReady;
                if (oldCanvas._bakedImage) {
                    // The baked image will be recreated when needed
                    newCanvas._bakedImage = null;
                    newCanvas._imageReady = false;
                }
                
                this.collisionLayers[mapId] = newCanvas;
                
                // Invalidate WebGL texture cache
                if (this.game?.renderSystem?.webglRenderer) {
                    this.game.renderSystem.webglRenderer.invalidateTexture(`collision_layer_${mapId}`);
                }
                
                console.log(`[EditorManager] Resized collision layer: ${oldWidth}x${oldHeight} → ${newWidth}x${newHeight}`);
            }
        }
        
        // Rescale spawn layer if it exists
        if (this.spawnLayers[mapId]) {
            const oldCanvas = this.spawnLayers[mapId];
            const oldWidth = oldCanvas.width;
            const oldHeight = oldCanvas.height;
            
            // Only resize if dimensions changed
            if (oldWidth !== newWidth || oldHeight !== newHeight) {
                const newCanvas = document.createElement('canvas');
                newCanvas.width = newWidth;
                newCanvas.height = newHeight;
                
                const ctx = newCanvas.getContext('2d');
                // Scale the old canvas content to fit new size
                ctx.drawImage(oldCanvas, 0, 0, oldWidth, oldHeight, 0, 0, newWidth, newHeight);
                
                // Copy over metadata
                newCanvas._dataDirty = oldCanvas._dataDirty;
                newCanvas._imageReady = oldCanvas._imageReady;
                if (oldCanvas._bakedImage) {
                    // The baked image will be recreated when needed
                    newCanvas._bakedImage = null;
                    newCanvas._imageReady = false;
                }
                
                this.spawnLayers[mapId] = newCanvas;
                
                // Invalidate spawn zone cache since coordinates changed
                if (this.game.spawnManager) {
                    this.game.spawnManager.invalidateSpawnZoneCache();
                }
                
                // Invalidate WebGL texture cache
                if (this.game?.renderSystem?.webglRenderer) {
                    this.game.renderSystem.webglRenderer.invalidateTexture(`spawn_layer_${mapId}`);
                }
                
                console.log(`[EditorManager] Resized spawn layer: ${oldWidth}x${oldHeight} → ${newWidth}x${newHeight}`);
            }
        }
    }

    /**
     * Start painting
     */
    startPainting(x, y) {
        if (this.selectedTool !== 'paint') return;
        
        const mapId = this.game.currentMapId;
        
        // Invalidate baked images when starting to paint
        if (this.paintMode === 'collision') {
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
            
            // Execute flood fill at mouse position with spinner
            this.showFillSpinner();
            
            // Use setTimeout to allow spinner to render before heavy computation
            setTimeout(() => {
                try {
                    this.fillArea(this.mouseWorldX, this.mouseWorldY, mapId);
                } finally {
                    this.hideFillSpinner();
                }
            }, 50); // Small delay to ensure spinner renders
            
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
        
        // Use mouseScreenWorldX/Y for painting (world coords BEFORE perspective transform)
        // This ensures paint matches the preview location in both 2D and 3D modes
        this.paintAt(this.mouseScreenWorldX, this.mouseScreenWorldY);
    }

    /**
     * Continue painting (while dragging)
     */
    continuePainting(x, y) {
        if (!this.isPainting) return;
        
        // Use mouseScreenWorldX/Y for painting
        this.paintAt(this.mouseScreenWorldX, this.mouseScreenWorldY);
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
        
        // Bake layers to images for better rendering performance
        if (this.paintMode === 'collision') {
            this.bakeCollisionLayer(this.game.currentMapId);
        } else if (this.paintMode === 'spawn') {
            // Invalidate spawn zone cache now that painting is done
            if (this.game.spawnManager) {
                this.game.spawnManager.invalidateSpawnZoneCache();
            }
            this.bakeSpawnLayer(this.game.currentMapId);
        }
        // Texture paint layer doesn't need baking - it renders directly
    }

    /**
     * Get paint layer for a map (called by RenderSystem)
     */
    getPaintLayer(mapId) {
        // Use legacy paint layer system
        if (!this.paintLayers[mapId]) {
            this.initializePaintLayer(mapId);
        }
        return this.paintLayers[mapId];
    }

    /**
     * Export paint layer data as base64 for a specific map
     * @param {string} mapId - The map ID
     * @returns {string|null} Base64 dataURL of the paint layer, or null if empty
     */
    exportPaintLayerData(mapId) {
        const canvas = this.paintLayers[mapId];
        if (!canvas) return null;
        
        // Check if canvas has any content
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hasContent = imageData.data.some((value, index) => index % 4 === 3 && value > 0); // Check alpha channel
        
        if (!hasContent) return null;
        
        return canvas.toDataURL('image/png');
    }

    /**
     * Export all paint layers data
     * @returns {Object} Map of mapId -> base64 dataURL
     */
    exportAllPaintLayers() {
        const result = {};
        for (const mapId of Object.keys(this.paintLayers)) {
            const data = this.exportPaintLayerData(mapId);
            if (data) {
                result[mapId] = data;
            }
        }
        return result;
    }

    /**
     * Import paint layer data for a specific map
     * @param {string} mapId - The map ID
     * @param {string} dataURL - Base64 dataURL of the paint layer
     * @returns {Promise} Resolves when loaded
     */
    async importPaintLayerData(mapId, dataURL) {
        if (!dataURL) return;
        
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                // Initialize canvas if needed
                if (!this.paintLayers[mapId]) {
                    this.initializePaintLayer(mapId);
                }
                
                const canvas = this.paintLayers[mapId];
                const ctx = canvas.getContext('2d');
                
                // Clear and draw the loaded image
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                console.log(`[EditorManager] Loaded paint layer for map ${mapId}`);
                resolve();
            };
            img.onerror = () => {
                console.warn(`[EditorManager] Failed to load paint layer for map ${mapId}`);
                resolve();
            };
            img.src = dataURL;
        });
    }

    /**
     * Import all paint layers from map data
     * @param {Object} mapsData - The maps data object (mapManager.maps)
     */
    async importAllPaintLayers(mapsData) {
        const loadPromises = [];
        for (const [mapId, mapData] of Object.entries(mapsData)) {
            if (mapData.paintLayerData) {
                loadPromises.push(this.importPaintLayerData(mapId, mapData.paintLayerData));
            }
        }
        await Promise.all(loadPromises);
        console.log(`[EditorManager] Loaded ${loadPromises.length} paint layers`);
    }

    /**
     * Render brush preview
     * Preview is drawn centered on cursor position in screen space.
     * In 3D mode, the shape gets perspective distortion.
     */
    renderBrushPreview(ctx) {
        if (this.selectedTool !== 'paint') return;
        
        const camera = this.game.camera;
        const webglRenderer = this.game.renderSystem?.webglRenderer;
        
        // Must have WebGL renderer for consistent transforms (same as grid)
        if (!webglRenderer || !webglRenderer.transformWorldToScreen) {
            return;
        }
        
        // mouseScreenWorldX/Y is in world coordinates (canvas + camera offset)
        // This is where paintAt will paint on the map canvas
        // For the preview, we need to transform from world coords to screen coords
        // BUT: transformWorldToScreen with viewMatrix expects world coords in the
        // same scale as MAP_WIDTH/HEIGHT (the viewMatrix is built with those)
        // mouseScreenWorldX is already in that scale (it's canvas + camera, canvas is CANVAS_WIDTH which equals MAP_WIDTH * resolutionScale)
        
        // Actually mouseScreenWorldX = worldCanvasX + camera.x
        // worldCanvasX is in canvas/logical space (0 to CANVAS_WIDTH)
        // camera.x is in world space (0 to MAP_WIDTH)
        // These are mixed scales! Let's use the pre-camera canvas coords instead
        
        // Actually check what paintAt receives... it receives mouseScreenWorldX which
        // then draws at worldX-brushSize on the paint layer canvas.
        // Paint layer canvas size = MAP_WIDTH * resolutionScale = CANVAS_WIDTH
        // So mouseScreenWorldX should be in 0..CANVAS_WIDTH range which IS canvas scale.
        
        // The grid passes worldCoord * resolutionScale. 
        // If we pass mouseScreenWorldX (already in canvas scale), we shouldn't multiply again.
        
        const centerWorldX = this.mouseScreenWorldX;
        const centerWorldY = this.mouseScreenWorldY;
        const brushSize = this.brushSize;
        
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        ctx.strokeStyle = this.selectedTexture ? 'rgba(74, 158, 255, 0.8)' : 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        if (this.brushShape === 'square') {
            // Transform corners - mouseScreenWorldX is already in scaled/canvas coords
            // Don't multiply by resolutionScale again
            const topLeft = webglRenderer.transformWorldToScreen(
                centerWorldX - brushSize,
                centerWorldY - brushSize,
                camera.x, camera.y
            );
            const topRight = webglRenderer.transformWorldToScreen(
                centerWorldX + brushSize,
                centerWorldY - brushSize,
                camera.x, camera.y
            );
            const bottomRight = webglRenderer.transformWorldToScreen(
                centerWorldX + brushSize,
                centerWorldY + brushSize,
                camera.x, camera.y
            );
            const bottomLeft = webglRenderer.transformWorldToScreen(
                centerWorldX - brushSize,
                centerWorldY + brushSize,
                camera.x, camera.y
            );
            
            ctx.beginPath();
            ctx.moveTo(topLeft.screenX, topLeft.screenY);
            ctx.lineTo(topRight.screenX, topRight.screenY);
            ctx.lineTo(bottomRight.screenX, bottomRight.screenY);
            ctx.lineTo(bottomLeft.screenX, bottomLeft.screenY);
            ctx.closePath();
            ctx.stroke();
            
            // Center marker
            const center = webglRenderer.transformWorldToScreen(
                centerWorldX, centerWorldY, camera.x, camera.y
            );
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(center.screenX, center.screenY, 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Circle: sample points around perimeter
            const numPoints = 32;
            ctx.beginPath();
            
            for (let i = 0; i <= numPoints; i++) {
                const angle = (i / numPoints) * Math.PI * 2;
                const worldX = centerWorldX + Math.cos(angle) * brushSize;
                const worldY = centerWorldY + Math.sin(angle) * brushSize;
                
                const screenPos = webglRenderer.transformWorldToScreen(
                    worldX, worldY, camera.x, camera.y
                );
                
                if (i === 0) {
                    ctx.moveTo(screenPos.screenX, screenPos.screenY);
                } else {
                    ctx.lineTo(screenPos.screenX, screenPos.screenY);
                }
            }
            
            ctx.closePath();
            ctx.stroke();
            
            // Center marker
            const center = webglRenderer.transformWorldToScreen(
                centerWorldX, centerWorldY, camera.x, camera.y
            );
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(center.screenX, center.screenY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    /**
     * Handle zone editor click
     */
    handleZoneClick(x, y, button) {
        // Use world coordinates (snapped if grid is on)
        const worldX = this.mouseWorldX;
        const worldY = this.mouseWorldY;
        
        // Convert to unscaled coordinates for storage
        const unscaled = this.worldToUnscaled(worldX, worldY);
        
        console.log(`[ZoneEditor] Click button ${button} at ${worldX}, ${worldY} (unscaled: ${unscaled.x}, ${unscaled.y})`);
        
        // Left click: Add point OR close loop if clicking start point
        if (button === 0) {
            // Check if clicking near start point to close loop
            if (this.currentZonePoints.length > 2) {
                const startPoint = this.currentZonePoints[0];
                // Convert start point to world coords for distance check
                const startWorld = this.unscaledToWorld(startPoint.x, startPoint.y);
                
                // Distance check (allow 10px radius)
                const dx = worldX - startWorld.x;
                const dy = worldY - startWorld.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < 20) { // 20px snap radius
                    console.log('[ZoneEditor] Clicked start point - closing loop');
                    this.finishZone();
                    return true;
                }
            }

            this.currentZonePoints.push({ x: unscaled.x, y: unscaled.y });
            console.log(`[ZoneEditor] Added point. Total: ${this.currentZonePoints.length}`);
            return true;
        }
        
        // Right click: Close loop
        if (button === 2) {
            this.finishZone();
            return true;
        }
        
        return false;
    }

    /**
     * Finish creating the current zone
     */
    finishZone() {
        if (this.currentZonePoints.length > 2) {
            try {
                // Create zone
                const zone = {
                    points: [...this.currentZonePoints],
                    type: this.zoneType || 'collision'
                };
                this.zones.push(zone);
                console.log(`[ZoneEditor] Zone created! Type: ${zone.type}`);
                
                // Invalidate spawn cache if needed
                if (zone.type === 'spawn' && this.game.spawnManager) {
                    this.game.spawnManager.invalidateSpawnZoneCache();
                }
            } catch (err) {
                console.error('[ZoneEditor] Error creating zone:', err);
            } finally {
                // ALWAYS clear points to prevent "stuck" dotted line
                this.currentZonePoints = [];
            }
        } else {
            console.log('[ZoneEditor] Need at least 3 points to create a zone');
            // Optional: Cancel if right click with < 3 points?
            // For now, just clear if they want to cancel
            if (this.currentZonePoints.length > 0) {
                console.log('[ZoneEditor] Cancelled current zone');
                this.currentZonePoints = [];
            }
        }
    }

    /**
     * Render zones and editor interface
     * Uses WebGL for proper perspective rendering without artifacts
     */
    renderZones(ctx) {
        const camera = this.game.camera;
        const zoom = camera.zoom || 1.0;
        const renderSystem = this.game.renderSystem;
        const webglRenderer = renderSystem?.webglRenderer;
        const perspectiveStrength = this.game.perspectiveSystem?.perspectiveStrength || 0;
        const screenWidth = ctx.canvas.width;
        const screenHeight = ctx.canvas.height;
        
        // Helper to get WebGL colors (RGBA 0-1, NOT premultiplied)
        const getZoneColors = (type, selected = false) => {
            if (selected) {
                return {
                    fill: [1.0, 1.0, 0.0, 0.3],   // Yellow
                    stroke: [1.0, 1.0, 0.0, 0.8]
                };
            }
            if (type === 'spawn') {
                return {
                    fill: [0.0, 0.4, 1.0, 0.3],   // Blue
                    stroke: [0.0, 0.4, 1.0, 0.8]
                };
            }
            // Default to collision (red)
            return {
                fill: [1.0, 0.0, 0.0, 0.3],
                stroke: [1.0, 0.0, 0.0, 0.8]
            };
        };
        
        // 1. Render completed zones using WebGL (handles perspective + no artifacts)
        if (webglRenderer) {
            for (const zone of this.zones) {
                if (zone.points.length < 3) continue;
                
                const isSelected = this.selectedZone === zone;
                const colors = getZoneColors(zone.type, isSelected);
                
                // Convert unscaled points to world coordinates
                const worldPoints = zone.points.map(p => this.unscaledToWorld(p.x, p.y));
                
                // Draw with WebGL - perspective handled in shader, stencil prevents overlap artifacts
                webglRenderer.drawPolygon(worldPoints, colors.fill, colors.stroke, isSelected ? 4 : 2);
            }
        }
        
        // Draw vertices for selected zone (Canvas2D for precise small points)
        if (this.selectedZone && renderSystem) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = '#ffff00';
            for (const point of this.selectedZone.points) {
                const world = this.unscaledToWorld(point.x, point.y);
                const screen = renderSystem.worldToScreen(world.x, world.y, screenWidth, screenHeight, perspectiveStrength);
                if (!screen.invalid) {
                    ctx.beginPath();
                    ctx.arc(screen.x, screen.y, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }
        
        // 2. Render current zone being drawn (Canvas2D with camera transform for real-time feedback)
        if (this.currentZonePoints.length > 0) {
            ctx.save();
            
            // Apply camera transform for current zone drawing
            const canvasWidth = this.game.CANVAS_WIDTH;
            const canvasHeight = this.game.CANVAS_HEIGHT;
            
            if (zoom !== 1.0) {
                ctx.translate(canvasWidth / 2, canvasHeight / 2);
                ctx.scale(zoom, zoom);
                ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
            }
            
            ctx.translate(-camera.x, -camera.y);
            
            const colors = getZoneColors(this.zoneType || 'collision');
            
            ctx.beginPath();
            
            // Convert unscaled points to world coordinates for rendering
            const p0 = this.unscaledToWorld(this.currentZonePoints[0].x, this.currentZonePoints[0].y);
            ctx.moveTo(p0.x, p0.y);
            
            for (let i = 1; i < this.currentZonePoints.length; i++) {
                const p = this.unscaledToWorld(this.currentZonePoints[i].x, this.currentZonePoints[i].y);
                ctx.lineTo(p.x, p.y);
            }
            
            // Draw line to cursor
            ctx.lineTo(this.mouseWorldX, this.mouseWorldY);
            
            ctx.strokeStyle = colors.stroke;
            ctx.lineWidth = 2 / zoom;
            ctx.setLineDash([5 / zoom, 5 / zoom]);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Draw points
            ctx.fillStyle = colors.stroke;
            for (const point of this.currentZonePoints) {
                const p = this.unscaledToWorld(point.x, point.y);
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4 / zoom, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        }
    }
}
window.EditorManager = EditorManager;
