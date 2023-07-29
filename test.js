
require('dotenv').config()
const Discord = require('./Discord.ext.js')

const client = new Discord.Client()

client.login(process.env.BOT_TOKEN).catch(e => {
	console.error(e)
})