const { EmbedBuilder, WebhookClient } = require("discord.js");
const Convert = require("../../classes/convert.js");
const Thread = require("../../models/thread.js");
module.exports = async (client, member) => {
  const recipientThread = await Thread.findOne({
    recipient: member.user.id,
    closed: false,
  });

  if (recipientThread) {
    const embed = new EmbedBuilder()
      .setAuthor({
        name: member.user.tag,
        iconURL: member.user.avatarURL({
          dynamic: true,
          format: "png",
        }),
      })
      .setDescription(
        `${client.config.emojis.redTick} User has left the server.`
      )
      .setColor("#E74D3C")
      .setTimestamp();

    const channel = client.channels.cache.get(recipientThread.channel);
    channel.send({ embeds: [embed] });
  }

  if (process.env.EVENT_LEAVE_TOKEN.indexOf("api/webhooks") > -1) {
    const webhook = new WebhookClient({
      url: process.env.EVENT_JOIN_TOKEN,
    });
    webhook.send({
      username: client.config.webhook.name,
      avatarURL: client.config.webhook.icon,
      content: `\`[${new Convert().time()}]\` ${
        client.config.emojis.redTick
      } **${member.user.tag}** (ID:${member.user.id}) left the server`,
    });
  }
};
