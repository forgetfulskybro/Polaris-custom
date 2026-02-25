const { MessageFlags } = require('discord.js')
module.exports = {
metadata: {
    name: "button:toggle_xp",
},

async run(client, int, tools) {
    let db = await tools.fetchSettings()
    if (!db) return tools.warn("*noData")

    let settings = db.settings
    let enabled = !settings.enabled;
    if (!tools.canManageServer(int.member, settings.manualPerms)) return tools.warn("*notMod")

    let polarisSettings = [
        `**XP enabled: ${enabled ? "Yes!" : "No!"}**`,
        `**XP per message:** ${settings.gain.min == settings.gain.max ? tools.commafy(settings.gain.min) : `${tools.commafy(settings.gain.min)} - ${tools.commafy(settings.gain.max)}`}`,
        `**XP cooldown:** ${tools.commafy(settings.gain.time)} ${tools.extraS("sec", settings.gain.time)}`,
        `**XP curve:** ${settings.curve[3]}x³ + ${settings.curve[2]}x² + ${settings.curve[1]}x`,
        `**Level up message:** ${settings.levelUp.enabled && settings.levelUp.message ? (settings.levelUp.embed ? "Enabled (embed)" : "Enabled") : "Disabled"}`,
        `**Rank cards:** ${settings.rankCard.disabled ? "Disabled" : settings.rankCard.ephemeral ? "Enabled (forced hidden)" : "Enabled"}`,
    ]

    let embed = tools.createEmbed({
        author: { name: "Settings for " + int.guild.name, iconURL: int.guild.iconURL() },
        footer: "Visit the online dashboard to change server settings",
        color: tools.COLOR, timestamp: true,
        description: polarisSettings.join("\n")
    })

    let toggleButton = enabled ?
      {style: "Danger", label: "Disable XP", emoji: "❕", customId: "toggle_xp" }
    : {style: "Success", label: "Enable XP", emoji: "✨", customId: "toggle_xp" }

    let buttons = tools.button([
        {style: "Success", label: "Edit Settings", emoji: "🛠", customID: "settings_list"},
        toggleButton,
        {style: "Secondary", label: "Export Data", emoji: "⏏️", customId: "export_xp"}
    ])

    let listButtons = tools.button([
        {style: "Primary", label: `Reward Roles (${settings.rewards.length})`, customId: "list_reward_roles"},
        {style: "Primary", label: `Role Multipliers (${settings.multipliers.roles.length})`, customId: "list_multipliers~roles"},
        {style: "Primary", label: `Channel Multipliers (${settings.multipliers.channels.length})`, customId: "list_multipliers~channels"}
    ])
  
  client.db.update(int.guild.id, { $set: { 'settings.enabled': enabled, 'info.lastUpdate': Date.now() } }).then(() => {
      int.update({ embeds: [embed], components: [tools.row(buttons)[0], tools.row(listButtons)[0]], flags: [MessageFlags.Ephemeral] })
    }).catch(() => tools.warn("Something went wrong while trying to toggle XP!"))
}}