const { MessageFlags } = require("discord.js");
const Thread = require("../../models/thread.js");
module.exports = {
  metadata: {
    name: "ticket",
    description: "Create's a ticket for support to get in contact with a user",
    args: [
      {
        type: "user",
        name: "user",
        description: "Provide a user you want to start a ticket with",
        required: true,
      },
      {
        type: "string",
        name: "type",
        description: "Provide which type of ticket you want to open",
        choices: [
          { name: "sky", value: "sky" },
          { name: "mod", value: "mod" },
        ],
        required: true,
      },
    ],
  },

  async run(client, interaction, tools) {
    const target = interaction.options.get("user");
    const type = interaction.options.get("type").value;

    if (!interaction.member.roles.cache.has(client.config.moderator))
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `Error! Only moderators have access to open tickets.`,
      });

    if (
      type === "sky" &&
      !interaction.member.roles.cache.has(client.config.management)
    )
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `Error! Only management members have access to open tickets for sky.`,
      });

    const haveThread = await Thread.findOne({
      recipient: target.user.id,
      closed: false,
    });

    if (haveThread)
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `Error! A thread is already ongoing in <#${haveThread.channel}>.`,
      });

    client.ticket.createStaff(interaction, type, {
      user: {
        username: target.user.username,
        id: target.user.id,
        avatar: target.user.displayAvatarURL(),
        createdTimestamp: target.user.createdTimestamp,
      },
      issue: `Hello, the staff team have reached out to you. Please wait patiently while the team gets ready.`,
    });
  },
};
