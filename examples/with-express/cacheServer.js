const Express = require('express')

async function cacheServer(nextHandler) {
	const cacheServer = Express()
	cacheServer.use((req, res, next) => {
		req.additionalData = 'Append By Express Middleware'
		next()
	})
	return cacheServer.use('*', nextHandler).listen(0)
}

exports.default = cacheServer