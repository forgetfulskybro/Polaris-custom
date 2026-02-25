const { MessageFlags, ContainerBuilder, ComponentType } = require("discord.js");
const Snippet = require("../../models/snippet.js");
const Message = require("../../models/message.js");
const Thread = require("../../models/thread.js");
const { StringSelectMenuBuilder } = require("discord.js");

module.exports = {
  metadata: {
    name: "snippets",
    description:
      "command for viewing, adding, and removing snippets for the ticket system.",
    args: [
      {
        type: "string",
        name: "type",
        description: "Provide which type you want to use for this command.",
        required: true,
        choices: [
          { name: "Settings", value: "settings" },
          { name: "Send", value: "send" },
        ],
      },
    ],
  },

  async run(client, interaction, tools) {
    if (!interaction.member.roles.cache.has(client.config.moderator))
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `${client.config.emojis.redTick} Unauthorized to use this command.`,
      });

    switch (interaction.options.getString("type")) {
      case "settings":
        tools.snippetEmbed(interaction);
        break;
      case "send":
        const ITEMS_PER_PAGE = 23;
        const snippets = await Snippet.find();
        const totalItems = snippets.length;
        const maxPage = Math.ceil(totalItems / ITEMS_PER_PAGE) - 1;
        let currentPage = 0;

        function generateSelectMenu(page = 0) {
          const start = page * ITEMS_PER_PAGE;
          const end = start + ITEMS_PER_PAGE;
          const pageItems = snippets.slice(start, end);
          const options = [];

          pageItems.forEach((snip, index) => {
            const globalIndex = start + index + 1;
            options.push({
              label: `${globalIndex}. ${snip.keyword}`.slice(0, 100),
              value: snip.id,
              description: snip.content?.slice(0, 100) || undefined,
            });
          });

          const hasPrevious = page > 0;
          const hasNext = end < totalItems;

          options.unshift({
            label: "← Previous Page",
            value: "previous",
            default: false,
            disabled: !hasPrevious,
          });

          options.push({
            label: "Next Page →",
            value: "next",
            disabled: !hasNext,
          });

          return [
            new ContainerBuilder()
              .addTextDisplayComponents((text) =>
                text.setContent(
                  `## Snippet Selector - Page ${page + 1} / ${maxPage + 1}`,
                ),
              )
              .addSeparatorComponents((separator) => separator)
              .addTextDisplayComponents((text) =>
                text.setContent(
                  "Pick a snippet to send\n-# Choose a snippet to send (or change page)",
                ),
              )
              .addActionRowComponents((actionrow) =>
                actionrow.addComponents(
                  new StringSelectMenuBuilder()
                    .setCustomId("snippet_selector")
                    .setPlaceholder("Choose a snippet to send (or change page)")
                    .addOptions(options),
                ),
              ),
          ];
        }

        let embed = generateSelectMenu(currentPage);
        let msg = await interaction
          .reply({
            components: embed,
            flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
          })
          .catch((e) => console.log(e));

        let collector = msg.createMessageComponentCollector({
          componentType: ComponentType.StringSelect,
          time: 1_000_000,
        });

        collector.on("collect", async (int) => {
          if (int.customId === "snippet_selector") {
            const input = int.values[0];

            switch (input) {
              case "previous":
                if (currentPage === 0) return int.deferUpdate();
                currentPage = Math.max(0, currentPage - 1);
                const newEmbed = generateSelectMenu(currentPage);
                await int
                  .update({
                    components: newEmbed,
                    flags: [
                      MessageFlags.IsComponentsV2,
                      MessageFlags.Ephemeral,
                    ],
                  })
                  .catch((e) => console.log(e));

                break;
              case "next":
                if (currentPage === maxPage) return int.deferUpdate();
                currentPage = Math.min(maxPage, currentPage + 1);
                const newEmbed1 = generateSelectMenu(currentPage);
                await int
                  .update({
                    components: newEmbed1,
                    flags: [
                      MessageFlags.IsComponentsV2,
                      MessageFlags.Ephemeral,
                    ],
                  })
                  .catch((e) => console.log(e));

                break;
              default:
                const snippet = await Snippet.findOne({ id: input });
                if (!snippet)
                  return int.update({
                    components: [
                      new ContainerBuilder().addTextDisplayComponents((text) =>
                        text.setContent(`Snippet not found!`),
                      ),
                    ],
                    flags: [
                      MessageFlags.Ephemeral,
                      MessageFlags.IsComponentsV2,
                    ],
                  });

                await int.channel.send({
                  components: [
                    new ContainerBuilder()
                      .addTextDisplayComponents((text) =>
                        text.setContent(`# ${snippet.keyword}`),
                      )
                      .addSeparatorComponents((separator) => separator)
                      .addTextDisplayComponents((text) =>
                        text.setContent(snippet.content),
                      ),
                  ],
                  flags: [MessageFlags.IsComponentsV2],
                });

                const Thread = await Thread.findOne({
                  channel: interaction.channel.id,
                  closed: false,
                });
                
                if (Thread) {
                  const messageID =
                    (await Message.countDocuments({
                      thread: Thread.id,
                    })) + 1;

                  await new Message({
                    thread: Thread.id,
                    message: messageID,
                    recipient: interaction.user.username,
                    channel: interaction.channel.id,
                    content: `## ${snippet.keyword}\n\n${snippet.content}`,
                    author: interaction.user.id,
                    attachments: [],
                    timestamp: Date.now(),
                  }).save();
                }

                int.update({
                  components: [
                    new ContainerBuilder().addTextDisplayComponents((text) =>
                      text.setContent(`Snippet sent!`),
                    ),
                  ],
                  flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
                });

                return collector.stop();
            }
          }
        });

        collector.on("end", () => {
          collector.stop();
        });
    }
  },
};
