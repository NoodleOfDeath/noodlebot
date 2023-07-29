'use strict'

const Discord = require('discord.js')

/*
 * Custom Constant Extensions
 * -------------------------------------------------- */
 
Discord.Key = {
	ID: 'id',
	NAME: 'name',
}

/*
 * Guild Extensions
 * -------------------------------------------------- */

Discord.Guild.prototype.getRole = function(id, key) {
	if (typeof id == 'function')
		return this.roles.cache.find(id)
	if (!key) key = Discord.Key.ID
	return this.roles.cache.find((m) => m[key] == id)
}

Discord.Guild.prototype.getMember = function(id, key) {
	if (typeof id == 'function')
		return this.members.cache.find(id)
	if (!key) key = Discord.Key.ID
	return this.members.cache.find((m) => m[key] == id)
}

Discord.Guild.prototype.getMembers = function(id, key) {
	if (typeof id == 'function')
		return this.members.cache.find(id)
	if (!key) key = Discord.Key.ID
	return this.members.cache.filter((m) => m[key] == id)
}

Discord.Guild.prototype.getChannel = function(id, key) {
	if (typeof id == 'function')
		return this.channels.cache.find(id)
	if (!key) key = Discord.Key.ID
	return this.channels.cache.find((m) => m[key] == id)
}

/*
 * GuildMember Extensions
 * -------------------------------------------------- */

Discord.GuildMember.prototype.getRole = function(id, key) {
	if (typeof id == 'function')
		return this.roles.cache.find(id)
	if (!key) key = Discord.Key.ID
	return this.roles.cache.find((m) => m[key] == id)
}

/*
 * Message Extensions
 * -------------------------------------------------- */

Discord.Message.prototype.awaitResponse = function() {
	if (!this.interaction) return
	client.api.interactions(this.interaction.id, this.interaction.token).callback.post({
	data: {
		type: 5,
	}})
}

module.exports = Discord

