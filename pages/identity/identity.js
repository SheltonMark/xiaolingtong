const { post } = require('../../utils/request')
const auth = require('../../utils/auth')

Page({
  data: {
    selected: '',
    loading: false
  },
  goToIndexPage() {
    auth.navigateAfterLoginOrHome()
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

    const app = getApp()
    const previousRole = app.globalData.userRole || wx.getStorageSync('userRole') || ''
    wx.setStorageSync('userRole', role)
    app.globalData.userRole = role

    // Logged in: sync role to backend before entering the app.
    if (auth.isLoggedIn()) {
      post('/auth/choose-role', { role }).then(res => {
        const { token, role: syncedRole } = res.data
        const finalRole = syncedRole || role
        if (token) auth.setToken(token)
        app.globalData.isLoggedIn = true
        app.globalData.userRole = finalRole
        if (app.globalData.userInfo) {
          app.globalData.userInfo = Object.assign({}, app.globalData.userInfo, { role: finalRole })
        }
        wx.setStorageSync('userRole', finalRole)
        this.goToIndexPage()
      }).catch(() => {
        if (previousRole) {
          wx.setStorageSync('userRole', previousRole)
          app.globalData.userRole = previousRole
        } else {
          wx.removeStorageSync('userRole')
          app.globalData.userRole = ''
        }
      }).finally(() => {
        this.setData({ loading: false })
      })
    } else {
      // 游客选角：始终进首页，勿消费 postLoginRedirect（留给真正登录成功）
      wx.reLaunch({ url: '/pages/index/index' })
      this.setData({ loading: false })
    }
  }
})
