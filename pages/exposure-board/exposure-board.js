Page({
  data: {
    currentTab: 0,
    tabs: ['全部', '虚假信息', '欺诈行为', '欠薪'],
    list: [
      {
        id: 1, poster: '匿名用户', date: '2026-02-05', type: '虚假信息',
        company: '***塑胶制品厂', contact: '王**', amount: '¥8,500',
        reason: '发布虚假库存信息，实际无货源，收款后拖延发货最终失联。',
        images: ['https://picsum.photos/seed/eb1a/300/300', 'https://picsum.photos/seed/eb1b/300/300', 'https://picsum.photos/seed/eb1c/300/300'],
        comments: 8
      },
      {
        id: 2, poster: '匿名用户', date: '2026-02-01', type: '欠薪',
        company: '***五金加工厂', contact: '李**', amount: '¥12,800',
        reason: '拖欠临工工资超过30天未支付，涉及8名临工，多次催促仍未解决。',
        images: ['https://picsum.photos/seed/eb2a/300/300', 'https://picsum.photos/seed/eb2b/300/300'],
        comments: 12
      },
      {
        id: 3, poster: '匿名用户', date: '2026-01-28', type: '欺诈行为',
        company: '***电子科技', contact: '张**', amount: '¥5,200',
        reason: '承诺20元/时实际只付15元，强制加班不给加班费，工作环境与描述严重不符。',
        images: ['https://picsum.photos/seed/eb3a/300/300', 'https://picsum.photos/seed/eb3b/300/300', 'https://picsum.photos/seed/eb3c/300/300'],
        comments: 5
      }
    ]
  },
  onTabChange(e) { this.setData({ currentTab: Number(e.currentTarget.dataset.index) }) },
  onTapCard(e) {
    wx.navigateTo({ url: '/pages/exposure-detail/exposure-detail?id=' + e.currentTarget.dataset.id })
  },
  onPublishExposure() {
    wx.navigateTo({ url: '/pages/exposure/exposure' })
  },
  onPreviewImage(e) {
    wx.previewImage({ current: e.currentTarget.dataset.current, urls: e.currentTarget.dataset.urls })
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
      this.getTabBar().setData({ selected: 1, userRole })
    }
  }
})
