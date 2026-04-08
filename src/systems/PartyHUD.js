/**
 * PartyHUD — top-left overlay showing the player's spirit party.
 *
 * Displays each spirit's portrait/icon, name, level, and HP bar.
 * The lead (active) spirit is shown larger; bench spirits are compact.
 *
 * Layout (top-left, vertical):
 *   ┌─────────────────────┐
 *   │ [sprite] Sylphie  5 │  ← lead spirit (bigger)
 *   │ ████████░░  68/80   │  ← HP bar
 *   ├─────────────────────┤
 *   │ [s] Spirit2  Lv.4   │  ← bench (compact)
 *   │ [s] Spirit3  Lv.3   │
 *   └─────────────────────┘
 */
class PartyHUD {

    constructor(game) {
        this.game = game;

        // Layout
        this.margin = 14;
        this.panelWidth = 200;

        // Lead spirit slot
        this.leadPortraitSize = 36;
        this.leadRowH = 56;

        // Bench spirit slot
        this.benchPortraitSize = 22;
        this.benchRowH = 28;

        // HP bar
        this.hpBarW = 110;
        this.hpBarH = 6;

        // Sprite cache  { spriteKey → Image }
        this._spriteCache = {};

        // Animation
        this.hpFlashTimers = {}; // spiritId → remaining
    }

    /**
     * Get the cached sprite image or start loading it
     */
    _getSprite(src) {
        if (!src) return null;
        if (this._spriteCache[src]) {
            const img = this._spriteCache[src];
            return img._loaded ? img : null;
        }
        const img = new Image();
        img._loaded = false;
        img.onload = () => { img._loaded = true; };
        img.onerror = () => { img._loaded = false; };
        img.src = src;
        this._spriteCache[src] = img;
        return null;
    }

    update(deltaTime) {
        for (const id in this.hpFlashTimers) {
            this.hpFlashTimers[id] -= deltaTime;
            if (this.hpFlashTimers[id] <= 0) delete this.hpFlashTimers[id];
        }
    }

    render(ctx) {
        const pm = this.game.partyManager;
        if (!pm) return;

        const party = pm.getFullParty();
        if (!party || party.length === 0) return;

        const x = this.margin;
        let y = this.margin;

        ctx.save();

        // ── Lead spirit (index 0) ──
        const lead = party[0];
        const leadH = this.leadRowH;
        const pw = this.panelWidth;

        // Panel background
        ctx.beginPath();
        this._roundRect(ctx, x, y, pw, leadH, 8);
        ctx.fillStyle = 'rgba(12, 15, 24, 0.4)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(160, 170, 200, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Portrait
        const ps = this.leadPortraitSize;
        const portraitX = x + 6;
        const portraitY = y + (leadH - ps) / 2;
        this._drawPortrait(ctx, lead, portraitX, portraitY, ps);

        // Name + level
        const textX = portraitX + ps + 8;
        ctx.font = 'bold 13px "Cinzel", serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(230, 235, 245, 0.85)';
        ctx.fillText(lead.name || '???', textX, y + 6);

        ctx.font = '10px "Lato", Arial, sans-serif';
        ctx.fillStyle = 'rgba(180, 190, 210, 0.7)';
        ctx.fillText(`Lv. ${lead.level || 1}`, textX, y + 22);

        // HP bar
        const currentHP = lead.currentHP ?? lead.baseStats?.hp ?? 1;
        const maxHP = lead.baseStats?.hp ?? 1;
        const hpRatio = Math.max(0, Math.min(1, currentHP / maxHP));
        this._drawHPBar(ctx, textX, y + 36, this.hpBarW, this.hpBarH, hpRatio, currentHP, maxHP);

        y += leadH + 3;

        // ── Bench spirits (index 1+) ──
        if (party.length > 1) {
            const benchCount = party.length - 1;
            const benchH = benchCount * this.benchRowH + 6;

            // Bench panel background
            ctx.beginPath();
            this._roundRect(ctx, x, y, pw, benchH, 6);
            ctx.fillStyle = 'rgba(12, 15, 24, 0.3)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(140, 150, 175, 0.18)';
            ctx.lineWidth = 1;
            ctx.stroke();

            let by = y + 3;
            for (let i = 1; i < party.length; i++) {
                const spirit = party[i];
                const bps = this.benchPortraitSize;
                const bpx = x + 6;
                const bpy = by + (this.benchRowH - bps) / 2;

                // Mini portrait
                this._drawPortrait(ctx, spirit, bpx, bpy, bps);

                // Name
                ctx.font = '11px "Lato", Arial, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(210, 215, 230, 0.7)';
                const nameStr = spirit.name || '???';
                ctx.fillText(nameStr, bpx + bps + 6, by + this.benchRowH / 2 - 1);

                // Level — right-aligned
                ctx.font = '9px "Lato", Arial, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillStyle = 'rgba(160, 170, 190, 0.55)';
                ctx.fillText(`Lv.${spirit.level || 1}`, x + pw - 8, by + this.benchRowH / 2 - 1);

                // Mini HP pip (colored dot showing health status)
                const sHP = spirit.currentHP ?? spirit.baseStats?.hp ?? 1;
                const sMaxHP = spirit.baseStats?.hp ?? 1;
                const sRatio = Math.max(0, Math.min(1, sHP / sMaxHP));
                const dotColor = sRatio > 0.5 ? 'rgba(80, 200, 120, 0.7)'
                               : sRatio > 0.2 ? 'rgba(220, 180, 60, 0.7)'
                               : 'rgba(220, 60, 60, 0.7)';
                ctx.beginPath();
                ctx.arc(x + pw - 30, by + this.benchRowH / 2, 3, 0, Math.PI * 2);
                ctx.fillStyle = dotColor;
                ctx.fill();

                by += this.benchRowH;
            }
        }

        ctx.restore();
    }

    /**
     * Draw a spirit's portrait (sprite thumbnail or fallback circle)
     */
    _drawPortrait(ctx, spirit, x, y, size) {
        const img = this._getSprite(spirit.sprite || spirit.spriteSrc);

        ctx.save();

        // Clip to rounded rect
        ctx.beginPath();
        this._roundRect(ctx, x, y, size, size, 4);
        ctx.clip();

        // Background
        ctx.fillStyle = 'rgba(30, 35, 50, 0.6)';
        ctx.fillRect(x, y, size, size);

        if (img) {
            // Draw sprite centered and scaled to fill
            const aspect = img.width / img.height;
            let dw, dh;
            if (aspect >= 1) {
                dh = size;
                dw = size * aspect;
            } else {
                dw = size;
                dh = size / aspect;
            }
            const dx = x + (size - dw) / 2;
            const dy = y + (size - dh) / 2;
            ctx.drawImage(img, dx, dy, dw, dh);
        } else {
            // Fallback — type-colored circle with first letter
            const typeColors = {
                fire: '#e85d3a', water: '#4a90d9', wind: '#7ec87e',
                earth: '#c4a950', light: '#f0e060', dark: '#8060c0',
                ice: '#80d0e8', electric: '#e8d040'
            };
            const color = typeColors[spirit.type1] || '#888';
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size * 0.35, 0, Math.PI * 2);
            ctx.fill();

            ctx.font = `bold ${Math.round(size * 0.4)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText((spirit.name || '?')[0], x + size / 2, y + size / 2 + 1);
        }

        ctx.restore();

        // Border
        ctx.beginPath();
        this._roundRect(ctx, x, y, size, size, 4);
        ctx.strokeStyle = 'rgba(140, 150, 180, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    /**
     * Draw a horizontal HP bar with numeric label
     */
    _drawHPBar(ctx, x, y, w, h, ratio, current, max) {
        // Background track
        ctx.beginPath();
        this._roundRect(ctx, x, y, w, h, 3);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();

        // Filled portion — color shifts with HP
        const fillW = Math.max(0, w * ratio);
        if (fillW > 0) {
            const color = ratio > 0.5 ? 'rgba(80, 200, 120, 0.85)'
                        : ratio > 0.2 ? 'rgba(220, 180, 60, 0.85)'
                        : 'rgba(220, 60, 60, 0.85)';
            ctx.beginPath();
            this._roundRect(ctx, x, y, fillW, h, 3);
            ctx.fillStyle = color;
            ctx.fill();
        }

        // Numeric label
        ctx.font = '9px "Lato", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(200, 210, 225, 0.6)';
        ctx.fillText(`${current}/${max}`, x + w + 30, y + h / 2);
    }

    // ── Utility ──

    _roundRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}

// Export
window.PartyHUD = PartyHUD;
