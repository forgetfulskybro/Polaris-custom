const moment = require("moment");
const Thread = require("../models/thread.js");
const Message = require("../models/message.js");
const {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ContainerBuilder,
  MessageFlags,
  TextDisplayBuilder,
} = require("discord.js");

module.exports = class Ticketing {
  async create(interaction, type) {
    const haveThread = await Thread.findOne({
      recipient: interaction.user.id,
      closed: false,
    });

    if (haveThread)
      return interaction.reply({
        content: `## You already have an ongoing ticket.\n\nChannel: <#${haveThread.channel}>`,
        flags: MessageFlags.Ephemeral,
      });

    const modalObject = {
      title: `Creating Ticket`,
      custom_id: "createTicket",
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              style: 2,
              min_length: 5,
              max_length: 1000,
              required: true,
              custom_id: "input",
              label: "Reason",
              placeholder: `Why are you creating this ticket?`,
            },
          ],
        },
      ],
    };

    interaction.showModal(modalObject).catch(() => {});
    interaction
      .awaitModalSubmit({
        filter: (mInter) => mInter.customId === modalObject.custom_id,
        time: 180000,
      })
      .then(async (modalInteraction) => {
        let input = modalInteraction.components[0].components[0].value;

        const channel = await interaction.client.guilds.cache
          .get(interaction.client.config.mainGuild)
          .channels.create({
            name: `${modalInteraction.user.username}`,
            type: 0,
            topic: `User: ${modalInteraction.user.username} (${modalInteraction.user.id})`,
            nsfw: false,
            parent: interaction.client.config.parent,
            permissionOverwrites: [
              {
                id: interaction.client.config.mainGuild,
                deny: ["ViewChannel"],
                type: "role",
              },
              type === "mod"
                ? {
                    id: interaction.client.config.moderator,
                    allow: ["ViewChannel"],
                    type: "role",
                  }
                : {
                    id: interaction.client.config.moderator,
                    deny: ["ViewChannel"],
                    type: "role",
                  },
              {
                id: interaction.client.config.management,
                deny: ["ViewChannel"],
                type: "role",
              },
              {
                id: modalInteraction.user.id,
                allow: ["ViewChannel"],
                type: "user",
              },
            ],
          });

        const textComp = new TextDisplayBuilder().setContent(
          type === "sky"
            ? `<@268843733317976066> <@${modalInteraction.user.id}>`
            : `<@&398965932418138125> <@${modalInteraction.user.id}>`
        );

        const infoEmbed = new ContainerBuilder()
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              `**${
                modalInteraction.user.username
              }** has opened a ticket.\nAccount was created <t:${Math.floor(
                interaction.user.createdTimestamp / 1000
              )}>.\n\n**Issue:** ${input}\n**Type:** ${type}`
            )
          )
          .addSeparatorComponents((separator) => separator)
          .addActionRowComponents((actionRow) =>
            actionRow.addComponents(
              new ButtonBuilder()
                .setCustomId("close")
                .setLabel("Close")
                .setStyle("Danger"),
              new ButtonBuilder()
                .setCustomId("closeReason")
                .setLabel("Close with reason")
                .setStyle("Danger"),
              new ButtonBuilder()
                .setCustomId("addUser")
                .setLabel("Add User")
                .setStyle("Primary"),
              new ButtonBuilder()
                .setCustomId("removeUser")
                .setLabel("Remove User")
                .setStyle("Secondary")
            )
          )
          .setAccentColor(0x0089de);

        channel
          .send({
            components: [textComp, infoEmbed],
            flags: MessageFlags.IsComponentsV2,
          })
          .then(async (msg) => await msg.pin());

        var threadID = await Thread.countDocuments();
        threadID += 1;

        await new Thread({
          id: threadID,
          recipient: interaction.user.id,
          contact: type,
          openedBy: interaction.user.id,
          channel: channel.id,
          admin: type === "sky" ? true : false,
          issue: input,
          timestamp: Date.now(),
        }).save();

        modalInteraction
          .reply({
            content: `Successfully created a ticket.`,
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => {});
      })
      .catch(() => {});
    return;
  }

  async createStaff(interaction, type, data) {
    const channel = await interaction.client.guilds.cache
      .get(interaction.client.config.mainGuild)
      .channels.create({
        name: `${data.user.username}`,
        type: 0,
        topic: `User: ${data.user.username} (${data.user.id})`,
        nsfw: false,
        parent: interaction.client.config.parent,
        permissionOverwrites: [
          {
            id: interaction.client.config.mainGuild,
            deny: ["ViewChannel"],
            type: "role",
          },
          type === "mod"
            ? {
                id: interaction.client.config.moderator,
                allow: ["ViewChannel"],
                type: "role",
              }
            : {
                id: interaction.client.config.moderator,
                deny: ["ViewChannel"],
                type: "role",
              },
          {
            id: interaction.client.config.management,
            deny: ["ViewChannel"],
            type: "role",
          },
          {
            id: data.user.id,
            allow: ["ViewChannel"],
            type: "user",
          },
        ],
      });

    const infoEmbed = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) => {
        textDisplay.setContent(
          `**${interaction.user.username}** opened a ticket for ${
            data.user.username
          }.\nAccount was created <t:${Math.floor(
            data.user.createdTimestamp / 1000
          )}>.\n\n**Issue:** ${data.issue}`
        );
      })
      .addActionRowComponents((actionRow) => {
        actionRow.addComponents(
          new ButtonBuilder()
            .setCustomId("close")
            .setLabel("Close")
            .setStyle("Danger"),
          new ButtonBuilder()
            .setCustomId("closeReason")
            .setLabel("Close with reason")
            .setStyle("Danger"),
          new ButtonBuilder()
            .setCustomId("addUser")
            .setLabel("Add User")
            .setStyle("Primary"),
          new ButtonBuilder()
            .setCustomId("removeUser")
            .setLabel("Remove User")
            .setStyle("Secondary")
        );
      })
      .setAccentColor(0x0089de);

    channel
      .send({
        components: [infoEmbed],
        flags: MessageFlags.IsComponentsV2,
        content: `<@${data.user.id}>`,
      })
      .then(async (msg) => await msg.pin());

    var threadID = await Thread.countDocuments();
    threadID += 1;

    await new Thread({
      id: threadID,
      recipient: data.user.id,
      contact: type,
      openedBy: interaction.user.id,
      channel: channel.id,
      admin: type === "sky" ? true : false,
      issue: data.issue,
      timestamp: Date.now(),
    }).save();

    interaction
      .reply({
        content: `Successfully created a ticket for ${data.user.username} in ${channel}.`,
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => {});
    return;
  }

  async delete(interaction, reason = false) {
    const recipientThread = await Thread.findOne({
      channel: interaction.channel.id,
      closed: false,
    });

    if (!recipientThread)
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `An error occured. There's no ticket in this channel!`,
      });

    if (
      !interaction.guild.members.cache
        .get(interaction.user.id)
        .roles.cache.has(interaction.client.config.management) ||
      !interaction.guild.members.cache
        .get(interaction.user.id)
        .roles.cache.has(interaction.client.config.moderator)
    )
      return interaction.reply({
        content: `Unauthorized to use this button.`,
        flags: MessageFlags.Ephemeral,
      });

    if (reason) {
      const modalObject = {
        title: `Closing with reason`,
        custom_id: "closeReason",
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                style: 2,
                min_length: 5,
                max_length: 1000,
                required: true,
                custom_id: "input",
                label: "Reason",
                placeholder: `Why are you closing this ticket?`,
              },
            ],
          },
        ],
      };

      interaction.showModal(modalObject).catch(() => {});
      await interaction
        .awaitModalSubmit({
          filter: (mInter) => mInter.customId === modalObject.custom_id,
          time: 180000,
        })
        .then(async (modalInteraction) => {
          const input = modalInteraction.components[0].components[0].value;

          const embed = new ContainerBuilder()
            .addTextDisplayComponents((textDisplay) =>
              textDisplay.setContent(
                `**Ticket Closed: ${
                  interaction.user.username
                }**\n\n**Recipient:** <@${recipientThread.recipient}> (${
                  recipientThread.recipient
                })\n**Contact:** ${
                  recipientThread.contact
                }\n**Time Lasted:** ${moment(recipientThread.timestamp)
                  .from(Date.now())
                  .replace("ago", "")}\n**Thread ID:** #${
                  recipientThread.id
                }\n**Issue:** "${recipientThread.issue}"\n**Reason:** ${input}`
              )
            )
            .setAccentColor(0x3665bb);

          modalInteraction.client.channels.cache
            .get(modalInteraction.client.config.log)
            .send({ components: [embed], flags: MessageFlags.IsComponentsV2 })
            .catch(() => {});
          recipientThread.closed = true;
          await recipientThread.save();

          await modalInteraction.reply({
            flags: MessageFlags.Ephemeral,
            content: "Done.",
          });

          return await modalInteraction.channel.delete({
            reason: `${modalInteraction.user.username}: Deleting ticket chnanel.`,
          });
        })
        .catch(() => {});
      return;
    }

    const embed = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `**Ticket Closed: ${
            interaction.user.username
          }**\n\n**Recipient:** <@${recipientThread.recipient}> (${
            recipientThread.recipient
          })\n**Contact:** ${
            recipientThread.contact
          }\n**Time Lasted:** ${moment(recipientThread.timestamp)
            .from(Date.now())
            .replace("ago", "")}\n**Thread ID:** #${
            recipientThread.id
          }\n**Issue:** "${
            recipientThread.issue
          }"\n**Reason:** Closed without reason`
        )
      )
      .setAccentColor(0x3665bb);

    interaction.client.channels.cache
      .get(interaction.client.config.log)
      .send({ components: [embed] })
      .catch(() => {});
    recipientThread.closed = true;
    await recipientThread.save();

    await interaction.channel
      .delete({
        reason: `${interaction.user.username}: Deleting ticket chnanel.`,
      })
      .catch(() => {
        return;
      });
  }

  async message(message) {
    if (!message) return;

    const recipientThread = await Thread.findOne({
      channel: message.channel.id,
      closed: false,
    });

    if (!recipientThread) return;

    const messageID =
      (await Message.countDocuments({
        thread: recipientThread.id,
      })) + 1;

    await new Message({
      thread: recipientThread.id,
      message: messageID,
      recipient: message.author.tag,
      channel: message.channel.id,
      content: message.content,
      author: message.author.id,
      attachments: message.attachments.map((a) => a.proxyURL),
      timestamp: Date.now(),
    }).save();
  }

  async addUser(interaction) {
    if (
      !interaction.guild.members.cache
        .get(interaction.user.id)
        .roles.cache.has(interaction.client.config.moderator) ||
      !interaction.guild.members.cache
        .get(interaction.user.id)
        .roles.cache.has(interaction.client.config.management)
    )
      return interaction.reply({
        content: `Unauthorized to use this button.`,
        flags: MessageFlags.Ephemeral,
      });

    const modalObject = {
      title: `Add User`,
      custom_id: "addUser",
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              style: 1,
              max_length: 20,
              required: true,
              custom_id: "input",
              label: "User",
              placeholder: `Why are you adding this user?`,
            },
          ],
        },
      ],
    };

    interaction.showModal(modalObject).catch(() => {});
    await interaction
      .awaitModalSubmit({
        filter: (mInter) => mInter.customId === modalObject.custom_id,
        time: 180000,
      })
      .then(async (modalInteraction) => {
        const input = modalInteraction.components[0].components[0].value;
        if (!interaction.guild.members.cache.has(input))
          return modalInteraction.reply({
            content: `Error! Could not find user in this server. Mention the user and try again!`,
            flags: MessageFlags.Ephemeral,
          });
        if (interaction.channel.members.has(input))
          return modalInteraction.reply({
            content: `Error! User is already in this channel!`,
            flags: MessageFlags.Ephemeral,
          });

        await interaction.client.channels.cache
          .get(interaction.channel.id)
          .permissionOverwrites.edit(input, { ViewChannel: true });
        modalInteraction.reply({
          content: `Successfully added <@${input}> to this ticket.`,
          flags: MessageFlags.Ephemeral,
        });
      })
      .catch(() => {});
  }

  async removeUser(interaction) {
    if (
      !interaction.guild.members.cache
        .get(interaction.user.id)
        .roles.cache.has(interaction.client.config.moderator) ||
      !interaction.guild.members.cache
        .get(interaction.user.id)
        .roles.cache.has(interaction.client.config.management)
    )
      return interaction.reply({
        content: `Unauthorized to use this button.`,
        flags: MessageFlags.Ephemeral,
      });

    const modalObject = {
      title: `Remove User`,
      custom_id: "removeUser",
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              style: 1,
              max_length: 20,
              required: true,
              custom_id: "input",
              label: "User",
              placeholder: `Why are you removing this user?`,
            },
          ],
        },
      ],
    };

    interaction.showModal(modalObject).catch(() => {});
    await interaction
      .awaitModalSubmit({
        filter: (mInter) => mInter.customId === modalObject.custom_id,
        time: 180000,
      })
      .then(async (modalInteraction) => {
        const input = modalInteraction.components[0].components[0].value;
        if (!interaction.guild.members.cache.has(input))
          return modalInteraction.reply({
            content: `Error! Could not find user in this server. Mention the user and try again!`,
            flags: MessageFlags.Ephemeral,
          });
        if (!interaction.channel.members.has(input))
          return modalInteraction.reply({
            content: `Error! Could not find user in this channel to remove!`,
            flags: MessageFlags.Ephemeral,
          });

        await interaction.client.channels.cache
          .get(interaction.channel.id)
          .permissionOverwrites.delete(input);
        modalInteraction.reply({
          content: `Successfully removed <@${input}> from this ticket.`,
          flags: MessageFlags.Ephemeral,
        });
      })
      .catch(() => {});
  }
};
