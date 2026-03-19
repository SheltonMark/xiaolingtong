const { post } = require('../../utils/request')
const auth = require('../../utils/auth')

const TAB_BAR_ROUTES = [
  'pages/index/index',
  'pages/exposure-board/exposure-board',
  'pages/publish/publish',
  'pages/messages/messages',
  'pages/mine/mine'
]

Page({
  data: {
    loading: false,
    statusBarHeight: 0
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 0
    })
  },

  onWxLogin() {
    if (this.data.loading) return
    this.setData({ loading: true })
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          wx.showToast({ title: '微信登录失败', icon: 'none' })
          this.setData({ loading: false })
          return
        }
        post('/auth/wx-login', {
          code: loginRes.code,
          inviteCode: getApp().globalData.pendingInviteCode || undefined
        }).then(res => {
          const { token, user } = res.data
          auth.setToken(token)
          const app = getApp()
          app.globalData.isLoggedIn = true
          app.globalData.userInfo = user
          const role = user.role || wx.getStorageSync('userRole')
          if (role) {
            wx.setStorageSync('userRole', role)
            app.globalData.userRole = role
            app.globalData.beanBalance = user.beanBalance || 0
            app.globalData.isMember = user.isMember || false
            wx.switchTab({ url: '/pages/index/index' })
          } else {
            wx.redirectTo({ url: '/pages/identity/identity' })
          }
        }).catch(() => {}).finally(() => {
          this.setData({ loading: false })
        })
      },
      fail: () => {
        wx.showToast({ title: '微信登录失败', icon: 'none' })
        this.setData({ loading: false })
      }
    })
  },

  onBack() {
    const pages = getCurrentPages()
    const prevPage = pages.length > 1 ? pages[pages.length - 2] : null

    if (prevPage && TAB_BAR_ROUTES.includes(prevPage.route)) {
      wx.switchTab({ url: '/' + prevPage.route })
      return
    }

    if (prevPage) {
      wx.navigateBack({ delta: 1 })
      return
    }

    wx.switchTab({ url: '/pages/index/index' })
  }
})
