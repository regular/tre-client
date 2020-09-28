module.exports = function(err) {
  if (!err) return
  const {message} = err
  if (message == 'unexpected end of parent stream') return true
  if (message == 'unexpected hangup') return true
  return false
}
