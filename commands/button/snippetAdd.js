const { MessageFlags } = require("discord.js");
const Snippet = require("../../models/snippet.js");

const modalObject = {
  title: "Creating Snippet",
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
          label: "Content",
          placeholder: "Add text to be the content for this snippet.",
        },
      ],
    },
  ],
};

module.exports = {
  metadata: {
    name: "button:snippetAdd",
  },

  async run(client, int, tools) {
    int.showModal(modalObject);
    int
      .awaitModalSubmit({
        filter: (mInter) => mInter.customId === modalObject.custom_id,
        time: 180000,
      })
      .then(async (modalInteraction) => {
        let input = modalInteraction.components[0].components[0].value;
        let input2 = modalInteraction.components[1].components[0].value;

        const snipp = await Snippet.findOne({
          keyword: input,
        });
        if (snipp)
          return modalInteraction.reply({
            flags: MessageFlags.Ephemeral,
            content: `${client.config.emojis.redTick} A snippet with name \`${input}\` already exists!`,
          });

        await new Snippet({
          keyword: input,
          content: input2,
          created: Date.now(),
          id: crypto.randomUUID(),
        }).save();

        return tools.snippetEmbed(modalInteraction, true);
      })
      .catch((e) => {
        console.log(e);
      });
  },
};
