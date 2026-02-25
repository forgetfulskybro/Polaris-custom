const {
  MessageFlags,
  ContainerBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Snippet = require("../../models/snippet.js");
module.exports = {
  metadata: {
    name: "button:snippetDelete",
  },

  async run(client, int, tools) {
    const ID = int.customId.split("_")[1];
    const answer = int.customId.split("_")[2];

    if (answer && answer === "yes") {
      await Snippet.deleteOne({ id: ID });
      return await tools.snippetEmbed(int, true);
    } else if (answer && answer === "no") {
      return await tools.snippetEmbed(int, true);
    }

    const snippet = await Snippet.findOne({ id: ID });
    if (!snippet)
      return int.reply({ content: "Snippet not found", flags: [MessageFlags.Ephemeral] });

    int.update({
      components: [
        new ContainerBuilder()
          .addSectionComponents((section) =>
            section
              .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(`**Name**: ${snippet.keyword}`),
              )
              .setButtonAccessory((button) =>
                button
                  .setCustomId(`snippetView_${ID}`)
                  .setEmoji({ id: "1472684666128695356", name: "view" })
                  .setStyle(ButtonStyle.Secondary),
              ),
          )
          .addSeparatorComponents((separator) => separator)
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              `**Are you sure you want to delete this snippet?**`,
            ),
          )
          .addActionRowComponents((actionrow) =>
            actionrow.addComponents(
              new ButtonBuilder()
                .setCustomId(`snippetDelete_${ID}_yes`)
                .setLabel("Yes")
                .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                .setCustomId(`snippetDelete_${ID}_no`)
                .setLabel("No")
                .setStyle(ButtonStyle.Secondary),
            ),
          ),
      ],
    });
  },
};
