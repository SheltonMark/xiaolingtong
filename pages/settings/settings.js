Page({
  data: {
    userRole: 'enterprise',
    nickname: '鑫达贸易公司',
    phone: '138****8888',
    cacheSize: '12.3 MB',
    version: 'v1.0.0'
  },

  onShow() {
    const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    const nickname = userRole === 'enterprise' ? '鑫达贸易公司' : '张三'
    this.setData({ userRole, nickname })
  },

  onClearCache() {
    wx.showModal({
      title: '提示',
      content: '确定清除缓存？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ cacheSize: '0 MB' })
          wx.showToast({ title: '缓存已清除', icon: 'success' })
        }
      }
    })
  },

  onAgreement() {
    wx.showToast({ title: '用户协议', icon: 'none' })
  },

  onPrivacy() {
    wx.showToast({ title: '隐私政策', icon: 'none' })
  },

  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定退出登录？',
      confirmColor: '#F43F5E',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          getApp().globalData.userRole = ''
          getApp().globalData.isLoggedIn = false
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  }
})
