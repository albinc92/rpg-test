/**
 * CrashReporter - Global error handler with in-game modal & Discord webhook reporting
 *
 * Catches uncaught exceptions and unhandled promise rejections, renders a
 * styled canvas overlay, and POSTs a structured report to a Discord webhook.
 */
class CrashReporter {
    constructor() {
        // ── Discord webhook URL — set this to your channel's webhook ──
        this.webhookUrl = '';  // e.g. 'https://discord.com/api/webhooks/xxxx/yyyy'

        // State
        this._showing = false;
        this._error = null;       // { message, stack, timestamp }
        this._gameState = null;   // snapshot of game context at crash time
        this._sending = false;
        this._sent = false;
        this._sendError = null;
        this._dismissed = false;

        // Overlay DOM element — we use a real HTML overlay rather than canvas so
        // it works even when the canvas render loop has crashed.
        this._overlay = null;

        // Collect recent console errors for context (circular buffer, last 20)
        this._recentErrors = [];
        this._maxRecentErrors = 20;
        this._hookConsole();

        // Install global handlers
        this._installHandlers();
    }

    /* ───────────────────── Configuration ───────────────────── */

    /**
     * Set the Discord webhook URL for crash reports.
     * Call this early (e.g. after engine init) with your webhook URL.
     */
    setWebhookUrl(url) {
        this.webhookUrl = url;
    }

    /* ───────────────────── Console hook ───────────────────── */

    _hookConsole() {
        const origError = console.error.bind(console);
        console.error = (...args) => {
            this._recentErrors.push({
                time: new Date().toISOString(),
                message: args.map(a => {
                    try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
                    catch { return '[unserializable]'; }
                }).join(' ')
            });
            if (this._recentErrors.length > this._maxRecentErrors) {
                this._recentErrors.shift();
            }
            origError(...args);
        };
    }

    /* ───────────────────── Global error handlers ───────────────────── */

    _installHandlers() {
        window.addEventListener('error', (event) => {
            this._handleError({
                message: event.message || 'Unknown error',
                stack: event.error?.stack || `at ${event.filename}:${event.lineno}:${event.colno}`,
                source: 'uncaughtException'
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason;
            this._handleError({
                message: reason?.message || String(reason) || 'Unhandled promise rejection',
                stack: reason?.stack || '(no stack)',
                source: 'unhandledRejection'
            });
        });
    }

    /* ───────────────────── Core logic ───────────────────── */

    _handleError(errorInfo) {
        // Don't stack multiple modals
        if (this._showing) return;
        this._showing = true;
        this._sent = false;
        this._sending = false;
        this._sendError = null;
        this._dismissed = false;

        this._error = {
            message: errorInfo.message,
            stack: errorInfo.stack,
            source: errorInfo.source,
            timestamp: new Date().toISOString()
        };

        // Snapshot game state
        this._gameState = this._captureGameState();

        // Show the overlay
        this._showOverlay();

        // Auto-send if webhook is configured
        if (this.webhookUrl) {
            this._sendReport();
        }
    }

    _captureGameState() {
        const game = window.game;
        if (!game) return { note: 'Game engine not available' };

        const state = {};
        try { state.currentState = game.stateManager?.getCurrentState() || 'unknown'; } catch { state.currentState = 'error'; }
        try { state.currentMapId = game.currentMapId || 'unknown'; } catch { state.currentMapId = 'error'; }
        try { state.fps = game.performanceMonitor?.currentFPS?.toFixed(1) || '?'; } catch { state.fps = '?'; }
        try {
            const p = game.player;
            if (p) state.playerPos = `(${Math.round(p.x)}, ${Math.round(p.y)})`;
        } catch { /* ignore */ }
        try {
            state.stateStack = game.stateManager?.stateStack?.join(' → ') || 'unknown';
        } catch { state.stateStack = 'error'; }
        try {
            state.resolution = `${game.CANVAS_WIDTH}x${game.CANVAS_HEIGHT}`;
        } catch { /* ignore */ }
        try {
            const party = game.partyManager;
            if (party) state.partySize = party.getParty?.()?.length || 0;
        } catch { /* ignore */ }

        state.userAgent = navigator.userAgent;
        state.platform = navigator.platform;
        state.isElectron = !!window.electronAPI;
        state.recentErrors = [...this._recentErrors];

        return state;
    }

    /* ───────────────────── Webhook ───────────────────── */

    async _sendReport() {
        if (!this.webhookUrl || this._sending || this._sent) return;
        this._sending = true;
        this._updateStatus('Sending report…');

        const embed = {
            title: '🐛 Crash Report',
            color: 0xFF4444,
            timestamp: this._error.timestamp,
            fields: [
                { name: 'Error', value: this._truncate(this._error.message, 1024), inline: false },
                { name: 'Source', value: this._error.source || 'unknown', inline: true },
                { name: 'State', value: this._gameState?.currentState || '?', inline: true },
                { name: 'Map', value: this._gameState?.currentMapId || '?', inline: true },
            ]
        };

        // Add optional fields
        if (this._gameState?.playerPos) {
            embed.fields.push({ name: 'Player', value: this._gameState.playerPos, inline: true });
        }
        if (this._gameState?.stateStack) {
            embed.fields.push({ name: 'State Stack', value: this._gameState.stateStack, inline: false });
        }
        if (this._gameState?.resolution) {
            embed.fields.push({ name: 'Resolution', value: this._gameState.resolution, inline: true });
        }
        if (this._gameState?.fps) {
            embed.fields.push({ name: 'FPS', value: this._gameState.fps, inline: true });
        }

        // Stack trace as a code block (capped to 1024 chars)
        embed.fields.push({
            name: 'Stack Trace',
            value: '```\n' + this._truncate(this._error.stack, 990) + '\n```',
            inline: false
        });

        // Recent console errors
        if (this._gameState?.recentErrors?.length) {
            const recent = this._gameState.recentErrors
                .slice(-5)
                .map(e => `[${e.time.split('T')[1]?.split('.')[0] || '?'}] ${e.message}`)
                .join('\n');
            embed.fields.push({
                name: 'Recent Console Errors',
                value: '```\n' + this._truncate(recent, 990) + '\n```',
                inline: false
            });
        }

        // Platform info footer
        embed.footer = {
            text: `${this._gameState?.platform || '?'} | Electron: ${this._gameState?.isElectron ? 'Yes' : 'No'}`
        };

        const payload = {
            username: 'Crash Reporter',
            embeds: [embed]
        };

        try {
            // Use Electron IPC if available (avoids CORS), otherwise direct fetch
            if (window.electronAPI?.sendCrashReport) {
                const result = await window.electronAPI.sendCrashReport(this.webhookUrl, payload);
                if (!result.success) throw new Error(result.error || 'IPC send failed');
            } else {
                const resp = await fetch(this.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            }
            this._sent = true;
            this._sending = false;
            this._updateStatus('Report sent — thank you!');
        } catch (e) {
            this._sending = false;
            this._sendError = e.message;
            this._updateStatus('Failed to send report.');
            console.error('[CrashReporter] Webhook send failed:', e);
        }
    }

    /* ───────────────────── HTML Overlay UI ───────────────────── */

    _showOverlay() {
        if (this._overlay) this._overlay.remove();

        const overlay = document.createElement('div');
        overlay.id = 'crash-overlay';
        overlay.innerHTML = `
            <style>
                #crash-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.85);
                    font-family: 'Lato', 'Segoe UI', sans-serif;
                    animation: crash-fadein 0.3s ease;
                }
                @keyframes crash-fadein {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                #crash-modal {
                    background: #1a1a2e;
                    border: 1px solid rgba(255, 68, 68, 0.4);
                    border-radius: 12px;
                    padding: 32px 36px;
                    max-width: 560px;
                    width: 90%;
                    color: #e0e0e0;
                    box-shadow: 0 0 40px rgba(255, 68, 68, 0.15), 0 8px 32px rgba(0,0,0,0.6);
                }
                #crash-modal h2 {
                    margin: 0 0 8px;
                    font-family: 'Cinzel', serif;
                    font-size: 22px;
                    color: #ff6666;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                #crash-modal .subtitle {
                    color: #999;
                    font-size: 14px;
                    margin-bottom: 18px;
                }
                #crash-error-box {
                    background: rgba(0,0,0,0.4);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 8px;
                    padding: 12px 14px;
                    font-family: 'Consolas', 'Courier New', monospace;
                    font-size: 12px;
                    color: #ff9999;
                    max-height: 140px;
                    overflow-y: auto;
                    white-space: pre-wrap;
                    word-break: break-all;
                    margin-bottom: 16px;
                    line-height: 1.5;
                }
                #crash-state-box {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 6px 16px;
                    font-size: 13px;
                    margin-bottom: 18px;
                    padding: 10px 14px;
                    background: rgba(74,158,255,0.06);
                    border-radius: 8px;
                    border: 1px solid rgba(74,158,255,0.12);
                }
                #crash-state-box .label {
                    color: #4a9eff;
                    font-weight: 600;
                }
                #crash-state-box .value {
                    color: #ccc;
                    text-align: right;
                }
                #crash-status {
                    font-size: 13px;
                    color: #888;
                    margin-bottom: 14px;
                    min-height: 18px;
                    transition: color 0.2s;
                }
                #crash-status.success { color: #4ade80; }
                #crash-status.error   { color: #f87171; }
                #crash-buttons {
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                }
                #crash-buttons button {
                    padding: 9px 22px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-family: 'Lato', sans-serif;
                    cursor: pointer;
                    transition: background 0.15s, transform 0.1s;
                }
                #crash-buttons button:active { transform: scale(0.97); }
                #crash-btn-resume {
                    background: #4a9eff;
                    color: #fff;
                }
                #crash-btn-resume:hover { background: #3b8de6; }
                #crash-btn-retry {
                    background: rgba(255,255,255,0.1);
                    color: #ccc;
                }
                #crash-btn-retry:hover { background: rgba(255,255,255,0.18); }
                /* Scrollbar for error box */
                #crash-error-box::-webkit-scrollbar { width: 6px; }
                #crash-error-box::-webkit-scrollbar-track { background: transparent; }
                #crash-error-box::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
            </style>
            <div id="crash-modal">
                <h2>⚠️ Something went wrong</h2>
                <div class="subtitle">An unexpected error occurred. A crash report has been sent automatically.</div>
                <div id="crash-error-box"></div>
                <div id="crash-state-box"></div>
                <div id="crash-status"></div>
                <div id="crash-buttons">
                    <button id="crash-btn-retry" style="display:none">Retry Send</button>
                    <button id="crash-btn-resume">Continue Playing</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this._overlay = overlay;

        // Populate error box
        const errorBox = overlay.querySelector('#crash-error-box');
        errorBox.textContent = `${this._error.message}\n\n${this._error.stack}`;

        // Populate state info
        const stateBox = overlay.querySelector('#crash-state-box');
        const stateFields = [
            ['Game State', this._gameState?.currentState],
            ['Map', this._gameState?.currentMapId],
            ['Player', this._gameState?.playerPos],
            ['FPS', this._gameState?.fps],
            ['Resolution', this._gameState?.resolution],
            ['State Stack', this._gameState?.stateStack],
        ];
        stateBox.innerHTML = stateFields
            .filter(([, v]) => v)
            .map(([label, value]) => `<span class="label">${label}</span><span class="value">${value}</span>`)
            .join('');

        // Update status
        if (!this.webhookUrl) {
            this._updateStatus('No webhook configured — report not sent.');
        }

        // Button handlers
        overlay.querySelector('#crash-btn-resume').addEventListener('click', () => {
            this._dismiss();
        });
        overlay.querySelector('#crash-btn-retry').addEventListener('click', () => {
            this._sent = false;
            this._sendError = null;
            this._sendReport();
        });

        // ESC to dismiss
        this._escHandler = (e) => {
            if (e.key === 'Escape') this._dismiss();
        };
        document.addEventListener('keydown', this._escHandler);
    }

    _updateStatus(text) {
        const el = this._overlay?.querySelector('#crash-status');
        if (!el) return;
        el.textContent = text;
        el.className = '';
        if (this._sent) el.classList.add('success');
        else if (this._sendError) {
            el.classList.add('error');
            // Show retry button on failure
            const retryBtn = this._overlay.querySelector('#crash-btn-retry');
            if (retryBtn) retryBtn.style.display = '';
        }
    }

    _dismiss() {
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
        if (this._escHandler) {
            document.removeEventListener('keydown', this._escHandler);
            this._escHandler = null;
        }
        this._showing = false;
        this._dismissed = true;
    }

    /* ───────────────────── Helpers ───────────────────── */

    _truncate(str, max) {
        if (!str) return '';
        return str.length > max ? str.slice(0, max - 3) + '…' : str;
    }

    /**
     * Manually trigger the crash reporter (for testing).
     * Example: window.crashReporter.test()
     */
    test() {
        this._handleError({
            message: 'Test crash — this is not a real error',
            stack: 'CrashReporter.test()\n  at GameEngine.update()\n  at requestAnimationFrame()',
            source: 'manual-test'
        });
    }
}

// Export globally
window.CrashReporter = CrashReporter;
