Page({
  data: {},
  onWxLogin() {
    // 模拟微信登录
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
