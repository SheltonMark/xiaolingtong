const mock = require('../../utils/mock')

Page({
  data: {
    userRole: 'enterprise', // enterprise | worker
    statusBarHeight: 0,
    // 企业端
    currentTab: 0,
    tabs: ['采购需求', '工厂库存', '代加工', '招工信息'],
    purchaseList: [],
    stockList: [],
    // 临工端
    jobList: [],
    filterLabels: ['工种', '计费方式', '距离', '工价']
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight })
  },

  onShow() {
    const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    this.setData({ userRole })
    this.loadData()
  },

  loadData() {
    if (this.data.userRole === 'enterprise') {
      this.setData({
        purchaseList: mock.purchaseList,
        stockList: mock.stockList,
        jobListEnterprise: mock.jobListEnterprise
      })
    } else {
      this.setData({ jobList: mock.jobListWorker })
    }
  },

  onTabChange(e) {
    this.setData({ currentTab: e.currentTarget.dataset.index })
  },

  onSearch() {
    wx.navigateTo({ url: '/pages/category/category' })
  },

  onNotification() {
    wx.switchTab({ url: '/pages/messages/messages' })
  },

  onCardTap(e) {
    const { id } = e.detail
    wx.navigateTo({ url: '/pages/post-detail/post-detail?id=' + id })
  },

  onJobTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/job-detail/job-detail?id=' + id })
  },

  onWechat(e) {
    wx.showToast({ title: '已复制微信号', icon: 'success' })
  },

  onPhone(e) {
    wx.makePhoneCall({ phoneNumber: '13800138000', fail() {} })
  }
})
