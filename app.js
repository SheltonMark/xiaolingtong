const { get } = require('./utils/request')

/** 从小程序码 scene 中解析 inv= 邀请码（与 getwxacodeunlimit 的 scene 格式一致） */
function parseInvFromSceneString(raw) {
  if (raw == null || raw === '') return ''
  try {
    const decoded = decodeURIComponent(String(raw))
    const pairs = decoded.split('&')
    for (let i = 0; i < pairs.length; i++) {
      const kv = pairs[i].split('=')
      if (kv[0] === 'inv' && kv[1]) {
        return decodeURIComponent(kv[1]).trim().toLowerCase()
      }
    }
  } catch (e) {
    /* ignore */
  }
  return ''
}

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

  /** 统一写入 pendingInviteCode：分享 ?inviteCode= 或扫码 scene 中的 inv= */
  applyInviteFromQuery(query) {
    if (!query || typeof query !== 'object') return
    if (query.inviteCode) {
      const c = String(query.inviteCode).trim()
      if (c) {
        this.globalData.pendingInviteCode = c.toLowerCase()
        return
      }
    }
    if (query.scene) {
      const inv = parseInvFromSceneString(query.scene)
      if (inv) this.globalData.pendingInviteCode = inv
    }
  },

  /** 登录页等晚于首页加载时，从启动参数再同步一次邀请码 */
  syncPendingInviteFromLaunch() {
    try {
      const lo = wx.getLaunchOptionsSync()
      if (lo && lo.query) this.applyInviteFromQuery(lo.query)
    } catch (e) {
      /* ignore */
    }
  },

  onLaunch(options) {
    if (options && options.query) this.applyInviteFromQuery(options.query)

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

  onShow(options) {
    if (options && options.query) this.applyInviteFromQuery(options.query)
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
