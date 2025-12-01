/**
 * DoodadEditor.js
 * Full-featured Doodad (Static Object) template editor with Create/Edit/Delete functionality
 * Standardized design matching other template editors
 */

class DoodadEditor {
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
        const theme = EditorStyles.THEMES.doodad;
        
        this.panel = document.createElement('div');
        this.panel.className = 'editor-panel';
        this.panel.style.cssText = EditorStyles.getPanelStyle(theme, this.game);

        // Header
        const header = document.createElement('div');
        header.style.cssText = EditorStyles.getHeaderStyle(theme, this.game);
        header.innerHTML = EditorStyles.createHeader(theme, 'Doodad Template Editor', 'Create, Edit, and Delete Doodad Templates', this.game);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = EditorStyles.getCloseButtonStyle(this.game);
        EditorStyles.applyCloseButtonHover(closeBtn);
        closeBtn.onclick = () => this.hide();
        header.appendChild(closeBtn);

        this.panel.appendChild(header);

        // Scrollable content
        const content = document.createElement('div');
        content.style.cssText = EditorStyles.getContentStyle(this.game);

        // New Template Button
        const newBtn = document.createElement('button');
        newBtn.textContent = '+ Create New Doodad Template';
        newBtn.style.cssText = EditorStyles.getNewButtonStyle(theme, this.game);
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

        const templates = this.game.staticObjectRegistry.getAllTemplates();

        if (templates.length === 0) {
            this.listContainer.innerHTML = `
                <div style="${EditorStyles.getEmptyStateStyle(this.game)}">
                    No doodad templates yet. Click "Create New" to add one!
                </div>
            `;
            return;
        }

        templates.forEach(template => {
            const item = document.createElement('div');
            item.style.cssText = EditorStyles.getListItemStyle(this.game);

            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: bold; color: #95a5a6;">${template.name}</div>
                        <div style="font-size: 11px; color: #7f8c8d; margin-top: 2px;">
                            Sprite: ${template.spritePath} | Scale: ${template.scale || 1.0}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="edit-btn" style="${EditorStyles.getEditButtonStyle(this.game)}">Edit</button>
                        <button class="delete-btn" style="${EditorStyles.getDeleteButtonStyle(this.game)}">Delete</button>
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
        const theme = EditorStyles.THEMES.doodad;
        this.currentEditingTemplate = template;

        // Hide list, show form
        this.listContainer.style.display = 'none';
        this.formContainer.style.display = 'block';

        this.formContainer.innerHTML = '';

        // Form Title
        const title = document.createElement('h4');
        title.textContent = template ? `Edit: ${template.name}` : 'Create New Doodad Template';
        title.style.cssText = `margin: 0 0 15px 0; color: ${theme.accent}; font-size: 16px;`;
        this.formContainer.appendChild(title);

        // Form
        const form = document.createElement('form');
        form.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

        // Name field
        form.appendChild(this.createField('Name', 'text', 'name', template?.name || '', 'oak-tree'));

        // Sprite Path field
        form.appendChild(this.createField('Sprite Path', 'text', 'spritePath', template?.spritePath || '', '/assets/objects/trees/oak-0.png'));

        // Scale field
        form.appendChild(this.createField('Scale', 'number', 'scale', template?.scale || 1.0, null, 0.1));

        // Collision section
        const collisionTitle = document.createElement('div');
        collisionTitle.textContent = 'Collision Settings';
        collisionTitle.style.cssText = EditorStyles.getSectionTitleStyle(this.game);
        form.appendChild(collisionTitle);

        // Has Collision checkbox
        const collisionContainer = document.createElement('div');
        collisionContainer.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';
        const collisionCheckbox = document.createElement('input');
        collisionCheckbox.type = 'checkbox';
        collisionCheckbox.id = 'hasCollision';
        collisionCheckbox.checked = template?.hasCollision !== false;
        const collisionLabel = document.createElement('label');
        collisionLabel.htmlFor = 'hasCollision';
        collisionLabel.textContent = 'Has Collision';
        collisionLabel.style.color = '#ecf0f1';
        collisionContainer.appendChild(collisionCheckbox);
        collisionContainer.appendChild(collisionLabel);
        form.appendChild(collisionContainer);

        // Collision Shape dropdown
        const shapeContainer = document.createElement('div');
        shapeContainer.style.cssText = EditorStyles.getFieldContainerStyle(this.game);
        const shapeLabel = document.createElement('label');
        shapeLabel.textContent = 'Collision Shape';
        shapeLabel.style.cssText = EditorStyles.getLabelStyle(this.game);
        shapeContainer.appendChild(shapeLabel);
        const shapeSelect = document.createElement('select');
        shapeSelect.name = 'collisionShape';
        shapeSelect.style.cssText = EditorStyles.getInputStyle(this.game);
        ['rectangle', 'circle', 'none'].forEach(shape => {
            const option = document.createElement('option');
            option.value = shape;
            option.textContent = shape.charAt(0).toUpperCase() + shape.slice(1);
            if (template?.collisionShape === shape) option.selected = true;
            shapeSelect.appendChild(option);
        });
        shapeContainer.appendChild(shapeSelect);
        form.appendChild(shapeContainer);

        // Collision Box dimensions
        const collisionBoxTitle = document.createElement('div');
        collisionBoxTitle.textContent = 'Collision Box';
        collisionBoxTitle.style.cssText = EditorStyles.getSectionTitleStyle(this.game);
        form.appendChild(collisionBoxTitle);

        const collisionRow = document.createElement('div');
        collisionRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';
        collisionRow.appendChild(this.createField('Width', 'number', 'collisionWidth', template?.collision?.width || 32, null, 1));
        collisionRow.appendChild(this.createField('Height', 'number', 'collisionHeight', template?.collision?.height || 32, null, 1));
        form.appendChild(collisionRow);

        // Offset
        const offsetRow = document.createElement('div');
        offsetRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';
        offsetRow.appendChild(this.createField('Offset X', 'number', 'collisionOffsetX', template?.collision?.offsetX || 0, null, 1));
        offsetRow.appendChild(this.createField('Offset Y', 'number', 'collisionOffsetY', template?.collision?.offsetY || 0, null, 1));
        form.appendChild(offsetRow);

        // Shadow section
        const shadowTitle = document.createElement('div');
        shadowTitle.textContent = 'Shadow Settings';
        shadowTitle.style.cssText = EditorStyles.getSectionTitleStyle(this.game);
        form.appendChild(shadowTitle);

        // Has Shadow checkbox
        const shadowContainer = document.createElement('div');
        shadowContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
        const shadowCheckbox = document.createElement('input');
        shadowCheckbox.type = 'checkbox';
        shadowCheckbox.id = 'hasShadow';
        shadowCheckbox.checked = template?.hasShadow !== false;
        const shadowLabel = document.createElement('label');
        shadowLabel.htmlFor = 'hasShadow';
        shadowLabel.textContent = 'Cast Shadow';
        shadowLabel.style.color = '#ecf0f1';
        shadowContainer.appendChild(shadowCheckbox);
        shadowContainer.appendChild(shadowLabel);
        form.appendChild(shadowContainer);

        // Buttons
        const buttonRow = document.createElement('div');
        buttonRow.style.cssText = 'display: flex; gap: 8px; margin-top: 15px;';

        const saveBtn = document.createElement('button');
        saveBtn.type = 'submit';
        saveBtn.textContent = template ? 'Save Changes' : 'Create Template';
        saveBtn.style.cssText = EditorStyles.getSaveButtonStyle(theme, this.game);
        EditorStyles.applySaveButtonHover(saveBtn, theme);
        buttonRow.appendChild(saveBtn);

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = EditorStyles.getCancelButtonStyle(this.game);
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
        container.style.cssText = EditorStyles.getFieldContainerStyle(this.game);

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = EditorStyles.getLabelStyle(this.game);
        container.appendChild(labelEl);

        const input = document.createElement('input');
        input.type = type;
        input.name = name;
        input.value = value;
        if (placeholder) input.placeholder = placeholder;
        if (step) input.step = step;
        input.style.cssText = EditorStyles.getInputStyle(this.game);
        EditorStyles.applyInputFocus(input);
        container.appendChild(input);

        return container;
    }

    saveTemplate(form) {
        const formData = new FormData(form);
        
        const templateData = {
            name: formData.get('name'),
            spritePath: formData.get('spritePath'),
            scale: parseFloat(formData.get('scale')),
            hasCollision: form.querySelector('#hasCollision').checked,
            collisionShape: formData.get('collisionShape'),
            collision: {
                width: parseFloat(formData.get('collisionWidth')),
                height: parseFloat(formData.get('collisionHeight')),
                offsetX: parseFloat(formData.get('collisionOffsetX')),
                offsetY: parseFloat(formData.get('collisionOffsetY'))
            },
            hasShadow: form.querySelector('#hasShadow').checked
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
                this.game.staticObjectRegistry.updateTemplate(this.currentEditingTemplate.name, templateData);
                console.log(`[DoodadEditor] Updated template: ${this.currentEditingTemplate.name}`);
            } else {
                // Create new
                this.game.staticObjectRegistry.addTemplate(templateData.name, templateData);
                console.log(`[DoodadEditor] Created template: ${templateData.name}`);
            }

            this.hideForm();
            this.refresh();
        } catch (error) {
            alert(`Error saving template: ${error.message}`);
        }
    }

    deleteTemplate(name) {
        if (!confirm(`Delete doodad template "${name}"?`)) return;

        try {
            this.game.staticObjectRegistry.removeTemplate(name);
            console.log(`[DoodadEditor] Deleted template: ${name}`);
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
window.DoodadEditor = DoodadEditor;
