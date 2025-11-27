/**
 * ObjectPlacementPanel - Unified panel for placing all types of game objects
 * Allows switching between object types and selecting templates to place
 */
class ObjectPlacementPanel {
    constructor(editor) {
        this.editor = editor;
        this.game = editor.game;
        this.panel = null;
        this.selectedType = 'lights'; // Current object type
        this.selectedTemplate = null; // Currently selected template
        this.placementMode = false;
        
        this.createPanel();
    }
    
    /**
     * Create the placement panel UI
     */
    createPanel() {
        // Define theme for placement panel
        const theme = {
            primary: 'rgba(46, 204, 113, 0.8)', // Green
            primaryLight: 'rgba(46, 204, 113, 0.2)',
            primaryDark: 'rgba(39, 174, 96, 0.4)',
            accent: '#2ecc71',
            name: 'Placement'
        };
        this.theme = theme;

        this.panel = document.createElement('div');
        this.panel.id = 'object-placement-panel';
        this.panel.style.cssText = EditorStyles.getPanelStyle(theme);
        this.panel.style.display = 'none'; // Start hidden
        
        // Header
        const header = document.createElement('div');
        header.style.cssText = EditorStyles.getHeaderStyle(theme);
        header.innerHTML = EditorStyles.createHeader(theme, 'Place Objects', 'Select and place game objects');
        
        const closeBtn = document.createElement('button');
        closeBtn.id = 'placement-panel-close';
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = EditorStyles.getCloseButtonStyle();
        EditorStyles.applyCloseButtonHover(closeBtn);
        header.appendChild(closeBtn);
        
        this.panel.appendChild(header);

        // Content Container
        const content = document.createElement('div');
        content.style.cssText = EditorStyles.getContentStyle();
        
        // Object Type Selector
        const typeContainer = document.createElement('div');
        typeContainer.style.cssText = EditorStyles.getFieldContainerStyle();
        
        const typeLabel = document.createElement('label');
        typeLabel.textContent = 'Object Type:';
        typeLabel.style.cssText = EditorStyles.getLabelStyle();
        
        const typeSelect = document.createElement('select');
        typeSelect.id = 'placement-type-select';
        typeSelect.style.cssText = EditorStyles.getInputStyle();
        typeSelect.style.width = '100%';
        typeSelect.style.cursor = 'pointer';
        
        const types = [
            { value: 'lights', label: '💡 Lights' },
            { value: 'spirits', label: '👻 Spirits' },
            { value: 'doodads', label: '🎨 Doodads' },
            { value: 'npcs', label: '🧙 NPCs' },
            { value: 'chests', label: '📦 Chests' },
            { value: 'portals', label: '🚪 Portals' }
        ];
        
        types.forEach(t => {
            const option = document.createElement('option');
            option.value = t.value;
            option.textContent = t.label;
            typeSelect.appendChild(option);
        });
        
        EditorStyles.applyInputFocus(typeSelect);
        
        typeContainer.appendChild(typeLabel);
        typeContainer.appendChild(typeSelect);
        content.appendChild(typeContainer);
        
        // Template List Container
        const listContainer = document.createElement('div');
        listContainer.id = 'placement-template-list';
        listContainer.style.marginBottom = '15px';
        content.appendChild(listContainer);
        
        // Placement Status
        const statusDiv = document.createElement('div');
        statusDiv.id = 'placement-status';
        statusDiv.style.cssText = `
            background: ${theme.primaryLight};
            border: 1px solid ${theme.primary};
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 15px;
            display: none;
        `;
        statusDiv.innerHTML = `
            <div style="font-size: 13px; margin-bottom: 5px; color: ${theme.accent}; font-weight: bold;">
                Placement Active
            </div>
            <div style="font-size: 12px; color: #bdc3c7;">
                Selected: <span id="placement-selected-name" style="color: #fff;">-</span><br>
                Click on map to place<br>
                Press ESC to cancel
            </div>
        `;
        content.appendChild(statusDiv);
        
        // Cancel Button
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'placement-cancel-btn';
        cancelBtn.textContent = '🛑 Cancel Placement';
        cancelBtn.style.cssText = `
            width: 100%;
            padding: 12px;
            background: rgba(231, 76, 60, 0.2);
            border: 1px solid #e74c3c;
            border-radius: 8px;
            color: #e74c3c;
            cursor: pointer;
            font-weight: 700;
            display: none;
            transition: all 0.2s;
        `;
        
        cancelBtn.onmouseover = () => {
            cancelBtn.style.background = 'rgba(231, 76, 60, 0.4)';
            cancelBtn.style.transform = 'translateY(-2px)';
        };
        cancelBtn.onmouseout = () => {
            cancelBtn.style.background = 'rgba(231, 76, 60, 0.2)';
            cancelBtn.style.transform = 'translateY(0)';
        };
        
        content.appendChild(cancelBtn);
        
        this.panel.appendChild(content);
        document.body.appendChild(this.panel);
        
        this.setupEventListeners();
        this.populateTemplates();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close button
        document.getElementById('placement-panel-close').addEventListener('click', () => this.hide());
        
        // Type selector
        document.getElementById('placement-type-select').addEventListener('change', (e) => {
            this.selectedType = e.target.value;
            this.selectedTemplate = null;
            this.populateTemplates();
            this.deactivatePlacementMode(); // Cancel placement when switching types
        });
        
        // Cancel button
        document.getElementById('placement-cancel-btn').addEventListener('click', () => {
            this.deactivatePlacementMode();
        });
    }
    
    /**
     * Populate template list based on selected type
     */
    async populateTemplates() {
        const container = document.getElementById('placement-template-list');
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Loading...</div>';
        
        let templates = [];
        
        switch(this.selectedType) {
            case 'lights':
                // Ensure lights are loaded from JSON first
                if (!this.game.lightManager.lightRegistry.dataLoaded) {
                    await this.game.lightManager.lightRegistry.loadTemplates();
                }
                templates = this.game.lightManager.lightRegistry.getAllTemplates();
                break;
            case 'spirits':
                templates = this.game.spiritRegistry.getAllTemplates();
                break;
            case 'doodads':
                // StaticObjectRegistry returns {name, template} format - merge name into template
                templates = this.game.staticObjectRegistry.getAllTemplates()
                    .map(item => ({ ...item.template, name: item.name, id: item.name }));
                break;
            case 'npcs':
                templates = this.game.npcRegistry.getAllTemplates();
                break;
            case 'chests':
                templates = this.game.chestRegistry.getAllTemplates();
                break;
            case 'portals':
                templates = this.game.portalRegistry.getAllTemplates();
                break;
        }
        
        if (templates.length === 0) {
            container.innerHTML = EditorStyles.getEmptyStateStyle();
            container.innerHTML = `
                <div style="${EditorStyles.getEmptyStateStyle()}">
                    No templates available.<br>
                    Create templates in the Data menu first.
                </div>
            `;
            return;
        }
        
        // Clear loading message
        container.innerHTML = '';
        
        // Create template list
        const list = document.createElement('div');
        list.style.cssText = `
            max-height: 300px;
            overflow-y: auto;
            padding-right: 5px;
        `;
        
        templates.forEach(template => {
            const item = document.createElement('div');
            item.className = 'placement-template-item';
            item.dataset.templateId = template.id || template.name;
            item.style.cssText = EditorStyles.getListItemStyle();
            
            const icon = this.getTypeIcon(this.selectedType);
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 24px; filter: drop-shadow(0 0 5px rgba(255,255,255,0.3));">${icon}</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 700; color: #fff; font-size: 14px;">${template.name || template.id}</div>
                        <div style="font-size: 11px; color: #95a5a6; margin-top: 2px;">${this.getTemplateInfo(template)}</div>
                    </div>
                </div>
            `;
            
            item.addEventListener('mouseenter', () => {
                if (!this.selectedTemplate || this.selectedTemplate.name !== template.name) {
                    item.style.background = 'rgba(255, 255, 255, 0.1)';
                    item.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }
            });
            
            item.addEventListener('mouseleave', () => {
                if (!this.selectedTemplate || this.selectedTemplate.name !== template.name) {
                    item.style.background = 'rgba(255, 255, 255, 0.03)';
                    item.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }
            });
            
            item.addEventListener('click', () => {
                this.selectTemplate(template);
            });
            
            list.appendChild(item);
        });
        
        container.appendChild(list);
    }
    
    /**
     * Get icon for object type
     */
    getTypeIcon(type) {
        const icons = {
            lights: '💡',
            spirits: '👻',
            doodads: '🎨',
            npcs: '🧙',
            chests: '📦',
            portals: '🚪'
        };
        return icons[type] || '📍';
    }
    
    /**
     * Get template info string
     */
    getTemplateInfo(template) {
        switch(this.selectedType) {
            case 'lights':
                return `Radius: ${template.radius}px`;
            case 'spirits':
                return `Level: ${template.level || 1}`;
            case 'doodads':
                return `Scale: ${template.scale || 1.0}`;
            case 'npcs':
                return template.npcType || 'Generic NPC';
            case 'chests':
                return template.chestType || 'Wooden';
            case 'portals':
                return template.portalType || 'Door';
            default:
                return '';
        }
    }
    
    // No longer needed - using real registries now!
    
    /**
     * Select a template
     */
    selectTemplate(template) {
        this.selectedTemplate = template;
        
        // Update visual selection
        const items = document.querySelectorAll('.placement-template-item');
        items.forEach(item => {
            const isSelected = item.dataset.templateId === (template.id || template.name);
            if (isSelected) {
                item.style.background = 'rgba(46, 204, 113, 0.2)';
                item.style.borderColor = '#2ecc71';
                item.style.boxShadow = '0 0 10px rgba(46, 204, 113, 0.1)';
            } else {
                item.style.background = 'rgba(255, 255, 255, 0.03)';
                item.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                item.style.boxShadow = 'none';
            }
        });
        
        // Auto-activate placement mode when template is selected
        this.activatePlacementMode();
    }
    
    /**
     * Update UI state
     */
    updateUI() {
        const statusDiv = document.getElementById('placement-status');
        const cancelBtn = document.getElementById('placement-cancel-btn');
        
        if (this.placementMode) {
            cancelBtn.style.display = 'block';
            statusDiv.style.display = 'block';
            
            if (this.selectedTemplate) {
                document.getElementById('placement-selected-name').textContent = this.selectedTemplate.name || this.selectedTemplate.id;
            }
        } else {
            cancelBtn.style.display = 'none';
            statusDiv.style.display = 'none';
        }
    }
    
    /**
     * Activate placement mode
     */
    activatePlacementMode() {
        if (!this.selectedTemplate) return;
        
        // Clear any previous placement state first
        this.editor.selectedPrefab = null;
        
        this.placementMode = true;
        
        // Create prefab data based on type
        const prefabData = this.createPrefabData(this.selectedTemplate);
        this.editor.selectedPrefab = prefabData;
        
        // Set editor to place mode AFTER setting prefab
        this.editor.setTool('place');
        
        // Load preview sprite if prefab has one
        if (prefabData && prefabData.spriteSrc) {
            this.editor.loadPreviewSprite(prefabData.spriteSrc);
        }
        
        console.log('[ObjectPlacementPanel] Activated placement mode:', this.selectedType);
        console.log('[ObjectPlacementPanel] Template:', this.selectedTemplate);
        console.log('[ObjectPlacementPanel] Prefab data:', prefabData);
        console.log('[ObjectPlacementPanel] Editor tool:', this.editor.selectedTool);
        console.log('[ObjectPlacementPanel] Preview sprite loading:', prefabData?.spriteSrc || 'none');
        
        this.updateUI();
    }
    
    /**
     * Deactivate placement mode
     */
    deactivatePlacementMode() {
        this.placementMode = false;
        this.editor.setTool('select');
        this.editor.selectedPrefab = null;
        
        console.log('[ObjectPlacementPanel] Deactivated placement mode');
        this.updateUI();
    }
    
    /**
     * Create prefab data for placement
     */
    createPrefabData(template) {
        switch(this.selectedType) {
            case 'lights':
                // Lights placed the same as other objects
                return {
                    category: 'Light',
                    objectType: 'light',
                    ...template,  // Include ALL template properties (radius, color, flicker)
                    templateName: template.name
                };
                
            case 'spirits':
                return {
                    category: 'Actor',
                    actorType: 'spirit',
                    ...template,  // Include ALL template properties (collision, stats, etc.)
                    templateId: template.id
                };
                
            case 'doodads':
                return {
                    category: 'StaticObject',
                    ...template,  // Include ALL template properties (collision, sway, shadow, etc.)
                    templateId: template.id,
                    castsShadow: template.castsShadow !== false // Enable shadows by default
                };
                
            case 'npcs':
                return {
                    category: 'Actor',
                    actorType: 'npc',
                    spriteSrc: '/assets/npc/main-0.png',
                    name: template.name,
                    npcType: template.npcType,
                    dialogue: 'Hello!',
                    scale: 0.15,
                    castsShadow: true // Enable shadows for NPCs
                };
                
            case 'chests':
                return {
                    category: 'InteractiveObject',
                    objectType: 'chest',
                    spriteSrc: '/assets/npc/chest-0.png',
                    chestType: template.chestType,
                    gold: 0,
                    loot: [],
                    scale: 0.15,  // COMMON BEHAVIOR: Set default scale for visual consistency
                    castsShadow: true // Enable shadows for chests
                };
                
            case 'portals':
                return {
                    category: 'InteractiveObject',
                    objectType: 'portal',
                    spriteSrc: '/assets/npc/door-0.png',
                    portalType: template.portalType,
                    targetMap: '0-0',
                    spawnPoint: 'default',
                    scale: 0.15,  // COMMON BEHAVIOR: Set default scale for visual consistency
                    castsShadow: true // Enable shadows for portals
                };
                
            default:
                return null;
        }
    }
    
    /**
     * Handle map click (for light placement)
     */
    handleMapClick(worldX, worldY) {
        if (!this.placementMode) return false;
        
        // Lights are handled specially through LightEditor
        if (this.selectedType === 'lights' && this.editor.lightEditor) {
            return this.editor.lightEditor.handleMapClick(worldX, worldY);
        }
        
        // Other objects use standard placement
        return false; // Let EditorManager handle it
    }
    
    /**
     * Show the panel
     */
    show() {
        this.panel.style.display = 'block';
        this.populateTemplates();
    }
    
    /**
     * Hide the panel
     */
    hide() {
        this.panel.style.display = 'none';
        if (this.placementMode) {
            this.deactivatePlacementMode();
        }
    }
    
    /**
     * Is the panel visible
     */
    isVisible() {
        return this.panel.style.display === 'block';
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
}

// Export
window.ObjectPlacementPanel = ObjectPlacementPanel;
