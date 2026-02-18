Component({
  options: { multipleSlots: true },
  properties: {
    title: { type: String, value: '' },
    showBack: { type: Boolean, value: true }
  },
  data: {
    statusBarHeight: 0,
    navHeight: 0
  },
  lifetimes: {
    attached() {
      const sysInfo = wx.getSystemInfoSync()
      const statusBarHeight = sysInfo.statusBarHeight
      const navHeight = statusBarHeight + 44
      this.setData({ statusBarHeight, navHeight })
    }
  },
  methods: {
    goBack() {
      wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) })
    }
  }
})
