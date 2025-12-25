/**
 * BattleSystem.js
 * Final Fantasy-style ATB Battle System
 * Handles battle logic, turn order, damage calculations, and state management
 */

class BattleSystem {
    constructor(game) {
        this.game = game;
        
        // Battle state
        this.isActive = false;
        this.battleConfig = null;
        
        // Combatants
        this.playerParty = [];      // Player's spirits (up to 4 active + 2 bench)
        this.enemyParty = [];       // Enemy spirits
        
        // ATB settings
        this.ATB_MAX = 100;
        this.ATB_SPEED_MULTIPLIER = 0.5; // How fast ATB fills based on speed
        
        // Action queue (FIFO - first ready, first to act)
        this.actionQueue = [];
        this.currentAction = null;
        this.actionTimer = 0;
        
        // Battle flags
        this.isBoss = false;
        this.canFlee = true;
        this.canSeal = true;
        this.customBgm = null;
        
        // Battle result
        this.result = null; // 'victory', 'defeat', 'fled'
        this.rewards = {
            exp: 0,
            gold: 0,
            items: []
        };
        
        // Log callback (set by BattleState)
        this.onLogEntry = null;
        
        // Type effectiveness chart
        // Multipliers: 2.0 = super effective, 0.5 = not very effective, 1.0 = normal
        this.typeChart = {
            fire: { fire: 0.5, water: 0.5, earth: 2.0, wind: 1.0 },
            water: { fire: 2.0, water: 0.5, earth: 1.0, wind: 0.5 },
            earth: { fire: 0.5, water: 1.0, earth: 0.5, wind: 2.0 },
            wind: { fire: 1.0, water: 2.0, earth: 0.5, wind: 0.5 }
        };
        
        // Animation/timing
        this.transitionTimer = 0;
        this.transitionDuration = 1.0; // seconds
        this.isTransitioning = false;
        
        // Triggered spirit reference (to remove after battle)
        this.triggeringSpirit = null;
    }
    
    /**
     * Start a battle with given configuration
     * @param {Object} config - Battle configuration
     * @param {Array} config.enemies - Array of spirit IDs or spirit data
     * @param {boolean} config.isBoss - Is this a boss battle?
     * @param {string} config.bgm - Custom battle music (optional)
     * @param {string} config.background - Battle background (optional)
     * @param {Object} config.triggeringSpirit - The roaming spirit that triggered this (optional)
     */
    startBattle(config) {
        console.log('[BattleSystem] Starting battle with config:', config);
        
        this.isActive = true;
        this.battleConfig = config;
        this.isBoss = config.isBoss || false;
        this.canFlee = !this.isBoss;
        this.canSeal = !this.isBoss;
        this.customBgm = config.bgm || null;
        this.triggeringSpirit = config.triggeringSpirit || null;
        this.result = null;
        
        // Reset rewards
        this.rewards = { exp: 0, gold: 0, items: [] };
        
        // Initialize player party from game's party system
        this.initializePlayerParty();
        
        // Initialize enemy party
        this.initializeEnemyParty(config.enemies);
        
        // Reset action queue
        this.actionQueue = [];
        this.currentAction = null;
        
        // Start transition
        this.isTransitioning = true;
        this.transitionTimer = 0;
        
        // Play battle music
        // battle01.mp3 = normal battle, battle02.mp3 = boss (or use custom if provided)
        const bgmTrack = this.isBoss ? 'battle02.mp3' : (this.customBgm || 'battle01.mp3');
        this.game.audioManager?.playBGM(bgmTrack);
        
        // Push battle state
        this.game.stateManager.pushState('BATTLE');
    }
    
    /**
     * Initialize player's party for battle
     */
    initializePlayerParty() {
        this.playerParty = [];
        
        // Get player's spirits from party manager
        const partySpirits = this.game.partyManager?.getActiveParty() || [];
        
        if (partySpirits.length === 0) {
            // Create a default spirit if player has none
            console.warn('[BattleSystem] No spirits in party, creating default');
            this.playerParty.push(this.createBattleSpirit({
                id: 'default_spirit',
                name: 'Spirit',
                level: 1,
                type1: 'fire',
                type2: null,
                baseStats: { hp: 100, mp: 50, attack: 20, defense: 15, magicAttack: 18, magicDefense: 12, speed: 25 }
            }, true));
        } else {
            partySpirits.forEach(spirit => {
                this.playerParty.push(this.createBattleSpirit(spirit, true));
            });
        }
    }
    
    /**
     * Initialize enemy party for battle
     * @param {Array} enemies - Array of enemy spirit configs
     */
    initializeEnemyParty(enemies) {
        this.enemyParty = [];
        
        if (!enemies || enemies.length === 0) {
            console.warn('[BattleSystem] No enemies specified, creating default');
            enemies = [{ templateId: 'wild_spirit' }];
        }
        
        enemies.forEach((enemyConfig, index) => {
            let spiritData;
            
            if (typeof enemyConfig === 'string') {
                // It's a template ID
                spiritData = this.game.spiritRegistry?.getTemplate(enemyConfig);
            } else if (enemyConfig.templateId) {
                spiritData = this.game.spiritRegistry?.getTemplate(enemyConfig.templateId);
                // Merge any overrides
                if (spiritData) {
                    spiritData = { ...spiritData, ...enemyConfig };
                }
            } else {
                spiritData = enemyConfig;
            }
            
            if (!spiritData) {
                // Create a basic enemy spirit
                spiritData = {
                    id: `enemy_${index}`,
                    name: 'Wild Spirit',
                    level: 5,
                    type1: 'earth',
                    type2: null,
                    baseStats: { hp: 80, mp: 30, attack: 18, defense: 12, magicAttack: 15, magicDefense: 10, speed: 20 },
                    expYield: 25,
                    goldYield: 10
                };
            }
            
            const battleSpirit = this.createBattleSpirit(spiritData, false);
            battleSpirit.expYield = spiritData.expYield || Math.floor(spiritData.level * 10);
            battleSpirit.goldYield = spiritData.goldYield || Math.floor(spiritData.level * 5);
            this.enemyParty.push(battleSpirit);
        });
    }
    
    /**
     * Create a battle-ready spirit instance
     * @param {Object} spiritData - Spirit template/data
     * @param {boolean} isPlayerOwned - Is this a player's spirit?
     */
    createBattleSpirit(spiritData, isPlayerOwned) {
        const level = spiritData.level || 1;
        const baseStats = spiritData.baseStats || spiritData.stats || {
            hp: 50, mp: 20, attack: 10, defense: 10,
            magicAttack: 10, magicDefense: 10, speed: 10
        };
        
        // Calculate actual stats based on level
        const statMultiplier = 1 + (level - 1) * 0.1;
        
        const battleSpirit = {
            id: spiritData.id || `spirit_${Date.now()}`,
            name: spiritData.name || 'Spirit',
            level: level,
            type1: spiritData.type1 || spiritData.element || 'fire',
            type2: spiritData.type2 || null,
            sprite: spiritData.sprite || spiritData.spriteSrc,
            scale: spiritData.scale || 0.075, // Copy scale from template (default to Sylphie's scale)
            isPlayerOwned: isPlayerOwned,
            
            // Floating/hovering animation
            isFloating: spiritData.isFloating || false,
            floatingSpeed: spiritData.floatingSpeed || 0.002,
            floatingRange: spiritData.floatingRange || 15,
            
            // Battle stats
            maxHp: Math.floor(baseStats.hp * statMultiplier),
            currentHp: Math.floor(baseStats.hp * statMultiplier),
            maxMp: Math.floor(baseStats.mp * statMultiplier),
            currentMp: Math.floor(baseStats.mp * statMultiplier),
            attack: Math.floor(baseStats.attack * statMultiplier),
            defense: Math.floor(baseStats.defense * statMultiplier),
            magicAttack: Math.floor(baseStats.magicAttack * statMultiplier),
            magicDefense: Math.floor(baseStats.magicDefense * statMultiplier),
            speed: Math.floor(baseStats.speed * statMultiplier),
            
            // ATB - start with random value
            atb: Math.random() * this.ATB_MAX * 0.7, // 0-70% random start
            isReady: false,
            
            // Casting state
            isCasting: false,
            castTimer: 0,
            castDuration: 0,
            pendingAbility: null,
            pendingTarget: null,
            
            // Status
            isAlive: true,
            statusEffects: [],
            
            // Abilities
            abilities: spiritData.abilities || this.getDefaultAbilities(spiritData.type1),
            
            // Original data reference
            originalData: spiritData
        };
        
        return battleSpirit;
    }
    
    /**
     * Get default abilities based on element type
     */
    getDefaultAbilities(element) {
        const abilities = [
            // Every spirit has basic attack
            { id: 'attack', name: 'Attack', type: 'physical', element: null, power: 40, mpCost: 0, target: 'single_enemy' }
        ];
        
        // Add elemental ability
        const elementalAbilities = {
            fire: { id: 'fireball', name: 'Fireball', type: 'magical', element: 'fire', power: 50, mpCost: 8, target: 'single_enemy' },
            water: { id: 'aqua_jet', name: 'Aqua Jet', type: 'magical', element: 'water', power: 50, mpCost: 8, target: 'single_enemy' },
            earth: { id: 'rock_throw', name: 'Rock Throw', type: 'magical', element: 'earth', power: 50, mpCost: 8, target: 'single_enemy' },
            wind: { id: 'gust', name: 'Gust', type: 'magical', element: 'wind', power: 50, mpCost: 8, target: 'single_enemy' }
        };
        
        if (elementalAbilities[element]) {
            abilities.push(elementalAbilities[element]);
        }
        
        // Add a basic heal
        abilities.push({ id: 'heal', name: 'Heal', type: 'supportive', element: null, power: 30, mpCost: 10, target: 'single_ally' });
        
        return abilities;
    }
    
    /**
     * Update battle logic (called every frame)
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        if (!this.isActive) return;
        
        // Handle transition
        if (this.isTransitioning) {
            this.transitionTimer += deltaTime;
            if (this.transitionTimer >= this.transitionDuration) {
                this.isTransitioning = false;
            }
            return;
        }
        
        // Check for battle end conditions
        if (this.checkBattleEnd()) {
            return;
        }
        
        // Process current action
        if (this.currentAction) {
            this.processCurrentAction(deltaTime);
            return;
        }
        
        // Update ATB for all combatants
        this.updateATB(deltaTime);
        
        // Process action queue
        if (this.actionQueue.length > 0 && !this.currentAction) {
            this.currentAction = this.actionQueue.shift();
            this.actionTimer = 0;
        }
        
        // AI for enemy turns
        this.processEnemyAI();
    }
    
    /**
     * Update ATB gauges for all combatants
     */
    updateATB(deltaTime) {
        const allCombatants = [...this.playerParty, ...this.enemyParty];
        
        allCombatants.forEach(spirit => {
            if (!spirit.isAlive || spirit.isReady) return;
            
            // Handle casting
            if (spirit.isCasting) {
                spirit.castTimer += deltaTime;
                if (spirit.castTimer >= spirit.castDuration) {
                    // Casting complete - execute the ability
                    this.completeCast(spirit);
                }
                return; // Don't fill ATB while casting
            }
            
            // ATB fills based on speed stat
            const atbGain = spirit.speed * this.ATB_SPEED_MULTIPLIER * deltaTime;
            spirit.atb = Math.min(this.ATB_MAX, spirit.atb + atbGain);
            
            if (spirit.atb >= this.ATB_MAX) {
                spirit.isReady = true;
                
                // Play ready sound for player-owned spirits
                if (spirit.isPlayerOwned) {
                    this.game.audioManager?.playEffect('ready.mp3');
                }
                
                // If it's an enemy, queue their action automatically
                if (!spirit.isPlayerOwned) {
                    this.queueEnemyAction(spirit);
                }
            }
        });
    }
    
    /**
     * Start casting an ability
     */
    startCast(user, target, ability) {
        // Calculate cast time based on ability power (0.5s to 2s)
        const baseCastTime = ability.castTime || (ability.mpCost > 0 ? 0.8 + (ability.mpCost / 20) : 0);
        
        if (baseCastTime > 0) {
            user.isCasting = true;
            user.castTimer = 0;
            user.castDuration = baseCastTime;
            user.pendingAbility = ability;
            user.pendingTarget = target;
            user.isReady = false;
            user.atb = 0;
            
            // Play spell sound when starting cast
            this.game.audioManager?.playEffect('spell.mp3');
            this.log(`${user.name} is casting ${ability.name}...`);
            return true;
        }
        return false;
    }
    
    /**
     * Complete a cast and execute the ability
     */
    completeCast(spirit) {
        spirit.isCasting = false;
        const ability = spirit.pendingAbility;
        const target = spirit.pendingTarget;
        
        if (ability && spirit.isAlive) {
            // Deduct MP
            if (spirit.currentMp >= ability.mpCost) {
                spirit.currentMp -= ability.mpCost;
                
                // Execute the ability effect
                switch (ability.type) {
                    case 'physical':
                        this.executePhysicalAbility(spirit, target, ability);
                        break;
                    case 'magical':
                        this.executeMagicalAbility(spirit, target, ability);
                        break;
                    case 'supportive':
                        this.executeSupportiveAbility(spirit, target, ability);
                        break;
                    case 'curse':
                        this.executeCurseAbility(spirit, target, ability);
                        break;
                }
            } else {
                this.log(`${spirit.name}'s cast fizzled - not enough MP!`);
            }
        }
        
        spirit.pendingAbility = null;
        spirit.pendingTarget = null;
        spirit.castTimer = 0;
        spirit.castDuration = 0;
    }
    
    /**
     * Process enemy AI to select actions
     */
    processEnemyAI() {
        // Handled in updateATB when enemy becomes ready
    }
    
    /**
     * Queue an enemy's action (simple AI)
     */
    queueEnemyAction(enemy) {
        // Simple AI: 70% attack, 30% use ability
        const useAbility = Math.random() < 0.3 && enemy.abilities.length > 1 && enemy.currentMp >= 8;
        
        let action;
        if (useAbility) {
            // Pick a random ability (not basic attack)
            const abilities = enemy.abilities.filter(a => a.id !== 'attack' && enemy.currentMp >= a.mpCost);
            if (abilities.length > 0) {
                const ability = abilities[Math.floor(Math.random() * abilities.length)];
                const target = this.selectRandomTarget(this.playerParty, ability.target);
                action = { type: 'ability', user: enemy, ability: ability, target: target };
            }
        }
        
        if (!action) {
            // Default to basic attack
            const target = this.selectRandomTarget(this.playerParty, 'single_enemy');
            action = { type: 'attack', user: enemy, target: target };
        }
        
        this.actionQueue.push(action);
        enemy.isReady = false;
        enemy.atb = 0;
    }
    
    /**
     * Select a random valid target
     */
    selectRandomTarget(party, targetType) {
        const aliveTargets = party.filter(s => s.isAlive);
        if (aliveTargets.length === 0) return null;
        
        if (targetType === 'all_enemies' || targetType === 'all_allies') {
            return aliveTargets;
        }
        
        return aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
    }
    
    /**
     * Queue a player action
     */
    queuePlayerAction(action) {
        const user = action.user;
        if (!user || !user.isReady) {
            console.warn('[BattleSystem] Cannot queue action - user not ready');
            return false;
        }
        
        this.actionQueue.push(action);
        user.isReady = false;
        user.atb = 0;
        
        return true;
    }
    
    /**
     * Process the current action
     */
    processCurrentAction(deltaTime) {
        if (!this.currentAction) return;
        
        this.actionTimer += deltaTime;
        
        // Action animation time (simplified)
        const actionDuration = 0.5;
        
        if (this.actionTimer >= actionDuration) {
            // Execute the action
            this.executeAction(this.currentAction);
            this.currentAction = null;
        }
    }
    
    /**
     * Execute an action and calculate effects
     */
    executeAction(action) {
        const { type, user, target, ability } = action;
        
        if (!user || !user.isAlive) return;
        
        console.log(`[BattleSystem] ${user.name} uses ${type}${ability ? `: ${ability.name}` : ''}`);
        
        switch (type) {
            case 'attack':
                this.executeAttack(user, target);
                break;
            case 'ability':
                this.executeAbility(user, target, ability);
                break;
            case 'item':
                this.executeItem(user, target, action.item);
                break;
            case 'flee':
                this.attemptFlee();
                break;
            case 'seal':
                this.attemptSeal(target);
                break;
            case 'switch':
                this.executeSwitch(user, action.switchTarget);
                break;
        }
        
        // Sound effect would go here - battle-hit.mp3 not available
        // this.game.audioManager?.playEffect('battle-hit.mp3');
    }
    
    /**
     * Add entry to battle log
     */
    log(message) {
        console.log(`[BattleSystem] ${message}`);
        if (this.onLogEntry) {
            this.onLogEntry(message);
        }
    }
    
    /**
     * Execute a basic attack
     */
    executeAttack(user, target) {
        if (!target || !target.isAlive) return;
        
        // Play attack sound effect
        this.game.audioManager?.playEffect('strike01.mp3');
        
        // Calculate damage
        const baseDamage = user.attack * 2;
        const defense = target.defense;
        
        // Type effectiveness (using attacker's type1)
        const effectiveness = this.calculateTypeEffectiveness(user.type1, target.type1, target.type2);
        
        // Damage formula
        let damage = Math.floor((baseDamage - defense * 0.5) * effectiveness);
        damage = Math.max(1, damage); // Minimum 1 damage
        
        // Apply damage
        this.applyDamage(target, damage);
        
        // Build effectiveness text
        let effText = '';
        if (effectiveness > 1) effText = ' (Super effective!)';
        else if (effectiveness < 1) effText = ' (Not very effective)';
        
        this.log(`${user.name} attacks ${target.name} for ${damage} dmg${effText}`);
    }
    
    /**
     * Execute an ability (starts casting if has cast time)
     */
    executeAbility(user, target, ability) {
        // Check MP cost
        if (user.currentMp < ability.mpCost) {
            this.log(`${user.name} doesn't have enough MP!`);
            return;
        }
        
        // Start casting (if ability has cast time, don't deduct MP yet)
        if (this.startCast(user, target, ability)) {
            return; // Casting started, will complete later
        }
        
        // No cast time - execute immediately
        // Deduct MP
        user.currentMp -= ability.mpCost;
        
        // Play spell sound for instant abilities too
        if (ability.mpCost > 0) {
            this.game.audioManager?.playEffect('spell.mp3');
        }
        
        switch (ability.type) {
            case 'physical':
                this.executePhysicalAbility(user, target, ability);
                break;
            case 'magical':
                this.executeMagicalAbility(user, target, ability);
                break;
            case 'supportive':
                this.executeSupportiveAbility(user, target, ability);
                break;
            case 'curse':
                this.executeCurseAbility(user, target, ability);
                break;
        }
    }
    
    /**
     * Execute physical ability
     */
    executePhysicalAbility(user, target, ability) {
        const targets = Array.isArray(target) ? target : [target];
        
        targets.forEach(t => {
            if (!t || !t.isAlive) return;
            
            const baseDamage = (user.attack * ability.power) / 20;
            const defense = t.defense;
            const effectiveness = ability.element 
                ? this.calculateTypeEffectiveness(ability.element, t.type1, t.type2)
                : 1.0;
            
            let damage = Math.floor((baseDamage - defense * 0.3) * effectiveness);
            damage = Math.max(1, damage);
            
            this.applyDamage(t, damage);
            
            let effText = '';
            if (effectiveness > 1) effText = ' (Super effective!)';
            else if (effectiveness < 1) effText = ' (Resisted)';
            this.log(`${user.name}'s ${ability.name} hits ${t.name} for ${damage} dmg${effText}`);
        });
    }
    
    /**
     * Execute magical ability
     */
    executeMagicalAbility(user, target, ability) {
        const targets = Array.isArray(target) ? target : [target];
        
        targets.forEach(t => {
            if (!t || !t.isAlive) return;
            
            const baseDamage = (user.magicAttack * ability.power) / 20;
            const magicDef = t.magicDefense;
            const effectiveness = ability.element 
                ? this.calculateTypeEffectiveness(ability.element, t.type1, t.type2)
                : 1.0;
            
            let damage = Math.floor((baseDamage - magicDef * 0.3) * effectiveness);
            damage = Math.max(1, damage);
            
            this.applyDamage(t, damage);
            
            let effText = '';
            if (effectiveness > 1) effText = ' (Super effective!)';
            else if (effectiveness < 1) effText = ' (Resisted)';
            this.log(`${user.name}'s ${ability.name} hits ${t.name} for ${damage} dmg${effText}`);
        });
    }
    
    /**
     * Execute supportive ability (healing, buffs)
     */
    executeSupportiveAbility(user, target, ability) {
        const targets = Array.isArray(target) ? target : [target];
        
        targets.forEach(t => {
            if (!t) return;
            
            if (ability.id === 'heal' || ability.effect === 'heal') {
                const healAmount = Math.floor(user.magicAttack * ability.power / 20);
                this.applyHealing(t, healAmount);
                this.log(`${user.name}'s ${ability.name} heals ${t.name} for ${healAmount} HP`);
            }
            
            // Handle buffs
            if (ability.buff) {
                t.statusEffects.push({
                    type: 'buff',
                    stat: ability.buff.stat,
                    amount: ability.buff.amount,
                    duration: ability.buff.duration || 3
                });
            }
        });
    }
    
    /**
     * Execute curse ability (debuffs)
     */
    executeCurseAbility(user, target, ability) {
        const targets = Array.isArray(target) ? target : [target];
        
        targets.forEach(t => {
            if (!t || !t.isAlive) return;
            
            if (ability.debuff) {
                t.statusEffects.push({
                    type: 'debuff',
                    stat: ability.debuff.stat,
                    amount: ability.debuff.amount,
                    duration: ability.debuff.duration || 3
                });
                console.log(`[BattleSystem] ${ability.name} debuffs ${t.name}'s ${ability.debuff.stat}`);
            }
        });
    }
    
    /**
     * Execute item usage
     */
    executeItem(user, target, item) {
        // TODO: Implement item usage
        console.log(`[BattleSystem] ${user.name} uses ${item.name} on ${target.name}`);
    }
    
    /**
     * Calculate type effectiveness multiplier
     */
    calculateTypeEffectiveness(attackType, defType1, defType2) {
        if (!attackType || !defType1) return 1.0;
        
        let effectiveness = this.typeChart[attackType]?.[defType1] || 1.0;
        
        if (defType2) {
            effectiveness *= this.typeChart[attackType]?.[defType2] || 1.0;
        }
        
        return effectiveness;
    }
    
    /**
     * Apply damage to a target
     */
    applyDamage(target, amount) {
        target.currentHp = Math.max(0, target.currentHp - amount);
        
        if (target.currentHp <= 0) {
            target.isAlive = false;
            target.currentHp = 0;
            this.log(`${target.name} has been defeated!`);
            
            // Add rewards if enemy
            if (!target.isPlayerOwned) {
                this.rewards.exp += target.expYield || 0;
                this.rewards.gold += target.goldYield || 0;
            }
        }
    }
    
    /**
     * Apply healing to a target
     */
    applyHealing(target, amount) {
        if (!target.isAlive) return;
        target.currentHp = Math.min(target.maxHp, target.currentHp + amount);
    }
    
    /**
     * Attempt to flee from battle
     */
    attemptFlee() {
        if (!this.canFlee) {
            this.log('Cannot flee from this battle!');
            return false;
        }
        
        // 75% base flee chance
        const fleeChance = 0.75;
        if (Math.random() < fleeChance) {
            this.result = 'fled';
            this.log('Successfully fled from battle!');
            return true;
        }
        
        this.log('Failed to flee!');
        return false;
    }
    
    /**
     * Attempt to seal (capture) an enemy spirit
     */
    attemptSeal(target) {
        if (!this.canSeal || !target || !target.isAlive) {
            this.log('Cannot seal this spirit!');
            return false;
        }
        
        // Seal chance based on target HP percentage
        const hpPercent = target.currentHp / target.maxHp;
        const baseChance = 0.3;
        const sealChance = baseChance + (1 - hpPercent) * 0.5; // Up to 80% at 1 HP
        
        if (Math.random() < sealChance) {
            this.log(`Successfully sealed ${target.name}!`);
            
            // Add to player's spirit box
            this.game.partyManager?.addToBox(target.originalData);
            
            // Remove from battle
            target.isAlive = false;
            
            return true;
        }
        
        this.log(`Failed to seal ${target.name}!`);
        return false;
    }
    
    /**
     * Switch a party member
     */
    executeSwitch(currentSpirit, newSpirit) {
        // Find indices
        const currentIndex = this.playerParty.findIndex(s => s.id === currentSpirit.id);
        const benchSpirits = this.game.partyManager?.getBenchSpirits() || [];
        
        // TODO: Implement proper switching
        console.log(`[BattleSystem] ${currentSpirit.name} switches out for ${newSpirit.name}`);
    }
    
    /**
     * Check if battle should end
     */
    checkBattleEnd() {
        // Check for victory
        const enemiesAlive = this.enemyParty.filter(s => s.isAlive).length;
        if (enemiesAlive === 0) {
            this.result = 'victory';
            this.endBattle();
            return true;
        }
        
        // Check for defeat
        const playersAlive = this.playerParty.filter(s => s.isAlive).length;
        if (playersAlive === 0) {
            this.result = 'defeat';
            this.endBattle();
            return true;
        }
        
        // Check for fled
        if (this.result === 'fled') {
            this.endBattle();
            return true;
        }
        
        return false;
    }
    
    /**
     * End the battle
     */
    endBattle() {
        console.log(`[BattleSystem] Battle ended with result: ${this.result}`);
        
        // Remove triggering spirit from world
        if (this.triggeringSpirit && this.result === 'victory') {
            this.game.spawnManager?.removeSpirit(this.triggeringSpirit);
        }
        
        // Show results screen (handled by BattleState)
        // The BattleState will pop itself and handle transitions
        
        this.isActive = false;
    }
    
    /**
     * Clean up after battle state is closed
     */
    cleanup() {
        this.isActive = false;
        this.playerParty = [];
        this.enemyParty = [];
        this.actionQueue = [];
        this.currentAction = null;
        this.battleConfig = null;
        this.triggeringSpirit = null;
        
        // Resume normal BGM
        this.game.audioManager?.playBGM('bgm-field.mp3');
    }
    
    /**
     * Get all alive player spirits that are ready to act
     */
    getReadyPlayerSpirits() {
        return this.playerParty.filter(s => s.isAlive && s.isReady);
    }
    
    /**
     * Get all alive enemies
     */
    getAliveEnemies() {
        return this.enemyParty.filter(s => s.isAlive);
    }
    
    /**
     * Get all alive player spirits
     */
    getAlivePlayerSpirits() {
        return this.playerParty.filter(s => s.isAlive);
    }
}

// Export
window.BattleSystem = BattleSystem;
