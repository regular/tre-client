const ssbClient = require('ssb-client')
const multicb = require('multicb')
const Reconnect = require('pull-reconnect')
const wrapAPI = require('wrap-muxrpc-api')
const debug = require('debug')('tre-client')

function client(keys, caps, remote, cb) {
  function _client(keys, caps, remote, manifest, cb) {
    ssbClient(keys, {caps, remote, manifest}, cb)
  }

  _client(keys, caps, remote, {manifest: 'sync'}, (err, ssb) => {
    if (err) return cb(err)
    ssb.manifest( (err, manifest) => {
      if (err) return cb(err)
      debug('received manifest %o', manifest)
      
      let currSSB = null
      let reconnects = 0

      function connect(reconnect) {
        debug('connecting ...')
        _client(keys, caps, remote, manifest, (err, ssb) => {
          if (err) {
            debug('connecting failed: %s', err.message)
            return reconnect(err)
          }
          ssb.on('closed', ()=>{
            debug('connection closed')
            reconnect(new Error('sbot connection lost'))
          })
          debug('connected')
          currSSB = ssb
          if (0 == reconnects++) {
            // first time successfully connected
            cb(null, wrap(ssb, reconnect))
          }
          reconnect(null)
        })
      }

      function wrap(ssb, reconnect) {
        return wrapAPI(ssb, manifest, function(fn, type, path) {
          if (type == 'sync') type = 'async'
          if (!reconnect[type]) {
            const msg = `${type} not supported by pull-reconnect (${path.join(',')})`
            console.error(msg)
            throw Error(msg)
          }
          return reconnect[type](function() {
            fn = traverse(currSSB).get(path)
            return fn.apply(this, Array.from(arguments))
          })
        })
      }
      
      Reconnect(connect)
    })
  })
}

function get(url, opts, cb) {
  fetch(url, opts)
    .then(r => r.json())
    .then(j => cb(null, j))
    .catch( e => cb(e))
}

module.exports.client = function(cb) {
  const keys = loadKeys('tre-keypair')
  const done = multicb({pluck:1, spread: true})

  get(document.location.origin + '/.trerc?dontcache=' + Date.now(), {credentials: 'same-origin'}, done())
  get(document.location.origin + '/.tre/ws-address', {}, done())
  done( (err, config, remote) => {
    if (err) return cb(err)
    //console.log('config', config)
    //console.log('remote', remote)
    client(keys, config.caps, remote, (err, ssb) => {
      if (err) return cb(err)
      ssb.whoami( (err, feed) => {
        if (err) return cb(err)
        console.log('pub key', feed.id)

        // add ssb.revisions.patch
        if (ssb.revisions) {
          ssb.revisions.patch = function(oldRev, patchFunc, cb) {
            ssb.get(oldRev, (err, msg)=>{
              if (err) return cb(err)
              let content = patchFunc(msg.content)
              if (content == undefined) content = msg.content // patched in-place
              content.revisionBranch = oldRev
              content.revisionRoot = content.revisionRoot || oldRev
              ssb.publish(content, cb)
            })
          }
        }
        cb(null, ssb, config)
      }) 
    })
  })
}

function loadKeys(name) {
  const json = sessionStorage[name] || localStorage[name]
  return JSON.parse(json)
}

