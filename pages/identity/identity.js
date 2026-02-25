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
    post('/auth/choose-role', { role }).then(res => {
      const { token } = res.data
      if (token) auth.setToken(token)
      wx.setStorageSync('userRole', role)
      const app = getApp()
      app.globalData.userRole = role
      app.globalData.isLoggedIn = true
      wx.switchTab({ url: '/pages/index/index' })
    }).catch(() => {}).finally(() => {
      this.setData({ loading: false })
    })
  }
})
