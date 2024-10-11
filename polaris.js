const Discord = require("discord.js")
require('dotenv').config();

const token = process.env.DISCORD_TOKEN
if (!token) return console.log("No Discord token provided! Put one in your .env file")

const Shard = new Discord.ShardingManager('./index.js', { token } );
Shard.spawn({amount: 1, timeout: 60000}).catch(console.error)