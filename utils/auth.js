const config = require('./config')

function getToken() {
  return wx.getStorageSync('token') || ''
}

function setToken(token) {
  wx.setStorageSync('token', token)
}

function clearToken() {
  wx.removeStorageSync('token')
  wx.removeStorageSync('userRole')
  wx.removeStorageSync('avatarUrl')
}

function isLoggedIn() {
  return !!getToken()
}

// 跳转登录页
function goLogin() {
  clearToken()
  const app = getApp()
  app.globalData.isLoggedIn = false
  app.globalData.userRole = ''
  wx.reLaunch({ url: '/pages/login/login' })
}

module.exports = {
  getToken,
  setToken,
  clearToken,
  isLoggedIn,
  goLogin
}
