const Tools = require("../../classes/Tools.js");
const Blocked = require("../../models/blocked.js");
module.exports = async (client, interaction) => {
  let foundCommand;
  // for setting changes
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId.startsWith("configmenu_")) {
      if (interaction.customId.split("_")[1] != interaction.user.id)
        return interaction.deferUpdate();
      let configData = interaction.values[0].split("_").slice(1);
      let configCmd =
        configData[0] == "dir"
          ? "button:settings_list"
          : "button:settings_view";
      client.commands
        .get(configCmd)
        .run(client, interaction, new Tools(client, interaction), configData);
    }
    return;
  }

  // also for setting changes
  else if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith("configmodal")) {
      let modalData = interaction.customId.split("~");
      if (modalData[2] != interaction.user.id) return interaction.deferUpdate();
      client.commands
        .get("button:settings_edit")
        .run(client, interaction, new Tools(client, interaction), modalData[1]);
    }
    return;
  }

  if (interaction.isChatInputCommand()) {
    foundCommand = client.commands.get(interaction.commandName);
    if (foundCommand?.metadata?.slashEquivalent)
      foundCommand = client.commands.get(foundCommand.metadata.slashEquivalent);

    let tools = new Tools(client, interaction);
    if (foundCommand.metadata.dev && !tools.isDev())
      return tools.warn("Only developers can use this!");
    else if (client.config.lockBotToDevOnly && !tools.isDev())
      return tools.warn("Only developers can use this bot!");
    try {
      await foundCommand.run(client, interaction, tools);
    } catch (e) {
      console.error(e);
      interaction.reply({
        content: "**Error!** " + e.message,
        ephemeral: true,
      });
    }
  } else if (interaction.isButton()) {
    foundCommand = client.commands.get(
      `button:${interaction.customId.split("~")[0]}`
    );
    if (foundCommand) {
      foundCommand = client.commands.get(foundCommand.metadata.slashEquivalent);

      try {
        await foundCommand.run(client, interaction);
      } catch (e) {
        console.error(e);
        interaction.reply({
          content: "**Error!** " + e.message,
          ephemeral: true,
        });
      }
    } else {
      const block = await Blocked.findOne({
        block: interaction.user.id,
      });

      if (block)
        return interaction.reply({
          content: `## You are currently blocked from opening tickets.\n\nReason: ${block.reason}`,
          ephemeral: true,
        });

      switch (interaction.customId) {
        case "verify":
          await client.captcha.start(interaction);
          break;
        case "captcha":
          await client.captcha.verify(interaction);
          break;
        case "sky":
        case "mod":
          await client.ticket.create(interaction, interaction.customId);
          break;
        case "close":
        case "closeReason":
          await client.ticket.delete(
            interaction,
            interaction.customId === "closeReason"
          );
          break;

        case "addUser":
          await client.ticket.addUser(interaction);
          break;

        case "removeUser":
          await client.ticket.removeUser(interaction);
          break;
      }
    }
  }
};
