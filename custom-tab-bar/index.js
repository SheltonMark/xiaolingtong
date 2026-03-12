const { get } = require('../utils/request')

Component({
  data: {
    selected: 0,
    userRole: 'enterprise',
    unreadCount: 0,
    entList: [
      { pagePath: '/pages/index/index', text: '首页', isTab: true },
      { pagePath: '/pages/exposure-board/exposure-board', text: '曝光', isTab: true },
      { pagePath: '/pages/publish/publish', text: '发布', isCenter: true, isTab: true },
      { pagePath: '/pages/messages/messages', text: '消息', isTab: true },
      { pagePath: '/pages/mine/mine', text: '我的', isTab: true }
    ],
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
    this.loadUnread()
  },

  pageLifetimes: {
    show() { this.loadUnread() }
  },

  methods: {
    loadUnread() {
      Promise.all([
        get('/notifications/unread-count').catch(() => ({ data: { count: 0 } })),
        get('/conversations').catch(() => ({ data: [] }))
      ]).then(([notiRes, chatRes]) => {
        const notiCount = (notiRes.data || notiRes).count || 0
        const chatList = (chatRes.data || chatRes)
        const chatCount = Array.isArray(chatList)
          ? chatList.reduce((sum, c) => sum + Number(c.unreadCount || 0), 0)
          : (chatList.list || []).reduce((sum, c) => sum + Number(c.unreadCount || 0), 0)
        this.setData({ unreadCount: notiCount + chatCount })
      })
    },
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
