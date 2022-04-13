/*****
Orcish Fury

USEAGE : AUTOMATIC
This item should be placed on the character that has the Orcish Fury Feat.  
Until used, during each melee attack the player will be prompted if they
want to use this ability.
 
MANEUVER DESCRIPTION:
When you hit with an attack using a simple or martial weapon, you can roll one 
of the weapon’s damage dice an additional time and add it as extra damage of 
the weapon’s damage type. Once you use this ability, you can’t use it again 
until you finish a short or long rest.

v0.2 April 12 2022 jbowens #0415 (Discord) https://github.com/jbowensii/More-Automated-Spells-Items-and-Feats.git 
*****/

// make sure the attempted hit was made with a weapon attack
if (!["mwak","rwak"].includes(args[0].item.data.actionType)) return;

if (args[0].macroPass === "preDamageRoll") {
    const pcActor = MidiQOL.MQfromActorUuid(args[0].actorUuid);
    const target = await fromUuid(args[0].hitTargetUuids[0] ?? "");

    // check to make sure only one target is selected
    if ((args[0].targetUuids.length < 1) || (args[0].targetUuids.length > 1)) {
        ui.notifications.error("You need to select a single target.");
        return;
    }

    // Find Superiority Dice Resource
    let orcishFury = await findSheetResource(pcActor, "Orcish Fury");
    if (!orcishFury) { 
        ui.notifications.error("Could not find a recource labeled 'Orcish Fury'..."); 
        return;
    } else if (orcishFury < 1) return;

    // create a dialog and prompt to spend a superiority die
    let dialog = new Promise((resolve) => {
        new Dialog({
            // localize this text
            title: "Orcish Fury:",
            content: "<p>Use Orcish Fury for extra damage?</p>",
            buttons: {
                one: {
                    icon: '<p> </p><img src = "systems/dnd5e/icons/skills/red_01.jpg" width="60" height="60"></>',
                    label: "<p>Yes</p>",
                    callback: () => resolve(true)
                },
                two: {
                    icon: '<p> </p><img src = "systems/dnd5e/icons/skills/weapon_28.jpg" width="60" height="60"></>',
                    label: "<p>No</p>",
                    callback: () => {resolve(false)}
                }
            },
            default: "two"
        }).render(true);
    });
    let choice = await dialog;

    if (!choice) return;

    // if YES subtract a superiorty die
    await decrimentSheetResource (pcActor, "Orcish Fury", 1);

    // get the live MIDI-QOL workflow so we can make changes
    const diceMult = args[0].isCritical ? 2: 1;
    let baseDice = (1 * diceMult);
    let die = args[0].item.data.damage.parts[0][0].split('[')[0];   // everything before the [
    die = die.toLowerCase();                                        // convert the string to lower case
    let baseDie = die.split('d')[1];                                //everything after the 'd' the die size and any mods
    let furyRoll = (baseDice+"d"+baseDie);                          // assemble the FuryRoll

    const damageType = args[0].item.data.damage.parts[0][1];        // get teh damage type from the weapon in use   
    
    // roll the damage and add it to the workflow
    let damageRoll = await new Roll(furyRoll).roll();
    new MidiQOL.DamageOnlyWorkflow(actor, token, damageRoll.total, damageType, target ? [target] : [], damageRoll, {flavor: "Orcish Fury", itemCardId: args[0].itemCardId});
    return; 
}

//---------------------------------- MY FUNCTIONS -------------------------------------

// Test for available resource
// Return resource object
async function findSheetResource (testActor, resourceName) {
    let resources = Object.values(testActor.data.data.resources);
    let foundResource = resources.find(i => i.label.toLowerCase() === resourceName.toLowerCase());
    return foundResource;
}

// Decriment available resource
async function decrimentSheetResource (testActor, resourceName, numValue) {
    let actorDup = duplicate(testActor.data._source);
    let resources = Object.values(actorDup.data.resources);
    let foundResource = resources.find(i => i.label.toLowerCase() === resourceName.toLowerCase());
    foundResource.value = foundResource.value - numValue;
    await testActor.update(actorDup); 
    return;
}