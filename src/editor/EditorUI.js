/**
 * EditorUI - Main toolbar and UI for the editor
 */
class EditorUI {
    constructor(editor) {
        this.editor = editor;
        this.container = null;
        this.createUI();
    }

    /**
     * Create UI elements
     */
    createUI() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'editor-ui';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            font-family: Arial, sans-serif;
            z-index: 1000;
            display: none;
            border-bottom: 2px solid #444;
        `;

        // Create toolbar
        const toolbar = document.createElement('div');
        toolbar.style.cssText = `
            display: flex;
            gap: 10px;
            align-items: center;
        `;

        // Title
        const title = document.createElement('span');
        title.textContent = '🎨 Map Editor';
        title.style.cssText = `
            font-weight: bold;
            font-size: 18px;
            margin-right: 20px;
        `;
        toolbar.appendChild(title);

        // Tool buttons
        const tools = [
            { id: 'select', icon: '👆', label: 'Select (V)', key: 'v' },
            { id: 'place', icon: '➕', label: 'Place (B)', key: 'b' },
            { id: 'delete', icon: '🗑️', label: 'Delete (D)', key: 'd' },
            { id: 'move', icon: '✋', label: 'Move (M)', key: 'm' }
        ];

        tools.forEach(tool => {
            const btn = this.createButton(tool.icon + ' ' + tool.label, () => {
                this.editor.setTool(tool.id);
            });
            btn.dataset.tool = tool.id;
            toolbar.appendChild(btn);
        });

        // Separator
        const separator1 = document.createElement('div');
        separator1.style.cssText = `
            width: 2px;
            height: 30px;
            background: #666;
            margin: 0 10px;
        `;
        toolbar.appendChild(separator1);

        // Action buttons
        const saveBtn = this.createButton('💾 Save (Ctrl+S)', () => {
            this.editor.save();
        });
        toolbar.appendChild(saveBtn);

        const undoBtn = this.createButton('↶ Undo (Ctrl+Z)', () => {
            this.editor.undo();
        });
        toolbar.appendChild(undoBtn);

        const redoBtn = this.createButton('↷ Redo (Ctrl+Y)', () => {
            this.editor.redo();
        });
        toolbar.appendChild(redoBtn);

        // Separator
        const separator2 = document.createElement('div');
        separator2.style.cssText = `
            width: 2px;
            height: 30px;
            background: #666;
            margin: 0 10px;
        `;
        toolbar.appendChild(separator2);

        // Grid toggle
        const gridBtn = this.createButton('📏 Grid (G)', () => {
            this.editor.gridEnabled = !this.editor.gridEnabled;
            gridBtn.style.background = this.editor.gridEnabled ? '#4a9eff' : '#333';
        });
        gridBtn.style.background = this.editor.gridEnabled ? '#4a9eff' : '#333';
        toolbar.appendChild(gridBtn);

        // Close button (right side)
        const closeBtn = this.createButton('✖ Close (F2)', () => {
            this.editor.toggle();
        });
        closeBtn.style.marginLeft = 'auto';
        toolbar.appendChild(closeBtn);

        this.container.appendChild(toolbar);
        document.body.appendChild(this.container);
    }

    /**
     * Create a button
     */
    createButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            background: #333;
            color: white;
            border: 1px solid #555;
            padding: 8px 12px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 14px;
            transition: background 0.2s;
        `;
        btn.onmouseover = () => btn.style.background = '#555';
        btn.onmouseout = () => {
            const isActive = btn.dataset.tool && btn.dataset.tool === this.editor.selectedTool;
            btn.style.background = isActive ? '#4a9eff' : '#333';
        };
        btn.onclick = onClick;
        return btn;
    }

    /**
     * Update tool button states
     */
    updateToolButtons() {
        const buttons = this.container.querySelectorAll('button[data-tool]');
        buttons.forEach(btn => {
            const isActive = btn.dataset.tool === this.editor.selectedTool;
            btn.style.background = isActive ? '#4a9eff' : '#333';
        });
    }

    /**
     * Show UI
     */
    show() {
        this.container.style.display = 'block';
    }

    /**
     * Hide UI
     */
    hide() {
        this.container.style.display = 'none';
    }
}

// Export
window.EditorUI = EditorUI;
