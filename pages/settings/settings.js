Page({
  data: {
    cacheSize: '0 MB',
    version: 'v1.0.0'
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
    wx.navigateTo({ url: '/pages/agreement/agreement' })
  },

  onPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' })
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
