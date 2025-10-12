/**
 * EditorStyles.js
 * Standardized styling and theming for all template editors
 * Provides consistent look and feel across NPC, Chest, Portal, Light, and other editors
 */

class EditorStyles {
    /**
     * Color themes for different editor types
     */
    static THEMES = {
        npc: {
            primary: 'rgba(46, 204, 113, 0.6)',
            primaryLight: 'rgba(46, 204, 113, 0.3)',
            primaryDark: 'rgba(39, 174, 96, 0.3)',
            accent: '#2ecc71',
            name: 'NPC'
        },
        chest: {
            primary: 'rgba(243, 156, 18, 0.6)',
            primaryLight: 'rgba(243, 156, 18, 0.3)',
            primaryDark: 'rgba(211, 84, 0, 0.3)',
            accent: '#f39c12',
            name: 'Chest'
        },
        portal: {
            primary: 'rgba(155, 89, 182, 0.6)',
            primaryLight: 'rgba(155, 89, 182, 0.3)',
            primaryDark: 'rgba(142, 68, 173, 0.3)',
            accent: '#9b59b6',
            name: 'Portal'
        },
        light: {
            primary: 'rgba(241, 196, 15, 0.6)',
            primaryLight: 'rgba(241, 196, 15, 0.3)',
            primaryDark: 'rgba(243, 156, 18, 0.3)',
            accent: '#f1c40f',
            name: 'Light'
        },
        spirit: {
            primary: 'rgba(52, 152, 219, 0.6)',
            primaryLight: 'rgba(52, 152, 219, 0.3)',
            primaryDark: 'rgba(41, 128, 185, 0.3)',
            accent: '#3498db',
            name: 'Spirit'
        },
        doodad: {
            primary: 'rgba(149, 165, 166, 0.6)',
            primaryLight: 'rgba(149, 165, 166, 0.3)',
            primaryDark: 'rgba(127, 140, 141, 0.3)',
            accent: '#95a5a6',
            name: 'Doodad'
        }
    };

    /**
     * Get panel style for editor
     */
    static getPanelStyle(theme) {
        return `
            position: fixed;
            right: 20px;
            top: 80px;
            width: 380px;
            max-height: 85vh;
            background: rgba(30, 30, 40, 0.95);
            border: 2px solid ${theme.primary};
            border-radius: 8px;
            padding: 0;
            color: #ecf0f1;
            font-family: 'Segoe UI', Arial, sans-serif;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(10px);
            display: flex;
            flex-direction: column;
            z-index: 9999;
            pointer-events: auto;
        `;
    }

    /**
     * Get header style for editor
     */
    static getHeaderStyle(theme) {
        return `
            padding: 15px 20px;
            background: linear-gradient(135deg, ${theme.primaryLight}, ${theme.primaryDark});
            border-bottom: 1px solid ${theme.primaryLight};
            border-radius: 6px 6px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
    }

    /**
     * Get content area style
     */
    static getContentStyle() {
        return `
            overflow-y: auto;
            flex: 1;
            padding: 15px;
            pointer-events: auto;
            overscroll-behavior: contain;
        `;
    }

    /**
     * Get close button style
     */
    static getCloseButtonStyle() {
        return `
            background: rgba(231, 76, 60, 0.2);
            border: 1px solid rgba(231, 76, 60, 0.4);
            color: #e74c3c;
            font-size: 24px;
            width: 32px;
            height: 32px;
            border-radius: 4px;
            cursor: pointer;
            line-height: 1;
            padding: 0;
            transition: background 0.2s;
        `;
    }

    /**
     * Get new button style
     */
    static getNewButtonStyle(theme) {
        return `
            width: 100%;
            padding: 12px;
            background: ${theme.primaryLight};
            border: 1px solid ${theme.primary};
            border-radius: 6px;
            color: ${theme.accent};
            cursor: pointer;
            font-weight: bold;
            margin-bottom: 15px;
            font-size: 14px;
            transition: background 0.2s;
        `;
    }

    /**
     * Get list item style
     */
    static getListItemStyle() {
        return `
            padding: 12px;
            margin-bottom: 8px;
            background: rgba(52, 73, 94, 0.3);
            border: 1px solid rgba(149, 165, 166, 0.3);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        `;
    }

    /**
     * Get edit button style
     */
    static getEditButtonStyle() {
        return `
            background: rgba(52, 152, 219, 0.2);
            border: 1px solid rgba(52, 152, 219, 0.4);
            color: #3498db;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
        `;
    }

    /**
     * Get delete button style
     */
    static getDeleteButtonStyle() {
        return `
            background: rgba(231, 76, 60, 0.2);
            border: 1px solid rgba(231, 76, 60, 0.4);
            color: #e74c3c;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
        `;
    }

    /**
     * Get form field container style
     */
    static getFieldContainerStyle() {
        return `
            display: flex;
            flex-direction: column;
            gap: 4px;
        `;
    }

    /**
     * Get form label style
     */
    static getLabelStyle() {
        return `
            font-size: 12px;
            color: #bdc3c7;
            font-weight: 500;
        `;
    }

    /**
     * Get form input style
     */
    static getInputStyle() {
        return `
            padding: 8px;
            background: rgba(52, 73, 94, 0.5);
            border: 1px solid rgba(149, 165, 166, 0.3);
            border-radius: 4px;
            color: #ecf0f1;
            font-size: 13px;
            transition: border-color 0.2s;
        `;
    }

    /**
     * Get section title style
     */
    static getSectionTitleStyle() {
        return `
            font-weight: bold;
            color: #3498db;
            margin-top: 8px;
            margin-bottom: 8px;
        `;
    }

    /**
     * Get save button style
     */
    static getSaveButtonStyle(theme) {
        return `
            flex: 1;
            padding: 10px;
            background: ${theme.primaryLight};
            border: 1px solid ${theme.primary};
            border-radius: 6px;
            color: ${theme.accent};
            cursor: pointer;
            font-weight: bold;
            transition: background 0.2s;
        `;
    }

    /**
     * Get cancel button style
     */
    static getCancelButtonStyle() {
        return `
            flex: 1;
            padding: 10px;
            background: rgba(127, 140, 141, 0.2);
            border: 1px solid rgba(127, 140, 141, 0.4);
            border-radius: 6px;
            color: #95a5a6;
            cursor: pointer;
            transition: background 0.2s;
        `;
    }

    /**
     * Get empty state style
     */
    static getEmptyStateStyle() {
        return `
            padding: 20px;
            text-align: center;
            color: #7f8c8d;
            background: rgba(52, 73, 94, 0.2);
            border-radius: 6px;
            margin: 10px 0;
        `;
    }

    /**
     * Create standardized header HTML
     */
    static createHeader(theme, title, subtitle) {
        return `
            <div>
                <h3 style="margin: 0; font-size: 18px; color: ${theme.accent};">${title}</h3>
                <div style="font-size: 12px; color: #95a5a6; margin-top: 4px;">${subtitle}</div>
            </div>
        `;
    }

    /**
     * Apply hover effect to button
     */
    static applyButtonHover(button, hoverColor, normalColor) {
        button.onmouseover = () => button.style.background = hoverColor;
        button.onmouseout = () => button.style.background = normalColor;
    }

    /**
     * Apply hover effect to close button
     */
    static applyCloseButtonHover(button) {
        button.onmouseover = () => button.style.background = 'rgba(231, 76, 60, 0.4)';
        button.onmouseout = () => button.style.background = 'rgba(231, 76, 60, 0.2)';
    }

    /**
     * Apply hover effect to new button
     */
    static applyNewButtonHover(button, theme) {
        button.onmouseover = () => button.style.background = theme.primary;
        button.onmouseout = () => button.style.background = theme.primaryLight;
    }

    /**
     * Apply hover effect to edit button
     */
    static applyEditButtonHover(button) {
        button.onmouseover = () => button.style.background = 'rgba(52, 152, 219, 0.3)';
        button.onmouseout = () => button.style.background = 'rgba(52, 152, 219, 0.2)';
    }

    /**
     * Apply hover effect to delete button
     */
    static applyDeleteButtonHover(button) {
        button.onmouseover = () => button.style.background = 'rgba(231, 76, 60, 0.3)';
        button.onmouseout = () => button.style.background = 'rgba(231, 76, 60, 0.2)';
    }

    /**
     * Apply hover effect to save button
     */
    static applySaveButtonHover(button, theme) {
        button.onmouseover = () => button.style.background = theme.primary;
        button.onmouseout = () => button.style.background = theme.primaryLight;
    }

    /**
     * Apply hover effect to cancel button
     */
    static applyCancelButtonHover(button) {
        button.onmouseover = () => button.style.background = 'rgba(127, 140, 141, 0.3)';
        button.onmouseout = () => button.style.background = 'rgba(127, 140, 141, 0.2)';
    }

    /**
     * Apply focus effect to input
     */
    static applyInputFocus(input) {
        input.onfocus = () => input.style.borderColor = 'rgba(52, 152, 219, 0.6)';
        input.onblur = () => input.style.borderColor = 'rgba(149, 165, 166, 0.3)';
    }
}

// Make globally available
window.EditorStyles = EditorStyles;
