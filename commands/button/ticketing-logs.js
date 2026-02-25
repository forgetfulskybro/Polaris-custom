const { MessageFlags, ContainerBuilder, ButtonBuilder } = require("discord.js");
const Thread = require("../../models/thread.js");
const Messages = require("../../models/message.js");
module.exports = {
  metadata: {
    name: "button:ticketing-logs",
  },

  async run(client, int, tools) {
    const ID = int.customId.split("_")[1];
    
    const msgs = await Messages.find({
      thread: ID,
    });
    
    if (msgs.length === 0)
      return int.reply({
        flags: MessageFlags.Ephemeral,
        content: `${client.config.emojis.redTick} Thread ${ID} has no messages to be displayed!`,
      });
    
    const thread = await Thread.findOne({
      id: ID,
    });
    
    if (!thread)
      return int.reply({
        flags: MessageFlags.Ephemeral,
        content: `${client.config.emojis.redTick} Thread ${ID} doesn't exist!`,
      });

    const threadRecipient = await client.users.fetch(thread.recipient);

    let out = `=== Thread Details ===
    Thread ID: ${thread.id}
    Recipient: ${threadRecipient.tag} (ID: ${threadRecipient.id})
    Issue: ${thread.issue}
    Created At: ${new Date(thread.timestamp).toLocaleString()}

    === Messages ===

    `;

    for (const m of msgs) {
      const ma = await client.users.fetch(m.author);

      let fetchedContent = `@ ${ma.tag} (ID: ${m.author}) ${new Date(
        m.timestamp,
      ).toLocaleString()}
    - Content: ${m.content}
    `;
      for (const at of m.attachments) {
        fetchedContent += `> Attachment: ${at}\n`;
      }

      out += `${fetchedContent}

    `;
    }

    int.reply({
      flags: MessageFlags.Ephemeral,
      content: `${client.config.emojis.greenTick} Thread **#${thread.id}** Details:`,
      files: [
        {
          attachment: Buffer.from(out),
          name: `ticket_${thread.id}_details.txt`,
        },
      ],
    });
  },
};
