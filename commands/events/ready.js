const { ChalkAdvanced } = require('chalk-advanced');
const wait = require("timers/promises").setTimeout;
const startTime = Date.now()

module.exports =  async (client) => {
    console.log(`${ChalkAdvanced.white("[ Bot ]")} ${ChalkAdvanced.gray(">")} ${ChalkAdvanced.green("Bot started")} (${+process.uptime().toFixed(2)} secs)`)
    client.startupTime = Date.now() - startTime

    client.application.commands.fetch() // cache slash commands
    .then(cmds => {
        if (cmds.size < 1) { // no commands!! deploy to test server
            console.info("!!! No global commands found, deploying dev commands to test server (Use /deploy global=true to deploy global commands)")
            client.commands.get("deploy").run(client, null, client.globalTools)
        }
    })

    async function Invites() {
        wait(1000);
        const firstInvites = await client.guilds.cache
          .get(client.config.mainGuild)
          .invites.fetch();
        firstInvites.map((invite) =>
          client.invites.set(invite.code, {
            uses: invite.uses,
            inviter: invite.inviter,
          })
        );
    
        if (firstInvites) {
          console.log(
            `${ChalkAdvanced.white("[ Invites ]")} ${ChalkAdvanced.gray(
              ">"
            )} ${ChalkAdvanced.green("Imported guild invites")} (${+process.uptime().toFixed(2)} secs)`
          );
        } else {
          console.log(
            `${ChalkAdvanced.white("[ Invites ]")} ${ChalkAdvanced.gray(
              ">"
            )} ${ChalkAdvanced.red("Failed to import guild invites")}`
          );
        }
      }
    
      await Invites();

    client.updateStatus()
    setInterval(client.updateStatus, 15 * 60000);
}
