const BASE_URL = 'https://quanqiutong888.com'
const WS_URL = 'wss://quanqiutong888.com/ws/chat'

const config = {
  baseUrl: BASE_URL,
  apiPrefix: '/api',
  wsUrl: WS_URL,
  envVersion: (function() {
    if (typeof wx === 'undefined' || !wx.getAccountInfoSync) return 'develop'
    try { return wx.getAccountInfoSync()?.miniProgram?.envVersion || 'develop' }
    catch (e) { return 'develop' }
  })()
}

module.exports = config
