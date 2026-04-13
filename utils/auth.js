const POST_LOGIN_REDIRECT_KEY = 'postLoginRedirect'

/** 与 custom-tab-bar 企业端一致；仅这些 path 可用 switchTab */
const TAB_BAR_PATHS = [
  '/pages/index/index',
  '/pages/exposure-board/exposure-board',
  '/pages/publish/publish',
  '/pages/messages/messages',
  '/pages/mine/mine'
]

function getToken() {
  return wx.getStorageSync('token') || ''
}

function setToken(token) {
  wx.setStorageSync('token', token)
}

function clearToken() {
  wx.removeStorageSync('token')
  wx.removeStorageSync('avatarUrl')
  // 不清除 userRole 和 policyHandled，游客选择过的浏览状态要保留
}

function isLoggedIn() {
  return !!getToken()
}

/**
 * 跳转登录页。可选 redirectUrl：登录/选身份成功后跳转（须为 /pages/ 开头，防开放重定向）
 */
function goLogin(redirectUrl) {
  clearToken()
  const app = getApp()
  app.globalData.isLoggedIn = false
  try {
    if (redirectUrl && typeof redirectUrl === 'string' && redirectUrl.startsWith('/pages/')) {
      wx.setStorageSync(POST_LOGIN_REDIRECT_KEY, redirectUrl)
    } else {
      wx.removeStorageSync(POST_LOGIN_REDIRECT_KEY)
    }
  } catch (e) {
    /* ignore */
  }
  wx.navigateTo({ url: '/pages/login/login' })
}

/** 登录或选角完成后调用：有则 redirectTo非 tab 页，否则回首页 */
function navigateAfterLoginOrHome() {
  let url = ''
  try {
    url = wx.getStorageSync(POST_LOGIN_REDIRECT_KEY) || ''
    if (url) wx.removeStorageSync(POST_LOGIN_REDIRECT_KEY)
  } catch (e) {
    /* ignore */
  }

  const goHome = () => {
    wx.switchTab({
      url: '/pages/index/index',
      fail: () => wx.reLaunch({ url: '/pages/index/index' })
    })
  }

  if (!url || typeof url !== 'string' || !url.startsWith('/pages/')) {
    goHome()
    return
  }

  const q = url.indexOf('?')
  const pathOnly = q === -1 ? url : url.slice(0, q)
  if (TAB_BAR_PATHS.indexOf(pathOnly) !== -1) {
    wx.switchTab({
      url: pathOnly,
      fail: () => goHome()
    })
    return
  }

  wx.redirectTo({
    url,
    fail: () => goHome()
  })
}

module.exports = {
  getToken,
  setToken,
  clearToken,
  isLoggedIn,
  goLogin,
  navigateAfterLoginOrHome
}
