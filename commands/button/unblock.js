const { MessageFlags, ContainerBuilder } = require("discord.js");
const Blocks = require("../../models/blocked.js");

module.exports = {
  metadata: {
    name: "button:unblock",
  },

  async run(client, int, tools) {
    const ID = int.customId.split("_")[1];

    const block = await Blocks.findOne({ id: ID });
    if (!block)
      return int.reply({
        content: "This user is not blocked.",
        flags: MessageFlags.Ephemeral,
      });

    const embed = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(
          `# Unblocked by <@${int.user.id}> <t:${Math.floor(Date.now() / 1000)}:R>.\nOriginally blocked <t:${block.date}:R>`,
        ),
      )
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents((text) =>
        text.setContent(`**Blocked User**: <@${ID}>`),
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Staff Member**: <@${block.blockedBy}>`),
      )
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents((text) =>
        text.setContent(`**Reason**: ${block.reason}`),
      )
      .addSeparatorComponents((separator) => separator);

    if (block.images?.length > 0) {
      let galleryItems = [];
      for (const image of block.images) {
        galleryItems.push((galleryItem) => galleryItem.setURL(image));
      }

      embed.addMediaGalleryComponents((gallery) =>
        gallery.addItems(...galleryItems),
      );
    }

    int.update({ components: [embed] });
    await Blocks.findOneAndDelete({ id: ID });
  },
};
