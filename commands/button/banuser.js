const { MessageFlags, ContainerBuilder, ButtonBuilder } = require("discord.js");

const banModal = {
  title: `Ban User`,
  custom_id: "banUser",
  components: [
    {
      type: 1,
      components: [
        {
          type: 4,
          style: 1,
          min_length: 4,
          required: true,
          custom_id: "input",
          label: "Ban Hammer",
          placeholder: `Why are you banning this user?`,
        },
      ],
    },
  ],
};

module.exports = {
  metadata: {
    name: "button:banuser",
  },

  async run(client, int, tools) {
    const userId = int.customId.split("_")[1];
    if (int.user.id == userId) return int.deferUpdate();

    int.showModal(banModal).catch(() => {});
    await int
      .awaitModalSubmit({
        filter: (mInter) => mInter.customId === banModal.custom_id,
        time: 180000,
      })
      .then(async (modalInteraction) => {
        let reason = modalInteraction.components[0].components[0].value;
        await modalInteraction.guild.bans
          .create(userId, { reason: reason })
          .catch(() => {});

        let banned = await modalInteraction.guild.bans
          .fetch(userId)
          .catch(() => null);
        const user = await client.users.fetch(userId, { cache: false, force: true }).catch(() => null);
        let tag;
        if (user.primaryGuild && user.primaryGuild.identityEnabled) {
          const identity = user.primaryGuild;
          tag = await client.application.emojis.create({
            name: `tempTag_${user.id}`,
            attachment: `https://cdn.discordapp.com/clan-badges/${identity.identityGuildId}/${identity.badge}.png`,
          });
        }

        const embed = new ContainerBuilder().addSectionComponents((sect) =>
          sect
            .addTextDisplayComponents((text) =>
              text.setContent(
                `User **${user.tag}** ${
                  user.globalName ? `(${user.globalName})` : ""
                }\n**Tag:** ${
                  tag
                    ? `<:${tag.name}:${tag.id}>${user.primaryGuild.tag}`
                    : "None"
                }\n**ID:** ${user.id}\n**Bot:** ${
                  user.bot ? "Yes" : "No"
                }\n**Created:** <t:${Math.floor(
                  user.createdTimestamp / 1000
                )}:F> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)\n`
              )
            )
            .setThumbnailAccessory((thumb) =>
              thumb.setURL(
                user.displayAvatarURL({ extension: "png", size: 1024 }) ||
                  user.defaultAvatarURL()
              )
            )
        );

        await tools.gallery(user, embed);
        embed.setAccentColor(0x3665bb);
        embed.addSeparatorComponents((separator) => separator);
        embed.addTextDisplayComponents((text) =>
          text.setContent(`**Ban Reason:** ${banned.reason}`)
        );
        embed.addSeparatorComponents((separator) => separator);
        embed.addActionRowComponents((row) =>
          row.addComponents(
            new ButtonBuilder()
              .setLabel("Unban User?")
              .setStyle("Danger")
              .setCustomId(`unbanuser_${user.id}`),
            new ButtonBuilder()
              .setLabel("Connections")
              .setStyle("Success")
              .setCustomId(`connections_${user.id}`)
          )
        );

        modalInteraction
          .update({
            components: [embed],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
          })
          .then(async () => {
            if (tag)
               client.application.emojis.delete(tag.id);
          });
      });
  },
};
