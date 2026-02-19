Page({
  data: {},
  onLoad() {
    // 已登录且已选身份，直接跳首页
    const token = wx.getStorageSync('token')
    const userRole = wx.getStorageSync('userRole')
    if (token && userRole) {
      wx.switchTab({ url: '/pages/index/index' })
      return
    }
    // 已登录但未选身份，跳身份选择
    if (token && !userRole) {
      wx.redirectTo({ url: '/pages/identity/identity' })
    }
  },
  onWxLogin() {
    wx.setStorageSync('token', 'mock_token_123')
    wx.navigateTo({ url: '/pages/identity/identity' })
  },
  onViewAgreement() {
    wx.showToast({ title: '用户协议', icon: 'none' })
  },
  onViewPrivacy() {
    wx.showToast({ title: '隐私政策', icon: 'none' })
  }
})
