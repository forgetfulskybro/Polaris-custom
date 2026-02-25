const { MessageFlags, ContainerBuilder, ButtonBuilder } = require("discord.js");
const Snippet = require("../../models/snippet.js");
module.exports = {
  metadata: {
    name: "button:snippetView",
  },

  async run(client, int, tools) {
    const ID = int.customId.split("_")[1];
  
    const snippet = await Snippet.findOne({ id: ID });
    if (!snippet) return int.reply({ content: "Snippet not found", flags: [MessageFlags.Ephemeral] });

    const embed = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent(snippet.content))
  
    int.reply({
      components: [embed],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
    })
  }
}