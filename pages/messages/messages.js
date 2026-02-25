const { get, post } = require('../../utils/request')

Page({
  data: {
    currentTab: 0,
    chatUnreadCount: 0,
    systemUnreadCount: 0,
    chatMessages: [],
    systemMessages: []
  },

  onShow() {
    this.loadMessages()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
      this.getTabBar().setData({ selected: userRole === 'enterprise' ? 3 : 2, userRole })
    }
  },

  loadMessages() {
    get('/conversations').then(res => {
      const list = res.data || []
      const unread = list.reduce((sum, m) => sum + (m.unreadCount || 0), 0)
      this.setData({ chatMessages: list, chatUnreadCount: unread })
    }).catch(() => {})
    get('/notifications').then(res => {
      const list = res.data || []
      const unread = list.filter(m => m.unread).length
      this.setData({ systemMessages: list, systemUnreadCount: unread })
    }).catch(() => {})
  },
  onTabChange(e) { this.setData({ currentTab: e.currentTarget.dataset.index }) },
  onReadAll() {
    post('/notifications/read-all').then(() => {
      const sys = this.data.systemMessages.map(m => ({ ...m, unread: false }))
      this.setData({ systemMessages: sys, systemUnreadCount: 0 })
      wx.showToast({ title: '已全部已读', icon: 'success' })
    }).catch(() => {})
  },
  onTapMsg(e) {
    const item = e.currentTarget.dataset.item
    if (item.id && item.unread) {
      post('/notifications/' + item.id + '/read').catch(() => {})
    }
    if (item.link) {
      wx.navigateTo({ url: item.link })
    }
  },
  onTapChat(e) {
    const id = e.currentTarget.dataset.id || ''
    wx.navigateTo({ url: '/pages/chat/chat?id=' + id })
  }
})
