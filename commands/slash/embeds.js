const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ContainerBuilder,
  MessageFlags,
} = require("discord.js");
module.exports = {
  metadata: {
    dev: true,
    name: "embeds",
    description: "Random embeds",
    args: [
      {
        type: "string",
        name: "option",
        description: "Type of embed",
        required: true,
        choices: [
          { name: "tickets", value: "tickets" },
          { name: "verify", value: "verify" },
          { name: "roles", value: "roles" },
        ],
      },
    ],
  },

  async run(client, interaction, tools) {
    switch (interaction.options._hoistedOptions[0].value) {
      case "tickets":
        const tickets = new ContainerBuilder()
          .setAccentColor(0x0089de)
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              `## Support Tickets\n\nUse the buttons below the panel to open a support ticket.`
            )
          )
          .addMediaGalleryComponents((mediaGallery) =>
            mediaGallery.addItems((galleryItem) =>
              galleryItem.setURL("https://i.imgur.com/ETYtGyT.png")
            )
          )
          .addActionRowComponents((actionRow) =>
            actionRow.setComponents(
              new ButtonBuilder()
                .setCustomId("sky")
                .setEmoji("1161124874950021130")
                .setLabel("Contact Sky")
                .setStyle("Primary"),
              new ButtonBuilder()
                .setCustomId("mod")
                .setEmoji("600055790182596619")
                .setLabel("Moderation")
                .setStyle("Secondary")
            )
          );

        interaction.channel.send({
          components: [tickets],
          flags: MessageFlags.IsComponentsV2,
        });
        break;

      case "verify":
        const text = new ContainerBuilder()
          .setAccentColor(0x0089de)
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`# Verification`)
          )
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              `Click the button below to start the verification process.`
            )
          )
          .addActionRowComponents((actionRow) =>
            actionRow.setComponents(
              new ButtonBuilder()
                .setCustomId("verify")
                .setLabel("Verify")
                .setStyle("Secondary")
            )
          );

        interaction.channel.send({
          components: [text],
          flags: MessageFlags.IsComponentsV2,
        });
        break;

      case "roles":
        const roles = new ContainerBuilder()
          .setAccentColor(0x0089de)
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              `## Color Roles\n\nClick the button below to get a color role.`
            )
          )
          .addActionRowComponents((actionRow) =>
            actionRow.setComponents(
              new StringSelectMenuBuilder()
                .setCustomId("colorRoles")
                .setPlaceholder("Select a role to be your color")
                .setMinValues(0)
                .setMaxValues(1)
                .addOptions([
                  {
                    label: "Red",
                    value: "418170855583907861",
                    emoji: "1351260385399013537",
                  },
                  {
                    label: "Blood Red",
                    value: "429392983041900564",
                    emoji: "1351259941771411556",
                  },
                  {
                    label: "Dark Red",
                    value: "418171715160637440",
                    emoji: "1351260384404963429",
                  },
                  {
                    label: "Royal Blue",
                    value: "507325828175233044",
                    emoji: "1351259938219098182",
                  },
                  {
                    label: "Dark Blue",
                    value: "418176076880281602",
                    emoji: "1351260383519838279",
                  },
                  {
                    label: "Blue",
                    value: "418170913033289739",
                    emoji: "1351259934674780221",
                  },
                  {
                    label: "Cyan",
                    value: "472008582469124097",
                    emoji: "1351260382672719962",
                  },
                  {
                    label: "Pink",
                    value: "418170958549876739",
                    emoji: "1351259931231129600",
                  },
                  {
                    label: "Orange",
                    value: "418171341355614219",
                    emoji: "1351260381326348391",
                  },
                  {
                    label: "Dark Orange",
                    value: "418171526727335946",
                    emoji: "1351259927712366663",
                  },
                  {
                    label: "Purple",
                    value: "418170998953738241",
                    emoji: "1351260380298608690",
                  },
                  {
                    label: "Dark Purple",
                    value: "418176912243032074",
                    emoji: "1351259925338128517",
                  },
                  {
                    label: "Yellow",
                    value: "419439869048258570",
                    emoji: "1351260379287916657",
                  },
                  {
                    label: "Gold",
                    value: "429392366206582794",
                    emoji: "1351259922645516409",
                  },
                  {
                    label: "Green",
                    value: "418176224838549528",
                    emoji: "1351259921802592316",
                  },
                  {
                    label: "Dark Green",
                    value: "418176288512147456",
                    emoji: "1351259920917336155",
                  },
                  {
                    label: "Ocean Blue",
                    value: "419441049182666754",
                    emoji: "1351259919952908370",
                  },
                  {
                    label: "Ocean Dark Blue",
                    value: "418176632314920962",
                    emoji: "1351259919059386379",
                  },
                  {
                    label: "Black",
                    value: "429392210639716352",
                    emoji: "1351259918014873722",
                  },
                  {
                    label: "Nightsky Blue",
                    value: "429393368926126081",
                    emoji: "1351259917029474314",
                  },
                ])
            )
          )
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              `## Continent Roles\n\nClick the button below to get a continent role.`
            )
          )
          .addActionRowComponents((actionRow) =>
            actionRow.setComponents(
              new StringSelectMenuBuilder()
                .setCustomId("conRoles")
                .setPlaceholder("Select a role to which your country resides")
                .setMinValues(0)
                .setMaxValues(1)
                .addOptions([
                  {
                    label: "Africa",
                    value: "454739527504756746",
                    emoji: "🌍",
                  },
                  {
                    label: "Asia",
                    value: "454739590226640909",
                    emoji: "🌏",
                  },
                  {
                    label: "Europe",
                    value: "454739557834031124",
                    emoji: "🌍",
                  },
                  {
                    label: "North America",
                    value: "454739621994037258",
                    emoji: "🌎",
                  },
                  {
                    label: "South America",
                    value: "454739674217578526",
                    emoji: "🌎",
                  },
                  {
                    label: "Australia",
                    value: "454739762645827595",
                    emoji: "🌏",
                  },
                ])
            )
          )
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              `## Ping Roles\n\nClick the button below to get a ping role.`
            )
          )
          .addActionRowComponents((actionRow) =>
            actionRow.setComponents(
              new StringSelectMenuBuilder()
                .setCustomId("pingRoles")
                .setPlaceholder("Select a role for ping roles")
                .setMinValues(0)
                .setMaxValues(1)
                .addOptions([
                  {
                    label: "Free Games Ping",
                    value: "1167954257887105045",
                  },
                  {
                    label: "Question Of The Day",
                    value: "1159688275179614301",
                  },
                  {
                    label: "Announcement Ping",
                    value: "1010702228073492610",
                  },
                ])
            )
          )
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              `**Note:** If you want to remove a role, deselect the role you just did and reselect the role you want removed.`
            )
          );

        interaction.channel.send({
          components: [roles],
          flags: MessageFlags.IsComponentsV2,
        });
        break;
    }

    interaction.reply({
      content: `Successfully used \`${interaction.options._hoistedOptions[0].value}\` embed.`,
      ephemeral: true,
    });
  },
};
