const { EmbedBuilder, ActionRowBuilder , ButtonBuilder} = require("discord.js");
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
          .setDescription(
            `Use the buttons below the panel to open a support ticket.`
          )
          .setImage(
            `https://cdn.discordapp.com/attachments/864868908661997589/1161123185383723058/bluesky.jpg?ex=6537273c&is=6524b23c&hm=53a94b3531420b1cacce5380312ee478783ca06832fb7708e945b3edb5529938&`
          )
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
