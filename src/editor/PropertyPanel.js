/**
 * PropertyPanel - Edit properties of selected object
 */
class PropertyPanel {
    constructor(editor) {
        this.editor = editor;
        this.container = null;
        this.currentObject = null;
        this.createUI();
    }

    /**
     * Create UI elements
     */
    createUI() {
        this.container = document.createElement('div');
        this.container.id = 'property-panel';
        this.container.style.cssText = `
            position: fixed;
            right: 10px;
            top: 70px;
            width: 300px;
            max-height: 600px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            font-family: Arial, sans-serif;
            z-index: 1000;
            display: none;
            border: 2px solid #444;
            border-radius: 8px;
            overflow-y: auto;
        `;

        // Title
        const title = document.createElement('h3');
        title.textContent = 'Properties';
        title.style.marginTop = '0';
        this.container.appendChild(title);

        // Properties container
        this.propertiesContainer = document.createElement('div');
        this.container.appendChild(this.propertiesContainer);

        document.body.appendChild(this.container);
    }

    /**
     * Show panel with object properties
     */
    show(obj) {
        if (!obj) {
            this.hide();
            return;
        }

        this.currentObject = obj;
        this.container.style.display = 'block';

        // Clear previous properties
        this.propertiesContainer.innerHTML = '';

        // Object type
        this.addLabel('Type: ' + obj.constructor.name);

        // Common properties
        this.addNumberInput('X', obj.x, (value) => {
            obj.x = value;
        });

        this.addNumberInput('Y', obj.y, (value) => {
            obj.y = value;
        });

        this.addNumberInput('Scale', obj.scale, (value) => {
            obj.scale = value;
        }, 0.1, 0.01);

        if (obj.rotation !== undefined) {
            this.addNumberInput('Rotation', obj.rotation, (value) => {
                obj.rotation = value;
            }, 1, 0);
        }

        // Reverse facing checkbox (for all objects with sprites)
        // Initialize reverseFacing if it doesn't exist
        if (obj.reverseFacing === undefined) {
            obj.reverseFacing = false;
        }
        this.addCheckbox('Reverse Facing', obj.reverseFacing, (value) => {
            obj.reverseFacing = value;
        });

        // Sprite selector for objects that have sprites
        if (obj.spriteSrc !== undefined) {
            this.addSpriteSelector(obj);
        }

        // Conditional properties
        if (obj.name !== undefined) {
            this.addTextInput('Name', obj.name, (value) => {
                obj.name = value;
            });
        }

        if (obj.dialogue !== undefined) {
            this.addTextArea('Dialogue', obj.dialogue, (value) => {
                obj.dialogue = value;
            });
        }

        if (obj.gold !== undefined) {
            this.addNumberInput('Gold', obj.gold, (value) => {
                obj.gold = value;
            });
        }

        if (obj.chestType !== undefined) {
            this.addSelect('Chest Type', obj.chestType, ['wooden', 'silver', 'golden'], (value) => {
                obj.chestType = value;
            });
        }

        // Loot list editor for chests
        if (obj.loot !== undefined) {
            this.addLootListEditor(obj);
        }

        if (obj.targetMap !== undefined) {
            this.addTextInput('Target Map', obj.targetMap, (value) => {
                obj.targetMap = value;
            });
        }

        if (obj.spawnPoint !== undefined) {
            this.addTextInput('Spawn Point', obj.spawnPoint, (value) => {
                obj.spawnPoint = value;
            });
        }

        // Animation properties
        if (obj.animation !== undefined) {
            this.addCollapsibleSection('Animation', () => {
                const section = document.createElement('div');
                
                section.appendChild(this.createSelect('Type', obj.animation.type || 'none', 
                    ['none', 'sway', 'pulse', 'rotate'], (value) => {
                        obj.animation.type = value;
                    }));
                
                if (obj.animation.speed !== undefined) {
                    section.appendChild(this.createNumberInput('Speed', obj.animation.speed, (value) => {
                        obj.animation.speed = value;
                    }, 0.1, 0));
                }
                
                if (obj.animation.intensity !== undefined) {
                    section.appendChild(this.createNumberInput('Intensity', obj.animation.intensity, (value) => {
                        obj.animation.intensity = value;
                    }, 0.1, 0));
                }
                
                return section;
            });
        }

        // Collision properties (collapsible)
        this.addCollapsibleSection('Collision', () => {
            const section = document.createElement('div');
            
            // Collision shape selection (radio buttons)
            const shapeGroup = document.createElement('div');
            shapeGroup.style.cssText = 'margin-bottom: 12px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px;';
            
            const shapeLabel = document.createElement('div');
            shapeLabel.textContent = 'Collision Shape:';
            shapeLabel.style.cssText = 'margin-bottom: 8px; font-weight: 600; color: #90caf9;';
            shapeGroup.appendChild(shapeLabel);
            
            const radioContainer = document.createElement('div');
            radioContainer.style.cssText = 'display: flex; gap: 16px;';
            
            // Rectangle radio button
            const rectangleLabel = document.createElement('label');
            rectangleLabel.style.cssText = 'display: flex; align-items: center; gap: 6px; cursor: pointer; color: #e0e0e0;';
            const rectangleRadio = document.createElement('input');
            rectangleRadio.type = 'radio';
            rectangleRadio.name = 'collisionShape';
            rectangleRadio.value = 'rectangle';
            rectangleRadio.checked = (obj.collisionShape || 'rectangle') === 'rectangle';
            rectangleRadio.style.cssText = 'cursor: pointer;';
            rectangleRadio.onchange = () => {
                obj.collisionShape = 'rectangle';
            };
            rectangleLabel.appendChild(rectangleRadio);
            rectangleLabel.appendChild(document.createTextNode('⬜ Square'));
            radioContainer.appendChild(rectangleLabel);
            
            // Circle radio button
            const circleLabel = document.createElement('label');
            circleLabel.style.cssText = 'display: flex; align-items: center; gap: 6px; cursor: pointer; color: #e0e0e0;';
            const circleRadio = document.createElement('input');
            circleRadio.type = 'radio';
            circleRadio.name = 'collisionShape';
            circleRadio.value = 'circle';
            circleRadio.checked = obj.collisionShape === 'circle';
            circleRadio.style.cssText = 'cursor: pointer;';
            circleRadio.onchange = () => {
                obj.collisionShape = 'circle';
            };
            circleLabel.appendChild(circleRadio);
            circleLabel.appendChild(document.createTextNode('⚫ Round'));
            radioContainer.appendChild(circleLabel);
            
            shapeGroup.appendChild(radioContainer);
            section.appendChild(shapeGroup);
            
            // Info text about oval shapes
            const infoText = document.createElement('div');
            infoText.textContent = 'Tip: Use Round + different expand % to create ovals';
            infoText.style.cssText = 'font-size: 11px; color: #90caf9; margin-bottom: 12px; font-style: italic;';
            section.appendChild(infoText);
            
            if (obj.collisionExpandTopPercent !== undefined) {
                section.appendChild(this.createNumberInput('Top %', obj.collisionExpandTopPercent, (value) => {
                    obj.collisionExpandTopPercent = value;
                }, 0.01, 0.01));
            }
            
            if (obj.collisionExpandBottomPercent !== undefined) {
                section.appendChild(this.createNumberInput('Bottom %', obj.collisionExpandBottomPercent, (value) => {
                    obj.collisionExpandBottomPercent = value;
                }, 0.01, 0.01));
            }
            
            if (obj.collisionExpandLeftPercent !== undefined) {
                section.appendChild(this.createNumberInput('Left %', obj.collisionExpandLeftPercent, (value) => {
                    obj.collisionExpandLeftPercent = value;
                }, 0.01, 0.01));
            }
            
            if (obj.collisionExpandRightPercent !== undefined) {
                section.appendChild(this.createNumberInput('Right %', obj.collisionExpandRightPercent, (value) => {
                    obj.collisionExpandRightPercent = value;
                }, 0.01, 0.01));
            }
            
            return section;
        });

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️ Delete Object';
        deleteBtn.style.cssText = `
            width: 100%;
            padding: 10px;
            margin-top: 20px;
            background: #d32f2f;
            color: white;
            border: none;
            cursor: pointer;
            border-radius: 4px;
            font-size: 14px;
        `;
        deleteBtn.onclick = () => {
            if (confirm('Delete this object?')) {
                this.editor.deleteObject(obj);
            }
        };
        this.propertiesContainer.appendChild(deleteBtn);
    }

    /**
     * Hide panel
     */
    hide() {
        this.container.style.display = 'none';
        this.currentObject = null;
    }

    /**
     * Add label
     */
    addLabel(text) {
        const label = document.createElement('div');
        label.textContent = text;
        label.style.cssText = `
            font-weight: bold;
            margin-bottom: 10px;
            padding: 5px;
            background: rgba(74, 158, 255, 0.2);
            border-radius: 4px;
        `;
        this.propertiesContainer.appendChild(label);
    }

    /**
     * Add checkbox
     */
    addCheckbox(label, value, onChange) {
        const container = document.createElement('div');
        container.style.cssText = `
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = value;
        checkbox.style.cssText = `
            width: 18px;
            height: 18px;
            cursor: pointer;
        `;
        checkbox.onchange = () => onChange(checkbox.checked);

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            font-size: 12px;
            cursor: pointer;
            user-select: none;
        `;
        labelEl.onclick = () => {
            checkbox.checked = !checkbox.checked;
            onChange(checkbox.checked);
        };

        container.appendChild(checkbox);
        container.appendChild(labelEl);
        this.propertiesContainer.appendChild(container);
    }

    /**
     * Add number input
     */
    addNumberInput(label, value, onChange, step = 1, min = null) {
        const container = this.createNumberInput(label, value, onChange, step, min);
        this.propertiesContainer.appendChild(container);
    }

    /**
     * Create number input (reusable)
     */
    createNumberInput(label, value, onChange, step = 1, min = null) {
        const container = document.createElement('div');
        container.style.marginBottom = '10px';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            display: block;
            margin-bottom: 5px;
            font-size: 12px;
        `;

        const input = document.createElement('input');
        input.type = 'number';
        input.value = value;
        input.step = step;
        if (min !== null) input.min = min;
        input.style.cssText = `
            width: 100%;
            padding: 5px;
            background: #222;
            color: white;
            border: 1px solid #555;
            border-radius: 4px;
        `;
        input.oninput = () => onChange(parseFloat(input.value));

        container.appendChild(labelEl);
        container.appendChild(input);
        return container;
    }

    /**
     * Add text input
     */
    addTextInput(label, value, onChange) {
        const container = document.createElement('div');
        container.style.marginBottom = '10px';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            display: block;
            margin-bottom: 5px;
            font-size: 12px;
        `;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = value || '';
        input.style.cssText = `
            width: 100%;
            padding: 5px;
            background: #222;
            color: white;
            border: 1px solid #555;
            border-radius: 4px;
        `;
        input.oninput = () => onChange(input.value);

        container.appendChild(labelEl);
        container.appendChild(input);
        this.propertiesContainer.appendChild(container);
    }

    /**
     * Add text area
     */
    addTextArea(label, value, onChange) {
        const container = document.createElement('div');
        container.style.marginBottom = '10px';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            display: block;
            margin-bottom: 5px;
            font-size: 12px;
        `;

        const textarea = document.createElement('textarea');
        textarea.value = value || '';
        textarea.rows = 3;
        textarea.style.cssText = `
            width: 100%;
            padding: 5px;
            background: #222;
            color: white;
            border: 1px solid #555;
            border-radius: 4px;
            resize: vertical;
        `;
        textarea.oninput = () => onChange(textarea.value);

        container.appendChild(labelEl);
        container.appendChild(textarea);
        this.propertiesContainer.appendChild(container);
    }

    /**
     * Add select dropdown
     */
    addSelect(label, value, options, onChange) {
        const container = document.createElement('div');
        container.style.marginBottom = '10px';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            display: block;
            margin-bottom: 5px;
            font-size: 12px;
        `;

        const select = document.createElement('select');
        select.style.cssText = `
            width: 100%;
            padding: 5px;
            background: #222;
            color: white;
            border: 1px solid #555;
            border-radius: 4px;
        `;

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            option.selected = opt === value;
            select.appendChild(option);
        });

        select.onchange = () => onChange(select.value);

        container.appendChild(labelEl);
        container.appendChild(select);
        this.propertiesContainer.appendChild(container);
    }

    /**
     * Create select dropdown (reusable)
     */
    createSelect(label, value, options, onChange) {
        const container = document.createElement('div');
        container.style.marginBottom = '10px';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            display: block;
            margin-bottom: 5px;
            font-size: 12px;
        `;

        const select = document.createElement('select');
        select.style.cssText = `
            width: 100%;
            padding: 5px;
            background: #222;
            color: white;
            border: 1px solid #555;
            border-radius: 4px;
        `;

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            option.selected = opt === value;
            select.appendChild(option);
        });

        select.onchange = () => onChange(select.value);

        container.appendChild(labelEl);
        container.appendChild(select);
        return container;
    }

    /**
     * Add collapsible section
     */
    addCollapsibleSection(title, contentCreator) {
        const header = document.createElement('div');
        header.textContent = '▶ ' + title;
        header.style.cssText = `
            padding: 8px;
            background: #333;
            cursor: pointer;
            border-radius: 4px;
            margin-bottom: 5px;
            user-select: none;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            display: none;
            padding: 10px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
            margin-bottom: 10px;
        `;
        
        const contentEl = contentCreator();
        content.appendChild(contentEl);

        let isExpanded = false;
        header.onclick = () => {
            isExpanded = !isExpanded;
            header.textContent = (isExpanded ? '▼ ' : '▶ ') + title;
            content.style.display = isExpanded ? 'block' : 'none';
        };

        this.propertiesContainer.appendChild(header);
        this.propertiesContainer.appendChild(content);
    }

    /**
     * Add sprite selector
     */
    addSpriteSelector(obj) {
        const container = document.createElement('div');
        container.style.marginBottom = '15px';

        const label = document.createElement('label');
        label.textContent = 'Sprite';
        label.style.cssText = `
            display: block;
            margin-bottom: 5px;
            font-size: 12px;
            font-weight: bold;
        `;

        // Preview and select button container
        const previewContainer = document.createElement('div');
        previewContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
        `;

        // Preview image
        const preview = document.createElement('img');
        preview.style.cssText = `
            width: 64px;
            height: 64px;
            object-fit: contain;
            background: #333;
            border: 1px solid #555;
            border-radius: 4px;
        `;
        if (obj.spriteSrc) {
            preview.src = obj.spriteSrc;
        }

        // Select sprite button
        const selectBtn = document.createElement('button');
        selectBtn.textContent = '📁 Choose Sprite...';
        selectBtn.style.cssText = `
            flex: 1;
            padding: 8px;
            background: #4a9eff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        `;
        selectBtn.onclick = () => {
            this.openSpritePicker(obj, (selectedPath) => {
                obj.spriteSrc = selectedPath;
                obj.loadSprite(selectedPath);
                preview.src = selectedPath;
                pathInput.value = selectedPath;
            });
        };
        selectBtn.onmouseover = () => selectBtn.style.background = '#5aafff';
        selectBtn.onmouseout = () => selectBtn.style.background = '#4a9eff';

        previewContainer.appendChild(preview);
        previewContainer.appendChild(selectBtn);

        // Current sprite path display
        const pathInput = document.createElement('input');
        pathInput.type = 'text';
        pathInput.value = obj.spriteSrc || '';
        pathInput.placeholder = 'assets/npc/...';
        pathInput.style.cssText = `
            width: 100%;
            padding: 5px;
            background: #222;
            color: #888;
            border: 1px solid #555;
            border-radius: 4px;
            font-size: 11px;
        `;
        pathInput.readOnly = true;

        container.appendChild(label);
        container.appendChild(previewContainer);
        container.appendChild(pathInput);
        this.propertiesContainer.appendChild(container);
    }

    /**
     * Add loot list editor
     */
    addLootListEditor(obj) {
        const container = document.createElement('div');
        container.style.marginBottom = '15px';

        const button = document.createElement('button');
        button.textContent = '📦 Loot List';
        button.style.cssText = `
            width: 100%;
            padding: 10px;
            background: #4a9eff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        `;
        button.onmouseover = () => button.style.background = '#5aafff';
        button.onmouseout = () => button.style.background = '#4a9eff';
        button.onclick = () => this.openLootListModal(obj);

        container.appendChild(button);
        this.propertiesContainer.appendChild(container);
    }

    /**
     * Open loot list modal
     */
    openLootListModal(obj) {
        // Load items data
        const items = this.editor.game.dataLoader.getItems() || {};
        
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Create modal container
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #1a1a1a;
            border: 2px solid #444;
            border-radius: 8px;
            width: 90%;
            max-width: 700px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 15px 20px;
            background: #2a2a2a;
            border-bottom: 2px solid #444;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        const title = document.createElement('h3');
        title.textContent = 'Loot List Editor';
        title.style.cssText = `
            margin: 0;
            color: white;
            font-size: 18px;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            background: #d32f2f;
            color: white;
            border: none;
            border-radius: 4px;
            width: 30px;
            height: 30px;
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
        `;
        closeBtn.onclick = () => overlay.remove();

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Current loot section
        const currentLootSection = document.createElement('div');
        currentLootSection.style.cssText = `
            padding: 20px;
            border-bottom: 2px solid #444;
            overflow-y: auto;
            max-height: 300px;
        `;

        const currentTitle = document.createElement('h4');
        currentTitle.textContent = 'Current Loot';
        currentTitle.style.cssText = `
            margin: 0 0 15px 0;
            color: white;
            font-size: 16px;
        `;
        currentLootSection.appendChild(currentTitle);

        // Loot grid
        const lootGrid = document.createElement('div');
        lootGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 10px;
        `;

        const updateLootGrid = () => {
            lootGrid.innerHTML = '';

            if (!obj.loot || obj.loot.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.textContent = 'No items in loot list';
                emptyMsg.style.cssText = `
                    color: #888;
                    font-style: italic;
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 20px;
                `;
                lootGrid.appendChild(emptyMsg);
                return;
            }

            obj.loot.forEach((lootItem, index) => {
                const itemData = items[lootItem.id];
                const itemCard = document.createElement('div');
                itemCard.style.cssText = `
                    background: #2a2a2a;
                    border: 2px solid #444;
                    border-radius: 8px;
                    padding: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                    position: relative;
                `;
                itemCard.onmouseover = () => itemCard.style.borderColor = '#4a9eff';
                itemCard.onmouseout = () => itemCard.style.borderColor = '#444';

                // Item icon
                if (itemData && itemData.icon) {
                    const icon = document.createElement('img');
                    icon.src = itemData.icon;
                    icon.style.cssText = `
                        width: 48px;
                        height: 48px;
                        object-fit: contain;
                        display: block;
                        margin: 0 auto 8px;
                        background: #1a1a1a;
                        border-radius: 4px;
                    `;
                    itemCard.appendChild(icon);
                }

                // Item name
                const name = document.createElement('div');
                name.textContent = itemData ? itemData.name : lootItem.id;
                name.style.cssText = `
                    color: white;
                    font-size: 12px;
                    text-align: center;
                    margin-bottom: 8px;
                    font-weight: bold;
                `;
                itemCard.appendChild(name);

                // Amount control
                const amountControl = document.createElement('div');
                amountControl.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                    margin-bottom: 8px;
                `;

                const minusBtn = document.createElement('button');
                minusBtn.textContent = '-';
                minusBtn.style.cssText = `
                    background: #333;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    width: 24px;
                    height: 24px;
                    cursor: pointer;
                    font-size: 14px;
                `;
                minusBtn.onclick = (e) => {
                    e.stopPropagation();
                    lootItem.amount = Math.max(1, (lootItem.amount || 1) - 1);
                    amountDisplay.textContent = lootItem.amount;
                };

                const amountDisplay = document.createElement('div');
                amountDisplay.textContent = lootItem.amount || 1;
                amountDisplay.style.cssText = `
                    color: white;
                    font-size: 14px;
                    min-width: 30px;
                    text-align: center;
                    font-weight: bold;
                `;

                const plusBtn = document.createElement('button');
                plusBtn.textContent = '+';
                plusBtn.style.cssText = `
                    background: #333;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    width: 24px;
                    height: 24px;
                    cursor: pointer;
                    font-size: 14px;
                `;
                plusBtn.onclick = (e) => {
                    e.stopPropagation();
                    lootItem.amount = (lootItem.amount || 1) + 1;
                    amountDisplay.textContent = lootItem.amount;
                };

                amountControl.appendChild(minusBtn);
                amountControl.appendChild(amountDisplay);
                amountControl.appendChild(plusBtn);
                itemCard.appendChild(amountControl);

                // Delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️ Remove';
                deleteBtn.style.cssText = `
                    width: 100%;
                    padding: 5px;
                    background: #d32f2f;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 11px;
                `;
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    obj.loot.splice(index, 1);
                    updateLootGrid();
                };
                itemCard.appendChild(deleteBtn);

                lootGrid.appendChild(itemCard);
            });
        };

        currentLootSection.appendChild(lootGrid);

        // Available items section
        const availableSection = document.createElement('div');
        availableSection.style.cssText = `
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        `;

        const availableTitle = document.createElement('h4');
        availableTitle.textContent = 'Add Items';
        availableTitle.style.cssText = `
            margin: 0 0 15px 0;
            color: white;
            font-size: 16px;
        `;
        availableSection.appendChild(availableTitle);

        // Search box
        const searchBox = document.createElement('input');
        searchBox.type = 'text';
        searchBox.placeholder = 'Search items...';
        searchBox.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #222;
            color: white;
            border: 1px solid #555;
            border-radius: 4px;
            margin-bottom: 15px;
            font-size: 14px;
        `;
        availableSection.appendChild(searchBox);

        // Items grid
        const itemsGrid = document.createElement('div');
        itemsGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 10px;
        `;

        const renderAvailableItems = (filter = '') => {
            itemsGrid.innerHTML = '';
            const filterLower = filter.toLowerCase();

            Object.values(items).forEach(item => {
                // Filter items
                if (filter && !item.name.toLowerCase().includes(filterLower) && 
                    !item.id.toLowerCase().includes(filterLower)) {
                    return;
                }

                const itemCard = document.createElement('div');
                itemCard.style.cssText = `
                    background: #2a2a2a;
                    border: 2px solid #444;
                    border-radius: 8px;
                    padding: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: center;
                `;
                itemCard.onmouseover = () => {
                    itemCard.style.borderColor = '#4a9eff';
                    itemCard.style.background = '#333';
                };
                itemCard.onmouseout = () => {
                    itemCard.style.borderColor = '#444';
                    itemCard.style.background = '#2a2a2a';
                };
                itemCard.onclick = () => {
                    if (!obj.loot) obj.loot = [];
                    obj.loot.push({ id: item.id, amount: 1 });
                    updateLootGrid();
                };

                // Item icon
                if (item.icon) {
                    const icon = document.createElement('img');
                    icon.src = item.icon;
                    icon.style.cssText = `
                        width: 48px;
                        height: 48px;
                        object-fit: contain;
                        display: block;
                        margin: 0 auto 8px;
                        background: #1a1a1a;
                        border-radius: 4px;
                    `;
                    itemCard.appendChild(icon);
                }

                // Item name
                const name = document.createElement('div');
                name.textContent = item.name;
                name.style.cssText = `
                    color: white;
                    font-size: 11px;
                    word-break: break-word;
                `;
                itemCard.appendChild(name);

                itemsGrid.appendChild(itemCard);
            });
        };

        searchBox.oninput = () => renderAvailableItems(searchBox.value);
        availableSection.appendChild(itemsGrid);

        // Assemble modal
        modal.appendChild(header);
        modal.appendChild(currentLootSection);
        modal.appendChild(availableSection);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Initial render
        updateLootGrid();
        renderAvailableItems();

        // Close on overlay click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        };
    }

    /**
     * Open sprite picker modal
     */
    openSpritePicker(obj, onSelect) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Create modal container
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #1a1a1a;
            border: 2px solid #444;
            border-radius: 8px;
            width: 90%;
            max-width: 800px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 15px 20px;
            background: #2a2a2a;
            border-bottom: 2px solid #444;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        const title = document.createElement('h3');
        title.textContent = 'Select Sprite';
        title.style.cssText = `
            margin: 0;
            color: white;
            font-size: 18px;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            background: #d32f2f;
            color: white;
            border: none;
            border-radius: 4px;
            width: 30px;
            height: 30px;
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
        `;
        closeBtn.onclick = () => overlay.remove();

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Sprite grid container
        const gridContainer = document.createElement('div');
        gridContainer.style.cssText = `
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        `;

        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 15px;
        `;

        // Available sprite paths
        const availableSprites = [
            'assets/npc/merchant-0.png',
            'assets/npc/sage-0.png',
            'assets/npc/main-0.png',
            'assets/npc/chest-0.png',
            'assets/npc/chest-0-open.png',
            'assets/npc/door-0.png',
            'assets/npc/navigation-0.png',
            'assets/npc/sign-0.png',
            'assets/npc/Spirits/Sylphie00.png',
        ];

        // Create sprite cards
        availableSprites.forEach(spritePath => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: #2a2a2a;
                border: 2px solid ${obj.spriteSrc === spritePath ? '#4a9eff' : '#444'};
                border-radius: 8px;
                padding: 10px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            `;

            const img = document.createElement('img');
            img.src = spritePath;
            img.style.cssText = `
                width: 64px;
                height: 64px;
                object-fit: contain;
                background: #1a1a1a;
                border-radius: 4px;
            `;

            const name = document.createElement('div');
            name.textContent = spritePath.split('/').pop().replace('.png', '');
            name.style.cssText = `
                color: white;
                font-size: 11px;
                text-align: center;
                word-break: break-word;
            `;

            card.appendChild(img);
            card.appendChild(name);

            card.onmouseover = () => {
                if (obj.spriteSrc !== spritePath) {
                    card.style.borderColor = '#666';
                    card.style.background = '#333';
                }
            };
            card.onmouseout = () => {
                if (obj.spriteSrc !== spritePath) {
                    card.style.borderColor = '#444';
                    card.style.background = '#2a2a2a';
                }
            };
            card.onclick = () => {
                onSelect(spritePath);
                overlay.remove();
            };

            grid.appendChild(card);
        });

        gridContainer.appendChild(grid);
        modal.appendChild(header);
        modal.appendChild(gridContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Close on overlay click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        };
    }
}

// Export
window.PropertyPanel = PropertyPanel;
