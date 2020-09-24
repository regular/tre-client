const fs = require('fs')
const url = require('url')

exports.name = 'tre-client'
exports.version = require('./package.json').version
exports.manifest = {
}
exports.init = function (ssb, config) {
  const ws_address = JSON.stringify(ssb.ws.getAddress())
  const data_path = config.path 
  fs.writeFileSync(data_path + '/ws-address', ws_address, 'utf8')
  
  ssb.ws.use(function (req, res, next) {
    if(!(req.method === "GET" || req.method == 'HEAD')) return next()
    const u = url.parse('http://makeurlparseright.com'+req.url)
    if (u.pathname == '/.trerc') {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        caps: config.caps, // TODO: this leaks appKey to the public 
        tre: config.tre
      }, null, 2))
      return
    }
    if (u.pathname == '/.tre/ws-address') {
      res.setHeader('Content-Type', 'application/json')
      res.end(ws_address)
      return
    }
    next()
  })
}
