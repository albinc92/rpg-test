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
                            Sprite: ${template.spriteSrc || template.spritePath} | Dialog: ${template.dialogId || 'None'}
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
        form.appendChild(this.createField('Sprite Path', 'text', 'spriteSrc', template?.spriteSrc || template?.spritePath || '', '/assets/npc/main-0.png'));

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
            spriteSrc: formData.get('spriteSrc'),
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

        if (!templateData.spriteSrc) {
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
     * Open script editor modal with tabs for Visual and Code modes
     */
    openScriptEditorModal(obj, onSave) {
        const theme = EditorStyles.THEMES.npc;
        let currentMode = 'visual'; // 'visual' or 'code'
        let visualEditor = null;
        let currentScript = obj.script || '';
        
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
        modal.style.maxWidth = '900px';
        modal.style.maxHeight = '90vh';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';

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
        modal.appendChild(header);

        // Tab bar
        const tabBar = document.createElement('div');
        tabBar.style.cssText = `
            display: flex;
            background: #16213e;
            border-bottom: 1px solid #0f3460;
        `;

        const visualTab = document.createElement('button');
        visualTab.innerHTML = '🧩 Visual Editor';
        visualTab.className = 'script-tab active';
        visualTab.style.cssText = `
            padding: 10px 20px;
            background: #2ecc71;
            color: white;
            border: none;
            cursor: pointer;
            font-size: 13px;
            font-weight: bold;
            transition: background 0.2s;
        `;

        const codeTab = document.createElement('button');
        codeTab.innerHTML = '📝 Code Editor';
        codeTab.className = 'script-tab';
        codeTab.style.cssText = `
            padding: 10px 20px;
            background: #333;
            color: #888;
            border: none;
            cursor: pointer;
            font-size: 13px;
            transition: background 0.2s;
        `;

        tabBar.appendChild(visualTab);
        tabBar.appendChild(codeTab);
        modal.appendChild(tabBar);

        // Content container
        const contentContainer = document.createElement('div');
        contentContainer.style.cssText = EditorStyles.getContentStyle();
        contentContainer.style.display = 'flex';
        contentContainer.style.flexDirection = 'column';
        contentContainer.style.flex = '1';
        contentContainer.style.overflow = 'hidden';

        // Visual editor container
        const visualContainer = document.createElement('div');
        visualContainer.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            min-height: 400px;
        `;

        // Code editor container
        const codeContainer = document.createElement('div');
        codeContainer.style.cssText = `
            flex: 1;
            display: none;
            flex-direction: column;
            gap: 15px;
            min-height: 400px;
        `;

        // Help text for code mode
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
        codeContainer.appendChild(helpSection);

        // Script textarea
        const textarea = document.createElement('textarea');
        textarea.value = currentScript;
        textarea.placeholder = `// Example NPC script
if (getvar("talked_before")) {
    message "Good to see you again!";
} else {
    message "Hello <b>traveler</b>! Welcome.";
    setvar "talked_before", true;
}
end;`;
        textarea.style.cssText = `
            flex: 1;
            width: 100%;
            min-height: 300px;
            padding: 12px;
            border: 1px solid #555;
            border-radius: 6px;
            background: #1a1a2e;
            color: #ecf0f1;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.5;
            resize: none;
            box-sizing: border-box;
        `;
        textarea.spellcheck = false;
        textarea.oninput = () => {
            currentScript = textarea.value;
        };
        codeContainer.appendChild(textarea);

        contentContainer.appendChild(visualContainer);
        contentContainer.appendChild(codeContainer);
        modal.appendChild(contentContainer);

        // Initialize visual editor
        if (window.VisualScriptEditor) {
            visualEditor = new window.VisualScriptEditor();
            visualEditor.createEditor(visualContainer);
            visualEditor.onChange((newScript) => {
                // Only update if in visual mode to avoid overwriting code
                if (currentMode === 'visual') {
                    currentScript = newScript;
                }
            });
        } else {
            visualContainer.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #888;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <div>Visual Script Editor not loaded.</div>
                    <div style="margin-top: 10px; font-size: 12px;">Use the Code Editor tab instead.</div>
                </div>
            `;
        }

        // Tab switching functions (defined before use)
        const switchToVisual = () => {
            currentMode = 'visual';
            visualTab.style.background = '#2ecc71';
            visualTab.style.color = 'white';
            visualTab.style.fontWeight = 'bold';
            codeTab.style.background = '#333';
            codeTab.style.color = '#888';
            codeTab.style.fontWeight = 'normal';
            visualContainer.style.display = 'flex';
            codeContainer.style.display = 'none';
        };

        const switchToCode = () => {
            currentMode = 'code';
            codeTab.style.background = '#2ecc71';
            codeTab.style.color = 'white';
            codeTab.style.fontWeight = 'bold';
            visualTab.style.background = '#333';
            visualTab.style.color = '#888';
            visualTab.style.fontWeight = 'normal';
            visualContainer.style.display = 'none';
            codeContainer.style.display = 'flex';
            
            // Sync visual to code only if visual has blocks
            if (visualEditor && visualEditor.getBlocks().length > 0) {
                const generatedScript = visualEditor.generateScript();
                if (generatedScript) {
                    textarea.value = generatedScript;
                    currentScript = generatedScript;
                }
            }
            
            setTimeout(() => textarea.focus(), 100);
        };
        
        // If there's existing script, start in code mode to preserve it
        if (currentScript) {
            switchToCode();
        }

        visualTab.onclick = () => {
            // When switching to visual, offer to parse existing code
            if (currentMode === 'code' && textarea.value.trim() && visualEditor) {
                if (visualEditor.getBlocks().length === 0) {
                    // Try to parse existing script into visual blocks
                    visualEditor.loadFromScript(textarea.value);
                }
            }
            switchToVisual();
        };
        codeTab.onclick = switchToCode;

        // Button row
        const buttonRow = document.createElement('div');
        buttonRow.style.cssText = `
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            padding: 15px 20px;
            background: #16213e;
            border-top: 1px solid #0f3460;
        `;

        // Clear button
        const clearBtn = document.createElement('button');
        clearBtn.textContent = '🗑️ Clear All';
        clearBtn.style.cssText = EditorStyles.getCancelButtonStyle(this.game);
        clearBtn.onclick = () => {
            if (confirm('Clear the entire script?')) {
                currentScript = '';
                textarea.value = '';
                if (visualEditor) {
                    visualEditor.clear();
                }
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
            // Get script from current mode
            let finalScript = '';
            if (currentMode === 'visual' && visualEditor) {
                finalScript = visualEditor.generateScript();
            } else {
                finalScript = textarea.value;
            }
            
            overlay.remove();
            if (onSave) onSave(finalScript.trim() || null);
        };
        EditorStyles.applySaveButtonHover(saveBtn, theme);
        buttonRow.appendChild(saveBtn);

        modal.appendChild(buttonRow);

        // Assemble
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }
}

// Make globally available
window.NPCEditor = NPCEditor;
