'use strict'

require('dotenv').config()
const { Sequelize, Model, DataTypes } = require('sequelize')

const sequelize = new Sequelize(
	process.env.DB_NAME, 
	process.env.DB_USER, 
	process.env.DB_PASS, {
	host: 'localhost',
	dialect: 'mysql',
	logging: false,
});

/* --------------------------------------------------
 * SQL Models
 * -------------------------------------------------- */

/* SQLCommandLog Model
 * -------------------------------------------------- */
 
const SQLCommandLog = sequelize.define('CommandLog', {
	id: {
		type: DataTypes.BIGINT,
		primaryKey: true,
	},
	userID: {
		type: DataTypes.BIGINT,
		primaryKey: true,
	},
	username: {
		type: DataTypes.STRING,
	},
	serverID: {
		type: DataTypes.BIGINT,
	},
	serverName: {
		type: DataTypes.STRING,
	},
	channelID: {
		type: DataTypes.BIGINT,
	},
	channelName: {
		type: DataTypes.STRING,
	},
	command: {
		type: DataTypes.STRING,
	},
	arguments: {
		type: DataTypes.STRING,
	},
})

/* SQLUser Model
 * -------------------------------------------------- */
 
const SQLUser = sequelize.define('User', {
	id: {
		type: DataTypes.BIGINT,
		primaryKey: true,
	},
	email: {
		type: DataTypes.STRING,
		primaryKey: true,
	},
})

/* SQLServer Model
 * -------------------------------------------------- */
 
const SQLServer = sequelize.define('Server', {
	id: {
		type: DataTypes.BIGINT,
		primaryKey: true,
	},
	ownerID: {
		type: DataTypes.BIGINT,
		primaryKey: true,
	},
})

/* SQLConfiguration Model
 * -------------------------------------------------- */
 
const SQLConfiguration = sequelize.define('Configuration', {
	serverID: {
		type: DataTypes.BIGINT,
		primaryKey: true,
	},
	key: {
		type: DataTypes.STRING,
		primaryKey: true,
	},
	value: {
		type: DataTypes.STRING,
	},
	format: {
		type: DataTypes.STRING,
	},
})

/* SQLCommand (Custom Commands) Model
 * -------------------------------------------------- */
 
const SQLCommand = sequelize.define('Command', {
	id: {
		type: DataTypes.BIGINT,
		primaryKey: true,
	},
	serverID: {
		type: DataTypes.BIGINT,
		primaryKey: true,
	},
	name: {
		type: DataTypes.STRING,
		primaryKey: true,
	},
	data: {
		type: DataTypes.STRING,
	},
})

/* SQLRoleRequest Model
 * -------------------------------------------------- */
 
const SQLRoleRequest = sequelize.define('RoleRequest', {
	serverID: {
		type: DataTypes.BIGINT,
		primaryKey: true,
	},
	userID: {
		type: DataTypes.BIGINT,
		primaryKey: true,
	},
	roleID: {
		type: DataTypes.BIGINT,
		primaryKey: true,
	},
})

/* SQLFaction Model
 * -------------------------------------------------- */
 
const SQLFaction = sequelize.define('Faction', {
	serverID: {
		type: DataTypes.BIGINT,
		primaryKey: true,
	},
	roleID: {
		type: DataTypes.BIGINT,
		primaryKey: true,
	},
	name: {
		type: DataTypes.STRING,
		primaryKey: true,
	},
})

/* SQLRank Model
 * -------------------------------------------------- */
 
const SQLRank = sequelize.define('Rank', {
	serverID: {
		type: DataTypes.BIGINT,
		primaryKey: true,
	},
	roleID: {
		type: DataTypes.BIGINT,
		primaryKey: true,
	},
	name: {
		type: DataTypes.STRING,
		primaryKey: true,
	},
})

module.exports = {
	SQLCommandLog: SQLCommandLog,
	SQLUser: SQLUser,
	SQLServer: SQLServer,
	SQLConfiguration: SQLConfiguration,
	SQLCommand: SQLCommand,
	SQLRoleRequest: SQLRoleRequest,
	SQLFaction: SQLFaction,
	SQLRank: SQLRank,
}

