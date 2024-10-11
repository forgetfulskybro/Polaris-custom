const { dependencies } = require('../../package.json');
const config = require("../../config.json")

module.exports = {
metadata: {
    name: "botstatus",
    description: "View some details about the bot"
},

async run(client, int, tools) {

    let versionNumber = client.version.version != Math.round(client.version.version) ? client.version.version : client.version.version.toFixed(1)

    let stats = await client.shard.broadcastEval(cl => ({ guilds: cl.guilds.cache.size, users: cl.users.cache.size }))
    let totalServers = stats.reduce((a, b) => a + b.guilds, 0)

    let botStatus = [
        `**Original creator:** **[Colon](https://gdcolon.com)** 🦊⛩️`,
        `**Version:** v${versionNumber} - updated <t:${Math.round(client.version.updated / 1000)}:R>`,
        `**Shard:** ${client.shard.id}/${client.shard.count - 1}`,
        `**Uptime:** ${tools.timestamp(client.uptime)}`,
        `**Servers:** ${tools.commafy(totalServers)}${client.shard.count == 1 ? "" : ` (on shard: ${tools.commafy(client.guilds.cache.size)})`}`,
        `**Memory usage:** ${Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2))} MB`
    ]

    let embed = tools.createEmbed({
        author: { name: client.user.displayName, iconURL: client.user.avatarURL() },
        color: tools.COLOR, timestamp: true, footer: "Pinging...",
        description: botStatus.join("\n")
    })

    int.reply({embeds: [embed], fetchReply: true}).then(msg => {
        embed.setFooter({ text: `Ping: ${tools.commafy(msg.createdTimestamp - int.createdAt)}ms`})
        int.editReply({ embeds: [embed], components: msg.components })
    })

}}