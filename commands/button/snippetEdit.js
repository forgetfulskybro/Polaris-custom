const { MessageFlags, ContainerBuilder, ButtonStyle, ButtonBuilder } = require("discord.js");
const Snippet = require("../../models/snippet.js");

const nameObject = {
  title: "Editing Snippet Name",
  custom_id: "modal",
  components: [
    {
      type: 1,
      components: [
        {
          type: 4,
          style: 1,
          min_length: 2,
          max_length: 50,
          required: true,
          custom_id: "input",
          label: "Name",
          placeholder: "Add text to be the name of the snippet.",
        },
      ],
    },
  ],
};

function getEmbed(snippet, ID) {
  return new ContainerBuilder()
    .addActionRowComponents((actionRow) =>
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`snippetEdit_${ID}_back`)
          .setLabel("Go Back")
          .setStyle(ButtonStyle.Secondary),
      ),
    )
    .addSectionComponents((section) =>
      section
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`**Name**: ${snippet.keyword}`),
        )
        .setButtonAccessory((button) =>
          button
            .setCustomId(`snippetEdit_${ID}_name`)
            .setEmoji({ id: "1472684664886923448", name: "edit" })
            .setStyle(ButtonStyle.Secondary),
        ),
    )
    .addSeparatorComponents((separator) => separator)
    .addSectionComponents((section) =>
      section
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `**Content**:\n\`\`\`${snippet.content}\`\`\``,
          ),
        )
        .setButtonAccessory((button) =>
          button
            .setCustomId(`snippetEdit_${ID}_content`)
            .setEmoji({ id: "1472684664886923448", name: "edit" })
            .setStyle(ButtonStyle.Secondary),
        ),
    );
}

module.exports = {
  metadata: {
    name: "button:snippetEdit",
  },

  async run(client, int, tools) {
    const ID = int.customId.split("_")[1];
    const type = int.customId.split("_")[2];

    const snippet = await Snippet.findOne({ id: ID });
    if (!snippet)
      return int.reply({ content: "Snippet not found", flags: [MessageFlags.Ephemeral] });

    if (type && type === "back") {
      return tools.snippetEmbed(int, true);
    } else if (type && type === "name") {
      int.showModal(nameObject).catch(() => {});
      return int
        .awaitModalSubmit({
          filter: (mInter) => mInter.customId === nameObject.custom_id,
          time: 180000,
        })
        .then(async (modalInteraction) => {
          let input = modalInteraction.components[0].components[0].value;

          await snippet.updateOne({ keyword: input });
          await snippet.save();

          const newSnippet = await Snippet.findOne({ id: ID });
          return modalInteraction.update({
            components: [getEmbed(newSnippet, ID)],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
          });
        })
        .catch(() => {});
    } else if (type && type === "content") {
      const contentObject = {
        title: "Editing Snippet Content",
        custom_id: "modal",
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                style: 2,
                min_length: 10,
                max_length: 2000,
                required: true,
                custom_id: "input2",
                label: `Name: '${snippet.keyword}'`,
                placeholder: "Add text to be the content for this snippet.",
              },
            ],
          },
        ],
      };

      int.showModal(contentObject).catch(() => {});
      return int
        .awaitModalSubmit({
          filter: (mInter) => mInter.customId === contentObject.custom_id,
          time: 180000,
        })
        .then(async (modalInteraction) => {
          let input = modalInteraction.components[0].components[0].value;

          await snippet.updateOne({ content: input });
          await snippet.save();

          const newSnippet = await Snippet.findOne({ id: ID });
          return modalInteraction.update({
            components: [getEmbed(newSnippet, ID)],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
          });
        })
        .catch(() => {});
    }

    int.update({
      components: [getEmbed(snippet, ID)],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
  },
};
