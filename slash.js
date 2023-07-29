

require('dotenv').config()
const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')

var argv = process.argv.slice(2)

const commands = JSON.parse(fs.readFileSync('Commands.json'))

var ep = `discord.com/api/v8/applications/${process.env.APP_ID}`
var method = 'GET'
var body = null
var index = null
var guild = null

var args = []

var arg = argv.shift()
while (arg) {
	if (arg.match(/-i|--index/gi) != null) {
		index = argv.shift()
	} else
	if (arg.match(/-g|--guild/gi) != null) {
		guild = argv.shift()
	} else {
		args.push(arg)
	}
	arg = argv.shift()
}

const action = args.shift()

switch (action) {
	case 'update':
		method = 'POST'
		if (guild)
			ep = path.join(ep, 'guilds', guild)
		ep = path.join(ep, 'commands')
		break
	case 'delete':
		method = 'DELETE'
		if (guild)
			ep = path.join(ep, 'guilds', guild)
		const id = args.shift()
		ep = path.join(ep, 'commands', id)
		break
	case 'GET':
	default:
		if (guild)
			ep = path.join(ep, 'guilds', guild)
		ep = path.join(ep, 'commands')
		break
}

ep = `https://${ep}`

if (action == 'update') {
	if (!index) index = Object.keys(commands)[0]
	var command = commands[index]
	if (!command) 
		command = commands.find((c) => c.name.match(new RegExp(index, 'gi')) != null)
	if (!command)
		return 
	body = JSON.stringify(command)
}

var options = {
	method: method,
	headers: {
		'Authorization': `Bot ${process.env.BOT_TOKEN}`,
		'Content-Type': 'application/json'
	}
}

if (body)
	options.body = body

//console.log(ep)
async function main() {
	const response = await fetch(ep, options)
	const json = await response.json()
	var str = JSON.stringify(json)
	if (json.length) {
		str = JSON.stringify(json.map(r => { 
			return { 
				name: r.name, 
				id: r.id
			} 
		}))
	}
	console.log(str)
}
main()
