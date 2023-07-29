
Array.prototype.joinLines = function() {
  return this.join('\n')
}

Array.prototype.isort = function() {
	return this.sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0)
}