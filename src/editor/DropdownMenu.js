/**
 * DropdownMenu - Reusable dropdown menu component for editor
 */
class DropdownMenu {
    constructor(label, items) {
        this.label = label;
        this.items = items; // Array of { label, action, items (for submenu), separator, disabled }
        this.isOpen = false;
        this.container = null;
        this.button = null;
        this.menu = null;
        this.activeSubmenu = null;
        
        this.createUI();
    }

    /**
     * Create UI elements
     */
    createUI() {
        // Create container
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: relative;
            display: inline-block;
        `;

        // Create button
        this.button = document.createElement('button');
        this.button.style.cssText = `
            background: #333;
            color: white;
            border: 1px solid #555;
            padding: 8px 16px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 14px;
            transition: background 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        // Add label text
        const labelSpan = document.createElement('span');
        labelSpan.textContent = this.label;
        this.button.appendChild(labelSpan);
        
        // Add dropdown arrow
        const arrow = document.createElement('span');
        arrow.textContent = '▾';
        arrow.style.fontSize = '10px';
        this.button.appendChild(arrow);

        // Button hover effects
        this.button.onmouseover = () => {
            if (!this.isOpen) this.button.style.background = '#555';
        };
        this.button.onmouseout = () => {
            if (!this.isOpen) this.button.style.background = '#333';
        };
        this.button.onclick = (e) => {
            e.stopPropagation();
            this.toggle();
        };

        // Create dropdown menu
        this.menu = document.createElement('div');
        this.menu.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            background: #2a2a2a;
            border: 1px solid #555;
            border-radius: 4px;
            margin-top: 4px;
            min-width: 200px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: none;
        `;

        // Add menu items
        this.items.forEach((item, index) => {
            if (item.separator) {
                const separator = document.createElement('div');
                separator.style.cssText = `
                    height: 1px;
                    background: #555;
                    margin: 4px 0;
                `;
                this.menu.appendChild(separator);
            } else {
                const menuItem = this.createMenuItem(item);
                this.menu.appendChild(menuItem);
            }
        });

        this.container.appendChild(this.button);
        this.container.appendChild(this.menu);

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });
    }

    /**
     * Create a menu item
     */
    createMenuItem(item) {
        const menuItem = document.createElement('div');
        menuItem.style.cssText = `
            padding: 10px 16px;
            cursor: ${item.disabled ? 'not-allowed' : 'pointer'};
            color: ${item.disabled ? '#666' : 'white'};
            font-size: 14px;
            transition: background 0.2s;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
        `;

        // Store reference to item for updates
        menuItem._item = item;

        // Create label container with checkmark
        const labelContainer = document.createElement('span');
        labelContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
        
        // Add checkmark if item is checkable and checked
        const checkmark = document.createElement('span');
        checkmark.textContent = '✓';
        checkmark.style.cssText = `
            display: ${item.checked ? 'inline' : 'none'};
            color: #4a9eff;
            font-weight: bold;
            width: 12px;
        `;
        checkmark.className = 'menu-checkmark';
        labelContainer.appendChild(checkmark);
        
        // Create label with icon
        const labelSpan = document.createElement('span');
        labelSpan.textContent = item.label;
        labelContainer.appendChild(labelSpan);
        
        menuItem.appendChild(labelContainer);

        // Add keyboard shortcut if present
        if (item.shortcut) {
            const shortcutSpan = document.createElement('span');
            shortcutSpan.textContent = item.shortcut;
            shortcutSpan.style.cssText = `
                color: #999;
                font-size: 12px;
                margin-left: 20px;
            `;
            menuItem.appendChild(shortcutSpan);
        }

        // Add submenu indicator
        if (item.items) {
            const submenuArrow = document.createElement('span');
            submenuArrow.textContent = '▸';
            submenuArrow.style.cssText = `
                margin-left: auto;
                padding-left: 12px;
            `;
            menuItem.appendChild(submenuArrow);

            // Create submenu
            const submenu = this.createSubmenu(item.items);
            menuItem.appendChild(submenu);

            // Show submenu on hover
            menuItem.onmouseenter = () => {
                if (!item.disabled) {
                    this.closeAllSubmenus();
                    submenu.style.display = 'block';
                    this.activeSubmenu = submenu;
                }
            };
        }

        // Hover effect
        if (!item.disabled) {
            menuItem.onmouseover = () => {
                menuItem.style.background = '#4a9eff';
                if (!item.items) {
                    this.closeAllSubmenus();
                }
            };
            menuItem.onmouseout = () => {
                menuItem.style.background = 'transparent';
            };
        }

        // Click action
        if (!item.disabled && !item.items) {
            menuItem.onclick = (e) => {
                e.stopPropagation();
                if (item.action) {
                    item.action();
                }
                this.close();
            };
        }

        return menuItem;
    }

    /**
     * Create submenu
     */
    createSubmenu(items) {
        const submenu = document.createElement('div');
        submenu.style.cssText = `
            position: absolute;
            left: 100%;
            top: 0;
            background: #2a2a2a;
            border: 1px solid #555;
            border-radius: 4px;
            min-width: 180px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            display: none;
            z-index: 10001;
        `;

        items.forEach(item => {
            if (item.separator) {
                const separator = document.createElement('div');
                separator.style.cssText = `
                    height: 1px;
                    background: #555;
                    margin: 4px 0;
                `;
                submenu.appendChild(separator);
            } else {
                const submenuItem = this.createSubmenuItem(item);
                submenu.appendChild(submenuItem);
            }
        });

        return submenu;
    }

    /**
     * Create submenu item
     */
    createSubmenuItem(item) {
        const menuItem = document.createElement('div');
        menuItem.style.cssText = `
            padding: 10px 16px;
            cursor: ${item.disabled ? 'not-allowed' : 'pointer'};
            color: ${item.disabled ? '#666' : 'white'};
            font-size: 14px;
            transition: background 0.2s;
            white-space: nowrap;
        `;

        menuItem.textContent = item.label;

        if (!item.disabled) {
            menuItem.onmouseover = () => {
                menuItem.style.background = '#4a9eff';
            };
            menuItem.onmouseout = () => {
                menuItem.style.background = 'transparent';
            };

            menuItem.onclick = (e) => {
                e.stopPropagation();
                if (item.action) {
                    item.action();
                }
                this.close();
            };
        }

        return menuItem;
    }

    /**
     * Close all submenus
     */
    closeAllSubmenus() {
        const submenus = this.menu.querySelectorAll('div[style*="position: absolute"]');
        submenus.forEach(submenu => {
            submenu.style.display = 'none';
        });
        this.activeSubmenu = null;
    }

    /**
     * Toggle dropdown
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Open dropdown
     */
    open() {
        // Close all other dropdowns first (mutually exclusive)
        if (window.editorDropdowns) {
            window.editorDropdowns.forEach(dropdown => {
                if (dropdown !== this) {
                    dropdown.close();
                }
            });
        }
        
        this.isOpen = true;
        this.menu.style.display = 'block';
        this.button.style.background = '#4a9eff';
    }

    /**
     * Close dropdown
     */
    close() {
        this.isOpen = false;
        this.menu.style.display = 'none';
        this.button.style.background = '#333';
        this.closeAllSubmenus();
    }

    /**
     * Get DOM element
     */
    getElement() {
        return this.container;
    }

    /**
     * Update menu items
     */
    updateItems(items) {
        this.items = items;
        this.menu.innerHTML = '';
        
        this.items.forEach(item => {
            if (item.separator) {
                const separator = document.createElement('div');
                separator.style.cssText = `
                    height: 1px;
                    background: #555;
                    margin: 4px 0;
                `;
                this.menu.appendChild(separator);
            } else {
                const menuItem = this.createMenuItem(item);
                this.menu.appendChild(menuItem);
            }
        });
    }

    /**
     * Update checkmarks for menu items
     */
    updateCheckmarks() {
        const menuItems = this.menu.querySelectorAll('div[style*="padding: 10px"]');
        menuItems.forEach(menuItem => {
            if (menuItem._item && menuItem._item.checked !== undefined) {
                const checkmark = menuItem.querySelector('.menu-checkmark');
                if (checkmark) {
                    checkmark.style.display = menuItem._item.checked ? 'inline' : 'none';
                }
            }
        });
    }
}

// Export
window.DropdownMenu = DropdownMenu;
