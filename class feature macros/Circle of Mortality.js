/*****
Circle of Mortality
At 1st level, you gain the ability to manipulate the line between life and death. When you would normally 
roll one or more dice to restore hit points with a spell to a creature at 0 hit points, you instead 
use the highest number possible for each die.

v0.5 April 13 2022 jbowens #0415 (Discord) https://github.com/jbowensii/More-Automated-Spells-Items-and-Feats.git 
*****/

if (args[0].macroPass === "postDamageRoll") {
    const workflow = MidiQOL.Workflow.getWorkflow(args[0].itemUuid);
    const actorUuid = workflow.tokenUuid;
    const actorToken = canvas.tokens.get(workflow.tokenId);
    const thisItem = actorToken.actor.items.find(i=> i.name === "Circle of Mortality")?.data;
    let targetTokenUuid = args[0].hitTargetUuids[0];
    let targetToken = await fromUuid(targetTokenUuid);
    let targetActor = targetToken.actor;

    // if Target HP > 0 return 
    if (targetActor.data.data.attributes.hp.value != 0) return;

    // check to make sure only one target is selected
    if ((args[0].targetUuids.length < 1) || (args[0].targetUuids.length > 1)) {
        ui.notifications.error("You need to select a single target.");
        return;
    }

    // compute maximum healing for the spell cast
    let healingRollMax = 0;
    for (let i = 0; i < workflow.damageRoll.terms.length; i++) 
        if (workflow.damageRoll.terms[i]?.faces) healingRollMax = healingRollMax+(workflow.damageRoll.terms[i].faces*workflow.damageRoll.terms[i].number);
            else if (workflow.damageRoll.terms[i]?.number) healingRollMax = healingRollMax+workflow.damageRoll.terms[i].number; 
    let bonusHealing = (healingRollMax - workflow.damageRoll.total); 
    await setProperty(workflow, "BonusHealing", bonusHealing);

    // trigger BonusDamage to apply the extra damage / adjustments outside of the normal damage roll
    let effectData = {
        label : "Healing Mortality",
        changes: [ {key: "flags.dnd5e.DamageBonusMacro", mode: 0, value: `ItemMacro.Circle of Mortality,all`, priority: 20} ],
        icon : thisItem.img,
        origin: thisItem.uuid,
        duration: {turns: 1}
    };    
    
    await MidiQOL.socket().executeAsGM("createEffects", {actorUuid: actorUuid, effects: [effectData]}); 
    return; 

} else if(args[0].tag === "DamageBonus") {
    const workflow = MidiQOL.Workflow.getWorkflow(args[0].itemUuid);
    const actorUuid = workflow.tokenUuid;
    const actorToken = canvas.tokens.get(workflow.tokenId);
    let bonusHealing = await getProperty(workflow, "BonusHealing");

    // remove extra damage effect 
    let effect = await findEffect(actorToken, "Healing Mortality");
    await MidiQOL.socket().executeAsGM("removeEffects", {actorUuid: actorUuid, effects:[effect.id]});
    
    // Bonus Healing
    return {damageRoll: `${bonusHealing}[healing]`, flavor: "Circle of Mortality Bonus Healing"}; 
}

// Function to test for an effect
async function findEffect (target, effectName) {
    let effectUuid = null;
    effectUuid = target?.actor.data.effects.find(ef=> ef.data.label === effectName);
    return effectUuid;
}