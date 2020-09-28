module.exports = function(err) {
  if (!err) return
  const {message} = err
  if (message == 'unexpected end of parent stream') return true
  if (message == 'unexpected hangup') return true
  if (message.match(/stream ended with:(\d+) but wanted:34/)) return true

  return false
}
