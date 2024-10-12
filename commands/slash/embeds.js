const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
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
        ],
      },
    ],
  },

  async run(client, interaction, tools) {
    switch (interaction.options._hoistedOptions[0].value) {
      case "tickets":
        const embed = new EmbedBuilder()
          .setTitle("Support Tickets")
          .setDescription(`Use the buttons below the panel to open a support ticket.`)
          .setImage(`https://i.imgur.com/ETYtGyT.png`)
          .setColor("#0089DE");
        const button = new ActionRowBuilder().addComponents(
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
        );

        interaction.channel.send({
          embeds: [embed],
          components: [button],
        });
        break;

      case "verify":
        const embed1 = new EmbedBuilder()
          .setTitle("Verification")
          .setDescription(
            `Click the button below to start the verification process.`
          )
          .setColor("#0089DE");
        const button1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("verify")
            .setLabel("Verify")
            .setStyle("Secondary")
        );

        interaction.channel.send({
          embeds: [embed1],
          components: [button1],
        });
        break;
    }

    interaction.reply({
      content: `Successfully used \`${interaction.options._hoistedOptions[0].value}\` embed.`,
      ephemeral: true,
    });
  },
};
