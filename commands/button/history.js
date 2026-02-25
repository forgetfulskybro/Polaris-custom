const { MessageFlags, ContainerBuilder, ButtonBuilder } = require("discord.js");

module.exports = {
  metadata: {
    name: "button:history",
  },
  
  async run(client, int, tools) {
    await int.deferUpdate();
    const userId = int.customId.split("_")[1];

    const data = await fetch(
      `https://beta.japi.rest/discord/v1/application/${userId}/changes`,
    )
      .then((res) => res.json())
      .catch(() => {return});
    if (!data || !data.result || !data.error)
      return;
    
    
    
  }
}