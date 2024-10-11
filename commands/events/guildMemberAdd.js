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
        `${client.config.emojis.greenTick} User has joined the server.`
      )
      .setColor("#E74D3C")
      .setTimestamp();

    const channel = client.channels.cache.get(recipientThread.channel);
    channel.send({ embeds: [embed] });
  }

  if (process.env.EVENT_JOIN_TOKEN.indexOf("api/webhooks") > -1) {
    const newInvites = await member.guild.invites.fetch();
    const invite = newInvites.find(
      (i) => i.uses > client.invites.get(i.code)?.uses
    );
    const inviter = await client.users.fetch(invite.inviter.id);

    const webhook = new WebhookClient({ url: process.env.EVENT_JOIN_TOKEN });
    webhook.send({
      username: client.config.webhook.name,
      avatarURL: client.config.webhook.icon,
      content: `\`[${new Convert().time()}]\` ${client.config.emojis.greenTick}${inviter ? ` **${inviter.tag}** invited ` : ''}**${
        member.user.tag
      }** (ID:${member.user.id}) ${inviter ? `to the server` : `joined the server`}\n\`[ ${invite.code} ]\` \`[${
        invite.uses
      }]\``,
    });
  }
};
