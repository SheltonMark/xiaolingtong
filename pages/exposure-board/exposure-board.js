Page({
  data: {
    currentTab: 0,
    tabs: ['全部', '虚假信息', '欺诈行为', '欠薪'],
    list: [
      {
        id: 1, poster: '匿名用户', date: '2026-02-05', type: '虚假信息',
        company: '***塑胶制品厂', contact: '王**', amount: '¥8,500',
        reason: '发布虚假库存信息，实际无货源，收款后拖延发货最终失联。',
        images: [
          'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200&h=200&fit=crop',
          'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=200&h=200&fit=crop',
          'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=200&fit=crop'
        ],
        comments: 8
      },
      {
        id: 2, poster: '匿名用户', date: '2026-02-01', type: '欠薪',
        company: '***五金加工厂', contact: '李**', amount: '¥12,800',
        reason: '拖欠临工工资超过30天未支付，涉及8名临工，多次催促仍未解决。',
        images: [
          'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200&h=200&fit=crop',
          'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=200&h=200&fit=crop'
        ],
        comments: 12
      },
      {
        id: 3, poster: '匿名用户', date: '2026-01-28', type: '欺诈行为',
        company: '***电子科技', contact: '张**', amount: '¥5,200',
        reason: '承诺20元/时实际只付15元，强制加班不给加班费，工作环境与描述严重不符。',
        images: [],
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
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
      this.getTabBar().setData({ selected: 1, userRole })
    }
  }
})
