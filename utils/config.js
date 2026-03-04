const PROD_BASE_URL = 'https://quanqiutong888.com'
const PROD_WS_URL = 'wss://quanqiutong888.com/ws/chat'

// 备案完成前，开发版优先走服务器 IP，避免域名被拦截导致请求失败
const DEV_BASE_URL = 'http://49.235.166.177:3000'
const DEV_WS_URL = 'ws://49.235.166.177:3000/ws/chat'
const FORCE_DEV_API = false

function getEnvVersion() {
  if (typeof wx === 'undefined' || !wx.getAccountInfoSync) {
    return 'develop'
  }
  try {
    const accountInfo = wx.getAccountInfoSync()
    return accountInfo?.miniProgram?.envVersion || 'develop'
  } catch (error) {
    return 'develop'
  }
}

const envVersion = getEnvVersion()
// 体验版和开发版都使用开发环境（域名未在小程序后台配置前）
const useDevApi = FORCE_DEV_API || envVersion === 'develop' || envVersion === 'trial'

const config = {
  baseUrl: useDevApi ? DEV_BASE_URL : PROD_BASE_URL,
  apiPrefix: '/api',
  wsUrl: useDevApi ? DEV_WS_URL : PROD_WS_URL,
  envVersion
}

module.exports = config
