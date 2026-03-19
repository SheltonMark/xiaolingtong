const { post } = require('../../utils/request')
const auth = require('../../utils/auth')

Page({
  data: {
    loading: false
  },

  onLoad() {
    // Wait for the user to trigger login explicitly.
  },

  completeLogin(role, user) {
    const app = getApp()
    const mergedUser = Object.assign({}, app.globalData.userInfo || {}, user || {}, { role })
    wx.setStorageSync('userRole', role)
    app.globalData.isLoggedIn = true
    app.globalData.userInfo = mergedUser
    app.globalData.userRole = role
    app.globalData.userId = mergedUser.id || null
    app.globalData.avatarUrl = mergedUser.avatarUrl || ''
    app.globalData.beanBalance = mergedUser.beanBalance || 0
    app.globalData.isMember = mergedUser.isMember || false
    if (mergedUser.avatarUrl) {
      wx.setStorageSync('avatarUrl', mergedUser.avatarUrl)
    }
    wx.switchTab({ url: '/pages/index/index' })
  },

  syncRoleAfterLogin(role, user) {
    const app = getApp()
    return post('/auth/choose-role', { role }).then(res => {
      const data = res.data || {}
      if (data.token) {
        auth.setToken(data.token)
      }
      const syncedRole = data.role || role
      const mergedUser = Object.assign({}, user || {}, { role: syncedRole })
      app.globalData.userInfo = mergedUser
      app.globalData.userRole = syncedRole
      wx.setStorageSync('userRole', syncedRole)
      return { role: syncedRole, user: mergedUser }
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
          const app = getApp()
          auth.setToken(token)
          app.globalData.isLoggedIn = true
          app.globalData.userInfo = user
          app.globalData.userId = user.id || null
          app.globalData.avatarUrl = user.avatarUrl || ''
          app.globalData.beanBalance = user.beanBalance || 0
          app.globalData.isMember = user.isMember || false

          if (user.role) {
            this.completeLogin(user.role, user)
            return
          }

          const localRole = wx.getStorageSync('userRole')
          if (!localRole) {
            wx.redirectTo({ url: '/pages/identity/identity' })
            return
          }

          this.syncRoleAfterLogin(localRole, user).then(({ role, user: syncedUser }) => {
            this.completeLogin(role, syncedUser)
          }).catch(() => {
            wx.redirectTo({ url: '/pages/identity/identity' })
          })
        }).catch(() => {}).finally(() => {
          this.setData({ loading: false })
        })
      },
      fail: () => {
        wx.showToast({ title: '微信登录失败', icon: 'none' })
        this.setData({ loading: false })
      }
    })
  }
})
