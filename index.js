const ssbClient = require('ssb-client')
const ssbKeys = require('ssb-keys')
const multicb = require('multicb')

function client(keys, caps, remote, cb) {
  function _client(keys, caps, remote, manifest, cb) {
    ssbClient(keys, {caps, remote, manifest}, cb)
  }

  _client(keys, caps, remote, {manifest: 'sync'}, (err, ssb) => {
    if (err) return cb(err)
    ssb.manifest( (err, manifest) => {
      if (err) return cb(err)
      //console.log('manifest', manifest)
      _client(keys, caps, remote, manifest, cb)
    })
  })
}

function get(url, cb) {
  fetch(url)
    .then(r => r.json())
    .then(j => cb(null, j))
    .catch( e => cb(e))
}

module.exports.client = function(cb) {
  const keys = ssbKeys.loadOrCreateSync('tre-keypair')
  const done = multicb({pluck:1, spread: true})

  get(document.location.origin + '/.trerc', done())
  get(document.location.origin + '/.tre/ws-address', done())
  done( (err, config, remote) => {
    if (err) return cb(err)
    //console.log('config', config)
    //console.log('remote', remote)
    client(keys, config.caps, remote, (err, ssb) => {
      if (err) return cb(err)
      ssb.whoami( (err, feed) => {
        if (err) return cb(err)
        console.log('pub key', feed.id)
        cb(null, ssb, config)
      }) 
    })
  })
}

// sbot plugin interface
exports.name = 'tre-client'
exports.version = require('./package.json').version
exports.manifest = {
}
exports.init = function (ssb, config) {
  const ws_address = JSON.stringify(ssb.ws.getAddress())
  const config_path = config.config
  const data_path = config.path 
  const r = require
  const fs = r('fs')
  const url = r('url')
  fs.writeFileSync(data_path + '/ws-address', ws_address, 'utf8')
  
  ssb.ws.use(function (req, res, next) {
    if(!(req.method === "GET" || req.method == 'HEAD')) return next()
    const u = url.parse('http://makeurlparseright.com'+req.url)
    if (u.pathname == '/.trerc') {
      res.setHeader('Content-Type', 'application/json')
      fs.createReadStream(config_path).pipe(res)
      return
    }
    if (u.pathname == '/.tre/ws-address') {
      res.setHeader('Content-Type', 'application/json')
      res.end(ws_address)
      return
    }
  })
}