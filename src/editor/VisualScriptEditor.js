/**
 * VisualScriptEditor - Block-based visual scripting for NPC dialogues
 * Allows non-programmers to create scripts using drag-and-drop blocks
 */
class VisualScriptEditor {
    constructor() {
        this.blocks = [];
        this.selectedBlock = null;
        this.draggedBlock = null;
        this.draggedIndex = -1;
        this.dropTargetIndex = -1;
        this.container = null;
        this.onChangeCallback = null;
        
        // Block type definitions
        this.blockTypes = {
            message: {
                name: 'Message',
                icon: '💬',
                color: '#4a90d9',
                fields: [
                    { name: 'text', type: 'textarea', label: 'Text', default: 'Hello!' }
                ],
                toScript: (data) => `message "${this.escapeString(data.text)}";`
            },
            choice: {
                name: 'Choice',
                icon: '🔀',
                color: '#9b59b6',
                fields: [
                    { name: 'options', type: 'choiceList', label: 'Options', default: ['Yes', 'No'] }
                ],
                toScript: (data) => `choice ${data.options.map(o => `"${this.escapeString(o)}"`).join(', ')};`
            },
            ifCondition: {
                name: 'If Condition',
                icon: '❓',
                color: '#e67e22',
                fields: [
                    { name: 'conditionType', type: 'select', label: 'Check', options: ['hasitem', 'getvar', 'choice'], default: 'getvar' },
                    { name: 'param1', type: 'text', label: 'Name/Item', default: 'variable_name' },
                    { name: 'param2', type: 'text', label: 'Value/Qty', default: '', placeholder: '(optional)' },
                    { name: 'operator', type: 'select', label: 'Operator', options: ['==', '!=', '>', '<', '>=', '<='], default: '==' },
                    { name: 'compareValue', type: 'text', label: 'Compare To', default: 'true' }
                ],
                hasChildren: true,
                hasElse: true,
                toScript: (data, children, elseChildren) => {
                    let condition;
                    if (data.conditionType === 'choice') {
                        condition = `choice ${data.operator} ${data.compareValue}`;
                    } else if (data.param2) {
                        condition = `${data.conditionType}("${data.param1}", ${data.param2}) ${data.operator} ${data.compareValue}`;
                    } else {
                        condition = `${data.conditionType}("${data.param1}") ${data.operator} ${data.compareValue}`;
                    }
                    
                    let script = `if (${condition}) {\n`;
                    script += children.map(c => '    ' + c).join('\n') + '\n';
                    script += '}';
                    
                    if (elseChildren && elseChildren.length > 0) {
                        script += ' else {\n';
                        script += elseChildren.map(c => '    ' + c).join('\n') + '\n';
                        script += '}';
                    }
                    
                    return script;
                }
            },
            setVariable: {
                name: 'Set Variable',
                icon: '🎯',
                color: '#27ae60',
                fields: [
                    { name: 'varName', type: 'text', label: 'Variable Name', default: 'my_variable' },
                    { name: 'value', type: 'text', label: 'Value', default: 'true' }
                ],
                toScript: (data) => {
                    const val = data.value === 'true' || data.value === 'false' ? data.value : 
                                isNaN(data.value) ? `"${this.escapeString(data.value)}"` : data.value;
                    return `setvar "${data.varName}", ${val};`;
                }
            },
            addItem: {
                name: 'Give Item',
                icon: '📦',
                color: '#2ecc71',
                fields: [
                    { name: 'itemId', type: 'text', label: 'Item ID', default: 'gold' },
                    { name: 'quantity', type: 'number', label: 'Quantity', default: 1 }
                ],
                toScript: (data) => `additem "${data.itemId}", ${data.quantity};`
            },
            removeItem: {
                name: 'Take Item',
                icon: '🗑️',
                color: '#e74c3c',
                fields: [
                    { name: 'itemId', type: 'text', label: 'Item ID', default: 'gold' },
                    { name: 'quantity', type: 'number', label: 'Quantity', default: 1 }
                ],
                toScript: (data) => `delitem "${data.itemId}", ${data.quantity};`
            },
            playSound: {
                name: 'Play Sound',
                icon: '🔊',
                color: '#3498db',
                fields: [
                    { name: 'soundFile', type: 'text', label: 'Sound File', default: 'effect.mp3' }
                ],
                toScript: (data) => `playsound "${data.soundFile}";`
            },
            wait: {
                name: 'Wait',
                icon: '⏱️',
                color: '#95a5a6',
                fields: [
                    { name: 'duration', type: 'number', label: 'Duration (ms)', default: 1000 }
                ],
                toScript: (data) => `wait ${data.duration};`
            },
            end: {
                name: 'End Script',
                icon: '🏁',
                color: '#34495e',
                fields: [],
                toScript: () => 'end;'
            },
            comment: {
                name: 'Comment',
                icon: '📝',
                color: '#7f8c8d',
                fields: [
                    { name: 'text', type: 'text', label: 'Comment', default: 'Description...' }
                ],
                toScript: (data) => `// ${data.text}`
            },
            label: {
                name: 'Label',
                icon: '🏷️',
                color: '#8e44ad',
                fields: [
                    { name: 'name', type: 'text', label: 'Label Name', default: 'my_label' }
                ],
                toScript: (data) => `:${data.name}`
            },
            goto: {
                name: 'Go To',
                icon: '↪️',
                color: '#9b59b6',
                fields: [
                    { name: 'label', type: 'text', label: 'Jump to Label', default: 'my_label' }
                ],
                toScript: (data) => `goto ${data.label};`
            }
        };
    }
    
    /**
     * Escape special characters in strings
     */
    escapeString(str) {
        return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    }
    
    /**
     * Create a new block
     */
    createBlock(type, data = {}) {
        const blockDef = this.blockTypes[type];
        if (!blockDef) return null;
        
        const block = {
            id: 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            type: type,
            data: {},
            children: [],      // For if blocks
            elseChildren: [],  // For else blocks
            collapsed: false
        };
        
        // Initialize with defaults
        blockDef.fields.forEach(field => {
            block.data[field.name] = data[field.name] !== undefined ? data[field.name] : field.default;
        });
        
        return block;
    }
    
    /**
     * Create the visual editor UI
     */
    createEditor(targetElement) {
        this.container = document.createElement('div');
        this.container.className = 'visual-script-editor';
        this.container.innerHTML = `
            <div class="vse-toolbar">
                <div class="vse-toolbar-label">Add Block:</div>
                <div class="vse-block-palette"></div>
            </div>
            <div class="vse-canvas">
                <div class="vse-blocks-container"></div>
                <div class="vse-empty-hint">
                    <span>👆 Click a block type above to add it</span>
                </div>
            </div>
            <div class="vse-footer">
                <button class="vse-btn vse-btn-secondary vse-view-code">📝 View Code</button>
                <button class="vse-btn vse-btn-secondary vse-import-code">📥 Import Code</button>
            </div>
        `;
        
        this.applyStyles();
        this.renderPalette();
        this.setupEventListeners();
        
        targetElement.appendChild(this.container);
        this.render();
        
        return this.container;
    }
    
    /**
     * Apply CSS styles
     */
    applyStyles() {
        if (document.getElementById('vse-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'vse-styles';
        style.textContent = `
            .visual-script-editor {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: #1a1a2e;
                border-radius: 8px;
                overflow: hidden;
                font-family: Arial, sans-serif;
            }
            
            .vse-toolbar {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px;
                background: #16213e;
                border-bottom: 1px solid #0f3460;
                flex-wrap: wrap;
            }
            
            .vse-toolbar-label {
                color: #888;
                font-size: 12px;
                white-space: nowrap;
            }
            
            .vse-block-palette {
                display: flex;
                gap: 5px;
                flex-wrap: wrap;
            }
            
            .vse-palette-btn {
                padding: 5px 10px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 4px;
                transition: transform 0.1s, box-shadow 0.1s;
            }
            
            .vse-palette-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            }
            
            .vse-canvas {
                flex: 1;
                overflow-y: auto;
                padding: 15px;
                position: relative;
            }
            
            .vse-blocks-container {
                display: flex;
                flex-direction: column;
                gap: 8px;
                min-height: 100px;
            }
            
            .vse-empty-hint {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: #555;
                font-size: 14px;
                text-align: center;
                pointer-events: none;
            }
            
            .vse-blocks-container:not(:empty) + .vse-empty-hint {
                display: none;
            }
            
            .vse-block {
                background: #2a2a4a;
                border-radius: 6px;
                border-left: 4px solid #4a90d9;
                overflow: hidden;
                transition: transform 0.15s, box-shadow 0.15s;
            }
            
            .vse-block.dragging {
                opacity: 0.5;
                transform: scale(0.98);
            }
            
            .vse-block.drag-over {
                box-shadow: 0 -3px 0 #fff;
            }
            
            .vse-block.drag-over-after {
                box-shadow: 0 3px 0 #fff;
            }
            
            .vse-block-header {
                display: flex;
                align-items: center;
                padding: 8px 12px;
                background: rgba(0,0,0,0.2);
                cursor: grab;
                user-select: none;
            }
            
            .vse-block-header:active {
                cursor: grabbing;
            }
            
            .vse-block-icon {
                font-size: 16px;
                margin-right: 8px;
            }
            
            .vse-block-title {
                flex: 1;
                font-weight: bold;
                font-size: 13px;
                color: #fff;
            }
            
            .vse-block-collapse {
                background: none;
                border: none;
                color: #888;
                cursor: pointer;
                padding: 2px 6px;
                font-size: 12px;
            }
            
            .vse-block-collapse:hover {
                color: #fff;
            }
            
            .vse-block-delete {
                background: none;
                border: none;
                color: #e74c3c;
                cursor: pointer;
                padding: 2px 6px;
                font-size: 14px;
                opacity: 0.7;
            }
            
            .vse-block-delete:hover {
                opacity: 1;
            }
            
            .vse-block-body {
                padding: 10px 12px;
            }
            
            .vse-block.collapsed .vse-block-body {
                display: none;
            }
            
            .vse-field {
                margin-bottom: 8px;
            }
            
            .vse-field:last-child {
                margin-bottom: 0;
            }
            
            .vse-field-label {
                display: block;
                font-size: 11px;
                color: #888;
                margin-bottom: 3px;
            }
            
            .vse-field-input {
                width: 100%;
                padding: 6px 8px;
                border: 1px solid #444;
                border-radius: 4px;
                background: #1a1a2e;
                color: #fff;
                font-size: 12px;
                box-sizing: border-box;
            }
            
            .vse-field-input:focus {
                outline: none;
                border-color: #4a90d9;
            }
            
            .vse-field-textarea {
                min-height: 60px;
                resize: vertical;
            }
            
            .vse-field-select {
                appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L2 4h8z'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 8px center;
                padding-right: 28px;
            }
            
            .vse-children-container {
                margin: 8px 0 8px 20px;
                padding: 8px;
                background: rgba(0,0,0,0.15);
                border-radius: 4px;
                border-left: 2px dashed #555;
            }
            
            .vse-children-label {
                font-size: 11px;
                color: #666;
                margin-bottom: 6px;
            }
            
            .vse-children-blocks {
                display: flex;
                flex-direction: column;
                gap: 6px;
                min-height: 30px;
            }
            
            .vse-children-empty {
                color: #555;
                font-size: 11px;
                font-style: italic;
                padding: 8px;
                text-align: center;
            }
            
            .vse-add-child-btn {
                margin-top: 6px;
                padding: 4px 8px;
                border: 1px dashed #555;
                border-radius: 4px;
                background: transparent;
                color: #888;
                font-size: 11px;
                cursor: pointer;
                width: 100%;
            }
            
            .vse-add-child-btn:hover {
                border-color: #888;
                color: #fff;
            }
            
            .vse-choice-list {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .vse-choice-item {
                display: flex;
                gap: 4px;
            }
            
            .vse-choice-item input {
                flex: 1;
            }
            
            .vse-choice-remove {
                padding: 4px 8px;
                background: #e74c3c;
                border: none;
                border-radius: 4px;
                color: white;
                cursor: pointer;
                font-size: 10px;
            }
            
            .vse-choice-add {
                padding: 4px 8px;
                background: #27ae60;
                border: none;
                border-radius: 4px;
                color: white;
                cursor: pointer;
                font-size: 11px;
                margin-top: 4px;
            }
            
            .vse-footer {
                display: flex;
                gap: 8px;
                padding: 10px;
                background: #16213e;
                border-top: 1px solid #0f3460;
            }
            
            .vse-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: background 0.2s;
            }
            
            .vse-btn-primary {
                background: #4a90d9;
                color: white;
            }
            
            .vse-btn-primary:hover {
                background: #357abd;
            }
            
            .vse-btn-secondary {
                background: #444;
                color: white;
            }
            
            .vse-btn-secondary:hover {
                background: #555;
            }
            
            .vse-drop-indicator {
                height: 3px;
                background: #4a90d9;
                border-radius: 2px;
                margin: 4px 0;
            }
            
            /* Code preview modal */
            .vse-code-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            .vse-code-modal-content {
                background: #1a1a2e;
                border-radius: 8px;
                padding: 20px;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
            }
            
            .vse-code-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            
            .vse-code-modal-title {
                color: #fff;
                font-size: 16px;
                font-weight: bold;
            }
            
            .vse-code-modal-close {
                background: none;
                border: none;
                color: #888;
                font-size: 20px;
                cursor: pointer;
            }
            
            .vse-code-modal-close:hover {
                color: #fff;
            }
            
            .vse-code-textarea {
                flex: 1;
                min-height: 300px;
                padding: 12px;
                background: #0a0a1a;
                border: 1px solid #333;
                border-radius: 4px;
                color: #0f0;
                font-family: monospace;
                font-size: 12px;
                resize: none;
            }
            
            .vse-code-modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                margin-top: 15px;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Render the block palette
     */
    renderPalette() {
        const palette = this.container.querySelector('.vse-block-palette');
        palette.innerHTML = '';
        
        Object.entries(this.blockTypes).forEach(([type, def]) => {
            const btn = document.createElement('button');
            btn.className = 'vse-palette-btn';
            btn.style.background = def.color;
            btn.style.color = this.getContrastColor(def.color);
            btn.innerHTML = `<span>${def.icon}</span> ${def.name}`;
            btn.onclick = () => this.addBlock(type);
            palette.appendChild(btn);
        });
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // View code button
        this.container.querySelector('.vse-view-code').onclick = () => this.showCodeModal(false);
        
        // Import code button
        this.container.querySelector('.vse-import-code').onclick = () => this.showCodeModal(true);
    }
    
    /**
     * Add a new block
     */
    addBlock(type, parentBlock = null, isElse = false) {
        const block = this.createBlock(type);
        if (!block) return;
        
        if (parentBlock) {
            if (isElse) {
                parentBlock.elseChildren.push(block);
            } else {
                parentBlock.children.push(block);
            }
        } else {
            this.blocks.push(block);
        }
        
        this.render();
        this.triggerChange();
    }
    
    /**
     * Delete a block
     */
    deleteBlock(blockId, blockList = this.blocks) {
        const index = blockList.findIndex(b => b.id === blockId);
        if (index !== -1) {
            blockList.splice(index, 1);
            this.render();
            this.triggerChange();
            return true;
        }
        
        // Search in children
        for (const block of blockList) {
            if (this.deleteBlock(blockId, block.children)) return true;
            if (this.deleteBlock(blockId, block.elseChildren)) return true;
        }
        
        return false;
    }
    
    /**
     * Move a block within a list
     */
    moveBlock(blockList, fromIndex, toIndex) {
        if (fromIndex === toIndex) return;
        
        const [block] = blockList.splice(fromIndex, 1);
        blockList.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, block);
        
        this.render();
        this.triggerChange();
    }
    
    /**
     * Render all blocks
     */
    render() {
        const container = this.container.querySelector('.vse-blocks-container');
        container.innerHTML = '';
        
        this.blocks.forEach((block, index) => {
            container.appendChild(this.renderBlock(block, index, this.blocks));
        });
    }
    
    /**
     * Render a single block
     */
    renderBlock(block, index, blockList) {
        const def = this.blockTypes[block.type];
        if (!def) return document.createTextNode('');
        
        const el = document.createElement('div');
        el.className = 'vse-block' + (block.collapsed ? ' collapsed' : '');
        el.style.borderLeftColor = def.color;
        el.dataset.blockId = block.id;
        
        // Header (drag handle)
        const header = document.createElement('div');
        header.className = 'vse-block-header';
        header.draggable = true; // Make only the header draggable, not the whole block
        header.innerHTML = `
            <span class="vse-block-icon">${def.icon}</span>
            <span class="vse-block-title">${def.name}</span>
            <button class="vse-block-collapse">${block.collapsed ? '▶' : '▼'}</button>
            <button class="vse-block-delete">✕</button>
        `;
        
        // Drag events - only on header
        header.ondragstart = (e) => {
            this.draggedBlock = block;
            this.draggedIndex = index;
            this.draggedList = blockList;
            el.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        };
        
        header.ondragend = () => {
            el.classList.remove('dragging');
            this.draggedBlock = null;
            this.draggedIndex = -1;
            this.draggedList = null;
            
            // Clear all drag-over classes
            this.container.querySelectorAll('.drag-over, .drag-over-after').forEach(e => {
                e.classList.remove('drag-over', 'drag-over-after');
            });
        };
        
        el.ondragover = (e) => {
            e.preventDefault();
            if (this.draggedBlock && this.draggedList === blockList && this.draggedBlock.id !== block.id) {
                const rect = el.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                
                el.classList.remove('drag-over', 'drag-over-after');
                if (e.clientY < midY) {
                    el.classList.add('drag-over');
                } else {
                    el.classList.add('drag-over-after');
                }
            }
        };
        
        el.ondragleave = () => {
            el.classList.remove('drag-over', 'drag-over-after');
        };
        
        el.ondrop = (e) => {
            e.preventDefault();
            if (this.draggedBlock && this.draggedList === blockList && this.draggedBlock.id !== block.id) {
                const rect = el.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const targetIndex = e.clientY < midY ? index : index + 1;
                
                this.moveBlock(blockList, this.draggedIndex, targetIndex);
            }
            el.classList.remove('drag-over', 'drag-over-after');
        };
        
        // Collapse button
        header.querySelector('.vse-block-collapse').onclick = (e) => {
            e.stopPropagation();
            block.collapsed = !block.collapsed;
            this.render();
        };
        
        // Delete button
        header.querySelector('.vse-block-delete').onclick = (e) => {
            e.stopPropagation();
            this.deleteBlock(block.id);
        };
        
        el.appendChild(header);
        
        // Body
        const body = document.createElement('div');
        body.className = 'vse-block-body';
        
        // Fields
        def.fields.forEach(field => {
            body.appendChild(this.renderField(field, block));
        });
        
        // Children (for if blocks)
        if (def.hasChildren) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'vse-children-container';
            childrenContainer.innerHTML = `<div class="vse-children-label">Then:</div>`;
            
            const childrenBlocks = document.createElement('div');
            childrenBlocks.className = 'vse-children-blocks';
            
            if (block.children.length === 0) {
                childrenBlocks.innerHTML = '<div class="vse-children-empty">No actions</div>';
            } else {
                block.children.forEach((child, childIndex) => {
                    childrenBlocks.appendChild(this.renderBlock(child, childIndex, block.children));
                });
            }
            
            childrenContainer.appendChild(childrenBlocks);
            
            // Add child button
            const addBtn = document.createElement('button');
            addBtn.className = 'vse-add-child-btn';
            addBtn.textContent = '+ Add Action';
            addBtn.onclick = () => this.showAddBlockMenu(block, false);
            childrenContainer.appendChild(addBtn);
            
            body.appendChild(childrenContainer);
            
            // Else children
            if (def.hasElse) {
                const elseContainer = document.createElement('div');
                elseContainer.className = 'vse-children-container';
                elseContainer.innerHTML = `<div class="vse-children-label">Else:</div>`;
                
                const elseBlocks = document.createElement('div');
                elseBlocks.className = 'vse-children-blocks';
                
                if (block.elseChildren.length === 0) {
                    elseBlocks.innerHTML = '<div class="vse-children-empty">No actions</div>';
                } else {
                    block.elseChildren.forEach((child, childIndex) => {
                        elseBlocks.appendChild(this.renderBlock(child, childIndex, block.elseChildren));
                    });
                }
                
                elseContainer.appendChild(elseBlocks);
                
                // Add else child button
                const addElseBtn = document.createElement('button');
                addElseBtn.className = 'vse-add-child-btn';
                addElseBtn.textContent = '+ Add Action';
                addElseBtn.onclick = () => this.showAddBlockMenu(block, true);
                elseContainer.appendChild(addElseBtn);
                
                body.appendChild(elseContainer);
            }
        }
        
        el.appendChild(body);
        
        return el;
    }
    
    /**
     * Render a field input
     */
    renderField(field, block) {
        const container = document.createElement('div');
        container.className = 'vse-field';
        
        const label = document.createElement('label');
        label.className = 'vse-field-label';
        label.textContent = field.label;
        container.appendChild(label);
        
        if (field.type === 'textarea') {
            const input = document.createElement('textarea');
            input.className = 'vse-field-input vse-field-textarea';
            input.value = block.data[field.name] || '';
            input.placeholder = field.placeholder || '';
            input.onchange = () => {
                block.data[field.name] = input.value;
                this.triggerChange();
            };
            container.appendChild(input);
        } else if (field.type === 'select') {
            const select = document.createElement('select');
            select.className = 'vse-field-input vse-field-select';
            field.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                option.selected = block.data[field.name] === opt;
                select.appendChild(option);
            });
            select.onchange = () => {
                block.data[field.name] = select.value;
                this.triggerChange();
            };
            container.appendChild(select);
        } else if (field.type === 'choiceList') {
            const list = document.createElement('div');
            list.className = 'vse-choice-list';
            
            const choices = block.data[field.name] || [];
            choices.forEach((choice, i) => {
                const item = document.createElement('div');
                item.className = 'vse-choice-item';
                
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'vse-field-input';
                input.value = choice;
                input.onchange = () => {
                    block.data[field.name][i] = input.value;
                    this.triggerChange();
                };
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'vse-choice-remove';
                removeBtn.textContent = '✕';
                removeBtn.onclick = () => {
                    block.data[field.name].splice(i, 1);
                    this.render();
                    this.triggerChange();
                };
                
                item.appendChild(input);
                item.appendChild(removeBtn);
                list.appendChild(item);
            });
            
            const addBtn = document.createElement('button');
            addBtn.className = 'vse-choice-add';
            addBtn.textContent = '+ Add Option';
            addBtn.onclick = () => {
                block.data[field.name].push('Option ' + (choices.length + 1));
                this.render();
                this.triggerChange();
            };
            list.appendChild(addBtn);
            
            container.appendChild(list);
        } else {
            const input = document.createElement('input');
            input.type = field.type === 'number' ? 'number' : 'text';
            input.className = 'vse-field-input';
            input.value = block.data[field.name] || '';
            input.placeholder = field.placeholder || '';
            input.onchange = () => {
                block.data[field.name] = field.type === 'number' ? Number(input.value) : input.value;
                this.triggerChange();
            };
            container.appendChild(input);
        }
        
        return container;
    }
    
    /**
     * Show add block menu for children
     */
    showAddBlockMenu(parentBlock, isElse) {
        const menu = document.createElement('div');
        menu.className = 'vse-add-menu';
        menu.style.cssText = `
            position: fixed;
            background: #2a2a4a;
            border-radius: 8px;
            padding: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            z-index: 10001;
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            max-width: 300px;
        `;
        
        Object.entries(this.blockTypes).forEach(([type, def]) => {
            // Don't allow nested if blocks for simplicity
            if (type === 'ifCondition') return;
            
            const btn = document.createElement('button');
            btn.className = 'vse-palette-btn';
            btn.style.background = def.color;
            btn.style.color = this.getContrastColor(def.color);
            btn.style.fontSize = '11px';
            btn.style.padding = '4px 8px';
            btn.innerHTML = `${def.icon} ${def.name}`;
            btn.onclick = () => {
                this.addBlock(type, parentBlock, isElse);
                document.body.removeChild(menu);
            };
            menu.appendChild(btn);
        });
        
        // Position near mouse
        menu.style.left = '50%';
        menu.style.top = '50%';
        menu.style.transform = 'translate(-50%, -50%)';
        
        // Close on click outside
        menu.onclick = (e) => e.stopPropagation();
        const closeMenu = () => document.body.removeChild(menu);
        setTimeout(() => document.addEventListener('click', closeMenu, { once: true }), 10);
        
        document.body.appendChild(menu);
    }
    
    /**
     * Show code modal
     */
    showCodeModal(isImport) {
        const modal = document.createElement('div');
        modal.className = 'vse-code-modal';
        modal.innerHTML = `
            <div class="vse-code-modal-content">
                <div class="vse-code-modal-header">
                    <div class="vse-code-modal-title">${isImport ? '📥 Import Script Code' : '📝 Generated Script Code'}</div>
                    <button class="vse-code-modal-close">✕</button>
                </div>
                <textarea class="vse-code-textarea" ${isImport ? '' : 'readonly'}>${isImport ? '' : this.generateScript()}</textarea>
                <div class="vse-code-modal-footer">
                    ${isImport ? '<button class="vse-btn vse-btn-primary vse-import-btn">Import</button>' : ''}
                    <button class="vse-btn vse-btn-secondary vse-close-btn">Close</button>
                </div>
            </div>
        `;
        
        modal.querySelector('.vse-code-modal-close').onclick = () => document.body.removeChild(modal);
        modal.querySelector('.vse-close-btn').onclick = () => document.body.removeChild(modal);
        
        if (isImport) {
            modal.querySelector('.vse-import-btn').onclick = () => {
                const code = modal.querySelector('.vse-code-textarea').value;
                // For now, just alert - full parser would be complex
                alert('Import from code is not yet implemented.\nPlease use the visual blocks to create your script.');
                document.body.removeChild(modal);
            };
        }
        
        modal.onclick = (e) => {
            if (e.target === modal) document.body.removeChild(modal);
        };
        
        document.body.appendChild(modal);
    }
    
    /**
     * Generate script code from blocks
     */
    generateScript() {
        return this.blocksToScript(this.blocks);
    }
    
    /**
     * Convert blocks to script code
     */
    blocksToScript(blocks, indent = '') {
        const lines = [];
        
        blocks.forEach(block => {
            const def = this.blockTypes[block.type];
            if (!def) return;
            
            if (def.hasChildren) {
                const childScript = block.children.length > 0 
                    ? this.blocksToScript(block.children, indent + '    ').split('\n')
                    : [];
                const elseScript = block.elseChildren.length > 0
                    ? this.blocksToScript(block.elseChildren, indent + '    ').split('\n')
                    : [];
                
                const script = def.toScript(block.data, childScript, elseScript);
                lines.push(indent + script.split('\n').join('\n' + indent));
            } else {
                lines.push(indent + def.toScript(block.data));
            }
        });
        
        return lines.join('\n');
    }
    
    /**
     * Load blocks from existing script - comprehensive parser
     */
    loadFromScript(scriptText) {
        this.blocks = [];
        
        if (!scriptText || !scriptText.trim()) {
            this.render();
            return;
        }
        
        try {
            this.parseScript(scriptText, this.blocks);
        } catch (e) {
            console.warn('[VisualScriptEditor] Could not fully parse script:', e);
            // If parsing fails, don't create any blocks - let user use code editor
        }
        
        this.render();
    }
    
    /**
     * Parse script text into blocks
     */
    parseScript(scriptText, targetBlocks) {
        // Tokenize the script
        const lines = scriptText.split('\n');
        let i = 0;
        
        while (i < lines.length) {
            const line = lines[i].trim();
            
            // Skip empty lines
            if (!line) {
                i++;
                continue;
            }
            
            // Comment
            if (line.startsWith('//')) {
                targetBlocks.push(this.createBlock('comment', { text: line.substring(2).trim() }));
                i++;
                continue;
            }
            
            // Label
            if (line.startsWith(':') && !line.includes(' ')) {
                targetBlocks.push(this.createBlock('label', { name: line.substring(1) }));
                i++;
                continue;
            }
            
            // Message
            const messageMatch = line.match(/^message\s+"(.*)";?$/);
            if (messageMatch) {
                targetBlocks.push(this.createBlock('message', { text: this.unescapeString(messageMatch[1]) }));
                i++;
                continue;
            }
            
            // Setvar
            const setvarMatch = line.match(/^setvar\s+"([^"]+)",\s*(.+);?$/);
            if (setvarMatch) {
                let value = setvarMatch[2].trim().replace(/;$/, '');
                // Remove quotes if it's a string
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                targetBlocks.push(this.createBlock('setVariable', { varName: setvarMatch[1], value: value }));
                i++;
                continue;
            }
            
            // Additem
            const additemMatch = line.match(/^additem\s+"([^"]+)",\s*(\d+);?$/);
            if (additemMatch) {
                targetBlocks.push(this.createBlock('addItem', { itemId: additemMatch[1], quantity: parseInt(additemMatch[2]) }));
                i++;
                continue;
            }
            
            // Delitem
            const delitemMatch = line.match(/^delitem\s+"([^"]+)",\s*(\d+);?$/);
            if (delitemMatch) {
                targetBlocks.push(this.createBlock('removeItem', { itemId: delitemMatch[1], quantity: parseInt(delitemMatch[2]) }));
                i++;
                continue;
            }
            
            // Playsound
            const playsoundMatch = line.match(/^playsound\s+"([^"]+)";?$/);
            if (playsoundMatch) {
                targetBlocks.push(this.createBlock('playSound', { soundFile: playsoundMatch[1] }));
                i++;
                continue;
            }
            
            // Wait
            const waitMatch = line.match(/^wait\s+(\d+);?$/);
            if (waitMatch) {
                targetBlocks.push(this.createBlock('wait', { duration: parseInt(waitMatch[1]) }));
                i++;
                continue;
            }
            
            // Goto
            const gotoMatch = line.match(/^goto\s+(\w+);?$/);
            if (gotoMatch) {
                targetBlocks.push(this.createBlock('goto', { label: gotoMatch[1] }));
                i++;
                continue;
            }
            
            // End
            if (line === 'end;' || line === 'end') {
                targetBlocks.push(this.createBlock('end'));
                i++;
                continue;
            }
            
            // Choice
            const choiceMatch = line.match(/^choice\s+(.+);?$/);
            if (choiceMatch) {
                const optionsStr = choiceMatch[1];
                const options = [];
                const optionRegex = /"([^"]+)"/g;
                let optMatch;
                while ((optMatch = optionRegex.exec(optionsStr)) !== null) {
                    options.push(optMatch[1]);
                }
                if (options.length > 0) {
                    targetBlocks.push(this.createBlock('choice', { options: options }));
                }
                i++;
                continue;
            }
            
            // If statement - need to find matching closing brace
            const ifMatch = line.match(/^if\s*\((.+)\)\s*\{?\s*$/);
            if (ifMatch) {
                const condition = ifMatch[1];
                const ifBlock = this.parseIfCondition(condition);
                
                // Find the block content
                const { thenContent, elseContent, endIndex } = this.findIfBlockContent(lines, i);
                
                // Parse children
                if (thenContent.trim()) {
                    this.parseScript(thenContent, ifBlock.children);
                }
                if (elseContent.trim()) {
                    this.parseScript(elseContent, ifBlock.elseChildren);
                }
                
                targetBlocks.push(ifBlock);
                i = endIndex + 1;
                continue;
            }
            
            // Skip closing braces and else keywords (handled by if parsing)
            if (line === '}' || line === '} else {' || line === 'else {' || line === 'else') {
                i++;
                continue;
            }
            
            // Unknown line - skip it
            console.log('[VisualScriptEditor] Skipping unrecognized line:', line);
            i++;
        }
    }
    
    /**
     * Parse an if condition string into a block
     */
    parseIfCondition(conditionStr) {
        // Try to parse: hasitem("id", qty) == value, getvar("name") == value, choice == value
        const block = this.createBlock('ifCondition');
        
        // Choice comparison
        const choiceMatch = conditionStr.match(/^choice\s*(==|!=|>|<|>=|<=)\s*(\d+)$/);
        if (choiceMatch) {
            block.data.conditionType = 'choice';
            block.data.operator = choiceMatch[1];
            block.data.compareValue = choiceMatch[2];
            return block;
        }
        
        // getvar comparison
        const getvarMatch = conditionStr.match(/^getvar\s*\(\s*"([^"]+)"\s*\)\s*(==|!=|>|<|>=|<=)?\s*(.+)?$/);
        if (getvarMatch) {
            block.data.conditionType = 'getvar';
            block.data.param1 = getvarMatch[1];
            block.data.operator = getvarMatch[2] || '==';
            block.data.compareValue = getvarMatch[3]?.trim() || 'true';
            return block;
        }
        
        // hasitem comparison
        const hasitemMatch = conditionStr.match(/^hasitem\s*\(\s*"([^"]+)"(?:\s*,\s*(\d+))?\s*\)\s*(==|!=|>|<|>=|<=)?\s*(.+)?$/);
        if (hasitemMatch) {
            block.data.conditionType = 'hasitem';
            block.data.param1 = hasitemMatch[1];
            block.data.param2 = hasitemMatch[2] || '';
            block.data.operator = hasitemMatch[3] || '==';
            block.data.compareValue = hasitemMatch[4]?.trim() || 'true';
            return block;
        }
        
        // Default - just store as getvar
        block.data.conditionType = 'getvar';
        block.data.param1 = conditionStr;
        
        return block;
    }
    
    /**
     * Find the content of an if block (then and else parts)
     */
    findIfBlockContent(lines, startIndex) {
        let braceCount = 0;
        let foundFirstBrace = false;
        let thenLines = [];
        let elseLines = [];
        let inElse = false;
        let i = startIndex;
        
        // Check if opening brace is on same line
        if (lines[i].includes('{')) {
            foundFirstBrace = true;
            braceCount = 1;
        }
        
        i++;
        
        while (i < lines.length) {
            const line = lines[i].trim();
            
            // Count braces
            for (const char of line) {
                if (char === '{') {
                    if (!foundFirstBrace) {
                        foundFirstBrace = true;
                    }
                    braceCount++;
                } else if (char === '}') {
                    braceCount--;
                }
            }
            
            // Check for else
            if (braceCount === 0 && (line === '} else {' || line === 'else {')) {
                inElse = true;
                braceCount = 1;
                i++;
                continue;
            }
            
            if (braceCount === 1 && line === 'else {') {
                inElse = true;
                braceCount = 1;
                i++;
                continue;
            }
            
            // If we're back to 0, we're done
            if (braceCount === 0 && foundFirstBrace) {
                return {
                    thenContent: thenLines.join('\n'),
                    elseContent: elseLines.join('\n'),
                    endIndex: i
                };
            }
            
            // Add to appropriate section (but not closing braces at our level)
            if (braceCount > 0 || !line.startsWith('}')) {
                if (inElse) {
                    if (!(braceCount === 1 && line === '}')) {
                        elseLines.push(lines[i]);
                    }
                } else {
                    if (!(braceCount === 1 && line === '}')) {
                        thenLines.push(lines[i]);
                    }
                }
            }
            
            i++;
        }
        
        return {
            thenContent: thenLines.join('\n'),
            elseContent: elseLines.join('\n'),
            endIndex: i - 1
        };
    }
    
    /**
     * Unescape string from script
     */
    unescapeString(str) {
        return str.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    
    /**
     * Set change callback
     */
    onChange(callback) {
        this.onChangeCallback = callback;
    }
    
    /**
     * Trigger change callback
     */
    triggerChange() {
        if (this.onChangeCallback) {
            this.onChangeCallback(this.generateScript());
        }
    }
    
    /**
     * Get contrast color for readability
     */
    getContrastColor(hexcolor) {
        const r = parseInt(hexcolor.slice(1, 3), 16);
        const g = parseInt(hexcolor.slice(3, 5), 16);
        const b = parseInt(hexcolor.slice(5, 7), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#000' : '#fff';
    }
    
    /**
     * Clear all blocks
     */
    clear() {
        this.blocks = [];
        this.render();
        this.triggerChange();
    }
    
    /**
     * Get the blocks data
     */
    getBlocks() {
        return this.blocks;
    }
    
    /**
     * Set blocks data
     */
    setBlocks(blocks) {
        this.blocks = blocks;
        this.render();
    }
}

// Export globally
window.VisualScriptEditor = VisualScriptEditor;
