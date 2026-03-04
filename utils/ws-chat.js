const config = require('./config')
const auth = require('./auth')

const listeners = new Set()

let socketTask = null
let connected = false
let manualClosed = false
let reconnectTimer = null
let reconnectCount = 0

function notify(event, payload) {
  listeners.forEach((listener) => {
    try {
      listener(event, payload)
    } catch (error) {}
  })
}

function buildWsUrl() {
  const token = auth.getToken()
  if (!token) return ''
  const separator = config.wsUrl.indexOf('?') >= 0 ? '&' : '?'
  return `${config.wsUrl}${separator}token=${encodeURIComponent(token)}`
}

function clearReconnect() {
  if (!reconnectTimer) return
  clearTimeout(reconnectTimer)
  reconnectTimer = null
}

function scheduleReconnect() {
  if (manualClosed || reconnectTimer) return
  const delay = Math.min(5000, 1000 * Math.pow(2, reconnectCount))
  reconnectCount += 1
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect()
  }, delay)
}

function connect() {
  if (connected || socketTask) return
  const url = buildWsUrl()
  if (!url) return

  manualClosed = false
  socketTask = wx.connectSocket({
    url,
    timeout: 10000
  })

  socketTask.onOpen(() => {
    connected = true
    reconnectCount = 0
    notify('open')
  })

  socketTask.onMessage((res) => {
    let packet = null
    try {
      packet = JSON.parse(res.data)
    } catch (error) {
      return
    }
    if (packet && packet.event) {
      notify(packet.event, packet.data)
    } else {
      notify('message', packet)
    }
  })

  socketTask.onClose(() => {
    connected = false
    socketTask = null
    notify('close')
    scheduleReconnect()
  })

  socketTask.onError((error) => {
    notify('error', error)
  })
}

function disconnect() {
  manualClosed = true
  clearReconnect()
  if (socketTask) {
    try {
      socketTask.close({ code: 1000, reason: 'manual close' })
    } catch (error) {}
  }
  socketTask = null
  connected = false
}

function subscribe(listener) {
  listeners.add(listener)
  return function unsubscribe() {
    listeners.delete(listener)
  }
}

function send(event, data) {
  if (!socketTask || !connected) return false
  try {
    socketTask.send({
      data: JSON.stringify({ event, data })
    })
    return true
  } catch (error) {
    return false
  }
}

function isConnected() {
  return connected
}

module.exports = {
  connect,
  disconnect,
  subscribe,
  send,
  isConnected
}
