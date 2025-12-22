/**
 * ScriptEngine - NPC Script Parser and Executor
 * 
 * Provides a simple scripting language for NPC dialogues and interactions.
 * Supports conditions, variables, inventory operations, shops, and rich text.
 * 
 * SCRIPT SYNTAX:
 * ==============
 * 
 * // Comments
 * message "Hello <b>traveler</b>!";                    // Show message (supports HTML)
 * additem "gold", 100;                                 // Give item to player
 * delitem "quest_item", 1;                             // Take item from player
 * addgold 100;                                         // Give gold (shorthand)
 * delgold 50;                                          // Take gold (shorthand)
 * setvar "quest_started", true;                        // Set global variable
 * playsound "coin.mp3";                                // Play sound effect
 * wait 1000;                                           // Wait milliseconds
 * 
 * // Shop System
 * shop "Shop Name", "item_id", price, "item_id2", price2;
 * shop "Limited Shop", "rare_item", 500, 3;            // 3 = stock limit
 * 
 * // Conditions
 * if (hasitem("key", 1)) {
 *     message "You have the key!";
 * } else if (getvar("talked_before")) {
 *     message "Find the key!";
 * } else {
 *     message "Hello stranger!";
 *     setvar "talked_before", true;
 * }
 * 
 * // Gold check
 * if (getgold() >= 100) {
 *     message "You have enough gold!";
 * }
 * 
 * // Player choices
 * choice "Yes", "No", "Maybe";
 * if (choice == 0) {
 *     message "You chose Yes!";
 * }
 * 
 * // Labels and jumps
 * label start:
 * message "Hello!";
 * goto start;
 * 
 * end;  // End script execution
 */
class ScriptEngine {
    constructor(game) {
        this.game = game;
        
        // Script execution state
        this.currentScript = null;
        this.currentNPC = null;
        this.tokens = [];
        this.position = 0;
        this.labels = {};
        this.isRunning = false;
        this.isPaused = false;
        this.waitUntil = 0;
        
        // Last choice result (0-indexed)
        this.lastChoice = -1;
        
        // Callback when script ends
        this.onComplete = null;
        
        // Callback for showing messages (returns promise that resolves when player continues)
        this.onMessage = null;
        
        // Callback for showing choices (returns promise with choice index)
        this.onChoice = null;
        
        // Built-in functions available in conditions
        this.functions = {
            'hasitem': (itemId, qty = 1) => this.game.inventoryManager?.hasItem(itemId, qty) || false,
            'getvar': (name, defaultVal = null) => this.game.gameVariables?.get(name, defaultVal),
            'getitemqty': (itemId) => this.game.inventoryManager?.getItemQuantity(itemId) || 0,
            'random': (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
            'choice': () => this.lastChoice,
            'getgold': () => this.game.inventoryManager?.getItemQuantity('gold_coin') || 0
        };
        
        // Built-in commands
        this.commands = {
            'message': this.cmdMessage.bind(this),
            'additem': this.cmdAddItem.bind(this),
            'delitem': this.cmdDelItem.bind(this),
            'setvar': this.cmdSetVar.bind(this),
            'incvar': this.cmdIncVar.bind(this),
            'decvar': this.cmdDecVar.bind(this),
            'playsound': this.cmdPlaySound.bind(this),
            'wait': this.cmdWait.bind(this),
            'choice': this.cmdChoice.bind(this),
            'goto': this.cmdGoto.bind(this),
            'end': this.cmdEnd.bind(this),
            'log': this.cmdLog.bind(this),
            'teleport': this.cmdTeleport.bind(this),
            'heal': this.cmdHeal.bind(this),
            'damage': this.cmdDamage.bind(this),
            'setflag': this.cmdSetFlag.bind(this),  // Alias for setvar with true
            'clearflag': this.cmdClearFlag.bind(this),  // Alias for setvar with false
            'shop': this.cmdShop.bind(this),  // Open shop interface
            'addgold': this.cmdAddGold.bind(this),  // Shorthand for adding gold
            'delgold': this.cmdDelGold.bind(this)   // Shorthand for removing gold
        };
    }
    
    /**
     * Tokenize a script string into tokens
     * @param {string} script - Raw script text
     * @returns {Array} Tokens
     */
    tokenize(script) {
        const tokens = [];
        let i = 0;
        const len = script.length;
        
        while (i < len) {
            // Skip whitespace
            if (/\s/.test(script[i])) {
                i++;
                continue;
            }
            
            // Skip comments
            if (script.substring(i, i + 2) === '//') {
                while (i < len && script[i] !== '\n') i++;
                continue;
            }
            
            // Multi-line comments
            if (script.substring(i, i + 2) === '/*') {
                i += 2;
                while (i < len - 1 && script.substring(i, i + 2) !== '*/') i++;
                i += 2;
                continue;
            }
            
            // String literals (double quotes)
            if (script[i] === '"') {
                i++;
                let str = '';
                while (i < len && script[i] !== '"') {
                    if (script[i] === '\\' && i + 1 < len) {
                        i++;
                        switch (script[i]) {
                            case 'n': str += '\n'; break;
                            case 't': str += '\t'; break;
                            case '"': str += '"'; break;
                            case '\\': str += '\\'; break;
                            default: str += script[i];
                        }
                    } else {
                        str += script[i];
                    }
                    i++;
                }
                i++; // Skip closing quote
                tokens.push({ type: 'STRING', value: str });
                continue;
            }
            
            // String literals (single quotes)
            if (script[i] === "'") {
                i++;
                let str = '';
                while (i < len && script[i] !== "'") {
                    if (script[i] === '\\' && i + 1 < len) {
                        i++;
                        str += script[i];
                    } else {
                        str += script[i];
                    }
                    i++;
                }
                i++;
                tokens.push({ type: 'STRING', value: str });
                continue;
            }
            
            // Numbers
            if (/[0-9]/.test(script[i]) || (script[i] === '-' && /[0-9]/.test(script[i + 1]))) {
                let num = '';
                if (script[i] === '-') {
                    num = '-';
                    i++;
                }
                while (i < len && /[0-9.]/.test(script[i])) {
                    num += script[i];
                    i++;
                }
                tokens.push({ type: 'NUMBER', value: parseFloat(num) });
                continue;
            }
            
            // Identifiers and keywords
            if (/[a-zA-Z_]/.test(script[i])) {
                let id = '';
                while (i < len && /[a-zA-Z0-9_]/.test(script[i])) {
                    id += script[i];
                    i++;
                }
                
                // Check for keywords
                const keywords = ['if', 'else', 'true', 'false', 'null', 'and', 'or', 'not', 'label', 'goto', 'end'];
                if (keywords.includes(id.toLowerCase())) {
                    tokens.push({ type: 'KEYWORD', value: id.toLowerCase() });
                } else {
                    tokens.push({ type: 'IDENTIFIER', value: id });
                }
                continue;
            }
            
            // Operators and punctuation
            const twoChar = script.substring(i, i + 2);
            if (['==', '!=', '>=', '<=', '&&', '||'].includes(twoChar)) {
                tokens.push({ type: 'OPERATOR', value: twoChar });
                i += 2;
                continue;
            }
            
            const oneChar = script[i];
            if ('(){};,:<>=+-*/%!'.includes(oneChar)) {
                tokens.push({ type: 'PUNCTUATION', value: oneChar });
                i++;
                continue;
            }
            
            // Unknown character, skip
            console.warn(`[ScriptEngine] Unknown character: ${script[i]}`);
            i++;
        }
        
        return tokens;
    }
    
    /**
     * Parse and prepare a script for execution
     * @param {string} script - Script source code
     * @param {Object} npc - NPC running this script
     */
    async run(script, npc = null) {
        if (!script || typeof script !== 'string') {
            console.warn('[ScriptEngine] No script provided');
            return;
        }
        
        this.currentScript = script;
        this.currentNPC = npc;
        this.tokens = this.tokenize(script);
        this.position = 0;
        this.isRunning = true;
        this.isPaused = false;
        this.lastChoice = -1;
        
        // First pass: find all labels
        this.labels = {};
        for (let i = 0; i < this.tokens.length; i++) {
            if (this.tokens[i].type === 'KEYWORD' && this.tokens[i].value === 'label') {
                if (i + 1 < this.tokens.length && this.tokens[i + 1].type === 'IDENTIFIER') {
                    this.labels[this.tokens[i + 1].value] = i + 3; // Skip "label name:"
                }
            }
        }
        
        console.log(`[ScriptEngine] Running script for NPC: ${npc?.name || 'unknown'}`);
        
        try {
            await this.execute();
        } catch (error) {
            console.error('[ScriptEngine] Execution error:', error);
        }
        
        this.isRunning = false;
        if (this.onComplete) {
            this.onComplete();
        }
    }
    
    /**
     * Main execution loop
     */
    async execute() {
        while (this.isRunning && this.position < this.tokens.length) {
            // Handle wait
            if (this.waitUntil > 0) {
                if (Date.now() < this.waitUntil) {
                    await new Promise(r => setTimeout(r, 16));
                    continue;
                }
                this.waitUntil = 0;
            }
            
            // Handle pause
            if (this.isPaused) {
                await new Promise(r => setTimeout(r, 16));
                continue;
            }
            
            await this.executeStatement();
        }
    }
    
    /**
     * Execute a single statement
     */
    async executeStatement() {
        const token = this.peek();
        if (!token) return;
        
        // Handle keywords
        if (token.type === 'KEYWORD') {
            switch (token.value) {
                case 'if':
                    await this.executeIf();
                    return;
                case 'label':
                    // Skip label declaration
                    this.consume(); // label
                    this.consume(); // name
                    this.consumeIf('PUNCTUATION', ':');
                    return;
                case 'end':
                    this.consume();
                    this.consumeIf('PUNCTUATION', ';');
                    this.isRunning = false;
                    return;
                case 'goto':
                    this.consume();
                    const labelName = this.consume();
                    if (labelName && this.labels[labelName.value] !== undefined) {
                        this.position = this.labels[labelName.value];
                    } else {
                        console.warn(`[ScriptEngine] Unknown label: ${labelName?.value}`);
                    }
                    this.consumeIf('PUNCTUATION', ';');
                    return;
            }
        }
        
        // Handle commands
        if (token.type === 'IDENTIFIER') {
            const cmdName = token.value.toLowerCase();
            if (this.commands[cmdName]) {
                this.consume();
                await this.commands[cmdName]();
                this.consumeIf('PUNCTUATION', ';');
                return;
            }
        }
        
        // Skip unknown tokens
        this.consume();
    }
    
    /**
     * Execute if/else if/else block
     */
    async executeIf() {
        this.consume(); // 'if'
        this.consumeIf('PUNCTUATION', '(');
        const condition = this.evaluateExpression();
        this.consumeIf('PUNCTUATION', ')');
        
        if (condition) {
            await this.executeBlock();
            // Skip else blocks
            while (this.peek()?.value === 'else') {
                this.consume(); // else
                if (this.peek()?.value === 'if') {
                    this.consume(); // if
                    this.consumeIf('PUNCTUATION', '(');
                    this.skipExpression();
                    this.consumeIf('PUNCTUATION', ')');
                }
                this.skipBlock();
            }
        } else {
            this.skipBlock();
            // Check for else if / else
            while (this.peek()?.value === 'else') {
                this.consume(); // else
                if (this.peek()?.value === 'if') {
                    this.consume(); // if
                    this.consumeIf('PUNCTUATION', '(');
                    const elseIfCond = this.evaluateExpression();
                    this.consumeIf('PUNCTUATION', ')');
                    
                    if (elseIfCond) {
                        await this.executeBlock();
                        // Skip remaining else blocks
                        while (this.peek()?.value === 'else') {
                            this.consume();
                            if (this.peek()?.value === 'if') {
                                this.consume();
                                this.consumeIf('PUNCTUATION', '(');
                                this.skipExpression();
                                this.consumeIf('PUNCTUATION', ')');
                            }
                            this.skipBlock();
                        }
                        return;
                    } else {
                        this.skipBlock();
                    }
                } else {
                    // else without if
                    await this.executeBlock();
                    return;
                }
            }
        }
    }
    
    /**
     * Execute a block of statements { ... }
     */
    async executeBlock() {
        this.consumeIf('PUNCTUATION', '{');
        let depth = 1;
        
        while (this.position < this.tokens.length && depth > 0) {
            const token = this.peek();
            if (token?.value === '{') depth++;
            if (token?.value === '}') {
                depth--;
                if (depth === 0) {
                    this.consume();
                    return;
                }
            }
            await this.executeStatement();
        }
    }
    
    /**
     * Skip a block without executing
     */
    skipBlock() {
        this.consumeIf('PUNCTUATION', '{');
        let depth = 1;
        
        while (this.position < this.tokens.length && depth > 0) {
            const token = this.consume();
            if (token?.value === '{') depth++;
            if (token?.value === '}') depth--;
        }
    }
    
    /**
     * Evaluate an expression (for conditions)
     */
    evaluateExpression() {
        return this.evaluateOr();
    }
    
    evaluateOr() {
        let left = this.evaluateAnd();
        
        while (this.peek()?.value === '||' || this.peek()?.value === 'or') {
            this.consume();
            const right = this.evaluateAnd();
            left = left || right;
        }
        
        return left;
    }
    
    evaluateAnd() {
        let left = this.evaluateComparison();
        
        while (this.peek()?.value === '&&' || this.peek()?.value === 'and') {
            this.consume();
            const right = this.evaluateComparison();
            left = left && right;
        }
        
        return left;
    }
    
    evaluateComparison() {
        let left = this.evaluatePrimary();
        
        const ops = ['==', '!=', '>=', '<=', '>', '<'];
        while (ops.includes(this.peek()?.value)) {
            const op = this.consume().value;
            const right = this.evaluatePrimary();
            
            switch (op) {
                case '==': left = left == right; break;
                case '!=': left = left != right; break;
                case '>=': left = left >= right; break;
                case '<=': left = left <= right; break;
                case '>': left = left > right; break;
                case '<': left = left < right; break;
            }
        }
        
        return left;
    }
    
    evaluatePrimary() {
        const token = this.peek();
        if (!token) return null;
        
        // Parentheses
        if (token.value === '(') {
            this.consume();
            const result = this.evaluateExpression();
            this.consumeIf('PUNCTUATION', ')');
            return result;
        }
        
        // Not operator
        if (token.value === '!' || token.value === 'not') {
            this.consume();
            return !this.evaluatePrimary();
        }
        
        // Boolean literals
        if (token.value === 'true') {
            this.consume();
            return true;
        }
        if (token.value === 'false') {
            this.consume();
            return false;
        }
        if (token.value === 'null') {
            this.consume();
            return null;
        }
        
        // Number
        if (token.type === 'NUMBER') {
            this.consume();
            return token.value;
        }
        
        // String
        if (token.type === 'STRING') {
            this.consume();
            return token.value;
        }
        
        // Function call or variable
        if (token.type === 'IDENTIFIER') {
            const name = this.consume().value.toLowerCase();
            
            // Function call
            if (this.peek()?.value === '(') {
                this.consume(); // (
                const args = this.parseArgumentList();
                this.consumeIf('PUNCTUATION', ')');
                
                if (this.functions[name]) {
                    return this.functions[name](...args);
                }
                console.warn(`[ScriptEngine] Unknown function: ${name}`);
                return null;
            }
            
            // Special variable: choice
            if (name === 'choice') {
                return this.lastChoice;
            }
            
            // Variable lookup
            return this.game.gameVariables?.get(name);
        }
        
        // Unknown, skip and return null
        this.consume();
        return null;
    }
    
    /**
     * Parse a comma-separated argument list
     */
    parseArgumentList() {
        const args = [];
        
        while (this.peek() && this.peek().value !== ')') {
            args.push(this.evaluatePrimary());
            
            if (this.peek()?.value === ',') {
                this.consume();
            }
        }
        
        return args;
    }
    
    /**
     * Skip an expression without evaluating
     */
    skipExpression() {
        let depth = 0;
        
        while (this.position < this.tokens.length) {
            const token = this.peek();
            if (token?.value === '(') depth++;
            if (token?.value === ')') {
                if (depth === 0) return;
                depth--;
            }
            this.consume();
            if (depth === 0 && (token?.value === ')' || !['OPERATOR', 'NUMBER', 'STRING', 'IDENTIFIER'].includes(token?.type))) {
                return;
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // TOKEN HELPERS
    // ═══════════════════════════════════════════════════════════════
    
    peek(offset = 0) {
        return this.tokens[this.position + offset];
    }
    
    consume() {
        return this.tokens[this.position++];
    }
    
    consumeIf(type, value) {
        const token = this.peek();
        if (token && token.type === type && (value === undefined || token.value === value)) {
            return this.consume();
        }
        return null;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // COMMANDS
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * message "text";
     * Show a dialogue message (supports HTML: <b>, <i>, <color=#hex>)
     */
    async cmdMessage() {
        const text = this.consume();
        if (text?.type !== 'STRING') {
            console.warn('[ScriptEngine] message requires a string');
            return;
        }
        
        if (this.onMessage) {
            await this.onMessage(text.value, this.currentNPC);
        } else {
            console.log(`[Script Message] ${text.value}`);
        }
    }
    
    /**
     * additem "itemId", quantity;
     */
    async cmdAddItem() {
        const itemId = this.consume()?.value;
        this.consumeIf('PUNCTUATION', ',');
        const qty = this.consume()?.value || 1;
        
        if (this.game.inventoryManager) {
            const success = this.game.inventoryManager.addItem(itemId, qty);
            if (success) {
                console.log(`[ScriptEngine] Added ${qty}x ${itemId}`);
            } else {
                console.warn(`[ScriptEngine] Failed to add item: ${itemId}`);
            }
        }
    }
    
    /**
     * delitem "itemId", quantity;
     */
    async cmdDelItem() {
        const itemId = this.consume()?.value;
        this.consumeIf('PUNCTUATION', ',');
        const qty = this.consume()?.value || 1;
        
        if (this.game.inventoryManager) {
            const success = this.game.inventoryManager.removeItem(itemId, qty);
            if (success) {
                console.log(`[ScriptEngine] Removed ${qty}x ${itemId}`);
            } else {
                console.warn(`[ScriptEngine] Failed to remove item: ${itemId}`);
            }
        }
    }
    
    /**
     * setvar "name", value;
     */
    async cmdSetVar() {
        const name = this.consume()?.value;
        this.consumeIf('PUNCTUATION', ',');
        const value = this.evaluatePrimary();
        
        if (this.game.gameVariables) {
            this.game.gameVariables.set(name, value);
        }
    }
    
    /**
     * incvar "name", amount;
     */
    async cmdIncVar() {
        const name = this.consume()?.value;
        this.consumeIf('PUNCTUATION', ',');
        const amount = this.consume()?.value || 1;
        
        if (this.game.gameVariables) {
            this.game.gameVariables.increment(name, amount);
        }
    }
    
    /**
     * decvar "name", amount;
     */
    async cmdDecVar() {
        const name = this.consume()?.value;
        this.consumeIf('PUNCTUATION', ',');
        const amount = this.consume()?.value || 1;
        
        if (this.game.gameVariables) {
            this.game.gameVariables.decrement(name, amount);
        }
    }
    
    /**
     * playsound "soundId";
     */
    async cmdPlaySound() {
        const soundId = this.consume()?.value;
        
        if (this.game.audioManager && soundId) {
            this.game.audioManager.playEffect(soundId);
        }
    }
    
    /**
     * wait milliseconds;
     */
    async cmdWait() {
        const ms = this.consume()?.value || 0;
        this.waitUntil = Date.now() + ms;
    }
    
    /**
     * choice "option1", "option2", ...;
     */
    async cmdChoice() {
        const choices = [];
        
        while (this.peek()?.type === 'STRING') {
            choices.push(this.consume().value);
            this.consumeIf('PUNCTUATION', ',');
        }
        
        if (choices.length > 0 && this.onChoice) {
            this.lastChoice = await this.onChoice(choices, this.currentNPC);
        }
    }
    
    /**
     * goto labelName;
     */
    async cmdGoto() {
        const labelName = this.consume()?.value;
        
        if (labelName && this.labels[labelName] !== undefined) {
            this.position = this.labels[labelName];
        } else {
            console.warn(`[ScriptEngine] Unknown label: ${labelName}`);
        }
    }
    
    /**
     * end;
     */
    async cmdEnd() {
        this.isRunning = false;
    }
    
    /**
     * log "message";
     */
    async cmdLog() {
        const msg = this.consume()?.value;
        console.log(`[Script Log] ${msg}`);
    }
    
    /**
     * teleport "mapId", x, y;
     */
    async cmdTeleport() {
        const mapId = this.consume()?.value;
        this.consumeIf('PUNCTUATION', ',');
        const x = this.consume()?.value;
        this.consumeIf('PUNCTUATION', ',');
        const y = this.consume()?.value;
        
        if (this.game.teleportToMap && mapId) {
            await this.game.teleportToMap(mapId, x, y);
        }
    }
    
    /**
     * heal amount;
     */
    async cmdHeal() {
        const amount = this.consume()?.value || 0;
        if (this.game.player) {
            // this.game.player.heal(amount); // If player has heal method
            console.log(`[ScriptEngine] Healed player for ${amount}`);
        }
    }
    
    /**
     * damage amount;
     */
    async cmdDamage() {
        const amount = this.consume()?.value || 0;
        if (this.game.player) {
            // this.game.player.damage(amount); // If player has damage method
            console.log(`[ScriptEngine] Damaged player for ${amount}`);
        }
    }
    
    /**
     * setflag "name";  (shorthand for setvar "name", true)
     */
    async cmdSetFlag() {
        const name = this.consume()?.value;
        if (this.game.gameVariables && name) {
            this.game.gameVariables.set(name, true);
        }
    }
    
    /**
     * clearflag "name";  (shorthand for setvar "name", false)
     */
    async cmdClearFlag() {
        const name = this.consume()?.value;
        if (this.game.gameVariables && name) {
            this.game.gameVariables.set(name, false);
        }
    }
    
    /**
     * shop "Shop Name", { items: [{itemId, price, stock}, ...] };
     * Opens a shop interface with the specified items
     * 
     * Example:
     * shop "Potion Shop", "health_potion", 50, "mana_potion", 75;
     * 
     * Or with stock limits:
     * shop "Rare Items", "magic_sword", 500, 1, "ancient_gem", 1000, 3;
     * 
     * Format: itemId, price, [stock=-1 for unlimited]
     */
    async cmdShop() {
        // Parse shop name
        const shopName = this.consume()?.value || 'Shop';
        this.consumeIf('PUNCTUATION', ',');
        
        // Parse item list: itemId, price, [stock], itemId, price, [stock], ...
        const items = [];
        
        while (this.position < this.tokens.length) {
            const token = this.peek();
            if (!token || token.type === 'PUNCTUATION' && token.value === ';') {
                break;
            }
            
            // Get item ID
            const itemId = this.consume()?.value;
            if (!itemId) break;
            
            this.consumeIf('PUNCTUATION', ',');
            
            // Get price
            const priceToken = this.consume();
            const price = priceToken?.value || 100;
            
            // Check if next is stock (number) or comma/semicolon (no stock specified)
            let stock = -1; // -1 = unlimited
            const nextToken = this.peek();
            if (nextToken && nextToken.type === 'PUNCTUATION' && nextToken.value === ',') {
                this.consume(); // consume comma
                const stockToken = this.peek();
                // Check if it's a number (stock) or string (next item)
                if (stockToken && stockToken.type === 'NUMBER') {
                    stock = this.consume()?.value || -1;
                    this.consumeIf('PUNCTUATION', ',');
                }
            }
            
            items.push({ itemId, price, stock });
        }
        
        console.log(`[ScriptEngine] Opening shop: ${shopName} with ${items.length} items`);
        
        // Open shop state
        if (this.game.stateManager) {
            // Pause script execution while shop is open
            this.isPaused = true;
            
            // Hide the dialogue box before opening shop
            const dialogueState = this.game.stateManager.states['DIALOGUE'];
            if (dialogueState) {
                dialogueState.isHidden = true;
            }
            
            // Wait a frame for the dialogue to disappear before opening shop
            await new Promise(r => setTimeout(r, 50));
            
            // Push shop state
            this.game.stateManager.pushState('SHOP', {
                shopName,
                items,
                npc: this.currentNPC
            });
            
            // Wait for shop to close
            await new Promise(resolve => {
                const checkShop = setInterval(() => {
                    if (!this.game.stateManager.isStateInStack('SHOP')) {
                        clearInterval(checkShop);
                        this.isPaused = false;
                        resolve();
                    }
                }, 100);
            });
        }
    }
    
    /**
     * addgold amount;  (shorthand for additem "gold_coin", amount)
     */
    async cmdAddGold() {
        const amount = this.consume()?.value || 0;
        if (this.game.inventoryManager && amount > 0) {
            this.game.inventoryManager.addItem('gold_coin', amount);
            console.log(`[ScriptEngine] Added ${amount} gold`);
        }
    }
    
    /**
     * delgold amount;  (shorthand for delitem "gold_coin", amount)
     */
    async cmdDelGold() {
        const amount = this.consume()?.value || 0;
        if (this.game.inventoryManager && amount > 0) {
            this.game.inventoryManager.removeItem('gold_coin', amount);
            console.log(`[ScriptEngine] Removed ${amount} gold`);
        }
    }
    
    /**
     * Stop script execution
     */
    stop() {
        this.isRunning = false;
    }
    
    /**
     * Pause script execution
     */
    pause() {
        this.isPaused = true;
    }
    
    /**
     * Resume script execution
     */
    resume() {
        this.isPaused = false;
    }
}

// Make globally available
window.ScriptEngine = ScriptEngine;
