/**
 * NPCEditor.js
 * Full-featured NPC template editor with Create/Edit/Delete functionality
 * Similar to LightEditor but for NPC management
 */

class NPCEditor {
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
        const theme = EditorStyles.THEMES.npc;
        
        this.panel = document.createElement('div');
        this.panel.className = 'editor-panel';
        this.panel.style.cssText = EditorStyles.getPanelStyle(theme, this.game);

        // Header
        const header = document.createElement('div');
        header.style.cssText = EditorStyles.getHeaderStyle(theme, this.game);
        header.innerHTML = EditorStyles.createHeader(theme, 'NPC Template Editor', 'Create, Edit, and Delete NPC Templates', this.game);

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
        newBtn.textContent = '+ Create New NPC Template';
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

        const templates = this.game.npcRegistry.getAllTemplates();

        if (templates.length === 0) {
            this.listContainer.innerHTML = `
                <div style="${EditorStyles.getEmptyStateStyle(this.game)}">
                    No NPC templates yet. Click "Create New" to add one!
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
                        <div style="font-weight: bold; color: #2ecc71;">${template.name}</div>
                        <div style="font-size: 11px; color: #95a5a6; margin-top: 2px;">
                            Sprite: ${template.spritePath} | Dialog: ${template.dialogId || 'None'}
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
        const theme = EditorStyles.THEMES.npc;
        this.currentEditingTemplate = template;

        // Hide list, show form
        this.listContainer.style.display = 'none';
        this.formContainer.style.display = 'block';

        this.formContainer.innerHTML = '';

        // Form Title
        const title = document.createElement('h4');
        title.textContent = template ? `Edit: ${template.name}` : 'Create New NPC Template';
        title.style.cssText = `margin: 0 0 15px 0; color: ${theme.accent}; font-size: 16px;`;
        this.formContainer.appendChild(title);

        // Form
        const form = document.createElement('form');
        form.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

        // Name field
        form.appendChild(this.createField('Name', 'text', 'name', template?.name || '', 'npc-merchant-0'));

        // Sprite Path field
        form.appendChild(this.createField('Sprite Path', 'text', 'spritePath', template?.spritePath || '', '/assets/npc/main-0.png'));

        // Dialog ID field
        form.appendChild(this.createField('Dialog ID', 'text', 'dialogId', template?.dialogId || '', 'merchant_greeting'));

        // Is Interactive checkbox
        const interactiveContainer = document.createElement('div');
        interactiveContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
        const interactiveCheckbox = document.createElement('input');
        interactiveCheckbox.type = 'checkbox';
        interactiveCheckbox.id = 'isInteractive';
        interactiveCheckbox.checked = template?.isInteractive !== false;
        const interactiveLabel = document.createElement('label');
        interactiveLabel.htmlFor = 'isInteractive';
        interactiveLabel.textContent = 'Is Interactive';
        interactiveLabel.style.color = '#ecf0f1';
        interactiveContainer.appendChild(interactiveCheckbox);
        interactiveContainer.appendChild(interactiveLabel);
        form.appendChild(interactiveContainer);

        // Collision dimensions
        const collisionTitle = document.createElement('div');
        collisionTitle.textContent = 'Collision Box';
        collisionTitle.style.cssText = EditorStyles.getSectionTitleStyle(this.game);
        form.appendChild(collisionTitle);

        const collisionRow = document.createElement('div');
        collisionRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';
        collisionRow.appendChild(this.createField('Width', 'number', 'collisionWidth', template?.collision?.width || 32, null, 1));
        collisionRow.appendChild(this.createField('Height', 'number', 'collisionHeight', template?.collision?.height || 32, null, 1));
        form.appendChild(collisionRow);

        // Script Section
        const scriptTitle = document.createElement('div');
        scriptTitle.textContent = 'NPC Script (Dialogue)';
        scriptTitle.style.cssText = EditorStyles.getSectionTitleStyle(this.game);
        form.appendChild(scriptTitle);
        
        // Script container with button
        const scriptContainer = document.createElement('div');
        scriptContainer.style.cssText = EditorStyles.getFieldContainerStyle(this.game);
        
        // Hidden input to store script value
        const scriptInput = document.createElement('input');
        scriptInput.type = 'hidden';
        scriptInput.name = 'script';
        scriptInput.id = 'npcScript';
        scriptInput.value = template?.script || '';
        scriptContainer.appendChild(scriptInput);
        
        // Edit script button
        const editScriptBtn = document.createElement('button');
        editScriptBtn.type = 'button';
        editScriptBtn.textContent = '📜 Edit Script';
        editScriptBtn.style.cssText = EditorStyles.getNewButtonStyle(theme);
        EditorStyles.applyNewButtonHover(editScriptBtn, theme);
        
        // Script status display
        const scriptStatus = document.createElement('div');
        scriptStatus.style.cssText = 'font-size: 11px; color: #888; margin-top: 6px;';
        scriptStatus.textContent = scriptInput.value ? `Script: ${scriptInput.value.length} chars` : 'No script assigned';
        
        editScriptBtn.onclick = () => {
            // Create a temporary object to pass to the modal
            const tempObj = { 
                script: scriptInput.value,
                name: template?.name || 'New NPC'
            };
            this.openScriptEditorModal(tempObj, (newScript) => {
                scriptInput.value = newScript || '';
                scriptStatus.textContent = newScript ? `Script: ${newScript.length} chars` : 'No script assigned';
            });
        };
        
        scriptContainer.appendChild(editScriptBtn);
        scriptContainer.appendChild(scriptStatus);
        form.appendChild(scriptContainer);

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
        
        // Get script from textarea
        const scriptTextarea = form.querySelector('#npcScript');
        const script = scriptTextarea?.value?.trim() || null;
        
        const templateData = {
            name: formData.get('name'),
            spritePath: formData.get('spritePath'),
            dialogId: formData.get('dialogId') || null,
            isInteractive: form.querySelector('#isInteractive').checked,
            script: script,
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
                this.game.npcRegistry.updateTemplate(this.currentEditingTemplate.name, templateData);
                console.log(`[NPCEditor] Updated template: ${this.currentEditingTemplate.name}`);
            } else {
                // Create new
                this.game.npcRegistry.addTemplate(templateData.name, templateData);
                console.log(`[NPCEditor] Created template: ${templateData.name}`);
            }

            this.hideForm();
            this.refresh();
        } catch (error) {
            alert(`Error saving template: ${error.message}`);
        }
    }

    deleteTemplate(name) {
        if (!confirm(`Delete NPC template "${name}"?`)) return;

        try {
            this.game.npcRegistry.removeTemplate(name);
            console.log(`[NPCEditor] Deleted template: ${name}`);
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

    /**
     * Open script editor modal (reuses same pattern as PropertyPanel)
     */
    openScriptEditorModal(obj, onSave) {
        const theme = EditorStyles.THEMES.npc;
        
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
        `;

        // Create modal container
        const modal = document.createElement('div');
        modal.style.cssText = EditorStyles.getPanelStyle(theme);
        modal.style.position = 'relative';
        modal.style.top = 'auto';
        modal.style.right = 'auto';
        modal.style.width = '90%';
        modal.style.maxWidth = '800px';
        modal.style.maxHeight = '85vh';

        // Header
        const header = document.createElement('div');
        header.style.cssText = EditorStyles.getHeaderStyle(theme);
        header.innerHTML = EditorStyles.createHeader(theme, 'NPC Script Editor', `Template: ${obj.name || 'Unnamed NPC'}`);

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = EditorStyles.getCloseButtonStyle();
        closeBtn.onclick = () => overlay.remove();
        EditorStyles.applyCloseButtonHover(closeBtn);

        header.appendChild(closeBtn);

        // Content container
        const contentContainer = document.createElement('div');
        contentContainer.style.cssText = EditorStyles.getContentStyle();
        contentContainer.style.display = 'flex';
        contentContainer.style.flexDirection = 'column';
        contentContainer.style.gap = '15px';

        // Help text
        const helpSection = document.createElement('div');
        helpSection.style.cssText = `
            padding: 12px;
            background: rgba(74, 158, 255, 0.1);
            border: 1px solid rgba(74, 158, 255, 0.3);
            border-radius: 6px;
            font-size: 12px;
            line-height: 1.5;
            color: #a0c8ff;
        `;
        helpSection.innerHTML = `
            <b>Commands:</b> message "text"; | additem "id", qty; | delitem "id", qty; | setvar "name", value; | end;<br>
            <b>Conditions:</b> if (hasitem("id", qty)) { } else { } | getvar("name")<br>
            <b>Choices:</b> choice "Option 1", "Option 2"; | if (choice == 0) { }<br>
            <b>HTML:</b> &lt;b&gt;bold&lt;/b&gt; | &lt;i&gt;italic&lt;/i&gt; | &lt;color=#hex&gt;text&lt;/color&gt;
        `;
        contentContainer.appendChild(helpSection);

        // Script textarea
        const textarea = document.createElement('textarea');
        textarea.value = obj.script || '';
        textarea.placeholder = `// Example NPC script
if (getvar("talked_before")) {
    message "Good to see you again!";
} else {
    message "Hello <b>traveler</b>! Welcome.";
    setvar "talked_before", true;
}
end;`;
        textarea.style.cssText = `
            width: 100%;
            height: 350px;
            padding: 12px;
            border: 1px solid #555;
            border-radius: 6px;
            background: #1a1a2e;
            color: #ecf0f1;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.5;
            resize: vertical;
            box-sizing: border-box;
        `;
        textarea.spellcheck = false;
        contentContainer.appendChild(textarea);

        // Button row
        const buttonRow = document.createElement('div');
        buttonRow.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;';

        // Clear button
        const clearBtn = document.createElement('button');
        clearBtn.textContent = '🗑️ Clear';
        clearBtn.style.cssText = EditorStyles.getCancelButtonStyle(this.game);
        clearBtn.onclick = () => {
            if (confirm('Clear the entire script?')) {
                textarea.value = '';
            }
        };
        EditorStyles.applyCancelButtonHover(clearBtn);
        buttonRow.appendChild(clearBtn);

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = EditorStyles.getCancelButtonStyle(this.game);
        cancelBtn.onclick = () => overlay.remove();
        EditorStyles.applyCancelButtonHover(cancelBtn);
        buttonRow.appendChild(cancelBtn);

        // Save button
        const saveBtn = document.createElement('button');
        saveBtn.textContent = '💾 Save Script';
        saveBtn.style.cssText = EditorStyles.getSaveButtonStyle(theme, this.game);
        saveBtn.onclick = () => {
            const scriptText = textarea.value.trim();
            overlay.remove();
            if (onSave) onSave(scriptText || null);
        };
        EditorStyles.applySaveButtonHover(saveBtn, theme);
        buttonRow.appendChild(saveBtn);

        contentContainer.appendChild(buttonRow);

        // Assemble modal
        modal.appendChild(header);
        modal.appendChild(contentContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Focus textarea
        setTimeout(() => textarea.focus(), 100);
    }
}

// Make globally available
window.NPCEditor = NPCEditor;
