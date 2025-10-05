/**
 * LayerPanel - UI component for managing map layers in the editor
 * 
 * Features:
 * - List all layers with visibility toggles
 * - Add/remove layers (except locked base layer)
 * - Reorder layers (move up/down)
 * - Select active layer for editing
 * - "Show All" mode to preview in-game look
 * - Visual dimming of non-active layers
 */
class LayerPanel {
    constructor(editor) {
        this.editor = editor;
        this.game = editor.game;
        this.container = null;
        this.showAllMode = false; // Toggle for showing all layers vs active only
        
        this.createUI();
    }

    /**
     * Create the layer panel UI
     */
    createUI() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'layer-panel';
        this.container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            width: 250px;
            background: rgba(0, 0, 0, 0.85);
            border: 2px solid #555;
            border-radius: 8px;
            padding: 15px;
            color: white;
            font-family: 'Press Start 2P', monospace;
            font-size: 10px;
            z-index: 1000;
            display: none;
            max-height: 500px;
            overflow-y: auto;
        `;

        // Title
        const title = document.createElement('div');
        title.textContent = 'LAYERS';
        title.style.cssText = `
            font-size: 12px;
            margin-bottom: 15px;
            text-align: center;
            color: #4CAF50;
            border-bottom: 1px solid #555;
            padding-bottom: 10px;
        `;
        this.container.appendChild(title);

        // Show All toggle
        const showAllContainer = document.createElement('div');
        showAllContainer.style.cssText = `
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        `;

        const showAllCheckbox = document.createElement('input');
        showAllCheckbox.type = 'checkbox';
        showAllCheckbox.id = 'show-all-layers';
        showAllCheckbox.checked = this.showAllMode;
        showAllCheckbox.style.cssText = `
            width: 16px;
            height: 16px;
            cursor: pointer;
        `;
        showAllCheckbox.addEventListener('change', () => {
            this.showAllMode = showAllCheckbox.checked;
            this.updateLayerList();
            console.log(`[LayerPanel] Show All mode: ${this.showAllMode}`);
        });

        const showAllLabel = document.createElement('label');
        showAllLabel.textContent = 'Show All (Preview)';
        showAllLabel.htmlFor = 'show-all-layers';
        showAllLabel.style.cssText = `
            cursor: pointer;
            font-size: 9px;
        `;

        showAllContainer.appendChild(showAllCheckbox);
        showAllContainer.appendChild(showAllLabel);
        this.container.appendChild(showAllContainer);

        // Layer list container
        this.layerListContainer = document.createElement('div');
        this.layerListContainer.id = 'layer-list';
        this.layerListContainer.style.cssText = `
            margin-bottom: 15px;
        `;
        this.container.appendChild(this.layerListContainer);

        // Add Layer button
        const addButton = document.createElement('button');
        addButton.textContent = '+ Add Layer';
        addButton.style.cssText = `
            width: 100%;
            padding: 10px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: 'Press Start 2P', monospace;
            font-size: 9px;
            margin-top: 10px;
        `;
        addButton.addEventListener('click', () => this.addLayer());
        addButton.addEventListener('mouseenter', () => addButton.style.background = '#45a049');
        addButton.addEventListener('mouseleave', () => addButton.style.background = '#4CAF50');
        this.container.appendChild(addButton);

        // Append to body
        document.body.appendChild(this.container);

        console.log('[LayerPanel] UI created');
    }

    /**
     * Update the layer list display
     */
    updateLayerList() {
        if (!this.game.currentMapId) return;

        const layers = this.game.layerManager.getLayers(this.game.currentMapId);
        const activeLayerId = this.game.layerManager.activeLayerId;

        this.layerListContainer.innerHTML = '';

        // Reverse order so highest z-index appears at top
        const reversedLayers = [...layers].reverse();

        reversedLayers.forEach((layer, index) => {
            const layerItem = document.createElement('div');
            const isActive = layer.id === activeLayerId;
            
            layerItem.style.cssText = `
                background: ${isActive ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
                border: 2px solid ${isActive ? '#4CAF50' : '#555'};
                border-radius: 4px;
                padding: 10px;
                margin-bottom: 8px;
                cursor: pointer;
            `;

            // Layer header (name and visibility)
            const header = document.createElement('div');
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            `;

            // Layer name
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${layer.name} ${layer.locked ? '🔒' : ''}`;
            nameSpan.style.cssText = `
                font-size: 10px;
                font-weight: bold;
                color: ${isActive ? '#4CAF50' : 'white'};
            `;
            header.appendChild(nameSpan);

            // Visibility toggle
            const visibilityButton = document.createElement('button');
            visibilityButton.textContent = layer.visible ? '👁️' : '👁️‍🗨️';
            visibilityButton.style.cssText = `
                background: transparent;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 16px;
                padding: 0;
            `;
            visibilityButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLayerVisibility(layer.id);
            });
            header.appendChild(visibilityButton);

            layerItem.appendChild(header);

            // Layer info
            const info = document.createElement('div');
            info.style.cssText = `
                font-size: 8px;
                color: #aaa;
                margin-bottom: 8px;
            `;
            info.textContent = `z-index: ${layer.zIndex}`;
            layerItem.appendChild(info);

            // Layer controls (only if not locked)
            if (!layer.locked) {
                const controls = document.createElement('div');
                controls.style.cssText = `
                    display: flex;
                    gap: 5px;
                    justify-content: center;
                `;

                // Move Up button
                const upButton = this.createControlButton('▲', () => {
                    this.moveLayerUp(layer.id);
                });
                controls.appendChild(upButton);

                // Move Down button
                const downButton = this.createControlButton('▼', () => {
                    this.moveLayerDown(layer.id);
                });
                controls.appendChild(downButton);

                // Delete button
                const deleteButton = this.createControlButton('🗑️', () => {
                    this.deleteLayer(layer.id);
                });
                deleteButton.style.background = '#f44336';
                controls.appendChild(deleteButton);

                layerItem.appendChild(controls);
            }

            // Click to select layer
            layerItem.addEventListener('click', () => {
                this.selectLayer(layer.id);
            });

            this.layerListContainer.appendChild(layerItem);
        });
    }

    /**
     * Create a control button
     */
    createControlButton(text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            padding: 5px 10px;
            background: #555;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
        `;
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
        });
        button.addEventListener('mouseenter', () => button.style.background = '#666');
        button.addEventListener('mouseleave', () => button.style.background = '#555');
        return button;
    }

    /**
     * Add a new layer (above currently active layer)
     */
    addLayer() {
        const layerName = prompt('Enter layer name:', `Layer ${this.game.layerManager.getLayers(this.game.currentMapId).length}`);
        if (!layerName) return;

        // Get active layer to determine z-index
        const activeLayer = this.game.layerManager.getActiveLayer(this.game.currentMapId);
        const newZIndex = activeLayer ? activeLayer.zIndex + 1 : 1;

        const newLayer = this.game.layerManager.addLayer(this.game.currentMapId, layerName, newZIndex);
        if (newLayer) {
            this.updateLayerList();
            console.log(`[LayerPanel] Added layer: ${layerName} at z-index ${newZIndex}`);
        }
    }

    /**
     * Delete a layer
     */
    deleteLayer(layerId) {
        const layer = this.game.layerManager.getLayer(this.game.currentMapId, layerId);
        if (!layer) return;

        if (confirm(`Delete layer "${layer.name}"?`)) {
            const success = this.game.layerManager.removeLayer(this.game.currentMapId, layerId);
            if (success) {
                this.updateLayerList();
                console.log(`[LayerPanel] Deleted layer: ${layer.name}`);
            }
        }
    }

    /**
     * Select a layer as active
     */
    selectLayer(layerId) {
        this.game.layerManager.setActiveLayer(layerId);
        this.updateLayerList();
    }

    /**
     * Move layer up in z-order
     */
    moveLayerUp(layerId) {
        this.game.layerManager.moveLayerUp(this.game.currentMapId, layerId);
        this.updateLayerList();
    }

    /**
     * Move layer down in z-order
     */
    moveLayerDown(layerId) {
        this.game.layerManager.moveLayerDown(this.game.currentMapId, layerId);
        this.updateLayerList();
    }

    /**
     * Toggle layer visibility
     */
    toggleLayerVisibility(layerId) {
        this.game.layerManager.toggleLayerVisibility(this.game.currentMapId, layerId);
        this.updateLayerList();
    }

    /**
     * Show the panel
     */
    show() {
        if (this.container) {
            this.container.style.display = 'block';
            this.updateLayerList();
        }
    }

    /**
     * Hide the panel
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * Check if panel is visible
     */
    isVisible() {
        return this.container && this.container.style.display !== 'none';
    }

    /**
     * Toggle panel visibility
     */
    toggle() {
        if (this.isVisible()) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Get whether "Show All" mode is enabled
     */
    isShowAllMode() {
        return this.showAllMode;
    }
}

// Export
window.LayerPanel = LayerPanel;
