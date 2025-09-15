const LevelUpMessage = require("../../classes/LevelUpMessage.js");
const config = require("../../config.json");

module.exports = async (client, message) => {
  // if (message.channel.id == "1167953302793756712" && message.author.id == "1167953594314661899") return message.reply(`<@&1167954257887105045>`);
  if (message.system || message.author.bot) return;
  else if (!message.guild || !message.member) return; // dm stuff

  if (config.lockBotToDevOnly && !client.globalTools.isDev(message.author))
    return;

  // fetch server xp settings, this can probably be optimized with caching but shrug
  let author = message.author.id;
  let db = await client.globalTools.fetchSettings(author, message.guild.id);
  if (!db || !db.settings?.enabled) return;

  let settings = db.settings;

  // fetch user's xp, or give them 0
  let userData = db.users[author] || { xp: 0, cooldown: 0 };
  if (userData.cooldown > Date.now()) return; // on cooldown, stop here

  // check role+channel multipliers, exit if 0x
  let multiplierData = client.globalTools.getMultiplier(
    message.member,
    settings,
    message.channel
  );
  if (multiplierData.multiplier <= 0) return;

  // randomly choose an amount of XP to give
  let oldXP = userData.xp;
  let xpRange = [settings.gain.min, settings.gain.max].map((x) =>
    Math.round(x * multiplierData.multiplier)
  );
  let xpGained = client.globalTools.rng(...xpRange); // number between min and max, inclusive

  if (xpGained > 0) userData.xp += Math.round(xpGained);
  else return;

  // set xp cooldown
  if (settings.gain.time > 0)
    userData.cooldown = Date.now() + settings.gain.time * 1000;

  // if hidden from leaderboard, unhide since they're no longer inactive
  if (userData.hidden) userData.hidden = false;

  // database update
  client.db
    .update(message.guild.id, { $set: { [`users.${author}`]: userData } })
    .exec();

  // check for level up
  let oldLevel = client.globalTools.getLevel(oldXP, settings);
  let newLevel = client.globalTools.getLevel(userData.xp, settings);
  let levelUp = newLevel > oldLevel;

  // auto sync roles on xp gain or level up
  let syncMode = settings.rewardSyncing.sync;
  if (syncMode == "xp" || (syncMode == "level" && levelUp)) {
    let roleCheck = client.globalTools.checkLevelRoles(
      message.guild.roles.cache,
      message.member.roles.cache,
      newLevel,
      settings.rewards,
      null,
      oldLevel
    );
    client.globalTools
      .syncLevelRoles(message.member, roleCheck)
      .catch(() => {});
  }

  // level up message
  if (levelUp && settings.levelUp.enabled && settings.levelUp.message) {
    let useMultiple =
      settings.levelUp.multiple > 1 &&
      (settings.levelUp.multipleUntil == 0 ||
        newLevel < settings.levelUp.multipleUntil);
    if (!useMultiple || newLevel % settings.levelUp.multiple == 0) {
      let lvlMessage = new LevelUpMessage(settings, message, {
        oldLevel,
        level: newLevel,
        userData,
      });
      lvlMessage.send();
    }
  }
};
