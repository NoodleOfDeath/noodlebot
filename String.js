
String.prototype.limit = function(length) {
	if (!length) length = 2000
	return this.substring(0, length)
}

String.prototype.chunk = function(length, limit) {
	var chunks = []
	var i = 0
	if (!length) length = 2000
	if (!limit) limit = 1
	while (i < this.length && i < length * limit) {
		chunks.push(this.substring(i, i + length))
		i += length
	}
	return chunks
}

String.prototype.pre = function() {
  return '`' + this + '`'
}

String.prototype.em = function() {
  return '_' + this + '_'
}

String.prototype.strong = function() {
  return '**' + this + '**'
}

String.prototype.uline = function() {
  return '__' + this + '__'
}

String.prototype.strike = function() {
  return '~~' + this + '~~'
}

String.prototype.parseArgs = function() {
  return this
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .split(' ')
  //.match(/(?<=")(\\"|.)*?(?=")|(?<=')(\\'|.)*?(?=')|\b[^\s]+\b/g)
}

String.prototype.matches = function(str, opts) {
	if (!opts) opts = 'gi'
	return this.match(new RegExp(str, opts)) != null
}

String.prototype.mentionUser = function() {
  return '<@!' + this + '>'
}

String.prototype.mentionChannel = function() {
  return '<#' + this + '>'
}

String.prototype.mentionRole = function() {
  return '<@&' + this + '>'
}