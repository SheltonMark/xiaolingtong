const { post } = require('../../utils/request')
const auth = require('../../utils/auth')

Page({
  data: {
    selected: '',
    loading: false
  },
  onSelectEnterprise() {
    this.setData({ selected: 'enterprise' })
    this.confirmRole('enterprise')
  },
  onSelectWorker() {
    this.setData({ selected: 'worker' })
    this.confirmRole('worker')
  },
  confirmRole(role) {
    if (this.data.loading) return
    this.setData({ loading: true })

    wx.setStorageSync('userRole', role)
    const app = getApp()
    app.globalData.userRole = role

    // 已登录：调后端同步角色
    if (auth.isLoggedIn()) {
      post('/auth/choose-role', { role }).then(res => {
        const { token } = res.data
        if (token) auth.setToken(token)
        app.globalData.isLoggedIn = true
        wx.switchTab({ url: '/pages/index/index' })
      }).catch(() => {
        // 即使后端失败，也让用户进首页浏览
        wx.switchTab({ url: '/pages/index/index' })
      }).finally(() => {
        this.setData({ loading: false })
      })
    } else {
      // 未登录：只存本地角色，直接进首页游客浏览
      wx.switchTab({ url: '/pages/index/index' })
      this.setData({ loading: false })
    }
  }
})
