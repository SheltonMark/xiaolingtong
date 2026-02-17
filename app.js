App({
  globalData: {
    userInfo: null,
    userRole: '', // 'enterprise' | 'worker'
    isLoggedIn: false
  },

  onLaunch() {
    const userRole = wx.getStorageSync('userRole')
    const token = wx.getStorageSync('token')
    if (userRole) {
      this.globalData.userRole = userRole
    }
    if (token) {
      this.globalData.isLoggedIn = true
    }
  }
})
