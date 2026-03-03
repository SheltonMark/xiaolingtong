const { get, post } = require('../../utils/request')
const wsChat = require('../../utils/ws-chat')

Page({
  data: {
    currentTab: 0,
    chatUnreadCount: 0,
    chatUnreadDisplay: '',
    systemUnreadCount: 0,
    systemUnreadDisplay: '',
    chatMessages: [],
    systemMessages: []
  },

  onShow() {
    this.loadMessages()
    wsChat.connect()
    if (!this._wsUnsubscribe) {
      this._wsUnsubscribe = wsChat.subscribe((event) => {
        if (event === 'new_message') {
          this.scheduleRefresh()
        }
      })
    }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
      this.getTabBar().setData({ selected: userRole === 'enterprise' ? 3 : 2, userRole })
    }
  },
  onHide() {
    if (this._wsUnsubscribe) {
      this._wsUnsubscribe()
      this._wsUnsubscribe = null
    }
    this.clearRefreshTimer()
  },
  onUnload() {
    this.onHide()
  },
  clearRefreshTimer() {
    if (!this._refreshTimer) return
    clearTimeout(this._refreshTimer)
    this._refreshTimer = null
  },
  scheduleRefresh() {
    if (this._refreshTimer) return
    this._refreshTimer = setTimeout(() => {
      this._refreshTimer = null
      this.loadMessages()
    }, 300)
  },

  loadMessages() {
    get('/conversations').then(res => {
      const list = Array.isArray(res.data) ? res.data : (res.data.list || [])
      const mapped = list.map(item => ({
        ...item,
        avatarText: item.avatarText || (item.name ? item.name[0] : '聊'),
        avatarBg: item.avatarBg || '#3B82F6',
        lastMsg: item.lastMsg || '暂无消息',
        time: item.time || ''
      }))
      const unread = mapped.reduce((sum, m) => sum + Number(m.unreadCount || 0), 0)
      this.setData({
        chatMessages: mapped,
        chatUnreadCount: unread,
        chatUnreadDisplay: unread > 99 ? '99+' : String(unread)
      })
    }).catch(() => {})
    get('/notifications').then(res => {
      const list = res.data.list || res.data || []
      const unread = list.filter(m => m.unread).length
      this.setData({
        systemMessages: list,
        systemUnreadCount: unread,
        systemUnreadDisplay: unread > 99 ? '99+' : String(unread)
      })
    }).catch(() => {})
  },
  onTabChange(e) { this.setData({ currentTab: e.currentTarget.dataset.index }) },
  onReadAll() {
    post('/notifications/read-all').then(() => {
      const sys = this.data.systemMessages.map(m => ({ ...m, unread: false }))
      this.setData({ systemMessages: sys, systemUnreadCount: 0, systemUnreadDisplay: '' })
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
    const item = e.currentTarget.dataset.item || {}
    const id = item.id || ''
    if (!id) {
      wx.showToast({ title: '会话不存在', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/chat/chat?id=' + id })
  }
})
