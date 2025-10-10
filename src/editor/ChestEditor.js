/**
 * ChestEditor.js
 * Full-featured Chest template editor with Create/Edit/Delete functionality
 * Includes rarity system and loot configuration
 */

class ChestEditor {
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
        const theme = EditorStyles.THEMES.chest;
        
        this.panel = document.createElement('div');
        this.panel.className = 'editor-panel';
        this.panel.style.cssText = EditorStyles.getPanelStyle(theme);

        // Header
        const header = document.createElement('div');
        header.style.cssText = EditorStyles.getHeaderStyle(theme);
        header.innerHTML = EditorStyles.createHeader(theme, 'Chest Template Editor', 'Create, Edit, and Delete Chest Templates');

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
        newBtn.textContent = '+ Create New Chest Template';
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

        const templates = this.game.chestRegistry.getAllTemplates();

        if (templates.length === 0) {
            this.listContainer.innerHTML = `
                <div style="${EditorStyles.getEmptyStateStyle()}">
                    No chest templates yet. Click "Create New" to add one!
                </div>
            `;
            return;
        }

        templates.forEach(template => {
            const rarityColors = {
                'Common': '#95a5a6',
                'Uncommon': '#3498db',
                'Rare': '#9b59b6',
                'Epic': '#f39c12'
            };

            const item = document.createElement('div');
            item.style.cssText = EditorStyles.getListItemStyle();

            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: bold; color: ${rarityColors[template.rarity] || '#ecf0f1'};">
                            ${template.name} <span style="font-size: 11px; opacity: 0.7;">[${template.rarity}]</span>
                        </div>
                        <div style="font-size: 11px; color: #95a5a6; margin-top: 2px;">
                            Sprite: ${template.spritePath} | Loot: ${template.lootTableId || 'None'}
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
        const theme = EditorStyles.THEMES.chest;
        this.currentEditingTemplate = template;

        // Hide list, show form
        this.listContainer.style.display = 'none';
        this.formContainer.style.display = 'block';

        this.formContainer.innerHTML = '';

        // Form Title
        const title = document.createElement('h4');
        title.textContent = template ? `Edit: ${template.name}` : 'Create New Chest Template';
        title.style.cssText = `margin: 0 0 15px 0; color: ${theme.accent}; font-size: 16px;`;
        this.formContainer.appendChild(title);

        // Form
        const form = document.createElement('form');
        form.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

        // Name field
        form.appendChild(this.createField('Name', 'text', 'name', template?.name || '', 'wooden-chest'));

        // Sprite Path field
        form.appendChild(this.createField('Sprite Path', 'text', 'spritePath', template?.spritePath || '', '/assets/npc/chest-0.png'));

        // Open Sprite Path field
        form.appendChild(this.createField('Open Sprite Path', 'text', 'openSpritePath', template?.openSpritePath || '', '/assets/npc/chest-0-open.png'));

        // Rarity dropdown
        const rarityContainer = document.createElement('div');
        rarityContainer.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
        const rarityLabel = document.createElement('label');
        rarityLabel.textContent = 'Rarity';
        rarityLabel.style.cssText = 'font-size: 12px; color: #bdc3c7; font-weight: 500;';
        rarityContainer.appendChild(rarityLabel);
        const raritySelect = document.createElement('select');
        raritySelect.name = 'rarity';
        raritySelect.style.cssText = `
            padding: 8px;
            background: rgba(52, 73, 94, 0.5);
            border: 1px solid rgba(149, 165, 166, 0.3);
            border-radius: 4px;
            color: #ecf0f1;
            font-size: 13px;
        `;
        ['Common', 'Uncommon', 'Rare', 'Epic'].forEach(rarity => {
            const option = document.createElement('option');
            option.value = rarity;
            option.textContent = rarity;
            if (template?.rarity === rarity) option.selected = true;
            raritySelect.appendChild(option);
        });
        rarityContainer.appendChild(raritySelect);
        form.appendChild(rarityContainer);

        // Loot Table ID field
        form.appendChild(this.createField('Loot Table ID', 'text', 'lootTableId', template?.lootTableId || '', 'basic_loot'));

        // Requires Key checkbox
        const keyContainer = document.createElement('div');
        keyContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
        const keyCheckbox = document.createElement('input');
        keyCheckbox.type = 'checkbox';
        keyCheckbox.id = 'requiresKey';
        keyCheckbox.checked = template?.requiresKey || false;
        const keyLabel = document.createElement('label');
        keyLabel.htmlFor = 'requiresKey';
        keyLabel.textContent = 'Requires Key';
        keyLabel.style.color = '#ecf0f1';
        keyContainer.appendChild(keyCheckbox);
        keyContainer.appendChild(keyLabel);
        form.appendChild(keyContainer);

        // Collision dimensions
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
            spritePath: formData.get('spritePath'),
            openSpritePath: formData.get('openSpritePath'),
            rarity: formData.get('rarity'),
            lootTableId: formData.get('lootTableId') || null,
            requiresKey: form.querySelector('#requiresKey').checked,
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
                this.game.chestRegistry.updateTemplate(this.currentEditingTemplate.name, templateData);
                console.log(`[ChestEditor] Updated template: ${this.currentEditingTemplate.name}`);
            } else {
                // Create new
                this.game.chestRegistry.addTemplate(templateData.name, templateData);
                console.log(`[ChestEditor] Created template: ${templateData.name}`);
            }

            this.hideForm();
            this.refresh();
        } catch (error) {
            alert(`Error saving template: ${error.message}`);
        }
    }

    deleteTemplate(name) {
        if (!confirm(`Delete chest template "${name}"?`)) return;

        try {
            this.game.chestRegistry.removeTemplate(name);
            console.log(`[ChestEditor] Deleted template: ${name}`);
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
window.ChestEditor = ChestEditor;
