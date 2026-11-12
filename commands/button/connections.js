const {
  MessageFlags,
  ContainerBuilder,
  ButtonBuilder,
  AttachmentBuilder,
} = require("discord.js");
const { getCachedProfileCard } = require("../../classes/profileCard.js");
const emojis = require("../../json/connection_emojis.json");

module.exports = {
  metadata: {
    name: "button:connections",
  },

  async run(client, int, tools) {
    await int.deferUpdate();
    const userId = int.customId.split("_")[1];

    const connections = await fetch(
      `https://japi.rest/discord/v1/user/${userId}/connections`,
      { signal: AbortSignal.timeout(7000) },
    )
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
    const connectionData = Array.isArray(connections?.data) ? connections.data : [];
    if (!connectionData.length) return;

    const groupedConnections = connectionData.reduce((acc, conn) => {
      if (!acc[conn.type]) {
        acc[conn.type] = [];
      }
      acc[conn.type].push(conn);
      return acc;
    }, {});

    const user = await client.users.fetch(userId, { cache: false, force: true }).catch(() => null);
    const embed = new ContainerBuilder().addSectionComponents((sect) =>
      sect
        .addTextDisplayComponents((text) =>
          text.setContent(
            `User **${user.tag}** ${
              user.globalName ? `(${user.globalName})` : ""
            }\n**Tag:** ${
              user.primaryGuild?.identityEnabled ? user.primaryGuild.tag : "None"
            }\n**ID:** ${user.id}\n**Bot:** ${
              user.bot ? "Yes" : "No"
            }\n**Created:** <t:${Math.floor(
              user.createdTimestamp / 1000,
            )}:F> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)\n`,
          ),
        )
        .setThumbnailAccessory((thumb) =>
          thumb.setURL(
            user.displayAvatarURL({ extension: "png", size: 1024 }) ||
              user.defaultAvatarURL(),
          ),
        ),
    );

    const cachedCard = getCachedProfileCard(user.id);
    const existingCard =
      !cachedCard &&
      int.message?.attachments?.find((attachment) =>
        /^profile-.*\.(png|gif)$/i.test(attachment.name || ""),
      );

    let cardFile = null;
    const card = cachedCard || existingCard;
    if (card) {
      cardFile = new AttachmentBuilder(cachedCard ? cachedCard.buffer : card.url, {
        name: card.name,
      });
      embed.addMediaGalleryComponents((gallery) =>
        gallery.addItems((item) =>
          item
            .setURL(`attachment://${card.name}`)
            .setDescription(`${user.displayName}'s profile card`),
        ),
      );
    } else {
      await tools.gallery(user, embed);
    }

    embed.addSeparatorComponents((separator) => separator);
    Object.entries(groupedConnections).forEach(([type, conns]) => {
      embed.addTextDisplayComponents((text) =>
        text.setContent(
          `${emojis[type]} **${type.charAt(0).toUpperCase() + type.slice(1)}**`,
        ),
      );

      let content = "";
      conns.forEach((conn, index) => {
        content += `\n${
          conn?.metadata?.created_at
            ? `<:log_downrightdown:1420807950708113529>`
            : `<:log_downright:1420807935608754217>`
        }${
          conn.url
            ? `[${conn.name || "Unknown"}](${conn.url})`
            : conn.name || "Unknown"
        }${
          conn.metadata && conn.metadata.created_at
            ? `\n<:log_downright:1420807935608754217>**Created**: <t:${Math.floor(
                new Date(conn.metadata.created_at).getTime() / 1000,
              )}:R>`
            : ""
        }`;
      });
      embed.addTextDisplayComponents((text) => text.setContent(content));
    });

    embed.setAccentColor(0x3665bb);
    embed.addSeparatorComponents((separator) => separator);
    embed.addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setLabel("Ban User?")
          .setStyle("Danger")
          .setCustomId(`banuser_${user.id}`),
      ),
    );

    return int.editReply({
      components: [embed],
      files: cardFile ? [cardFile] : [],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
  },
};
