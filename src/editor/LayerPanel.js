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
        
        // Define theme for layer panel
        this.theme = {
            primary: 'rgba(46, 204, 113, 0.8)',
            primaryLight: 'rgba(46, 204, 113, 0.2)',
            primaryDark: 'rgba(39, 174, 96, 0.4)',
            accent: '#2ecc71',
            name: 'Layers'
        };
        
        this.createUI();
    }

    /**
     * Create the layer panel UI
     */
    createUI() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'layer-panel';
        this.container.style.cssText = EditorStyles.getPanelStyle(this.theme);
        // Override specific styles
        this.container.style.right = '20px';
        this.container.style.top = '80px';
        this.container.style.width = '280px';
        this.container.style.maxHeight = '500px';
        this.container.style.display = 'none';

        // Header
        const header = document.createElement('div');
        header.style.cssText = EditorStyles.getHeaderStyle(this.theme);
        header.innerHTML = EditorStyles.createHeader(this.theme, 'Layers', 'Manage Map Layers');
        this.container.appendChild(header);

        // Content container
        const content = document.createElement('div');
        content.style.cssText = EditorStyles.getContentStyle();
        this.container.appendChild(content);

        // Show All toggle
        const showAllContainer = document.createElement('div');
        showAllContainer.style.cssText = EditorStyles.getListItemStyle();
        showAllContainer.style.marginBottom = '15px';
        showAllContainer.style.padding = '10px';

        const showAllLabel = document.createElement('label');
        showAllLabel.textContent = 'Show All (Preview)';
        showAllLabel.htmlFor = 'show-all-layers';
        showAllLabel.style.cssText = `
            cursor: pointer;
            font-size: 12px;
            color: #ecf0f1;
            flex: 1;
            font-weight: 600;
        `;

        const showAllCheckbox = document.createElement('input');
        showAllCheckbox.type = 'checkbox';
        showAllCheckbox.id = 'show-all-layers';
        showAllCheckbox.checked = this.showAllMode;
        showAllCheckbox.style.cssText = `
            width: 16px;
            height: 16px;
            cursor: pointer;
            accent-color: ${this.theme.accent};
        `;
        
        const toggleShowAll = () => {
            showAllCheckbox.checked = !showAllCheckbox.checked;
            this.showAllMode = showAllCheckbox.checked;
            this.updateLayerList();
            console.log(`[LayerPanel] Show All mode: ${this.showAllMode}`);
        };

        showAllCheckbox.addEventListener('change', () => {
            this.showAllMode = showAllCheckbox.checked;
            this.updateLayerList();
            console.log(`[LayerPanel] Show All mode: ${this.showAllMode}`);
        });
        
        showAllContainer.onclick = (e) => {
            if (e.target !== showAllCheckbox && e.target !== showAllLabel) toggleShowAll();
        };

        showAllContainer.appendChild(showAllLabel);
        showAllContainer.appendChild(showAllCheckbox);
        content.appendChild(showAllContainer);

        // Layer list container
        this.layerListContainer = document.createElement('div');
        this.layerListContainer.id = 'layer-list';
        this.layerListContainer.style.cssText = `
            margin-bottom: 15px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;
        content.appendChild(this.layerListContainer);

        // Add Layer button
        const addButton = document.createElement('button');
        addButton.textContent = '+ Add Layer';
        addButton.style.cssText = EditorStyles.getNewButtonStyle(this.theme);
        addButton.style.marginBottom = '0';
        
        addButton.addEventListener('click', () => this.addLayer());
        EditorStyles.applyNewButtonHover(addButton, this.theme);
        
        content.appendChild(addButton);

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
                background: ${isActive ? 'rgba(46, 204, 113, 0.15)' : 'rgba(255, 255, 255, 0.03)'};
                border: 1px solid ${isActive ? this.theme.accent : 'rgba(255, 255, 255, 0.05)'};
                border-radius: 8px;
                padding: 12px;
                cursor: pointer;
                transition: all 0.2s;
                position: relative;
                overflow: hidden;
            `;
            
            if (isActive) {
                layerItem.style.boxShadow = `0 0 10px ${this.theme.primaryDark}`;
            }

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
                font-size: 13px;
                font-weight: 700;
                color: ${isActive ? this.theme.accent : '#ecf0f1'};
                font-family: 'Lato', sans-serif;
            `;
            header.appendChild(nameSpan);

            // Visibility toggle
            const visibilityButton = document.createElement('button');
            visibilityButton.textContent = layer.visible ? '👁️' : '👁️‍🗨️';
            visibilityButton.style.cssText = `
                background: transparent;
                border: none;
                color: ${layer.visible ? '#ecf0f1' : '#7f8c8d'};
                cursor: pointer;
                font-size: 16px;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s;
            `;
            visibilityButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLayerVisibility(layer.id);
            });
            visibilityButton.onmouseover = () => visibilityButton.style.background = 'rgba(255, 255, 255, 0.1)';
            visibilityButton.onmouseout = () => visibilityButton.style.background = 'transparent';
            
            header.appendChild(visibilityButton);

            layerItem.appendChild(header);

            // Layer info
            const info = document.createElement('div');
            info.style.cssText = `
                font-size: 10px;
                color: #95a5a6;
                margin-bottom: 10px;
                font-family: 'Lato', sans-serif;
            `;
            info.textContent = `z-index: ${layer.zIndex}`;
            layerItem.appendChild(info);

            // Layer controls (only if not locked)
            if (!layer.locked) {
                const controls = document.createElement('div');
                controls.style.cssText = `
                    display: flex;
                    gap: 8px;
                    justify-content: flex-end;
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
                deleteButton.style.background = 'rgba(231, 76, 60, 0.15)';
                deleteButton.style.color = '#e74c3c';
                deleteButton.style.borderColor = 'rgba(231, 76, 60, 0.3)';
                
                deleteButton.onmouseover = () => {
                    deleteButton.style.background = 'rgba(231, 76, 60, 0.3)';
                    deleteButton.style.borderColor = '#e74c3c';
                };
                deleteButton.onmouseout = () => {
                    deleteButton.style.background = 'rgba(231, 76, 60, 0.15)';
                    deleteButton.style.borderColor = 'rgba(231, 76, 60, 0.3)';
                };
                
                controls.appendChild(deleteButton);

                layerItem.appendChild(controls);
            }

            // Click to select layer
            layerItem.addEventListener('click', () => {
                this.selectLayer(layer.id);
            });
            
            // Hover effect for layer item
            layerItem.onmouseover = () => {
                if (!isActive) {
                    layerItem.style.background = 'rgba(255, 255, 255, 0.08)';
                    layerItem.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
            };
            layerItem.onmouseout = () => {
                if (!isActive) {
                    layerItem.style.background = 'rgba(255, 255, 255, 0.03)';
                    layerItem.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }
            };

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
            padding: 6px 10px;
            background: rgba(255, 255, 255, 0.1);
            color: #ecf0f1;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 28px;
        `;
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
        });
        button.addEventListener('mouseenter', () => {
            button.style.background = 'rgba(255, 255, 255, 0.2)';
            button.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.background = 'rgba(255, 255, 255, 0.1)';
            button.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        });
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
