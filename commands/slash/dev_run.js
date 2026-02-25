const {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  ComponentType,
} = require("discord.js");
const util = require("util");

module.exports = {
  metadata: {
    dev: true,
    name: "run",
    description: "(dev) Evaluate JS code (with pagination - Components V2)",
    args: [
      {
        type: "string",
        name: "code",
        description: "Some JS code to evaluate",
        required: true,
      },
    ],
  },

  async run(client, interaction, tools) {
    await interaction.deferReply({
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
    const code = interaction.options.getString("code");

    let output;
    try {
      output = await Promise.resolve(eval(code));
    } catch (err) {
      output = err;
    }

    let cleaned;
    if (output instanceof Error) {
      cleaned = `**Error**: ${output.name}\n${output.message}\n${output.stack || ""}`;
    } else {
      cleaned =
        typeof output === "string"
          ? output
          : util.inspect(output, {
              depth: 2,
              maxArrayLength: 150,
              compact: false,
              breakLength: 120,
              colors: false,
              getters: true,
              showHidden: false,
            });
    }

    cleaned = cleaned
      .replace(client.token, "[TOKEN]")
      .replace(process.env?.DISCORD_TOKEN ?? "", "[TOKEN]")
      .replace(/[\w-]{24}\.[\w-]{6}\.[\w-]{27,}/g, "[TOKEN]");

    const MAX_LENGTH = 3900;
    const pages = [];
    let current = "";

    for (const line of cleaned.split("\n")) {
      if (current.length + line.length + 1 > MAX_LENGTH) {
        pages.push(current);
        current = line;
      } else {
        current += (current ? "\n" : "") + line;
      }
    }

    if (current) pages.push(current);
    if (pages.length === 0) pages.push("**No output / empty result**");
    let currentPage = 0;

    const buildContainer = (pageIndex) => {
      const content = pages[pageIndex] || "???";

      return new ContainerBuilder()
        .addTextDisplayComponents((text) => text.setContent(`\`\`\`js\n${content}\n\`\`\``)
        )
        .addSeparatorComponents((separator) => separator)
        .addActionRowComponents((actionRow) =>
          actionRow.setComponents(
            new ButtonBuilder()
              .setCustomId("evalPrev")
              .setLabel("◀")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(pageIndex === 0),
            new ButtonBuilder()
              .setCustomId("evalNext")
              .setLabel("▶")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(pageIndex === pages.length - 1),
          ),
        );
    };

    const container = buildContainer(0);
    const message = await interaction.editReply({
      components: [container],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
    });

    if (pages.length === 1) {
      return;
    }

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300_000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "evalPrev") {
        currentPage--;
      } else if (i.customId === "evalNext") {
        currentPage++;
      }

      currentPage = Math.max(0, Math.min(currentPage, pages.length - 1));
      const newContainer = buildContainer(currentPage);
      await i.update({
        components: [newContainer],
      });
    });

    collector.on("end", async () => {
      try {
        const disabledContainer = new ContainerBuilder()
          .addTextDisplayComponents((text) => text.setContent(`\`\`\`js\n${content}\n\`\`\``))
          .addSeparatorComponents((separator) => separator)
          .addActionRowComponents((ar) =>
            ar.setComponents(
              new ButtonBuilder()
                .setCustomId("prev")
                .setLabel("◀")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId("next")
                .setLabel("▶")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            ),
          );

        await message.edit({ components: [disabledContainer] });
      } catch {}
    });
  },
};
