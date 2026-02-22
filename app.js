App({
  globalData: {
    userInfo: null,
    userRole: '', // 'enterprise' | 'worker'
    isLoggedIn: false,
    avatarUrl: '',
    isMember: false,  // 是否会员
    beanBalance: 128  // 灵豆余额
  },

  onLaunch() {
    const userRole = wx.getStorageSync('userRole')
    const token = wx.getStorageSync('token')
    const avatarUrl = wx.getStorageSync('avatarUrl')
    if (userRole) {
      this.globalData.userRole = userRole
    }
    if (token) {
      this.globalData.isLoggedIn = true
    }
    if (avatarUrl) {
      this.globalData.avatarUrl = avatarUrl
    }
  }
})
