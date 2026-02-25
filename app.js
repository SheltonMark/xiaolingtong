const { get } = require('./utils/request')

App({
  globalData: {
    userInfo: null,
    userRole: '',
    isLoggedIn: false,
    avatarUrl: '',
    isMember: false,
    beanBalance: 0
  },

  onLaunch() {
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
      if (user.role) wx.setStorageSync('userRole', user.role)
      if (user.avatarUrl) wx.setStorageSync('avatarUrl', user.avatarUrl)
    }).catch(() => {})
  }
})
