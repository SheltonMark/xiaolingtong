const { post } = require('../../utils/request')
const auth = require('../../utils/auth')

const TAB_BAR_ROUTES = [
  'pages/index/index',
  'pages/exposure-board/exposure-board',
  'pages/publish/publish',
  'pages/messages/messages',
  'pages/mine/mine'
]

function hasBoundPhone(user) {
  if (!user || user.phone == null) return false
  return String(user.phone).trim().length > 0
}

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

  resetSession() {
    const app = getApp()
    auth.clearToken()
    app.globalData.isLoggedIn = false
    app.globalData.userInfo = null
    app.globalData.userId = null
    app.globalData.avatarUrl = ''
    app.globalData.beanBalance = 0
    app.globalData.isMember = false
  },

  applyWxLoginSession(token, user) {
    const app = getApp()
    auth.setToken(token)
    app.globalData.isLoggedIn = true
    app.globalData.userInfo = user
    app.globalData.userId = user.id || null
    app.globalData.avatarUrl = user.avatarUrl || ''
    app.globalData.beanBalance = user.beanBalance || 0
    app.globalData.isMember = user.isMember || false
  },

  goToIndexPage() {
    wx.switchTab({
      url: '/pages/index/index',
      fail: (error) => {
        console.error('[login] switchTab to index failed, fallback to reLaunch', error)
        wx.reLaunch({ url: '/pages/index/index' })
      }
    })
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
    this.goToIndexPage()
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

  continueAfterWxLogin(user) {
    const app = getApp()
    const localRole = wx.getStorageSync('userRole')
    app.globalData.userInfo = user
    app.globalData.userId = user.id || null
    app.globalData.avatarUrl = user.avatarUrl || ''
    app.globalData.beanBalance = user.beanBalance || 0
    app.globalData.isMember = user.isMember || false

    if (localRole && localRole !== user.role) {
      this.syncRoleAfterLogin(localRole, user).then(({ role, user: syncedUser }) => {
        this.completeLogin(role, syncedUser)
      }).catch(() => {
        wx.redirectTo({ url: '/pages/identity/identity' })
      })
      return
    }

    if (user.role) {
      this.completeLogin(user.role, user)
      return
    }

    if (!localRole) {
      wx.redirectTo({ url: '/pages/identity/identity' })
      return
    }

    this.syncRoleAfterLogin(localRole, user).then(({ role, user: syncedUser }) => {
      this.completeLogin(role, syncedUser)
    }).catch(() => {
      wx.redirectTo({ url: '/pages/identity/identity' })
    })
  },

  /**
   * 一次点击：按钮带 getPhoneNumber，用户在微信弹窗中同意后执行登录。
   * 服务端已有手机号的用户不再调 bind-phone；新用户用本次 code 写入手机号。
   */
  onWeChatLogin(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      if (e.detail.errMsg && e.detail.errMsg.indexOf('deny') !== -1) {
        wx.showToast({ title: '需同意授权手机号才能登录', icon: 'none' })
      }
      return
    }
    const phoneCode = e.detail.code
    if (!phoneCode) {
      wx.showToast({ title: '未获取到手机号凭证，请重试', icon: 'none' })
      return
    }

    if (this.data.loading) return
    this.setData({ loading: true })

    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          wx.showToast({ title: '微信登录失败', icon: 'none' })
          this.setData({ loading: false })
          return
        }
        const app = getApp()
        post('/auth/wx-login', {
          code: loginRes.code,
          inviteCode: app.globalData.pendingInviteCode || undefined
        })
          .then((res) => {
            const { token, user } = res.data
            this.applyWxLoginSession(token, user)
            if (hasBoundPhone(user)) {
              return Promise.resolve(user)
            }
            return post('/auth/bind-phone', { code: phoneCode }).then((phoneRes) => {
              const phone = (phoneRes.data && phoneRes.data.phone) || ''
              if (!phone) {
                throw new Error('NO_PHONE')
              }
              return Object.assign({}, user, { phone })
            })
          })
          .then((user) => {
            this.continueAfterWxLogin(user)
          })
          .catch((err) => {
            this.resetSession()
            if (err && err.message === 'NO_PHONE') {
              wx.showToast({ title: '手机号绑定失败，请重试', icon: 'none' })
            }
          })
          .finally(() => {
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
