/**
 * SpiritEditor.js
 * Full-featured Spirit template editor with Create/Edit/Delete functionality
 * Standardized design matching other template editors
 */

class SpiritEditor {
    constructor(game) {
        this.game = game;
        this.panel = null;
        this.listContainer = null;
        this.formContainer = null;
        this.currentEditingTemplate = null;
    }

    show() {
        if (this.panel) {
            this.panel.style.display = 'block';
            this.refresh();
            return;
        }

        this.createPanel();
    }

    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
        }
    }

    createPanel() {
        const theme = EditorStyles.THEMES.spirit;
        
        this.panel = document.createElement('div');
        this.panel.className = 'editor-panel';
        this.panel.style.cssText = EditorStyles.getPanelStyle(theme);

        // Header
        const header = document.createElement('div');
        header.style.cssText = EditorStyles.getHeaderStyle(theme);
        header.innerHTML = EditorStyles.createHeader(theme, '✨ Spirit Template Editor', 'Create, Edit, and Delete Spirit Templates');

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = EditorStyles.getCloseButtonStyle();
        EditorStyles.applyCloseButtonHover(closeBtn);
        closeBtn.onclick = () => this.hide();
        header.appendChild(closeBtn);

        this.panel.appendChild(header);

        // Scrollable content
        const content = document.createElement('div');
        content.style.cssText = EditorStyles.getContentStyle();

        // New Template Button
        const newBtn = document.createElement('button');
        newBtn.textContent = '+ Create New Spirit Template';
        newBtn.style.cssText = EditorStyles.getNewButtonStyle(theme);
        EditorStyles.applyNewButtonHover(newBtn, theme);
        newBtn.onclick = () => this.showForm();
        content.appendChild(newBtn);

        // Template List
        this.listContainer = document.createElement('div');
        content.appendChild(this.listContainer);

        // Form Container (hidden by default)
        this.formContainer = document.createElement('div');
        this.formContainer.style.display = 'none';
        content.appendChild(this.formContainer);

        this.panel.appendChild(content);
        document.body.appendChild(this.panel);

        this.refresh();
    }

    refresh() {
        if (!this.listContainer) return;

        this.listContainer.innerHTML = '';

        const templates = this.game.spiritRegistry.getAllTemplates();

        if (templates.length === 0) {
            this.listContainer.innerHTML = `
                <div style="${EditorStyles.getEmptyStateStyle()}">
                    No spirit templates yet. Click "Create New" to add one!
                </div>
            `;
            return;
        }

        templates.forEach(template => {
            const item = document.createElement('div');
            item.style.cssText = EditorStyles.getListItemStyle();

            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: bold; color: #3498db;">${template.name}</div>
                        <div style="font-size: 11px; color: #95a5a6; margin-top: 2px;">
                            Type: ${template.spiritType || 'Unknown'} | Sprite: ${template.spritePath}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="edit-btn" style="${EditorStyles.getEditButtonStyle()}">Edit</button>
                        <button class="delete-btn" style="${EditorStyles.getDeleteButtonStyle()}">Delete</button>
                    </div>
                </div>
            `;

            const editBtn = item.querySelector('.edit-btn');
            const deleteBtn = item.querySelector('.delete-btn');
            
            EditorStyles.applyEditButtonHover(editBtn);
            EditorStyles.applyDeleteButtonHover(deleteBtn);
            
            editBtn.onclick = (e) => {
                e.stopPropagation();
                this.showForm(template);
            };

            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteTemplate(template.name);
            };

            this.listContainer.appendChild(item);
        });
    }

    showForm(template = null) {
        const theme = EditorStyles.THEMES.spirit;
        this.currentEditingTemplate = template;

        // Hide list, show form
        this.listContainer.style.display = 'none';
        this.formContainer.style.display = 'block';

        this.formContainer.innerHTML = '';

        // Form Title
        const title = document.createElement('h4');
        title.textContent = template ? `Edit: ${template.name}` : 'Create New Spirit Template';
        title.style.cssText = `margin: 0 0 15px 0; color: ${theme.accent}; font-size: 16px;`;
        this.formContainer.appendChild(title);

        // Form
        const form = document.createElement('form');
        form.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

        // Name field
        form.appendChild(this.createField('Name', 'text', 'name', template?.name || '', 'forest-pixie'));

        // Spirit Type field
        form.appendChild(this.createField('Spirit Type', 'text', 'spiritType', template?.spiritType || '', 'pixie'));

        // Sprite Path field
        form.appendChild(this.createField('Sprite Path', 'text', 'spritePath', template?.spritePath || '', '/assets/npc/Spirits/pixie-0.png'));

        // Scale field
        form.appendChild(this.createField('Scale', 'number', 'scale', template?.scale || 0.15, null, 0.01));

        // Movement section
        const movementTitle = document.createElement('div');
        movementTitle.textContent = 'Movement Settings';
        movementTitle.style.cssText = EditorStyles.getSectionTitleStyle();
        form.appendChild(movementTitle);

        // Movement Pattern dropdown
        const patternContainer = document.createElement('div');
        patternContainer.style.cssText = EditorStyles.getFieldContainerStyle();
        const patternLabel = document.createElement('label');
        patternLabel.textContent = 'Movement Pattern';
        patternLabel.style.cssText = EditorStyles.getLabelStyle();
        patternContainer.appendChild(patternLabel);
        const patternSelect = document.createElement('select');
        patternSelect.name = 'movementPattern';
        patternSelect.style.cssText = EditorStyles.getInputStyle();
        ['wander', 'stationary', 'patrol', 'follow'].forEach(pattern => {
            const option = document.createElement('option');
            option.value = pattern;
            option.textContent = pattern.charAt(0).toUpperCase() + pattern.slice(1);
            if (template?.movementPattern === pattern) option.selected = true;
            patternSelect.appendChild(option);
        });
        patternContainer.appendChild(patternSelect);
        form.appendChild(patternContainer);

        // Speed fields
        const speedRow = document.createElement('div');
        speedRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';
        speedRow.appendChild(this.createField('Speed', 'number', 'speed', template?.speed || 2, null, 0.1));
        speedRow.appendChild(this.createField('Wander Radius', 'number', 'wanderRadius', template?.wanderRadius || 50, null, 10));
        form.appendChild(speedRow);

        // Stats section
        const statsTitle = document.createElement('div');
        statsTitle.textContent = 'Stats';
        statsTitle.style.cssText = EditorStyles.getSectionTitleStyle();
        form.appendChild(statsTitle);

        const statsRow = document.createElement('div');
        statsRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';
        statsRow.appendChild(this.createField('HP', 'number', 'hp', template?.hp || 100, null, 10));
        statsRow.appendChild(this.createField('Attack', 'number', 'attack', template?.attack || 10, null, 1));
        form.appendChild(statsRow);

        // Behavior section
        const behaviorTitle = document.createElement('div');
        behaviorTitle.textContent = 'Behavior';
        behaviorTitle.style.cssText = EditorStyles.getSectionTitleStyle();
        form.appendChild(behaviorTitle);

        // Is Hostile checkbox
        const hostileContainer = document.createElement('div');
        hostileContainer.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';
        const hostileCheckbox = document.createElement('input');
        hostileCheckbox.type = 'checkbox';
        hostileCheckbox.id = 'isHostile';
        hostileCheckbox.checked = template?.isHostile || false;
        const hostileLabel = document.createElement('label');
        hostileLabel.htmlFor = 'isHostile';
        hostileLabel.textContent = 'Is Hostile';
        hostileLabel.style.color = '#ecf0f1';
        hostileContainer.appendChild(hostileCheckbox);
        hostileContainer.appendChild(hostileLabel);
        form.appendChild(hostileContainer);

        // Can Capture checkbox
        const captureContainer = document.createElement('div');
        captureContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
        const captureCheckbox = document.createElement('input');
        captureCheckbox.type = 'checkbox';
        captureCheckbox.id = 'canCapture';
        captureCheckbox.checked = template?.canCapture !== false;
        const captureLabel = document.createElement('label');
        captureLabel.htmlFor = 'canCapture';
        captureLabel.textContent = 'Can Be Captured';
        captureLabel.style.color = '#ecf0f1';
        captureContainer.appendChild(captureCheckbox);
        captureContainer.appendChild(captureLabel);
        form.appendChild(captureContainer);

        // Collision section
        const collisionTitle = document.createElement('div');
        collisionTitle.textContent = 'Collision Box';
        collisionTitle.style.cssText = EditorStyles.getSectionTitleStyle();
        form.appendChild(collisionTitle);

        const collisionRow = document.createElement('div');
        collisionRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';
        collisionRow.appendChild(this.createField('Width', 'number', 'collisionWidth', template?.collision?.width || 32, null, 1));
        collisionRow.appendChild(this.createField('Height', 'number', 'collisionHeight', template?.collision?.height || 32, null, 1));
        form.appendChild(collisionRow);

        // Buttons
        const buttonRow = document.createElement('div');
        buttonRow.style.cssText = 'display: flex; gap: 8px; margin-top: 15px;';

        const saveBtn = document.createElement('button');
        saveBtn.type = 'submit';
        saveBtn.textContent = template ? 'Save Changes' : 'Create Template';
        saveBtn.style.cssText = EditorStyles.getSaveButtonStyle(theme);
        EditorStyles.applySaveButtonHover(saveBtn, theme);
        buttonRow.appendChild(saveBtn);

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = EditorStyles.getCancelButtonStyle();
        EditorStyles.applyCancelButtonHover(cancelBtn);
        cancelBtn.onclick = () => this.hideForm();
        buttonRow.appendChild(cancelBtn);

        form.appendChild(buttonRow);

        form.onsubmit = (e) => {
            e.preventDefault();
            this.saveTemplate(form);
        };

        this.formContainer.appendChild(form);
    }

    createField(label, type, name, value, placeholder = '', step = null) {
        const container = document.createElement('div');
        container.style.cssText = EditorStyles.getFieldContainerStyle();

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = EditorStyles.getLabelStyle();
        container.appendChild(labelEl);

        const input = document.createElement('input');
        input.type = type;
        input.name = name;
        input.value = value;
        if (placeholder) input.placeholder = placeholder;
        if (step) input.step = step;
        input.style.cssText = EditorStyles.getInputStyle();
        EditorStyles.applyInputFocus(input);
        container.appendChild(input);

        return container;
    }

    saveTemplate(form) {
        const formData = new FormData(form);
        
        const templateData = {
            name: formData.get('name'),
            spiritType: formData.get('spiritType'),
            spritePath: formData.get('spritePath'),
            scale: parseFloat(formData.get('scale')),
            movementPattern: formData.get('movementPattern'),
            speed: parseFloat(formData.get('speed')),
            wanderRadius: parseFloat(formData.get('wanderRadius')),
            hp: parseInt(formData.get('hp')),
            attack: parseInt(formData.get('attack')),
            isHostile: form.querySelector('#isHostile').checked,
            canCapture: form.querySelector('#canCapture').checked,
            collision: {
                width: parseFloat(formData.get('collisionWidth')),
                height: parseFloat(formData.get('collisionHeight'))
            }
        };

        // Validate
        if (!templateData.name) {
            alert('Name is required!');
            return;
        }

        if (!templateData.spritePath) {
            alert('Sprite Path is required!');
            return;
        }

        try {
            if (this.currentEditingTemplate) {
                // Update existing
                this.game.spiritRegistry.updateTemplate(this.currentEditingTemplate.name, templateData);
                console.log(`[SpiritEditor] Updated template: ${this.currentEditingTemplate.name}`);
            } else {
                // Create new
                this.game.spiritRegistry.addTemplate(templateData.name, templateData);
                console.log(`[SpiritEditor] Created template: ${templateData.name}`);
            }

            this.hideForm();
            this.refresh();
        } catch (error) {
            alert(`Error saving template: ${error.message}`);
        }
    }

    deleteTemplate(name) {
        if (!confirm(`Delete spirit template "${name}"?`)) return;

        try {
            this.game.spiritRegistry.removeTemplate(name);
            console.log(`[SpiritEditor] Deleted template: ${name}`);
            this.refresh();
        } catch (error) {
            alert(`Error deleting template: ${error.message}`);
        }
    }

    hideForm() {
        this.currentEditingTemplate = null;
        this.formContainer.style.display = 'none';
        this.listContainer.style.display = 'block';
    }
}

// Make globally available
window.SpiritEditor = SpiritEditor;
