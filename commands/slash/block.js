const { MessageFlags, ContainerBuilder, ButtonStyle } = require("discord.js");
const Blocks = require("../../models/blocked.js");

const modalObject = {
  title: "Block User from tickets",
  custom_id: "modal",
  components: [
    {
      type: 18,
      label: "User you want to block",
      component: {
        type: 5,
        custom_id: "user_selected",
        max_values: 1,
        required: true,
      },
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
          custom_id: "input",
          label: "Reason for blocking (This shows for the user if they try to open a ticket)",
          placeholder: "This user was mean to me :(",
        },
      ],
    },
    {
      type: 18,
      label: "File Evidence",
      description: "Provide evidence for your reasoning to block",
      component: {
        type: 19,
        custom_id: "file_upload",
        min_values: 1,
        max_values: 4,
        required: false,
      },
    },
  ],
};

module.exports = {
  metadata: {
    name: "block",
    description: "Block users from using tickets.",
  },

  async run(client, interaction, tools) {
    if (!interaction.member.roles.cache.has(client.config.moderator))
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `${client.config.emojis.redTick} You must be apart of our support team to access this command!`,
      });

    interaction.showModal(modalObject);
    await interaction
      .awaitModalSubmit({
        filter: (mInter) => mInter.customId === modalObject.custom_id,
        time: 180000,
      })
      .then(async (modalInteraction) => {
        const input = modalInteraction.components[0].component.values[0];
        const reason = modalInteraction.components[1].components[0].value;
        const images = modalInteraction.components[2]?.component?.attachments;

        const block = await Blocks.findOne({
          block: input,
        });

        if (block)
          return modalInteraction.reply({
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
            components: [
              new ContainerBuilder()
                .addTextDisplayComponents((text) =>
                  text.setContent(`**User**: <@${input}>`),
                )
                .addSeparatorComponents((separator) => separator)
                .addTextDisplayComponents((text) =>
                  text.setContent(
                    `**This user is already blocked from using tickets**`,
                  ),
                )
                .addTextDisplayComponents((text) =>
                  text.setContent(`**Reason**: ${reason}`),
                ),
            ],
          });

        const blocking = new Blocks({
          id: input,
          reason,
          images: images ? images.map((image) => image.url) : [],
          date: Math.floor(Date.now() / 1000),
          blockedBy: interaction.user.id,
        });

        blocking.save();

        const embed = new ContainerBuilder()
          .addTextDisplayComponents((text) =>
            text.setContent(`**Blocked User**: <@${input}>`),
          )
          .addSectionComponents((section) =>
            section
              .addTextDisplayComponents((text) =>
                text.setContent(`**Staff Member**: <@${interaction.user.id}>`),
              )
              .setButtonAccessory((button) =>
                button
                  .setLabel("Unblock")
                  .setStyle(ButtonStyle.Secondary)
                  .setCustomId(`unblock_${input}`),
              ),
          )
          .addSeparatorComponents((separator) => separator)
          .addTextDisplayComponents((text) =>
            text.setContent(`**Reason**: ${reason}`),
          )
          .addSeparatorComponents((separator) => separator);

        if (images) {
          let galleryItems = [];

          for (const image of images.values()) {
            galleryItems.push((galleryItem) => galleryItem.setURL(image.url));
          }

          embed.addMediaGalleryComponents((gallery) =>
            gallery.addItems(...galleryItems),
          );
        }

        const msg = await client.channels.cache.get(client.config.blocks).send({
          components: [embed],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
          allowed_mentions: {
            parse: [],
          },
        });

        modalInteraction.reply({
          components: [
            new ContainerBuilder()
              .addTextDisplayComponents((text) =>
                text.setContent(`User is blocked.`),
              )
              .addSeparatorComponents((separator) => separator)
              .addTextDisplayComponents((text) =>
                text.setContent(
                  `Blocked Message: https://discord.com/channels/${msg.guild.id}/${msg.channel.id}/${msg.id}`,
                ),
              ),
          ],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        });
      });
  },
};
