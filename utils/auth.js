const config = require('./config')

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

// 跳转登录页
function goLogin() {
  clearToken()
  const app = getApp()
  app.globalData.isLoggedIn = false
  // 保留 userRole，登录后可以直接回首页
  wx.navigateTo({ url: '/pages/login/login' })
}

module.exports = {
  getToken,
  setToken,
  clearToken,
  isLoggedIn,
  goLogin
}
