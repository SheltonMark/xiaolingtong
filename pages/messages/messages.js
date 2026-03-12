const { get, post, put } = require('../../utils/request')
const wsChat = require('../../utils/ws-chat')

const SYSTEM_STYLE_MAP = {
  cert: { icon: '✓', iconBg: '#EAF2FF', iconColor: '#3B82F6', accentColor: '#3B82F6' },
  invite: { icon: '◎', iconBg: '#EAFBF4', iconColor: '#10B981', accentColor: '#10B981' },
  job_apply: { icon: '◷', iconBg: '#FFF3E8', iconColor: '#F97316', accentColor: '#F97316' },
  settlement: { icon: '¥', iconBg: '#FFF7E5', iconColor: '#F59E0B', accentColor: '#F59E0B' },
  promotion: { icon: '★', iconBg: '#F3EEFF', iconColor: '#8B5CF6', accentColor: '#8B5CF6' },
  system: { icon: '📢', iconBg: '#F3F4F6', iconColor: '#475569', accentColor: '#64748B' }
}

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

  formatTime(createdAt) {
    if (!createdAt) return ''
    const date = new Date(createdAt)
    if (Number.isNaN(date.getTime())) return ''
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    if (diff < 60 * 60 * 1000) {
      const mins = Math.max(1, Math.floor(diff / (60 * 1000)))
      return `${mins}分钟前`
    }
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000))
      return `${hours}小时前`
    }
    const sameYear = date.getFullYear() === now.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return sameYear ? `${mm}-${dd}` : `${date.getFullYear()}-${mm}-${dd}`
  },

  mapSystemMessage(item) {
    const style = SYSTEM_STYLE_MAP[item.type] || SYSTEM_STYLE_MAP.system
    const unread = item.unread !== undefined ? !!item.unread : Number(item.isRead || 0) === 0
    return {
      ...item,
      unread,
      desc: item.content || item.desc || '',
      time: item.time || this.formatTime(item.createdAt),
      icon: style.icon,
      iconBg: style.iconBg,
      iconColor: style.iconColor,
      accentColor: style.accentColor
    }
  },

  setSystemMessages(systemMessages) {
    const systemUnreadCount = systemMessages.filter((m) => m.unread).length
    this.setData({
      systemMessages,
      systemUnreadCount,
      systemUnreadDisplay: systemUnreadCount > 99 ? '99+' : (systemUnreadCount ? String(systemUnreadCount) : '')
    })
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
        chatUnreadDisplay: unread > 99 ? '99+' : (unread ? String(unread) : '')
      })
    }).catch(() => {})

    get('/notifications').then(res => {
      const list = res.data.list || res.data || []
      const mapped = (Array.isArray(list) ? list : []).map((item) => this.mapSystemMessage(item))
      this.setSystemMessages(mapped)
    }).catch(() => {})
  },

  onTabChange(e) {
    this.setData({ currentTab: e.currentTarget.dataset.index })
  },

  onReadAll() {
    post('/notifications/read-all').then(() => {
      const sys = this.data.systemMessages.map((m) => ({ ...m, unread: false, isRead: 1 }))
      this.setSystemMessages(sys)
      wx.showToast({ title: '已全部已读', icon: 'success' })
    }).catch(() => {})
  },

  onTapMsg(e) {
    const item = e.currentTarget.dataset.item || {}
    if (item.id && item.unread) {
      const sys = this.data.systemMessages.map((m) => (
        Number(m.id) === Number(item.id) ? { ...m, unread: false, isRead: 1 } : m
      ))
      this.setSystemMessages(sys)
      put('/notifications/' + item.id + '/read').catch(() => {
        this.loadMessages()
      })
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
