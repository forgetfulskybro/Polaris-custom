const { MessageFlags } = require("discord.js");
const Thread = require("../../models/thread.js");
module.exports = {
  metadata: {
    name: "info",
    description: "See how fast/slow the bot is currently & other info",
  },

  async run(client, interaction, tools) {
    const unixstamp =
      Math.floor((Date.now() / 1000) | 0) - Math.floor(client.uptime / 1000);

    let beforeCall = Date.now();
    await Thread.findOne();
    let dbPing = Date.now() - beforeCall;

    interaction.reply({
      content: `${
        client.ws.ping > 200
          ? client.config.emojis.redTick
          : client.config.emojis.greenTick
      } **Latency**: ${client.ws.ping}ms\n${
        dbPing > 30
          ? client.config.emojis.redTick
          : client.config.emojis.greenTick
      } **Database**: ${dbPing}ms
      
      **Uptime**: <t:${unixstamp}:R>      `,
      flags: MessageFlags.Ephemeral,
    });
  },
};
