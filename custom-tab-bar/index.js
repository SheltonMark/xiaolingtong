Component({
  data: {
    selected: 0,
    userRole: 'enterprise',
    // 企业端 5 个 tab
    entList: [
      { pagePath: '/pages/index/index', text: '首页', isTab: true },
      { pagePath: '/pages/exposure-board/exposure-board', text: '曝光', isTab: true },
      { pagePath: '/pages/publish/publish', text: '发布', isCenter: true, isTab: true },
      { pagePath: '/pages/messages/messages', text: '消息', isTab: true },
      { pagePath: '/pages/mine/mine', text: '我的', isTab: true }
    ],
    // 临工端 4 个 tab
    workerList: [
      { pagePath: '/pages/index/index', text: '首页', isTab: true },
      { pagePath: '/pages/exposure-board/exposure-board', text: '曝光', isTab: true },
      { pagePath: '/pages/messages/messages', text: '消息', isTab: true },
      { pagePath: '/pages/mine/mine', text: '我的', isTab: true }
    ]
  },

  attached() {
    const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    this.setData({ userRole })
  },

  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      const isTab = data.istab
      if (isTab) {
        wx.switchTab({ url })
      } else {
        wx.navigateTo({ url })
      }
    }
  }
})
