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
            primary: 'rgba(46, 204, 113, 0.8)',
            primaryLight: 'rgba(46, 204, 113, 0.2)',
            primaryDark: 'rgba(39, 174, 96, 0.4)',
            accent: '#2ecc71',
            name: 'NPC'
        },
        chest: {
            primary: 'rgba(243, 156, 18, 0.8)',
            primaryLight: 'rgba(243, 156, 18, 0.2)',
            primaryDark: 'rgba(211, 84, 0, 0.4)',
            accent: '#f39c12',
            name: 'Chest'
        },
        portal: {
            primary: 'rgba(155, 89, 182, 0.8)',
            primaryLight: 'rgba(155, 89, 182, 0.2)',
            primaryDark: 'rgba(142, 68, 173, 0.4)',
            accent: '#9b59b6',
            name: 'Portal'
        },
        light: {
            primary: 'rgba(241, 196, 15, 0.8)',
            primaryLight: 'rgba(241, 196, 15, 0.2)',
            primaryDark: 'rgba(243, 156, 18, 0.4)',
            accent: '#f1c40f',
            name: 'Light'
        },
        spirit: {
            primary: 'rgba(52, 152, 219, 0.8)',
            primaryLight: 'rgba(52, 152, 219, 0.2)',
            primaryDark: 'rgba(41, 128, 185, 0.4)',
            accent: '#3498db',
            name: 'Spirit'
        },
        doodad: {
            primary: 'rgba(149, 165, 166, 0.8)',
            primaryLight: 'rgba(149, 165, 166, 0.2)',
            primaryDark: 'rgba(127, 140, 141, 0.4)',
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
            background: rgba(20, 20, 25, 0.95);
            border: 1px solid ${theme.primary};
            border-radius: 12px;
            padding: 0;
            color: #ecf0f1;
            font-family: 'Lato', sans-serif;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(12px);
            display: flex;
            flex-direction: column;
            z-index: 9999;
            pointer-events: auto;
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;
    }

    /**
     * Get header style for editor
     */
    static getHeaderStyle(theme) {
        return `
            padding: 16px 24px;
            background: linear-gradient(135deg, ${theme.primaryLight}, rgba(0,0,0,0));
            border-bottom: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px 12px 0 0;
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
            padding: 20px;
            pointer-events: auto;
            overscroll-behavior: contain;
        `;
    }

    /**
     * Get close button style
     */
    static getCloseButtonStyle() {
        return `
            background: transparent;
            border: none;
            color: #e74c3c;
            font-size: 20px;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
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
            border-radius: 8px;
            color: ${theme.accent};
            cursor: pointer;
            font-weight: 700;
            margin-bottom: 20px;
            font-size: 14px;
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        `;
    }

    /**
     * Get list item style
     */
    static getListItemStyle() {
        return `
            padding: 14px;
            margin-bottom: 10px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
    }

    /**
     * Get edit button style
     */
    static getEditButtonStyle() {
        return `
            background: rgba(52, 152, 219, 0.15);
            border: 1px solid rgba(52, 152, 219, 0.3);
            color: #3498db;
            padding: 6px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.2s;
        `;
    }

    /**
     * Get delete button style
     */
    static getDeleteButtonStyle() {
        return `
            background: rgba(231, 76, 60, 0.15);
            border: 1px solid rgba(231, 76, 60, 0.3);
            color: #e74c3c;
            padding: 6px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.2s;
        `;
    }

    /**
     * Get form field container style
     */
    static getFieldContainerStyle() {
        return `
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-bottom: 16px;
        `;
    }

    /**
     * Get form label style
     */
    static getLabelStyle() {
        return `
            font-size: 12px;
            color: #95a5a6;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        `;
    }

    /**
     * Get form input style
     */
    static getInputStyle() {
        return `
            padding: 10px 12px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            color: #ecf0f1;
            font-size: 14px;
            font-family: 'Lato', sans-serif;
            transition: all 0.2s;
            outline: none;
        `;
    }

    /**
     * Get section title style
     */
    static getSectionTitleStyle() {
        return `
            font-weight: 700;
            color: #fff;
            margin-top: 24px;
            margin-bottom: 12px;
            font-size: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 8px;
        `;
    }

    /**
     * Get save button style
     */
    static getSaveButtonStyle(theme) {
        return `
            flex: 1;
            padding: 12px;
            background: ${theme.primary};
            border: none;
            border-radius: 6px;
            color: #fff;
            cursor: pointer;
            font-weight: 700;
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
    }

    /**
     * Get cancel button style
     */
    static getCancelButtonStyle() {
        return `
            flex: 1;
            padding: 12px;
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            color: #bdc3c7;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
        `;
    }

    /**
     * Get empty state style
     */
    static getEmptyStateStyle() {
        return `
            padding: 40px 20px;
            text-align: center;
            color: #7f8c8d;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            border: 1px dashed rgba(255, 255, 255, 0.1);
            margin: 10px 0;
        `;
    }

    /**
     * Create standardized header HTML
     */
    static createHeader(theme, title, subtitle) {
        return `
            <div>
                <h3 style="margin: 0; font-size: 20px; font-weight: 700; color: ${theme.accent}; font-family: 'Cinzel', serif;">${title}</h3>
                <div style="font-size: 12px; color: #bdc3c7; margin-top: 4px;">${subtitle}</div>
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
        button.onmouseover = () => {
            button.style.background = 'rgba(231, 76, 60, 0.2)';
            button.style.transform = 'rotate(90deg)';
        };
        button.onmouseout = () => {
            button.style.background = 'transparent';
            button.style.transform = 'rotate(0deg)';
        };
    }

    /**
     * Apply hover effect to new button
     */
    static applyNewButtonHover(button, theme) {
        button.onmouseover = () => {
            button.style.background = theme.primary;
            button.style.color = '#fff';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = `0 4px 12px ${theme.primaryDark}`;
        };
        button.onmouseout = () => {
            button.style.background = theme.primaryLight;
            button.style.color = theme.accent;
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = 'none';
        };
    }

    /**
     * Apply hover effect to edit button
     */
    static applyEditButtonHover(button) {
        button.onmouseover = () => {
            button.style.background = 'rgba(52, 152, 219, 0.3)';
            button.style.borderColor = '#3498db';
        };
        button.onmouseout = () => {
            button.style.background = 'rgba(52, 152, 219, 0.15)';
            button.style.borderColor = 'rgba(52, 152, 219, 0.3)';
        };
    }

    /**
     * Apply hover effect to delete button
     */
    static applyDeleteButtonHover(button) {
        button.onmouseover = () => {
            button.style.background = 'rgba(231, 76, 60, 0.3)';
            button.style.borderColor = '#e74c3c';
        };
        button.onmouseout = () => {
            button.style.background = 'rgba(231, 76, 60, 0.15)';
            button.style.borderColor = 'rgba(231, 76, 60, 0.3)';
        };
    }

    /**
     * Apply hover effect to save button
     */
    static applySaveButtonHover(button, theme) {
        button.onmouseover = () => {
            button.style.filter = 'brightness(1.1)';
            button.style.transform = 'translateY(-1px)';
        };
        button.onmouseout = () => {
            button.style.filter = 'brightness(1)';
            button.style.transform = 'translateY(0)';
        };
    }

    /**
     * Apply hover effect to cancel button
     */
    static applyCancelButtonHover(button) {
        button.onmouseover = () => {
            button.style.background = 'rgba(255, 255, 255, 0.1)';
            button.style.color = '#fff';
        };
        button.onmouseout = () => {
            button.style.background = 'transparent';
            button.style.color = '#bdc3c7';
        };
    }

    /**
     * Apply focus effect to input
     */
    static applyInputFocus(input) {
        input.onfocus = () => {
            input.style.borderColor = '#3498db';
            input.style.background = 'rgba(0, 0, 0, 0.5)';
        };
        input.onblur = () => {
            input.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            input.style.background = 'rgba(0, 0, 0, 0.3)';
        };
    }
}

// Make globally available
window.EditorStyles = EditorStyles;
