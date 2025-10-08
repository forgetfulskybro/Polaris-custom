const { MessageFlags, ContainerBuilder, ButtonBuilder } = require("discord.js");
const emojis = {
  mastodon: "<:mastodon:1422024653311836223>",
  instagram: "<:instagram:1422023623459213393>",
  youtube: "<:youtube:1422015121617715251>",
  xbox: "<:xbox:1422015111417303202>",
  twitter: "<:twitter:1422015098444058666>",
  x: "<:twitter:1422015098444058666>",
  twitch: "<:twitch:1422015086020792444>",
  tiktok: "<:tiktok:1422015072028327957>",
  steam: "<:steam:1422015055402369065>",
  spotify: "<:spotify:1422015037010219099>",
  riotgames: "<:riotgames:1422015021759725599>",
  reddit: "<:reddit:1422015008728027288>",
  playstation: "<:playstation:1422014997914976356>",
  paypal: "<:paypal:1422014976146673725>",
  leagueoflegends: "<:leagueoflegends:1422014964964786418>",
  github: "<:github:1422014954772496524>",
  facebook: "<:facebook:1422014942340579479>",
  epicgames: "<:epicgames:1422014927237021841>",
  ebay: "<:ebay:1422014920417083503>",
  domain: "<:domain:1422014909964615833>",
  crunchyroll: "<:crunchyroll:1422014902666530908>",
  bungie: "<:bungie:1422014892973625364>",
  bluesky: "<:bluesky:1422014883515334656>",
  battlenet: "<:battlenet:1422014873419649055>",
};

module.exports = {
  metadata: {
    name: "button:connections",
  },

  async run(client, int, tools) {
    await int.deferUpdate();
    const userId = int.customId.split("_")[1];

    const connections = await fetch(
      `https://japi.rest/discord/v1/user/${userId}/connections`
    )
      .then((res) => res.json())
      .catch(() => int.deferUpdate());
    if (!connections || !connections.data || connections.data.error)
      return int.deferUpdate();

    const groupedConnections = connections.data.reduce((acc, conn) => {
      if (!acc[conn.type]) {
        acc[conn.type] = [];
      }
      acc[conn.type].push(conn);
      return acc;
    }, {});

    const user = await client.users.fetch(userId).catch(() => null);
    let tag;
    if (user.primaryGuild && user.primaryGuild.identityEnabled) {
      const identity = user.primaryGuild;
      tag = await int.guild.emojis
        .create({
          attachment: `https://cdn.discordapp.com/clan-badges/${identity.identityGuildId}/${identity.badge}.png`,
          name: "tempTag",
        })
        .catch(() => null);
    }

    const embed = new ContainerBuilder().addSectionComponents((sect) =>
      sect
        .addTextDisplayComponents((text) =>
          text.setContent(
            `User **${user.tag}** ${
              user.globalName ? `(${user.globalName})` : ""
            }\n**Tag:** ${
              tag ? `<:${tag.name}:${tag.id}>${user.primaryGuild.tag}` : "None"
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

    tools.gallary(user, embed);
    embed.addSeparatorComponents((separator) => separator);
    Object.entries(groupedConnections).forEach(([type, conns]) => {
      embed.addTextDisplayComponents((text) =>
        text.setContent(
          `${emojis[type]} **${type.charAt(0).toUpperCase() + type.slice(1)}**`
        )
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
                new Date(conn.metadata.created_at).getTime() / 1000
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
          .setCustomId(`banuser_${user.id}`)
      )
    );

    return int
      .editReply({
        components: [embed],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      })
      .then(async () => {
        if (tag)
          await int.guild.emojis.delete(
            tag,
            "Emoji was used for userinfo command"
          );
      });
  },
};
