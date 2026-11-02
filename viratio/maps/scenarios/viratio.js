Trigger.prototype.defeatedTracker = new Set();
Trigger.prototype.requiredDefeats = [3, 4];
Trigger.prototype.bothDefeatedDone = false;

Trigger.prototype.PostInit = function ()
{
	cmpTrigger.romanArmy = this.GetEntsInsideSquare(this.allSoldiers, 200, 600, 800, 1400); // get the roman army at the pass 
	cmpTrigger.campArmy = this.GetEntsInsideSquare(this.allSoldiers, 500, 700, 1600, 1800); // get the roman army at the camp 
    QueryPlayerIDInterface(1, IID_Diplomacy).SetNeutral(3);
    QueryPlayerIDInterface(1, IID_Diplomacy).SetNeutral(4);
    QueryPlayerIDInterface(3, IID_Diplomacy).SetNeutral(1);
    QueryPlayerIDInterface(3, IID_Diplomacy).Ally(2);
    QueryPlayerIDInterface(3, IID_Diplomacy).Ally(4);
    QueryPlayerIDInterface(4, IID_Diplomacy).SetNeutral(1);
    QueryPlayerIDInterface(4, IID_Diplomacy).Ally(2);
    QueryPlayerIDInterface(4, IID_Diplomacy).Ally(3);
};

Trigger.prototype.OnPlayerDefeatedAction = function(data)
{
	// Assumption: data.playerId holds the defeated player's ID
	if (!this.requiredDefeats.includes(data.playerId))
		return;

	this.defeatedTracker.add(data.playerId);

	if (this.bothDefeatedDone)
		return;
	if (!this.requiredDefeats.every(id => this.defeatedTracker.has(id)))
		return;

	this.bothDefeatedDone = true;
	this.PlayerVictory();
};

Trigger.prototype.DisableTechnologies = function()
{
	for (let i = 1; i < TriggerHelper.GetNumberOfPlayers(); ++i)
		QueryPlayerIDInterface(i).SetDisabledTechnologies([
			"phase_city_{civ}"
		]);
};

Trigger.prototype.CheckKill = function (data) // when an entity dies
{
    let entity = data.entity;

    if (entity == this.Viratio) // mission is lost if Viratio is slain
    {
        cmpTrigger.DisableTrigger("OnEntityDeath", "CheckKill"); // dont repeat this again
        cmpTrigger.DoAfterDelay(1000, "DefeatPlayer", {});
    }
    else if (entity == this.CivCenter) // mission is lost if the Civ Center is destroyed
    {
        cmpTrigger.DisableTrigger("OnEntityDeath", "CheckKill"); // dont repeat this again
        cmpTrigger.DoAfterDelay(1000, "DefeatPlayer", {});
    }
    else if (entity == this.General) // mission is won when the Roman General is slain
    {
        cmpTrigger.DoAfterDelay(1000, "RomanRetreat", {});
        cmpTrigger.DoAfterDelay(1000, "PassRetreat", {});
        cmpTrigger.DoAfterDelay(1000, "HostileIber", {});
    }
};

Trigger.prototype.HostileIber = function (data)
{
    QueryPlayerIDInterface(1, IID_Diplomacy).SetEnemy(3);
    QueryPlayerIDInterface(1, IID_Diplomacy).SetEnemy(4);
    QueryPlayerIDInterface(3, IID_Diplomacy).SetEnemy(1);
    QueryPlayerIDInterface(4, IID_Diplomacy).SetEnemy(1);
};

Trigger.prototype.RomanAttack = function (data)
{
	ProcessCommand(2, {
		"type": "attack-walk",
		"entities": this.campArmy,
		"x": 1267,
		"z": 301,
		"queued": false,
		"force": true
	});
};

Trigger.prototype.RomanRetreat = function (data)
{
	ProcessCommand(2, {
		"type": "walk",
		"entities": this.campArmy,
		"x": 605,
		"z": 1550,
		"queued": false,
		"force": true
	});
};

Trigger.prototype.PassRetreat = function (data)
{
	ProcessCommand(2, {
		"type": "walk",
		"entities": this.romanArmy,
		"x": 605,
		"z": 1550,
		"queued": false,
		"force": true
	});
};

Trigger.prototype.CommandCenterCapture = function (data)
{
    for (const ent of this.CommandCenter)
    {
        const cmpOwnership = Engine.QueryInterface(ent, IID_Ownership);
        if (cmpOwnership)
            cmpOwnership.SetOwner(1);
    }

    cmpTrigger.DisableTrigger("OnRange", "CommandCenterCapture"); // dont repeat this again
    cmpTrigger.DoAfterDelay(5000, "RomanAttack", {});
    cmpTrigger.DoAfterDelay(1000, "TimerStart", {});
};

Trigger.prototype.DefeatPlayer = function ()
{
    let cmpPlayer = QueryPlayerIDInterface(1, IID_Player);
    cmpPlayer.SetState("defeated", "Either Viratio was killed, or your command center was destroyed. Either way, you have lost.");
}

Trigger.prototype.PlayerVictory = function ()
{
    let cmpPlayer = QueryPlayerIDInterface(1, IID_Player);
    cmpPlayer.SetState("won", "Both Belli and Thetti have been defeated, victory is yours!");
}

Trigger.prototype.GetEntsInsideSquare = function (list, minX, maxX, minZ, maxZ)
{
    let newList = [];
    for (let ent of list)
    {
        const cmpPosition = Engine.QueryInterface(ent, IID_Position);
        if (!cmpPosition)
        {
            warn("GetEntsInsideSquare: entity " + ent + " has no Position component, skipping");
            continue;
        }
        if (!cmpPosition || !cmpPosition.IsInWorld())
            continue;

        let pos = cmpPosition.GetPosition2D();
        if (pos.x > minX && pos.x < maxX && pos.y > minZ && pos.y < maxZ)
            newList.push(ent);
    }
    return newList;
};

var cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
cmpTrigger.RegisterTrigger("OnInitGame", "DisableTechnologies", { "enabled": true });
cmpTrigger.RegisterTrigger("OnEntityDeath", "CheckKill", { "enabled": true });
cmpTrigger.RegisterTrigger("OnRange", "CommandCenterCapture", { "enabled": true, entities: cmpTrigger.GetTriggerPoints("A"), players: [1], minRange: 0, maxRange: 60, requiredComponent: IID_UnitAI }); 
cmpTrigger.RegisterTrigger("OnPlayerDefeated", "OnPlayerDefeatedAction", {"enabled": true});
cmpTrigger.allSoldiers = TriggerHelper.GetAllPlayersEntitiesByClass("Soldier");
cmpTrigger.state = "start";
cmpTrigger.playerID = 1;
cmpTrigger.enemyID = 0;
cmpTrigger.General = 1183;
cmpTrigger.CivCenter = 1127;
cmpTrigger.CommandCenter = [1127, 1128, 1130, 1131, 1134, 1135, 1136, 1137, 1138, 1139, 1140, 1141, 1142]; // reference to the command center
cmpTrigger.Viratio = 611; // reference to Viratio
cmpTrigger.DoAfterDelay(1000, "PostInit", {});
