const { ContainerBuilder, MessageFlags, Routes } = require("discord.js");
const { ButtonBuilder } = require("@discordjs/builders");
const { REST } = require("@discordjs/rest");
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
module.exports = {
  metadata: {
    dev: true,
    name: "userinfo",
    description: "Basic userinfo command",
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
    const user = await client.users.fetch(userId).catch(() => null);
    console.log(user);
    if (!user)
      return interaction.reply({ content: "User not found.", ephemeral: true });

    let banned = await interaction.guild.bans.fetch(user.id).catch(() => null);
    let tag;
    if (user.primaryGuild && user.primaryGuild.identityEnabled) {
      const identity = user.primaryGuild;
      tag = await client.application.emojis.create({
        name: "tempTag",
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
    embed.setAccentColor(0x3665bb);
    embed.addSeparatorComponents((separator) => separator);
    if (banned) {
      embed.addTextDisplayComponents((text) =>
        text.setContent(`**Ban Reason:** ${banned.reason}`)
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
          .setCustomId(`connections_${user.id}`)
      )
    );
    return interaction
      .reply({
        components: [embed],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      })
      .then(async () => {
        if (tag)
          client.application.emojis.delete(tag.id);
      });
  },
};
