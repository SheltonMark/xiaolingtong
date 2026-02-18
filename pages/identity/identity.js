Page({
  data: {
    selected: ''
  },
  onSelectEnterprise() {
    this.setData({ selected: 'enterprise' })
  },
  onSelectWorker() {
    this.setData({ selected: 'worker' })
  },
  onConfirm() {
    const { selected } = this.data
    if (!selected) {
      wx.showToast({ title: '请选择身份', icon: 'none' })
      return
    }
    wx.setStorageSync('userRole', selected)
    getApp().globalData.userRole = selected
    getApp().globalData.isLoggedIn = true
    wx.switchTab({ url: '/pages/index/index' })
  }
})
