Page({
  data: {
    userRole: 'enterprise',
    nickname: '鑫达贸易公司',
    phone: '138****8888',
    cacheSize: '12.3 MB',
    version: 'v1.0.0',
    avatarUrl: '',
    avatarText: '鑫',
    avatarColor: '#3B82F6'
  },

  onShow() {
    const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    const nickname = userRole === 'enterprise' ? '鑫达贸易公司' : '张三'
    const avatarUrl = getApp().globalData.avatarUrl || wx.getStorageSync('avatarUrl') || ''
    const avatarText = nickname[0]
    const avatarColor = userRole === 'enterprise' ? '#3B82F6' : '#F97316'
    this.setData({ userRole, nickname, avatarUrl, avatarText, avatarColor })
  },

  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        getApp().globalData.avatarUrl = tempPath
        wx.setStorageSync('avatarUrl', tempPath)
        this.setData({ avatarUrl: tempPath })
        wx.showToast({ title: '头像已更新', icon: 'success' })
      }
    })
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
