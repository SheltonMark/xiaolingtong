const { get } = require('./utils/request')

App({
  globalData: {
    userInfo: null,
    userRole: '',
    isLoggedIn: false,
    avatarUrl: '',
    isMember: false,
    beanBalance: 0,
    inviteCode: '',
    pendingInviteCode: '',
    userId: null,
    certStatus: 'none',
    isVerified: false,

    // ===== 测试模式开关 =====
    // 设置为 true 启用测试模式，可以模拟不同用户
    // 测试完成后务必改回 false！
    TEST_MODE: false,
    TEST_USER_ID: null  // 测试模式下模拟的用户ID，null表示使用真实ID
    // ========================
  },

  onLaunch(options) {
    // 捕获分享链接中的邀请码
    if (options && options.query && options.query.inviteCode) {
      this.globalData.pendingInviteCode = options.query.inviteCode
    }

    if (!wx.getStorageSync('policyHandled') && wx.getStorageSync('agreedPolicy')) {
      wx.setStorageSync('policyHandled', true)
      wx.setStorageSync('policyDecision', 'agree')
    }

    const userRole = wx.getStorageSync('userRole')
    const token = wx.getStorageSync('token')
    const avatarUrl = wx.getStorageSync('avatarUrl')
    if (userRole) this.globalData.userRole = userRole
    if (avatarUrl) this.globalData.avatarUrl = avatarUrl
    if (token) {
      this.globalData.isLoggedIn = true
      this.loadProfile()
    }
  },

  loadProfile() {
    get('/auth/profile').then(res => {
      const user = res.data
      this.globalData.userInfo = user
      this.globalData.userRole = user.role || ''
      this.globalData.avatarUrl = user.avatarUrl || ''
      this.globalData.isMember = user.isMember || false
      this.globalData.beanBalance = user.beanBalance || 0
      this.globalData.inviteCode = user.inviteCode || ''
      const certStatus = user.certStatus || 'none'
      this.globalData.certStatus = certStatus
      this.globalData.isVerified =
        user.isVerified === true || certStatus === 'approved'

      // 保存真实userId
      this.globalData.userId = user.id || null

      // 测试模式：如果设置了TEST_USER_ID，覆盖真实userId
      if (this.globalData.TEST_MODE && this.globalData.TEST_USER_ID) {
        console.warn('⚠️ 测试模式已启用，当前模拟用户ID:', this.globalData.TEST_USER_ID)
        this.globalData.userId = this.globalData.TEST_USER_ID
      }

      if (user.role) wx.setStorageSync('userRole', user.role)
      if (user.avatarUrl) wx.setStorageSync('avatarUrl', user.avatarUrl)
    }).catch(() => {
      // token 过期或无效，静默清除，不跳登录页
      wx.removeStorageSync('token')
      this.globalData.isLoggedIn = false
      this.globalData.certStatus = 'none'
      this.globalData.isVerified = false
    })
  },

  getSharePath(basePath) {
    const code = this.globalData.inviteCode
    if (!code) return basePath
    const sep = basePath.includes('?') ? '&' : '?'
    return basePath + sep + 'inviteCode=' + code
  }
})
