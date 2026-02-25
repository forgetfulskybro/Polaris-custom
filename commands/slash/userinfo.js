const { ContainerBuilder, MessageFlags, Routes } = require("discord.js");
const { ButtonBuilder } = require("@discordjs/builders");
module.exports = {
  metadata: {
    dev: true,
    name: "userinfo",
    description: "Basic userinfo command",
    userInstall: true,
    args: [
      {
        type: "string",
        name: "user",
        description: "Provide a user's ID to fetch their info.",
        required: true,
      },
    ],
  },

  async run(client, interaction, tools) {
    const userId = interaction.options.get("user").value;
    const user = await client.users
      .fetch(userId, { cache: false, force: true })
      .catch(() => null);
    if (!user)
      return interaction.reply({ content: "User not found.", flags: [MessageFlags.Ephemeral] });

    if (!user.bot) {
      let banned = await client.guilds.cache
        .get("286252263109033984")
        .bans.fetch(user.id)
        .catch(() => null);
      let tag;
      if (user.primaryGuild && user.primaryGuild.identityEnabled) {
        const identity = user.primaryGuild;
        tag = await client.application.emojis.create({
          name: `tempTag_${user.id}_${Math.random()}`,
          attachment: `https://cdn.discordapp.com/clan-badges/${identity.identityGuildId}/${identity.badge}.png`,
        });
      }

      const embed = new ContainerBuilder().addSectionComponents((sect) =>
        sect
          .addTextDisplayComponents((text) =>
            text.setContent(
              `User **${user.tag}** ${
                user.globalName ? `(${user.globalName})` : ""
              }\n**Tag:** ${tag ? `<:${tag.name}:${tag.id}>${user.primaryGuild.tag}` : "None"}\n**ID:** ${user.id}\n**Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:F> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)\n`,
            ),
          )
          .setThumbnailAccessory((thumb) =>
            thumb.setURL(
              user.displayAvatarURL({ extension: "png", size: 1024 }) ||
                user.defaultAvatarURL(),
            ),
          ),
      );

      await tools.gallery(user, embed);
      embed.setAccentColor(0x3665bb);
      embed.addSeparatorComponents((separator) => separator);
      if (banned) {
        embed.addTextDisplayComponents((text) =>
          text.setContent(`**Ban Reason:** ${banned.reason}`),
        );
        embed.addSeparatorComponents((separator) => separator);
      }
      embed.addActionRowComponents((row) =>
        row.addComponents(
          banned
            ? new ButtonBuilder()
                .setLabel("Unban User?")
                .setStyle("Danger")
                .setCustomId(`unbanuser_${user.id}`)
            : new ButtonBuilder()
                .setLabel("Ban User?")
                .setStyle("Danger")
                .setCustomId(`banuser_${user.id}`),
          new ButtonBuilder()
            .setLabel("Connections")
            .setStyle("Success")
            .setCustomId(`connections_${user.id}`),
        ),
      );
      return interaction
        .reply({
          components: [embed],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        })
        .then(async () => {
          if (tag) client.application.emojis.delete(tag.id);
        });
    } else {
      const bot = await fetch(
        `https://beta.japi.rest/discord/v1/application/${user.id}`,
      )
        .then((res) => res.json())
        .catch(() => {
          return;
        });
      if (!bot.success) {
        const embed = new ContainerBuilder().addSectionComponents((sect) =>
          sect
            .addTextDisplayComponents((text) =>
              text.setContent(
                `<:bot:1470872034220179649><:veri_bot2:1470870518738456770> **${user.tag}**} | ${user.id}
\n**Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:F> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)
\n`,
              ),
            )
            .setThumbnailAccessory((thumb) =>
              thumb.setURL(
                user.displayAvatarURL({ extension: "png", size: 1024 }) ||
                  user.defaultAvatarURL(),
              ),
            ),
        );

        await tools.gallery(user, embed);
        embed.setAccentColor(0x3665bb);

        return interaction.reply({
          components: [embed],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        });
      }

      function section(data, emb) {
        if (data?.directory_entry?.external_urls?.length > 0) {
          embed.addTextDisplayComponents((text) =>
            text.setContent(
              `\n**Guild Count**: ${data.approximate_guild_count}\n**Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:F> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)\n**Public**: ${bot.data.bot_public ? "True" : "False"}\n**Discoverable**: ${bot.data.is_discoverable ? "True" : "False"}\n**External Links**:`,
            ),
          );
          return emb.addActionRowComponents((row) =>
            row.addComponents(
              data.directory_entry.external_urls.map((link) =>
                new ButtonBuilder()
                  .setStyle("Link")
                  .setLabel(link.name)
                  .setURL(link.url),
              ),
            ),
          );
        } else {
          return embed.addTextDisplayComponents((text) =>
            text.setContent(
              `\n**Guild Count**: ${data.approximate_guild_count}\n**Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:F> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)\n**Public**: ${bot.data.bot_public ? "True" : "False"}\n**Discoverable**: ${bot.data.is_discoverable ? "True" : "False"}\n**External Links**: None`,
            ),
          );
        }
      }

      function section2(data, emb) {
        if (data?.directory_entry?.popular_application_commands?.length > 0) {
          embed.addTextDisplayComponents((text) =>
            text.setContent(`\n**Popular Commands**:`),
          );
          return emb.addActionRowComponents((row) =>
            row.addComponents(
              data.directory_entry.popular_application_commands.map((cmd) =>
                new ButtonBuilder()
                  .setStyle("Secondary")
                  .setLabel(`/${cmd.name}`)
                  .setCustomId(`popularCommand_${cmd.id}`),
              ),
            ),
          );
        } else {
          return embed.addTextDisplayComponents((text) =>
            text.setContent(`\n**Popular Commands**: None`),
          );
        }
      }

      const embed = new ContainerBuilder().addSectionComponents((sect) =>
        sect
          .addTextDisplayComponents((text) =>
            text.setContent(
              `${bot.data.is_verified ? "<:veri_bot:1470870502699434038><:veri_bot2:1470870518738456770>" : "<:bot:1470872034220179649><:veri_bot2:1470870518738456770>"} **${user.tag}** | ${user.id}\n${bot.data.description}`,
            ),
          )
          .setThumbnailAccessory((thumb) =>
            thumb.setURL(
              user.displayAvatarURL({ extension: "png", size: 1024 }) ||
                user.defaultAvatarURL(),
            ),
          ),
      );

      embed.addSeparatorComponents((separator) => separator);
      section(bot.data, embed);
      section2(bot.data, embed);
      let icon;
      if (bot.data.guild) {
        icon = await client.application.emojis.create({
          name: `guildicon_${bot.data.guild.id}`,
          attachment: `https://cdn.discordapp.com/icons/${bot.data.guild.id}/${bot.data.guild.icon}.png?size=1024`,
        });

        const creationDate = new Date(
          Number(
            (BigInt(bot.data.guild.id) >> BigInt("22")) +
              BigInt("1420070400000"),
          ),
        );
        const time = `<t:${Math.floor(creationDate.getTime() / 1000)}:F> (<t:${Math.floor(creationDate.getTime() / 1000)}:R>)`;
        embed.addSeparatorComponents((separator) => separator);
        embed.addTextDisplayComponents((text) =>
          text.setContent(
            `<:${icon.name}:${icon.id}> **${bot.data.guild.name}**\n<:online:1458309926806880472>${bot.data.guild.approximate_presence_count} Online <:offline:1458310153257488394>${bot.data.guild.approximate_member_count} Members\n${time}${bot.data.guild.description ? `\n> ${bot.data.guild.description}` : ``}`,
          ),
        );
        embed.addSeparatorComponents((separator) => separator);
      }

      await tools.gallery(user, embed);
      embed.addMediaGalleryComponents((mediaGallary) => mediaGallary.addItems((item) => item.setURL(`https://japi.tools/discord/apps/application/${user.id}/servers-graph`)))
      // embed.addSeparatorComponents((separator) => separator);
      // embed.addActionRowComponents((row) =>
      //   row.addComponents(
      //     new ButtonBuilder()
      //       .setStyle("Secondary")
      //       .setLabel(`History`)
      //       .setCustomId(`history_${user.id}`),
      //   ),
      // );
      embed.setAccentColor(0x3665bb);

      return interaction
        .reply({
          components: [embed],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        })
        .then(async () => {
          if (icon) client.application.emojis.delete(icon.id);
        });
    }
  },
};
