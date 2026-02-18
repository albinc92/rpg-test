/**
 * InteractionSystem - Handles player interactions with world
 * Responsible for: NPC dialogue, object interactions, item pickups
 */
class InteractionSystem {
    constructor() {
        this.INTERACTION_DISTANCE = 120;
    }
    
    /**
     * Find the closest interactable NPC
     */
    findClosestNPC(player, npcs) {
        let closestNPC = null;
        let closestDistance = Infinity;
        
        npcs.forEach(npc => {
            // Skip spirits (they don't have dialogue)
            if (npc.type === 'spirit') return;
            
            const dx = player.x - npc.x;
            const dy = player.y - npc.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.INTERACTION_DISTANCE && distance < closestDistance) {
                closestDistance = distance;
                closestNPC = npc;
            }
        });
        
        return closestNPC;
    }
    
    /**
     * Handle interaction attempt
     * Returns: { type, data } for what was interacted with
     */
    handleInteraction(player, npcs, objects, currentMapId) {
        // Check interactive objects first (higher priority)
        const interactiveObj = objects.checkNearbyInteractions(player, currentMapId);
        if (interactiveObj) {
            return {
                type: 'object',
                target: interactiveObj
            };
        }
        
        // Check NPCs
        const npc = this.findClosestNPC(player, npcs);
        if (npc) {
            return {
                type: 'npc',
                target: npc
            };
        }
        
        return null;
    }
}
window.InteractionSystem = InteractionSystem;
