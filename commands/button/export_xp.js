const Discord = require("discord.js");
const { MessageFlags } = require("discord.js");
module.exports = {
  metadata: {
    name: "button:export_xp",
  },

  async run(client, int, tools) {
    let db = await tools.fetchSettings(); // only fetch settings before checking perms
    if (!db) return tools.warn("*noData");

    if (!tools.canManageServer(int.member, db.settings.manualPerms))
      return tools.warn("*notMod");

    await int.deferReply({ flags: MessageFlags.Ephemeral });

    let allData = await tools.fetchAll(); // fetch all data

    let jsonData = JSON.stringify(
      { settings: allData.settings, users: allData.users },
      null,
      2
    );
    let attached = new Discord.AttachmentBuilder(
      Buffer.from(jsonData, "utf-8"),
      { name: `${int.guild.name}.json` }
    );
    return int
      .followUp({
        content: `Here's all the data for **${
          int.guild.name
        }**, as of <t:${Math.round(Date.now() / 1000)}:f>`,
        files: [attached],
        flags: MessageFlags.Ephemeral,
      })
      .catch((e) =>
        int.followUp({
          content: `**Something went wrong!** ${e.message}`,
          flags: MessageFlags.Ephemeral,
        })
      );
  },
};
