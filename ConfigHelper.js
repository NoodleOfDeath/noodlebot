'use strict'

const Discord = require('./Discord.ext.js')
const SQLConfiguration = require('./SQLModels.js').SQLConfiguration
require('./String.js')

class ConfigHelper {
	
	static async getConfig(guild, key) {
		const config = await SQLConfiguration.findAll({
			where: {
				serverID: guild.id,
				key: key,
			}
		})
		const value = this.parseConfig(config.length == 1 ? config[0] : null)
		return value
	}
	
	static parseConfig(config) {
		if (!config) return null
		switch (config.format) {
			case 'BOOLEAN':
				return config.value > 0
			case 'INTEGER':
				return parseInt(config.value)
			case 'FLOAT':
				return parseFloat(config.value)
			case 'JSON':
				return JSON.parse(config.value)
			case 'STRING':
			default:
				return config.value
		}
	}
	
  static parseContent(content, member, guild) {
		var content = content.replace(/\{user\}/gi, member)
		content = content.replace(/\{#.*?\}/gi, (match) => {
			const matches = (new RegExp('\\{#(.*?)\\}', 'gi')).exec(match)
			console.log(JSON.stringify(matches))
			if (!matches[1])
				return 'CHANNEL_NOT_FOUND'
			const channel = guild.getChannel(matches[1], Discord.Key.NAME)
			if (!channel)
				return 'CHANNEL_NOT_FOUND'
			console.log(JSON.stringify(channel))
			return channel.id.mentionChannel()
		})
		content = content.replace(/\{@.*?\}/gi, (match) => {
			const matches = (new RegExp('\\{@(.*?)\\}', 'gi')).exec(match)
			console.log(JSON.stringify(matches))
			if (!matches[1])
				return 'ROLE_NOT_FOUND'
			const role = guild.getRole(matches[1], Discord.Key.NAME)
			if (!role)
				return 'ROLE_NOT_FOUND'
			console.log(JSON.stringify(role))
			return role.id.mentionRole()
		})
		return content
	}
	
}

module.exports = ConfigHelper