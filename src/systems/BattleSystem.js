/**
 * BattleSystem.js
 * 1v1 ATB Battle System
 * Handles battle logic, turn order, damage calculations, and state management
 * Only 1 spirit per side fights at a time; player can switch from their party
 */

class BattleSystem {
    constructor(game) {
        this.game = game;
        
        // Battle state
        this.isActive = false;
        this.battleConfig = null;
        
        // Combatants (1v1 - only 1 active per side)
        this.playerParty = [];      // Active player spirit (array with 1 entry)
        this.enemyParty = [];       // Active enemy spirit (array with 1 entry)
        
        // Full party reserves for switching
        this.fullPlayerParty = [];  // All player spirits (for switching)
        this.fullEnemyParty = [];   // All enemy spirits (for multi-enemy encounters)
        
        // ATB settings
        this.ATB_MAX = 100;
        this.ATB_SPEED_MULTIPLIER = 0.5; // How fast ATB fills based on speed
        this.atbPaused = false; // Wait mode: pause ATB while player is selecting
        
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
        
        // Callbacks for UI effects (damage numbers, action text, etc.)
        this.onDamage = null;  // (target, { damage, isCrit, effectiveness, absorbed }) => {}
        this.onHeal = null;    // (target, healAmount) => {}
        this.onActionText = null; // (user, actionName) => {}
        this.onAbilityEffect = null; // (target, effectName, options) => {}
        
        // Camera event callbacks (set by BattleState for dynamic battle camera)
        this.onCameraActionStart = null;  // (user, target, isPhysical) => {}
        this.onCameraActionImpact = null; // () => {}
        this.onCameraActionEnd = null;    // () => {}
        this.onCameraKO = null;           // (target) => {}
        
        // Type effectiveness chart (8 elements)
        // Multipliers: 2.0 = super effective, 0.5 = self-resist, 1.0 = normal
        // Each type: 2 strengths, 2 weaknesses
        this.typeChart = {
            fire:      { ice: 2.0, earth: 2.0, fire: 0.5 },
            water:     { fire: 2.0, lightning: 2.0, water: 0.5 },
            earth:     { lightning: 2.0, wind: 2.0, earth: 0.5 },
            wind:      { ice: 2.0, light: 2.0, wind: 0.5 },
            lightning: { wind: 2.0, dark: 2.0, lightning: 0.5 },
            ice:       { earth: 2.0, water: 2.0, ice: 0.5 },
            light:     { dark: 2.0, fire: 2.0, light: 0.5 },
            dark:      { light: 2.0, water: 2.0, dark: 0.5 }
        };
        
        // Animation/timing
        this.transitionTimer = 0;
        this.transitionDuration = 1.0; // seconds
        this.isTransitioning = false;
        
        // Action animation state
        this.actionAnimation = {
            phase: null,          // 'moving_to_target', 'impact', 'returning', null
            timer: 0,
            userEntity: null,     // The entity performing the action
            targetEntity: null,   // The target entity (for attack movement)
            originalX: 0,         // User's original X position
            originalY: 0,         // User's original Y position
            targetX: 0,           // Position to move to (near target)
            targetY: 0,
            moveToTargetDuration: 0.25,   // Time to reach target
            impactDuration: 0.15,         // Brief pause at impact
            returnDuration: 0.3,          // Time to return
            isAttackAnimation: false      // Whether this action has movement
        };
        
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
     * Initialize player's party for battle (1v1 - only lead spirit enters)
     */
    initializePlayerParty() {
        this.playerParty = [];
        this.fullPlayerParty = [];
        
        // Get ALL player's spirits from party manager
        const allSpirits = this.game.partyManager?.getFullParty() || [];
        
        if (allSpirits.length === 0) {
            // Create a default spirit if player has none
            console.warn('[BattleSystem] No spirits in party, creating default');
            const defaultSpirit = this.createBattleSpirit({
                id: 'default_spirit',
                name: 'Spirit',
                level: 1,
                type1: 'fire',
                type2: null,
                baseStats: { hp: 100, mp: 50, attack: 20, defense: 15, magicAttack: 18, magicDefense: 12, speed: 25 }
            }, true);
            this.playerParty.push(defaultSpirit);
            this.fullPlayerParty.push(defaultSpirit);
        } else {
            // Create battle spirits for all party members
            allSpirits.forEach(spirit => {
                this.fullPlayerParty.push(this.createBattleSpirit(spirit, true));
            });
            // Only the lead spirit enters the active battle slot
            this.playerParty.push(this.fullPlayerParty[0]);
        }
    }
    
    /**
     * Initialize enemy party for battle (1v1 - only first enemy enters)
     * @param {Array} enemies - Array of enemy spirit configs
     */
    initializeEnemyParty(enemies) {
        this.enemyParty = [];
        this.fullEnemyParty = [];
        
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
            this.fullEnemyParty.push(battleSpirit);
        });
        
        // Only the first enemy enters the active battle slot
        if (this.fullEnemyParty.length > 0) {
            this.enemyParty.push(this.fullEnemyParty[0]);
        }
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
        
        // Calculate actual stats based on level and evolution stage
        const stageMultiplier = spiritData.stageMultiplier || 1.0;
        const statMultiplier = stageMultiplier * (1 + (level - 1) * 0.03);
        
        const battleSpirit = {
            id: spiritData.id || `spirit_${Date.now()}`,
            name: spiritData.name || 'Spirit',
            level: level,
            type1: spiritData.type1 || spiritData.element || 'fire',
            type2: spiritData.type2 || null,
            sprite: spiritData.sprite || spiritData.spriteSrc,
            scale: spiritData.scale || 0.075, // Copy scale from template
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
            
            // Abilities - resolve from registry if possible
            abilities: this.resolveAbilities(spiritData),
            
            // Registry metadata for evolution tracking
            chainId: spiritData.chainId || null,
            archetype: spiritData.archetype || null,
            stage: spiritData.stage || 1,
            stageMultiplier: spiritData.stageMultiplier || 1.0,
            speciesId: spiritData.speciesId || null,
            
            // Original data reference
            originalData: spiritData
        };
        
        return battleSpirit;
    }
    
    /**
     * Resolve abilities for a spirit: registry learnset > spirit.abilities > legacy defaults
     */
    resolveAbilities(spiritData) {
        // 1. If spirit already has explicit abilities array, use them
        if (spiritData.abilities && spiritData.abilities.length > 0) {
            return spiritData.abilities;
        }
        
        // 2. Try to resolve from registry learnset
        if (spiritData.chainId && this.game?.spiritRegistry?.registryLoaded) {
            const registryAbilities = this.game.spiritRegistry.getAbilitiesForLevel(
                spiritData.chainId,
                spiritData.level || 1
            );
            if (registryAbilities && registryAbilities.length > 0) {
                return registryAbilities;
            }
        }
        
        // 3. Fallback to legacy defaults
        return this.getDefaultAbilities(spiritData.type1 || spiritData.element);
    }
    
    /**
     * Get default abilities based on element type (legacy fallback)
     */
    getDefaultAbilities(element) {
        const abilities = [
            { id: 'attack', name: 'Attack', type: 'physical', element: null, power: 40, mpCost: 0, target: 'single_enemy' }
        ];
        
        const elementalAbilities = {
            fire: { id: 'ember', name: 'Ember', type: 'magical', element: 'fire', power: 40, mpCost: 5, target: 'single_enemy' },
            water: { id: 'aqua_splash', name: 'Aqua Splash', type: 'magical', element: 'water', power: 40, mpCost: 5, target: 'single_enemy' },
            earth: { id: 'pebble_shot', name: 'Pebble Shot', type: 'physical', element: 'earth', power: 40, mpCost: 5, target: 'single_enemy' },
            wind: { id: 'gust', name: 'Gust', type: 'magical', element: 'wind', power: 40, mpCost: 5, target: 'single_enemy' },
            lightning: { id: 'spark', name: 'Spark', type: 'magical', element: 'lightning', power: 40, mpCost: 5, target: 'single_enemy' },
            ice: { id: 'frost_shard', name: 'Frost Shard', type: 'magical', element: 'ice', power: 40, mpCost: 5, target: 'single_enemy' },
            light: { id: 'holy_spark', name: 'Holy Spark', type: 'magical', element: 'light', power: 40, mpCost: 5, target: 'single_enemy' },
            dark: { id: 'shadow_bolt', name: 'Shadow Bolt', type: 'magical', element: 'dark', power: 40, mpCost: 5, target: 'single_enemy' }
        };
        
        if (elementalAbilities[element]) {
            abilities.push(elementalAbilities[element]);
        }
        
        abilities.push({ id: 'heal', name: 'Heal', type: 'supportive', element: null, power: 30, mpCost: 10, target: 'single_ally' });
        
        return abilities;
    }
    
    /**
     * Get the default visual effect name for an element type
     * Used when an ability doesn't specify its own effect
     * @param {string} element - Element type (fire, water, wind, earth, etc.)
     * @param {string} role - 'offensive' or 'defensive'
     */
    getElementEffect(element, role = 'offensive') {
        const elementEffects = {
            fire: { offensive: 'fire_burst', defensive: 'fire_pillar' },
            water: { offensive: 'water_splash', defensive: 'water_wave' },
            wind: { offensive: 'wind_slash', defensive: 'wind_tornado' },
            earth: { offensive: 'earth_rocks', defensive: 'earth_quake' },
            dark: { offensive: 'dark_miasma', defensive: 'dark_chains' },
            light: { offensive: 'light_rays', defensive: 'light_rays' },
            electric: { offensive: 'electric_spark', defensive: 'electric_spark' }
        };
        
        if (elementEffects[element]) {
            return elementEffects[element][role] || elementEffects[element].offensive;
        }
        
        // Default fallback
        return 'magic_burst';
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
            
            // Wait mode: if ATB is paused, skip filling (but still allow casting to finish)
            if (spirit.isCasting) {
                spirit.castTimer += deltaTime;
                if (spirit.castTimer >= spirit.castDuration) {
                    this.completeCast(spirit);
                }
                return;
            }
            
            // If paused (player selecting action), don't fill ATB gauges
            if (this.atbPaused) return;
            
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
                // Show action text immediately when action starts
                if (this.onActionText) {
                    this.onActionText(enemy, ability.name);
                }
            }
        }
        
        if (!action) {
            // Default to basic attack
            const target = this.selectRandomTarget(this.playerParty, 'single_enemy');
            action = { type: 'attack', user: enemy, target: target };
            // Show action text immediately when action starts
            if (this.onActionText) {
                this.onActionText(enemy, 'Attack');
            }
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
        
        // Show action text immediately when action starts
        if (this.onActionText) {
            if (action.type === 'ability' && action.ability) {
                this.onActionText(user, action.ability.name);
            } else if (action.type === 'attack') {
                this.onActionText(user, 'Attack');
            } else if (action.type === 'seal') {
                this.onActionText(user, 'Seal');
            } else if (action.type === 'flee') {
                this.onActionText(user, 'Flee');
            } else if (action.type === 'switch') {
                this.onActionText(user, 'Switch');
            }
        }
        
        this.actionQueue.push(action);
        user.isReady = false;
        user.atb = 0;
        
        return true;
    }
    
    /**
     * Process the current action with animation phases
     */
    processCurrentAction(deltaTime) {
        if (!this.currentAction) return;
        
        const anim = this.actionAnimation;
        
        // Initialize animation if not started
        if (!anim.phase) {
            this.startActionAnimation(this.currentAction);
        }
        
        anim.timer += deltaTime;
        
        switch (anim.phase) {
            case 'moving_to_target':
                if (anim.timer >= anim.moveToTargetDuration) {
                    anim.phase = 'impact';
                    anim.timer = 0;
                    // Notify camera: impact moment
                    if (this.onCameraActionImpact) {
                        this.onCameraActionImpact();
                    }
                    // Apply the action effect at impact
                    this.executeAction(this.currentAction);
                }
                break;
                
            case 'impact':
                if (anim.timer >= anim.impactDuration) {
                    if (anim.isAttackAnimation) {
                        anim.phase = 'returning';
                        anim.timer = 0;
                    } else {
                        // Non-attack actions end here
                        this.finishActionAnimation();
                    }
                }
                break;
                
            case 'returning':
                if (anim.timer >= anim.returnDuration) {
                    this.finishActionAnimation();
                }
                break;
        }
    }
    
    /**
     * Start the action animation
     */
    startActionAnimation(action) {
        const anim = this.actionAnimation;
        const { type, user, target } = action;
        
        // Find the user entity (set by GameStateManager)
        anim.userEntity = user._entity;
        anim.targetEntity = Array.isArray(target) ? target[0]?._entity : target?._entity;
        
        // Store original position
        if (anim.userEntity) {
            anim.originalX = anim.userEntity.x;
            anim.originalY = anim.userEntity.y;
        }
        
        // Determine if this is an attack animation (movement to target)
        anim.isAttackAnimation = (type === 'attack');
        
        if (anim.isAttackAnimation && anim.targetEntity) {
            // Calculate target position (stop short of the target)
            const stopDistance = 60; // Stop this far from target
            const dx = anim.targetEntity.x - anim.originalX;
            const dy = anim.targetEntity.y - anim.originalY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > stopDistance) {
                const ratio = (dist - stopDistance) / dist;
                anim.targetX = anim.originalX + dx * ratio;
                anim.targetY = anim.originalY + dy * ratio;
            } else {
                anim.targetX = anim.originalX;
                anim.targetY = anim.originalY;
            }
        }
        
        anim.phase = 'moving_to_target';
        anim.timer = 0;
        
        // Notify camera: action is starting
        if (this.onCameraActionStart) {
            const targetSingle = Array.isArray(target) ? target[0] : target;
            this.onCameraActionStart(user, targetSingle, type === 'attack');
        }
    }
    
    /**
     * Finish the action animation and clean up
     */
    finishActionAnimation() {
        const anim = this.actionAnimation;
        
        // Reset entity position
        if (anim.userEntity) {
            anim.userEntity.x = anim.originalX;
            anim.userEntity.y = anim.originalY;
        }
        
        // Reset animation state
        anim.phase = null;
        anim.timer = 0;
        anim.userEntity = null;
        anim.targetEntity = null;
        anim.isAttackAnimation = false;
        
        // Clear current action
        this.currentAction = null;
        
        // Notify camera: action finished
        if (this.onCameraActionEnd) {
            this.onCameraActionEnd();
        }
    }
    
    /**
     * Get the current animated position for the action user
     * Called by GameStateManager to update entity positions
     */
    getAnimatedPosition(entity) {
        const anim = this.actionAnimation;
        
        if (!anim.phase || anim.userEntity !== entity) {
            return null; // No animation active for this entity
        }
        
        if (!anim.isAttackAnimation) {
            return null; // Non-attack animations don't move
        }
        
        let progress;
        let x, y;
        
        switch (anim.phase) {
            case 'moving_to_target':
                // Ease out - start fast, slow down at end
                progress = Math.min(1, anim.timer / anim.moveToTargetDuration);
                progress = 1 - Math.pow(1 - progress, 2); // ease out quad
                x = anim.originalX + (anim.targetX - anim.originalX) * progress;
                y = anim.originalY + (anim.targetY - anim.originalY) * progress;
                return { x, y };
                
            case 'impact':
                // Stay at target position
                return { x: anim.targetX, y: anim.targetY };
                
            case 'returning':
                // Ease in - start slow, speed up at end
                progress = Math.min(1, anim.timer / anim.returnDuration);
                progress = progress * progress; // ease in quad
                x = anim.targetX + (anim.originalX - anim.targetX) * progress;
                y = anim.targetY + (anim.originalY - anim.targetY) * progress;
                return { x, y };
        }
        
        return null;
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
        const rawDefense = target.defense;
        
        // Type effectiveness (using attacker's type1)
        const effectiveness = this.calculateTypeEffectiveness(user.type1, target.type1, target.type2);
        
        // Critical hit check (10% base chance)
        const isCrit = Math.random() < 0.1;
        const critMultiplier = isCrit ? 1.5 : 1.0;
        
        // Damage formula  
        const rawDamage = baseDamage * effectiveness * critMultiplier;
        const absorbed = Math.floor(rawDefense * 0.5);
        let damage = Math.floor(rawDamage - absorbed);
        damage = Math.max(1, damage); // Minimum 1 damage
        
        // Apply damage with metadata
        this.applyDamage(target, damage, { isCrit, effectiveness, absorbed });
        
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
            const rawDefense = t.defense;
            const effectiveness = ability.element 
                ? this.calculateTypeEffectiveness(ability.element, t.type1, t.type2)
                : 1.0;
            
            // Critical hit check (8% for abilities)
            const isCrit = Math.random() < 0.08;
            const critMultiplier = isCrit ? 1.5 : 1.0;
            
            const rawDamage = baseDamage * effectiveness * critMultiplier;
            const absorbed = Math.floor(rawDefense * 0.3);
            let damage = Math.floor(rawDamage - absorbed);
            damage = Math.max(1, damage);
            
            this.applyDamage(t, damage, { isCrit, effectiveness, absorbed });
            this.applyAbilityEffects(user, t, ability, damage);
            
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
            
            // Spawn visual effect - use ability's specified effect or fall back to element-based
            if (this.onAbilityEffect) {
                const effectName = ability.effect || this.getElementEffect(ability.element, 'offensive');
                const intensity = ability.effectIntensity || 1.0;
                this.onAbilityEffect(t, effectName, { intensity });
            }
            
            const baseDamage = (user.magicAttack * ability.power) / 20;
            const rawMagicDef = t.magicDefense;
            const effectiveness = ability.element 
                ? this.calculateTypeEffectiveness(ability.element, t.type1, t.type2)
                : 1.0;
            
            // Critical hit check (8% for abilities)
            const isCrit = Math.random() < 0.08;
            const critMultiplier = isCrit ? 1.5 : 1.0;
            
            const rawDamage = baseDamage * effectiveness * critMultiplier;
            const absorbed = Math.floor(rawMagicDef * 0.3);
            let damage = Math.floor(rawDamage - absorbed);
            damage = Math.max(1, damage);
            
            this.applyDamage(t, damage, { isCrit, effectiveness, absorbed });
            this.applyAbilityEffects(user, t, ability, damage);
            
            let effText = '';
            if (effectiveness > 1) effText = ' (Super effective!)';
            else if (effectiveness < 1) effText = ' (Resisted)';
            this.log(`${user.name}'s ${ability.name} hits ${t.name} for ${damage} dmg${effText}`);
        });
    }
    
    /**
     * Apply secondary effects from registry ability data (status, debuff, recoil, drain)
     */
    applyAbilityEffects(user, target, ability, damage) {
        if (!ability || !target?.isAlive) return;
        
        // Status chance (e.g. burn from Inferno, paralyze from Thundercrack)
        if (ability.statusChance && ability.statusEffect) {
            if (Math.random() < ability.statusChance) {
                const existing = target.statusEffects?.find(s => s.type === ability.statusEffect);
                if (!existing) {
                    target.statusEffects = target.statusEffects || [];
                    target.statusEffects.push({
                        type: ability.statusEffect,
                        duration: ability.statusDuration || 3,
                        source: user.name
                    });
                    this.log(`${target.name} was inflicted with ${ability.statusEffect}!`);
                }
            }
        }
        
        // Debuff on damage (e.g. defense drop, speed drop)
        if (ability.debuff && damage > 0) {
            target.statusEffects = target.statusEffects || [];
            target.statusEffects.push({
                type: 'debuff',
                stat: ability.debuff.stat,
                amount: ability.debuff.amount || -0.2,
                duration: ability.debuff.duration || 3
            });
            this.log(`${target.name}'s ${ability.debuff.stat} was lowered!`);
        }
        
        // Recoil damage (fraction of damage dealt back to user)
        if (ability.recoilPercent && damage > 0) {
            const recoil = Math.max(1, Math.floor(damage * ability.recoilPercent));
            user.hp = Math.max(0, user.hp - recoil);
            if (user.hp <= 0) user.isAlive = false;
            this.log(`${user.name} took ${recoil} recoil damage!`);
        }
        
        // MP drain (steal MP from target)
        if (ability.drainMp && damage > 0) {
            const drained = Math.min(target.mp, Math.floor(damage * 0.3));
            target.mp -= drained;
            user.mp = Math.min(user.maxMp, user.mp + drained);
            if (drained > 0) {
                this.log(`${user.name} drained ${drained} MP from ${target.name}!`);
            }
        }
        
        // Self-buff after attack (e.g. speed boost on certain moves)
        if (ability.selfBuff) {
            user.statusEffects = user.statusEffects || [];
            user.statusEffects.push({
                type: 'buff',
                stat: ability.selfBuff.stat,
                amount: ability.selfBuff.amount || 0.2,
                duration: ability.selfBuff.duration || 3
            });
            this.log(`${user.name}'s ${ability.selfBuff.stat} rose!`);
        }
    }
    
    /**
     * Execute supportive ability (healing, buffs)
     */
    executeSupportiveAbility(user, target, ability) {
        const targets = Array.isArray(target) ? target : [target];
        
        targets.forEach(t => {
            if (!t) return;
            
            if (ability.id === 'heal' || ability.effect === 'heal') {
                // Spawn heal visual effect
                if (this.onAbilityEffect) {
                    const effectName = ability.visualEffect || 'heal_sparkle';
                    const intensity = ability.effectIntensity || 1.0;
                    this.onAbilityEffect(t, effectName, { intensity });
                }
                
                const healAmount = Math.floor(user.magicAttack * ability.power / 20);
                this.applyHealing(t, healAmount);
                this.log(`${user.name}'s ${ability.name} heals ${t.name} for ${healAmount} HP`);
            }
            
            // Handle buffs
            if (ability.buff) {
                // Spawn buff visual effect
                if (this.onAbilityEffect) {
                    const effectName = ability.visualEffect || 'buff_up';
                    const intensity = ability.effectIntensity || 1.0;
                    this.onAbilityEffect(t, effectName, { intensity });
                }
                
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
            
            // Spawn debuff visual effect
            if (this.onAbilityEffect) {
                const effectName = ability.visualEffect || 'debuff_down';
                const intensity = ability.effectIntensity || 1.0;
                this.onAbilityEffect(t, effectName, { intensity });
            }
            
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
        
        // Prefer registry type chart if loaded
        const chart = this.game?.spiritRegistry?.typeChart || this.typeChart;
        
        let effectiveness = chart[attackType]?.[defType1] ?? 1.0;
        
        if (defType2) {
            effectiveness *= chart[attackType]?.[defType2] ?? 1.0;
        }
        
        return effectiveness;
    }
    
    /**
     * Apply damage to a target with optional metadata
     */
    applyDamage(target, amount, meta = {}) {
        target.currentHp = Math.max(0, target.currentHp - amount);
        
        // Trigger damage flash on the target sprite
        target._damageFlash = 1.0;
        
        // Trigger damage callback for floating numbers
        if (this.onDamage) {
            this.onDamage(target, {
                damage: amount,
                isCrit: meta.isCrit || false,
                effectiveness: meta.effectiveness || 1.0,
                absorbed: meta.absorbed || 0
            });
        }
        
        if (target.currentHp <= 0) {
            target.isAlive = false;
            target.currentHp = 0;
            
            // Start death animation (red shift + fade out)
            target._deathAnimation = {
                active: true,
                timer: 0,
                duration: 1.2 // 1.2 seconds for death animation
            };
            
            // Notify camera: a spirit was KO'd
            if (this.onCameraKO) {
                this.onCameraKO(target);
            }
            
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
        const actualHeal = Math.min(target.maxHp - target.currentHp, amount);
        target.currentHp = Math.min(target.maxHp, target.currentHp + amount);
        
        // Trigger heal callback for floating numbers
        if (this.onHeal) {
            this.onHeal(target, actualHeal);
        }
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
     * Switch the active player spirit with another from the full party (1v1)
     */
    executeSwitch(currentSpirit, newSpirit) {
        if (!newSpirit || !newSpirit.isAlive) {
            this.log('Cannot switch to that spirit!');
            return;
        }
        
        // Remove current from active slot
        this.playerParty = [];
        
        // Reset ATB on switched-out spirit
        currentSpirit.atb = 0;
        currentSpirit.isReady = false;
        
        // Put new spirit into active slot
        this.playerParty.push(newSpirit);
        
        // Give the incoming spirit a small ATB boost (so they're not completely at 0)
        newSpirit.atb = Math.min(this.ATB_MAX * 0.3, newSpirit.atb);
        newSpirit.isReady = false;
        
        this.log(`${currentSpirit.name} switches out! ${newSpirit.name} enters the battle!`);
        console.log(`[BattleSystem] ${currentSpirit.name} switches out for ${newSpirit.name}`);
        
        // Notify UI to recreate entities
        this._switchOccurred = true;
    }
    
    /**
     * Get available spirits to switch to (alive, not currently active)
     */
    getSwitchableSpirits() {
        const activeSpirit = this.playerParty[0];
        return this.fullPlayerParty.filter(s => s.isAlive && s !== activeSpirit);
    }
    
    /**
     * Auto-switch to next available spirit when active one faints (1v1)
     * Returns true if a switch was made, false if no spirits left
     */
    autoSwitchOnKO() {
        const nextSpirit = this.fullPlayerParty.find(s => s.isAlive && !this.playerParty.includes(s));
        if (nextSpirit) {
            this.playerParty = [nextSpirit];
            nextSpirit.atb = 0;
            nextSpirit.isReady = false;
            this.log(`${nextSpirit.name} enters the battle!`);
            this._switchOccurred = true;
            return true;
        }
        return false;
    }
    
    /**
     * Auto-switch to next enemy spirit when active one faints (1v1)
     * Returns true if a switch was made, false if no enemies left
     */
    autoSwitchEnemyOnKO() {
        const nextEnemy = this.fullEnemyParty.find(s => s.isAlive && !this.enemyParty.includes(s));
        if (nextEnemy) {
            this.enemyParty = [nextEnemy];
            nextEnemy.atb = 0;
            nextEnemy.isReady = false;
            this.log(`Enemy ${nextEnemy.name} enters the battle!`);
            this._switchOccurred = true;
            return true;
        }
        return false;
    }
    
    /**
     * Check if battle should end (1v1 with reserves)
     */
    checkBattleEnd() {
        // Check if active enemy is KO'd - try to send in next
        const activeEnemyAlive = this.enemyParty.some(s => s.isAlive);
        if (!activeEnemyAlive) {
            // Try auto-switching to next enemy
            if (!this.autoSwitchEnemyOnKO()) {
                // No more enemies - victory!
                this.result = 'victory';
                this.endBattle();
                return true;
            }
        }
        
        // Check if active player spirit is KO'd - try to send in next
        const activePlayerAlive = this.playerParty.some(s => s.isAlive);
        if (!activePlayerAlive) {
            // Try auto-switching to next player spirit
            if (!this.autoSwitchOnKO()) {
                // No more spirits - defeat!
                this.result = 'defeat';
                this.endBattle();
                return true;
            }
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
        this.fullPlayerParty = [];
        this.fullEnemyParty = [];
        this.actionQueue = [];
        this.currentAction = null;
        this.battleConfig = null;
        this.triggeringSpirit = null;
        this._switchOccurred = false;
        
        // Resume normal BGM
        this.game.audioManager?.playBGM('bgm-field.mp3');
        
        // Respawn companion spirit after battle
        if (this.game.companionEnabled) {
            this.game.spawnCompanion();
        }
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
