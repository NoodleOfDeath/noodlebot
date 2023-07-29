'use strict'

/* --------------------------------------------------
 * Command Class Definition
 * -------------------------------------------------- */

// Defines the Command class
class Command {
	
	constructor(name, config) {
		const self = this
		this.name = name
		this.description = self.pp(config.description || '')
		this.usage = self.pp(config.usage || '').pre()
		this.requirements = config.requirements || {}
		this.onRun = config.onRun
		if (typeof config.onRun == 'string') {
			const lines = config.onRun.split(/;\n/g)
			console.log(lines)
		}
		this.isSlash = config.isSlash
	}
	
	pp(str) {
		return str.replace(/\$this/g, this.name)
	}
	
	validate(msg, args) {
		if (this.requirements) {
			const reqs = this.requirements
			if (reqs.userID && msg.user) {
				if (msg.user.id === reqs.userID || (typeof reqs.userID == 'array' && reqs.userID.includes(msg.user.id))) {
					msg.reply('You are not authorized to use that command', 64)
					return false
				}
			} else {
				if (!msg.member) {
					msg.reply('shit')
					return
				}
				if (reqs.roles && reqs.roles.length > 0) {
					var authorized = false
					reqs.roles.forEach((role) => {
						if (msg.member.getRole(role, 'name'))
							authorized = true
					})
					if (!authorized) {
						msg.reply('You are not authorized to use that command')
						return false
					}
				}
			}
			if (reqs.channels && reqs.channels.length > 0) {
				if (!reqs.channels.includes(msg.channel.name)) {
					msg.reply(['That command should not be used on this channel.', this.tooltip].joinLines(), 64)
					return false
				}
			}
			if (reqs.args && reqs.args.length > 0) {
				if (args.length < reqs.args.length) {
					msg.reply(['This command requires at least ' + reqs.args.length + ' argument(s).', this.tooltip].joinLines(), 64)
					return false
				}
			}
		}
		return true
	}
	
	run(msg, args) {
		if (this.validate(msg, args))
			this.onRun(msg, args)
	}

}

module.exports = Command
