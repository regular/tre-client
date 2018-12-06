# tre-client

Fully automated client connections for web applications based on secure-scuttlebutt

## Example

```
const {client} = require('tre-client')

client( (err, ssb, config) => {
  if (err) return console.error(err)
  ssb.whoami( (err, feed) => {
    if (err) return console.error(err)
    console.log('pub key', feed.id) 
  }) 
})
```

> Note: tre-client assumes that your sbot configuration is in a file called `.trerc` in your project's home directory (next to package.json).

## Install

```
sbot plugins.install tre-client
```

## See also

[tre-init](https://github.com/regular/tre-init)
