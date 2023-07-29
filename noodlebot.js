/* Import node packages
 * -------------------------------------------------- */
 
require('dotenv').config()

const execSync = require('child_process').execSync
const fs = require('fs')
const https = require('https')

const md5 = require('md5')
const moment = require('moment')
const path = require('path')
const spawnSync = require('child_process').spawnSync
const util = require('util')

// Local node extension packages
require('./Array.js')
require('./String.js')
const Discord = require('./Discord.ext.js')
const Command = require('./Command.js')
const ConfigHelper = require('./ConfigHelper.js')
const {
	SQLCommandLog, 
	SQLUser, 
	SQLServer,
	SQLConfiguration,
	SQLCommand,
	SQLRoleRequest,
	SQLRank,
	SQLFaction,
} = require('./SQLModels.js')

const stdout_log = fs.createWriteStream(__dirname + '/stdout.log', { flags: 'w' })
const stderr_log = fs.createWriteStream(__dirname + '/stderr.log', { flags: 'w' })

console.log = function(d) {
	stdout_log.write(util.format(d) + '\n')
	process.stdout.write(util.format(d) + '\n')
}

console.error = function(d) {
	stderr_log.write(util.format(d) + '\n')
	process.stderr.write(util.format(d) + '\n')
}

/* Global Variables
 * -------------------------------------------------- */

// Define package class constants
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });
client.on('message', onMessageHandler)
client.on('guildMemberAdd', onGuildMemberAddHandler)
client.on('messageReactionAdd', onMessageReactionAddHandler)
client.on('messageReactionRemove', onMessageReactionRemoveHandler)
client.ws.on('INTERACTION_CREATE', onInteractionCreateHandler)

/* Event Handlers
 * -------------------------------------------------- */

// Message event handler
async function onMessageHandler(msg) {
	//if (!msg.guild) return
	if (msg.authorID == client.user.id)
		return
	const args = msg.content.parseArgs()
	const arg0 = args.shift()
	const prefix = arg0.substring(0, 1)
	const command = arg0.substring(1)
	var command_prefix = '!'
	const config = await ConfigHelper.getConfig(msg.guild, 'general.command_prefix')
	if (!msg.user && msg.authorID) {
		msg.user = client.users.cache.find((u) => u.id == msg.authorID)
		msg.author = msg.user
	}
	if (config)
		command_prefix = config
	if (prefix != command_prefix)
		return
	//msg.reply(JSON.stringify(msg))
	runCommand(msg, command, args)
}

// GuildMemberAdd handler
async function onGuildMemberAddHandler(member) {
	const enabled = await ConfigHelper.getConfig(member.guild, 'welcome.enabled')
	if (!enabled) 
		return
	var message = await ConfigHelper.getConfig(member.guild, 'welcome.message')
	if (!message)
		return
	message = ConfigHelper.parseContent(message, member, member.guild)
	const channel = member.guild.getChannel(c => c.name.indexOf('general') >= 0)
	if (channel) {
		channel.send(message)
	} else {
		member.send(message)
	}
}

async function onMessageReactionAddHandler(reaction, user) {
	assignRole(reaction, user, true)
}

async function onMessageReactionRemoveHandler(reaction, user) {
	assignRole(reaction, user, false)
}

// Assign self-assigned roles based on the a reaction made
async function assignRole(reaction, user, addRole) {
	
	if (reaction.me) 
		return
	if (reaction.message.channel.name != 'self-assigned-roles')
		return
	
	//reaction.message.reply(JSON.stringify(reaction.emoji))
	// When we receive a reaction we check if the reaction is partial or not
	if (reaction.partial) {
		// If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
		try {
			await reaction.fetch();
		} catch (error) {
			console.error('Something went wrong when fetching the message: ', error);
			// Return as `reaction.message.author` may be undefined/null
			return;
		}
	}
	
	const guild = reaction.message.guild
	const member = guild.getMember(user.id)
	if (!member) return
	
	var roleName = null
	switch (reaction.emoji.name) {
		case '🦐': {
			//reaction.message.reply('shrimp!')
			roleName = 'F2P'
			break
		}
		case '🐟': {
			//reaction.message.reply('fish!')
			roleName = 'Low Spender'
			break
		}
		case '🦈': {
			//reaction.message.reply('shark')
			roleName = 'Mid Spender'
			break 
		}
		case '🦑': {
			//reaction.message.reply('giant squid!')
			roleName = 'High Spender'
			break
		}
		case '🐋': {
			//reaction.message.reply('whale!')
			roleName = 'Whale'
			break
		}
		default:
			if (addRole) {
				member.send(`Whoa you are not supposed to send that reaction! But, congrats, here is some developer mumbo jumbo as a reward UwU: ${JSON.stringify(reaction.emoji)}`)
			}
			return
	}
	
	if (roleName) {
		const role = guild.getRole(roleName, Discord.Key.NAME)
		if (role) {
			try {
				if (addRole) {
					member.roles.add(role)
					member.send(`You now have the role, "${role.name}"`)
				} else {
					member.roles.remove(role)
					member.send(`You no longer have the role, "${role.name}"`)
				}
			} catch(e) {
				console.error(e)
			}
		}
	}
	
}

// Handle slash commands
async function onInteractionCreateHandler(interaction) {
	const command = interaction.data.name.toLowerCase()
	const guild = client.guilds.cache.get(interaction.guild_id)
	const channel = client.channels.cache.get(interaction.channel_id)
	const member = guild.getMember(interaction.member.user.id)
	//channel.send(JSON.stringify(interaction))
  const args = interaction.data.options
	runCommand({
		author: member.user,
		channel: channel,
		guild: guild,
		member: member,
		reply: (str, flags) => {
			client.api.interactions(interaction.id, interaction.token).callback.post({
				data: {
					type: 4,
					data: {
						content: `${member}, ${str}`,
						flags: flags || 0,
					},
				}})
		},
		awaitResponse: async (str, flags) => {
			client.api.interactions(interaction.id, interaction.token).callback.post({
				data: {
					type: 5,
					data: {
						content: `${member}, ${str}`,
						flags: flags || 0,
					}
				}})
		},
	}, command, args ? args.map(a => a.value) : [])
}

// Commands dictionaryclient.on('messageReactionAdd', onMessageReactionAdd)
var commands = {}

/* Global Functions
 * -------------------------------------------------- */
 
// Adds a commmand to the global command dictionary
function loadCommand(command) {
	commands[command.name] = command
}

// Runs a command
async function runCommand(msg, commandName, args) {
	const command = commands[commandName]
	await SQLCommandLog.create({
		userID: (msg.member || msg.user || msg.author).id,
		username: (msg.member && msg.member.user ? msg.member.user.tag : msg.user) || '',
		serverID: msg.guild ? msg.guild.id : null,
		serverName: msg.guild ? msg.guild.name : null,
		channelID: msg.channel ? msg.channel.id : null,
		channelName: msg.channel ? msg.channel.name : null,
		command: commandName,
		arguments: JSON.stringify(args),
	})
	if (command !== undefined && command !== null) {
		try {
			command.run(msg, args)
		} catch(e) {
			console.error(e)
		}
	} else {
		const prefix = await ConfigHelper.getConfig(msg.guild, 'general.command_prefix')
		msg.reply([
				'I don\'t know that command. Dafuq am I supposed to do with `' + commandName + '`?', 
				'Try running ' + (prefix + 'commands').pre() + ' to see a list of all possible commands.'
			].joinLines())
	}
}

/* Top Level Commands
* -------------------------------------------------- */

loadCommand(
	new Command('settings', {
		description: 'Lists/modifies the settings for NoodleBot',
		usage: '$this',
		requirements: {
			roles: ['NoodleMaster'],
		},
		onRun: async (msg, args) => {
			const key = args.shift()
			const value = args.shift()
			if (value) {
				
			} else {
				msg.reply(response)
			}
		}
	})
)

// commands command
loadCommand(
	new Command('commands', {
		description: 'Lists all possible commands that can be sent to NoodleBot',
		usage: '$this',
		onRun: async (msg, args) => {
			const prefix = await ConfigHelper.getConfig(msg.guild, 'general.command_prefix')
			msg.reply('Here is a list of commands you can send me:\n' + [
				Object.keys(commands)
				.filter((commandString) => {
					const command = commands[commandString]
					if (command.requirements) {
						const reqs = command.requirements
						if (reqs.roles && reqs.roles.length > 0) {
							var authorized = false
							reqs.roles.forEach((role) => {
								if (msg.member.getRole(role, 'name')) {
									authorized = true
								}
							})
							return authorized
						}
					}
					return true
				})
				.map((commandString) => {
					const command = commands[commandString]
					return (prefix + commandString).pre() + '\n\t\t' + command.description
				}).joinLines()
			].joinLines(), 64)
		},
	}))
	
/* Role Request Commands
* -------------------------------------------------- */

loadCommand(
	new Command('request', {
		requirements: {
			args: ['role'],
		},
		onRun: async (msg, args) => {
			msg.awaitResponse()
		}
	})
)

/* Promotion Commands
 * -------------------------------------------------- */

// promote command
loadCommand(
	new Command('promote', {
		description: 'Promotes a player',
		usage: '$this @<player-name> @<role-name>',
		requirements: {
			args: ['username', 'role'],
		},
		onRun: (msg, args) => {
			const id = args.shift().match(/\d+/) + ''
			const roleID = args.shift().match(/\d+/) + ''
			const role = msg.guild.getRole(roleID)
			if (!role) {
				msg.reply('invlaid role specified', 64)
				return
			}
			if (role.position > msg.member.roles.highest.position) {
				msg.reply('you do not have a high enough faction to give that role to another member', 64)
				return
			}
			const targetMember = msg.guild.getMember(id)
			if (targetMember) {
				targetMember.roles.add(role).then(() => {
					msg.reply(`${id.mentionUser()} now has the role ${role}!`)
				}).catch((e) => {
					console.error(e)
				})
			} else {
				msg.reply('unable to find that user.', 64)
			}
		}
	}))
	
// promote command
loadCommand(
	new Command('demote', {
		description: 'Demotes a player by removing a specified role',
		usage: '$this @<player-name> @<role-name>',
		requirements: {
			args: ['username', 'role'],
		},
		onRun: (msg, args) => {
			const id = args.shift().match(/\d+/) + ''
			const roleID = args.shift().match(/\d+/) + ''
			const role = msg.guild.getRole(roleID)
			if (!role) {
				msg.reply('invalid role specified', 64)
				return
			}
			if (role.position > msg.member.roles.highest.position) {
				msg.reply('you do not have a high enough faction to remove that role from another member', 64)
				return
			}
			const targetMember = msg.guild.getMember(id)
			if (targetMember) {
				targetMember.roles.remove(role).then(() => {
					msg.reply(`${id.mentionUser()}  no longer has the role ${role}!`)
				}).catch((e) => {
					console.error(e)
				})
			} else {
				msg.reply('unable to find that user.', 64)
			}
		}
	}))
	
// captain command
loadCommand(
	new Command('captain', {
		description: 'Makes a player a captain',
		usage: '$this @<player-name>',
		requirements: {
			args: ['username'],
			roles: ['r4/r5'],
		},
		onRun: (msg, args) => {
			const id = args.shift().match(/\d+/) + ''
			const roleName = 'captain'
			const member = msg.guild.getMember(id)
			if (member) {
				const role = msg.guild.getRole((r) => r.name.match(new RegExp(roleName, 'gi')) != null)
				if (!role) {
					msg.reply(`there is no "${roleName}" role on this server.`, 64)
					return
				}
				member.roles.add(role).then(() => {
					msg.reply(id.mentionUser() + ' is now a captain!')
				}).catch((e) => {
					console.error(e)
				})
			}
		}
	}))
	
// uncaptain command
loadCommand(
	new Command('uncaptain', {
		description: 'Makes a player no longer a captain',
		usage: '$this @<player-name>',
		requirements: {
			args: ['username'],
			roles: ['r4/r5'],
		},
		onRun: (msg, args) => {
			const id = args.shift().match(/\d+/) + ''
			const roleName = 'captain'
			var member = msg.guild.getMember(id)
			if (member) {
				const role = msg.guild.getRole((r) => r.name.match(new RegExp(roleName, 'gi')) != null)
				if (!role) {
					msg.reply(`there is no "${roleName}" role on this server.`, 64)
					return
				}
				member.roles.remove(role).then(() => {
					msg.reply(id.mentionUser() + ' is no longer a captain! Bad ' + id.mentionUser() + '!')
				}).catch((e) => {
					console.error(e)
				})
			}
		}
	}))

/*  Verify Commands
 * -------------------------------------------------- */

// verify command
loadCommand(
	new Command('verify', {
		description: 'Verifies a player',
		usage: '$this @<player-name>',
		requirements: {
			args: ['username'],
			roles: ['r4/r5'],
		},
		onRun: (msg, args) => {
			const id = args.shift().match(/\d+/) + ''
			const roleName = 'verified'
			const member = msg.guild.getMember(id)
			if (member) {
				const role = msg.guild.getRole((r) => r.name.match(new RegExp(roleName, 'gi')) != null)
				if (!role) {
					msg.reply(`there is no "${roleName}" role on this server.`, 64)
					return
				}
				member.roles.add(role).then(() => {
					msg.reply(id.mentionUser() + ' is now verified!')
				}).catch((e) => {
					console.error(e)
				})
			}
		}
	}))

// unverify command
loadCommand(
	new Command('unverify', {
		description: 'Unverifies a player',
		usage: '$this @<player-name>',
		requirements: {
			args: ['username'],
			roles: ['r4/r5'],
		},
		onRun: (msg, args) => {
			const id = args.shift().match(/\d+/) + ''
			const roleName = 'verified'
			var member = msg.guild.getMember(id)
			if (member) {
				const role = msg.guild.getRole((r) => r.name.match(new RegExp(roleName, 'gi')) != null)
				if (!role) {
					msg.reply(`there is no "${roleName}" role on this server.`, 64)
					return
				}
				member.roles.remove(role).then(() => {
					msg.reply(id.mentionUser() + ' is no longer verified! Bad ' + id.mentionUser() + '!')
				}).catch((e) => {
					console.error(e)
				})
			}
		}
	}))
	
	
/*  Rank Commands
 * -------------------------------------------------- */

// Gets the factions
async function getFactions(serverID) {
	const factions = await SQLFaction.findAll({
		where: {
			serverID: serverID,
		}
	})
	return factions
}

// factions command
loadCommand(
	new Command('factions', {
		description: 'Lists all factions available to join',
		usage: '$this',
		requirements: {
			channels: ['declare-faction'],
		},
		onRun: async (msg, args) => {
			const enabled = await ConfigHelper.getConfig(msg.guild, 'factions.enabled')
			if (!enabled)
				return
			const limit = await ConfigHelper.getConfig(msg.guild, 'factions.limit') || '∞'
			const factions = await getFactions(msg.guild.id)
			var userFactions = []
			var otherFactions = []
			factions.forEach((faction) => {
				if (msg.member.getRole(faction.roleID)) {
					userFactions.push(faction)
				} else {
					otherFactions.push(faction)
				}
			})
			var str = '\n\nYour Factions:'.strong() +
				`\n(You may join up to ${limit} faction(s) on this server)\n` + 
				userFactions.map((faction) => `:ramen: ${faction.name}`).isort().joinLines() +
				'\n\nJoinable Factions:\n'.strong() +
				otherFactions.map((faction) => `:ramen: ${faction.name}`).isort().joinLines()
			msg.reply(str, 64)
		}
	}))
	
// join command
loadCommand(
	new Command('join', {
		usage: '$this <faction-name>',
		description: 'Join a faction by its name. Use the `factions` command to view joinable factions.',
		requirements: {
			args: ['faction'],
			channels: ['declare-faction'],
		},
		onRun: async (msg, args) => {
			const enabled = await ConfigHelper.getConfig(msg.guild, 'factions.enabled')
			if (!enabled)
				return
			const limit = await ConfigHelper.getConfig(msg.guild, 'factions.limit') || 100
			const prefix = await ConfigHelper.getConfig(msg.guild, 'general.command_prefix')
			const roleID = args.shift().match(/\d+/gi) + ''
			const factions = await getFactions(msg.guild.id)
			const userFactions = factions.filter((r) => msg.member.getRole(r.roleID) != null)
			const faction = factions.find((r) => r.roleID == roleID)
			if (!faction) {
				msg.reply(`that faction does not exist. Use the ${(prefix + 'factions').pre()} command to see available factions`, 64)
				return
			}
			if (userFactions.length + 1 > limit) {
				msg.reply(`you have reached the max number of factions allowed (**${limit}**) on this server. You must leave a faction using the ${(prefix + 'unfaction').pre()} command before joining another faction.`, 64)
				return
			}
			const role = msg.guild.getRole(roleID)
			if (!role) {
				msg.reply('unexpected error, unable to find role.')
				return
			}
			msg.member.roles.add(role).then(() => {
				msg.reply(`you have joined the faction ${role}!`)
			}).catch((e) => {
				console.error(e)
			})
		}
	}))

// leave command
loadCommand(
	new Command('leave', {
		usage: '$this <faction-name>',
		description: 'Leave a faction by its name.',
		requirements: {
			args: ['faction'],
			channels: ['declare-faction'],
		},
		onRun: async (msg, args) => {
			const enabled = await ConfigHelper.getConfig(msg.guild, 'factions.enabled')
			if (!enabled)
				return
			const roleID = args.shift().match(/\d+/gi) + ''
			const factions = await getFactions(msg.guild.id)
			const userFactions = factions.filter((r) => msg.member.getRole(r.roleID) != null)
			const faction = factions.find((r) => r.roleID == roleID)
			if (!faction) {
				msg.reply(`that faction does not exist. Use the ${(prefix + 'factions').pre()} command to see available factions`, 64)
				return
			}
			const role = msg.guild.getRole(faction.roleID)
			if (!role) {
				msg.reply('unexpected error, unable to find role.')
				return
			}
			if (!msg.member.getRole(roleID)) {
				msg.reply('you are not part of that faction.', 64)
				return
			}
			msg.member.roles.remove(role).then(() => {
				msg.reply(`you have left the faction ${role}!`)
			}).catch((e) => {
				console.error(e)
			})
		}
	}))
	
// addfaction command
loadCommand(
	new Command('addfaction', {
		description: 'Adds a new faction that can be joined by members.',
		usage: '$this <faction-name>',
		requirements: {
			args: ['faction'],
			roles: ['NoodleMaster'],
			channels: ['declare-faction'],
		},
		onRun: async (msg, args) => {
			
			const factionName = args.shift()
			const factions = await getFactions(msg.guild.id)
			const faction = factions.find((r) => r.name.matches(factionName)) || {}
			var exists = false
			
			async function update(msg, response) {
				if (exists) {
					await SQLRank.update({
						serverID: msg.guild.id,
						roleID: faction.roleID,
						name: faction.name,
					}, {
						where: {
							id: faction.id
						},
					})
				} else {
					await SQLRank.create({
						serverID: msg.guild.id,
						roleID: faction.roleID,
						name: faction.name,
					})
				}
				msg.reply(response)
				runCommand(msg, 'factions')
			}
			
			if (faction.name) {
				msg.reply('That faction already exists.')
				exists = true
			}
			
			faction.name = factionName
			const existingRole = msg.guild.getRole((r) => r.id == faction.roleID || r.name.matches(factionName))
			
			if (existingRole) {
				faction.roleID = existingRole.id
				update(msg, 'faction ' + factionName.strong() + ' created from existing role ' + existingRole.name.strong())
			} else {
				msg.guild.roles.create({
					data: {
						name: factionName,
						hoist: true,
						mentionable: true,
					},
				}).then((r) => {
					faction.roleID = r.id
					update(msg, 'faction and role ' + factionName.strong() + ' created')
				}).catch((e) => {
					console.error(e)(msg, args, e)
				})
			}
			
		},
	}))
	
// delfaction command
loadCommand(
	new Command('rmfaction', {
		description: 'Deletes an existing faction.',
		usage: '$this <faction-name>',
		requirements: {
			args: ['faction'],
			roles: ['NoodleMaster'],
			channels: ['declare-faction'],
		},
		onRun: async (msg, args) => {
			const factionName = args.shift()
			const force = args.shift()
			const factions = await getFactions(msg.guild.id)
			const faction = factions.find((r) => r.name.matches(factionName))
			if (!faction) {
				msg.reply('That faction does not exist.')
				return
			}
			await SQLRank.destroy({
				where: {
					id: faction.id,
				}
			})
			if (force == '-f') {
				msg.guild.getRole(faction.roleID).delete()
			}
			msg.reply('faction ' + factionName.strong() + ' deleted')
			runCommand(msg, 'factions')
		},
	}))

// modfaction command
loadCommand(
	new Command('modfaction', {
		description: 'Modifies an existing faction.',
		usage: '$this <faction-name> <key>=<value>...',
		requirements: {
			args: ['faction'],
			roles: ['NoodleMaster'],
			channels: ['declare-faction'],
		},
		onRun: async (msg, args) => {
			
			const factionName = args.shift();
			const factions = await getFactions(msg.guild.id)
			var faction = factions.find((r) => r.name.matches(factionName))
			
			args.filter(function(n) { return n.indexOf('=') > 0 }).forEach((arg) => {
				const key = arg.split('=')[0]
				const value = arg.split('=')[1]
				switch (key) {
					case 'role': {
						
						break
					}
					case 'roleName': {
						const role = msg.guild.getRole(faction.id)
						if (!role) {
							msg.reply('unable to find a role for that faction.')
							return
						}
						role.setName(value)
						break
					}
					default: {
						faction[key] = value
						break
					}
				}
			})
			await SQLRank.update({
				serverID: msg.guild.id,
				roleID: faction.roleID,
				name: faction.name,
			}, {
				where: {
					id: faction.id
				},
			})
				
			//runCommand(msg, 'factioninfo', [faction.name])
			msg.reply('faction successfully modified')
			
		},
	}))
	
// modfaction command
loadCommand(
	new Command('modrole', {
		description: 'Modifies an existing role.',
		usage: '$this <role-name> <key>=<value>...',
		requirements: {
			args: ['role'],
			roles: ['NoodleMaster'],
			channels: ['declare-faction'],
		},
		onRun: async (msg, args) => {
			const roleName = args.shift();
			const role = msg.guild.getRole((r) => r.id == faction.id || r.name.matches(factionName))
			args.filter(function(n) { return n.indexOf('=') > 0 }).forEach((arg) => {
				const key = arg.split('=')[0]
				const value = arg.split('=')[1]
				faction[key] = value
				if (role) {
					switch (key) {
						case 'name':
							role.setName(value)
							break
						case 'color':
							role.setColor(value)
							break
						case 'hoist':
							role.setHoist(value ? true : false)
							break
						case 'mentionable':
							role.setMentionable(value ? true : false)
							break
						default: 
							break
					}
				}
			})
			factions[md5(faction.name)] = faction
			setFactions(factions)
			msg.reply('faction successfully modified')
		},
		}))
	
/*  System Commands
 * -------------------------------------------------- */

// restart command
loadCommand(
	new Command('restart', {
		usage: '$this',
		description: 'Force restarts NoodleBot',
		requirements: {
			userID: ['823170656261636116'],
			roles: ['NoodleMaster'],
		},
		onRun: (msg, args) => {
			msg.reply('force restarting NoodleBot').then(() => {
				spawnSync('node', ['noodlebot.js'], {
					cwd: process.cwd(),
					detach: true,
					stdio: 'inherit',
				})
				process.exit()
			})
		}
	}))

// stdout command
loadCommand(
	new Command('stdout', {
		usage: '$this',
		description: 'Prints stdout',
		requirements: {
			userID: ['823170656261636116'],
			roles: ['NoodleMaster'],
		},
		onRun: (msg, args) => {
			msg.reply('\n' + fs.readFileSync('./stdout.log', 'utf-8'))
		}
	}))
	
// stderr command
loadCommand(
	new Command('stderr', {
		usage: '$this',
		description: 'Prints stderr',
		requirements: {
			userID: ['823170656261636116'],
			roles: ['NoodleMaster'],
		},
		onRun: (msg, args) => {
			msg.reply('\n' + fs.readFileSync('./stderr.log', 'utf-8'))
		}
	}))
	
// logs command
loadCommand(
	new Command('logs', {
		usage: '$this',
		description: 'Prints logs',
		requirements: {
			userID: ['823170656261636116'],
			roles: ['NoodleMaster'],
		},
		onRun: async (msg, args) => {

			var argv = args
			var arg = argv.shift()
			
			var limit = 3
			var order = [['createdAt', 'DESC']]
			var raw = false
			
			while (arg) {
				if (arg.match(/-l|--limit/gi) != null) {
					limit = parseInt(argv.shift())
				} else if (arg.match(/-o|--orderby/gi) != null) {
					order = JSON.parse(argv.shift())
				} else if (arg.match(/-r|--raw/gi) != null) {
					raw = true
				} else{
					args.push(arg)
				}
				arg = argv.shift()
			}
			
			const logs = (await SQLCommandLog.findAll({
				limit: limit,
				order: order,
			})).map(log => {
				return `**Time:** ${log.createdAt}\n**User:** ${raw ? log.userID : log.username || log.userID}\n**Server:** ${raw ? log.serverID : log.serverName || log.serverID}#${raw ? log.channelID : log.channelName || log.channelID}\n\`${log.command} ${JSON.parse(log.arguments).join(' ')}\``
			})
			
			msg.reply(`\n${logs.join('\n\n')}`.limit())
			
		}
	}))
	
// useradd command
loadCommand(
	new Command('useradd', {
		usage: '$this',
		description: 'Runs useradd message',
		requirements: {
			userID: ['823170656261636116'],
			roles: ['NoodleMaster'],
		},
		onRun: (msg, args) => {
			onGuildMemberAddHandler(msg.member)
		}
	}))
	
// slash command
loadCommand(
	new Command('slash', {
		usage: '$this',
		description: 'Updates slash commands',
		requirements: {
			userID: ['823170656261636116'],
			roles: ['NoodleMaster'],
		},
		onRun: (msg, args) => {
			if (args.includes('-c')) {
				const i = args.indexOf('-c')
				args.push('-g', msg.guild.id)
				args.splice(i, 1)
				//msg.reply(JSON.stringify(args))
			}
			msg.reply(execSync(`cd ~/nb && node slash.js ${args.join(' ')}`).toString().pre())
		}
	}))
	
// Connect to Discord
client.login(process.env.BOT_TOKEN)
