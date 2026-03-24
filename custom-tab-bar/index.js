const { get } = require('../utils/request')
const auth = require('../utils/auth')
const { countSystemUnread } = require('../utils/system-messages')

Component({
  data: {
    selected: 0,
    userRole: 'enterprise',
    unreadCount: 0,
    entList: [
      { pagePath: '/pages/index/index', text: '首页', isTab: true },
      { pagePath: '/pages/exposure-board/exposure-board', text: '风险', isTab: true },
      { pagePath: '/pages/publish/publish', text: '发布', isCenter: true, isTab: true },
      { pagePath: '/pages/messages/messages', text: '消息', isTab: true },
      { pagePath: '/pages/mine/mine', text: '我的', isTab: true }
    ],
    workerList: [
      { pagePath: '/pages/index/index', text: '首页', isTab: true },
      { pagePath: '/pages/exposure-board/exposure-board', text: '风险', isTab: true },
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
    show() {
      const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
      if (userRole !== this.data.userRole) {
        this.setData({ userRole })
      }
      this.loadUnread()
    }
  },

  methods: {
    getCurrentUserId() {
      const app = getApp()
      const storageUser = wx.getStorageSync('userInfo') || {}
      const currentUserId = app.globalData.userId
        || (app.globalData.userInfo && app.globalData.userInfo.id)
        || storageUser.id
        || wx.getStorageSync('userId')
        || 0
      return Number(currentUserId) || 0
    },

    loadUnread() {
      const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || this.data.userRole || 'enterprise'
      if (userRole !== this.data.userRole) {
        this.setData({ userRole })
      }
      if (!auth.getToken()) {
        this.setData({ unreadCount: 0 })
        return
      }
      const conversationTask = get('/conversations').catch(() => ({ data: [] }))

      if (userRole === 'worker') {
        Promise.all([
          get('/notifications', { page: 1, pageSize: 1000 }).catch(() => ({ data: { list: [] } })),
          get('/wallet/transactions', { page: 1, pageSize: 1000 }).catch(() => ({ data: { list: [] } })),
          conversationTask
        ]).then(([notificationRes, walletRes, chatRes]) => {
          const notifications = notificationRes.data.list || notificationRes.data || []
          const systemUnread = countSystemUnread({
            userRole,
            notifications: Array.isArray(notifications) ? notifications : [],
            transactions: walletRes.data,
            userId: this.getCurrentUserId()
          })
          const chatList = (chatRes.data || chatRes)
          const chatCount = Array.isArray(chatList)
            ? chatList.reduce((sum, c) => sum + Number(c.unreadCount || 0), 0)
            : (chatList.list || []).reduce((sum, c) => sum + Number(c.unreadCount || 0), 0)
          this.setData({ unreadCount: systemUnread + chatCount })
        })
        return
      }

      Promise.all([
        get('/notifications/unread-count').catch(() => ({ data: { count: 0 } })),
        conversationTask
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
