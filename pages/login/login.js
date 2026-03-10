const { post } = require('../../utils/request')
const auth = require('../../utils/auth')

Page({
  data: {
    loading: false
  },
  onLoad() {
    const token = wx.getStorageSync('token')
    const userRole = wx.getStorageSync('userRole')
    if (token && userRole) {
      wx.switchTab({ url: '/pages/index/index' })
      return
    }
    if (token && !userRole) {
      wx.redirectTo({ url: '/pages/identity/identity' })
    }
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
          if (user.role) {
            wx.setStorageSync('userRole', user.role)
            app.globalData.userRole = user.role
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
  onViewAgreement() {
    wx.navigateTo({ url: '/pages/agreement/agreement' })
  },
  onViewPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' })
  }
})
