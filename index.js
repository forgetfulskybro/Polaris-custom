const Model = require("./classes/DatabaseModel.js");
const keepAlive = require("./classes/keepAlive.js");
const Ticketing = require("./classes/ticketing.js");
const Captcha = require("./classes/captcha.js");
const Tools = require("./classes/Tools.js");
const config = require("./config.json")
const Discord = require("discord.js")
const { readdir } = require('fs');
const fs = require("fs")

// automatic files: these handle discord status and version number, manage them with the dev commands
const autoPath = "./json/auto/"
if (!fs.existsSync(autoPath)) fs.mkdirSync(autoPath)
if (!fs.existsSync(autoPath + "status.json")) fs.copyFileSync("./json/default_status.json", autoPath + "status.json")
if (!fs.existsSync(autoPath + "version.json")) fs.writeFileSync(autoPath + "version.json", JSON.stringify({ version: "1.0.0", updated: Date.now() }, null, 2))
const rawStatus = require("./json/auto/status.json")

// create client
const client = new Discord.Client({
    allowedMentions: { parse: ["users", "roles"] },
    makeCache: Discord.Options.cacheWithLimits({ MessageManager: 0 }),
    intents: ['Guilds', 'GuildMessages', 'GuildMembers', 'DirectMessages', 'GuildMessageReactions', 'MessageContent'].map(i => Discord.GatewayIntentBits[i]),
    partials: ['Channel'].map(p => Discord.Partials[p]),
    failIfNotExists: false
})

client.keepAlive = new keepAlive(client);
client.keepAlive.start();
client.ticket = new Ticketing();
client.captcha = new Captcha();
client.config = config;
client.invites = new Discord.Collection();
client.commands = new Discord.Collection();
client.used = new Map();
client.buttons = new Map();
client.globalTools = new Tools(client);
client.db = new Model("servers", require("./database_schema.js").schema)
client.commands = new Discord.Collection()

client.statusData = rawStatus
client.updateStatus = function() {
    let status = client.statusData
    client.user.setPresence({ activities: status.type ? [{ name: status.name, state: status.state || undefined, type: Discord.ActivityType[status.type], url: status.url }] : [], status: status.status })
}

const dir = "./commands/"
fs.readdirSync("./commands").forEach(type => {
    fs.readdirSync(dir + type).filter(x => x.endsWith(".js")).forEach(file => {
        let command = require(dir + type + "/" + file)
        if (!command.metadata) command.metadata = { name: file.split(".js")[0] }
        command.metadata.type = type
        client.commands.set(command.metadata.name, command)
    })
})

readdir('./commands/events/', (err, files) => {
    if (err) return console.error(err);

    files.forEach((file) => {
      const event = require(`./commands/events/${file}`);
      const eventName = file.split('.')[0];
      client.on(eventName, event.bind(null, client));
    });
});

client.login(process.env.DISCORD_TOKEN)