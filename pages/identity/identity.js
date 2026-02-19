Page({
  data: {
    selected: ''
  },
  onSelectEnterprise() {
    this.setData({ selected: 'enterprise' })
    this.confirmRole('enterprise')
  },
  onSelectWorker() {
    this.setData({ selected: 'worker' })
    this.confirmRole('worker')
  },
  confirmRole(role) {
    wx.setStorageSync('userRole', role)
    getApp().globalData.userRole = role
    getApp().globalData.isLoggedIn = true
    wx.switchTab({ url: '/pages/index/index' })
  }
})
