const { get, post, put } = require('../../utils/request')
const wsChat = require('../../utils/ws-chat')
const auth = require('../../utils/auth')
const {
  buildRoleSystemMessages,
  markWorkerSystemMessageRead,
  markWorkerSystemMessagesReadAll
} = require('../../utils/system-messages')

const SYSTEM_STYLE_MAP = {
  cert: { icon: '证', iconBg: '#EAF2FF', iconColor: '#3B82F6', accentColor: '#3B82F6' },
  invite: { icon: '邀', iconBg: '#EAFBF4', iconColor: '#10B981', accentColor: '#10B981' },
  job_apply: { icon: '岗', iconBg: '#FFF3E8', iconColor: '#F97316', accentColor: '#F97316' },
  settlement: { icon: '账', iconBg: '#FFF7E5', iconColor: '#F59E0B', accentColor: '#F59E0B' },
  income: { icon: '账', iconBg: '#FFF7E5', iconColor: '#F59E0B', accentColor: '#F59E0B' },
  withdraw: { icon: '提', iconBg: '#E0F2FE', iconColor: '#0284C7', accentColor: '#0284C7' },
  promotion: { icon: '评', iconBg: '#F3EEFF', iconColor: '#8B5CF6', accentColor: '#8B5CF6' },
  system: { icon: '系', iconBg: '#F3F4F6', iconColor: '#475569', accentColor: '#64748B' }
}

const TAB_BAR_PAGE_PATHS = [
  '/pages/index/index',
  '/pages/exposure-board/exposure-board',
  '/pages/publish/publish',
  '/pages/messages/messages',
  '/pages/mine/mine'
]

function getSystemNoticeCopy(userRole) {
  if (userRole === 'worker') {
    return {
      systemTabLabel: '临工通知',
      systemPanelTitle: '临工系统通知',
      systemPanelHint: '录用、开工、工资到账和提现进度会统一汇总在这里。',
      systemEmptyText: '暂无临工系统通知',
      systemEmptySubText: '后续与你相关的录用、结算和钱包提醒会显示在这里。',
      systemRoleBadgeText: '临工'
    }
  }

  return {
    systemTabLabel: '企业通知',
    systemPanelTitle: '企业系统通知',
    systemPanelHint: '报名、考勤、结算和平台提醒会统一汇总在这里。',
    systemEmptyText: '暂无企业系统通知',
    systemEmptySubText: '后续与你发布工单和平台处理相关的提醒会显示在这里。',
    systemRoleBadgeText: '企业'
  }
}

Page({
  data: {
    currentTab: 0,
    chatUnreadCount: 0,
    chatUnreadDisplay: '',
    systemUnreadCount: 0,
    systemUnreadDisplay: '',
    chatMessages: [],
    systemMessages: [],
    notLoggedIn: false,
    userRole: 'enterprise',
    systemTabLabel: '企业通知',
    systemPanelTitle: '企业系统通知',
    systemPanelHint: '报名、考勤、结算和平台提醒会统一汇总在这里。',
    systemEmptyText: '暂无企业系统通知',
    systemEmptySubText: '后续与你发布工单和平台处理相关的提醒会显示在这里。',
    systemRoleBadgeText: '企业'
  },

  onShow() {
    const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    const systemNoticeCopy = getSystemNoticeCopy(userRole)

    if (!auth.isLoggedIn()) {
      this.setData({
        notLoggedIn: true,
        currentTab: userRole === 'worker' ? 0 : this.data.currentTab,
        userRole,
        ...systemNoticeCopy
      })
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().setData({ selected: userRole === 'enterprise' ? 3 : 2, userRole })
      }
      return
    }

    this.setData({
      notLoggedIn: false,
      currentTab: userRole === 'worker' ? 0 : this.data.currentTab,
      userRole,
      ...systemNoticeCopy
    })

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

  normalizeInternalLink(link) {
    const text = String(link || '').trim()
    if (!text) return ''
    if (text.startsWith('/pages/')) return text
    if (text.startsWith('pages/')) return '/' + text
    return text
  },

  getWorkerNotificationFallbackLink(item) {
    const data = item.data || {}
    const title = String(item.title || '')
    const content = String(item.content || item.desc || '')
    const status = String(data.status || '')
    const jobId = Number(data.jobId || 0)
    const base = '/pages/my-applications/my-applications'
    const suffix = jobId ? `?jobId=${jobId}` : ''

    if (status === 'accepted' || title.includes('录用') || content.includes('确认出勤')) {
      return `${base}?tab=accepted${jobId ? `&jobId=${jobId}` : ''}`
    }
    if (status === 'rejected' || title.includes('未通过') || title.includes('拒绝')) {
      return `${base}?tab=all${jobId ? `&jobId=${jobId}` : ''}`
    }
    if (status === 'confirmed' || status === 'working') {
      return jobId ? `/pages/checkin/checkin?jobId=${jobId}` : `${base}?tab=ongoing`
    }
    if (status === 'done') {
      return `${base}?tab=done${jobId ? `&jobId=${jobId}` : ''}`
    }

    return `${base}${suffix}`
  },

  resolveSystemMessageLink(item) {
    const normalizedLink = this.normalizeInternalLink(item.link)
    if (normalizedLink.startsWith('/pages/')) return normalizedLink

    const data = item.data || {}
    const jobId = Number(data.jobId || 0)
    const userRole = this.data.userRole || 'enterprise'

    if (item.sourceType === 'wallet') {
      return normalizedLink || '/pages/withdraw-history/withdraw-history?tab=all'
    }

    if (item.type === 'job_apply') {
      if (userRole === 'worker') {
        return this.getWorkerNotificationFallbackLink(item)
      }
      if (jobId) {
        return `/pages/job-process/job-process?jobId=${jobId}&tab=applications`
      }
    }

    if (item.type === 'settlement' && jobId) {
      return `/pages/settlement/settlement?jobId=${jobId}&role=worker&viewOnly=1`
    }

    if (item.type === 'promotion' && jobId) {
      return data.isWorker
        ? `/pages/settlement/settlement?jobId=${jobId}&role=worker&viewOnly=1`
        : `/pages/job-process/job-process?jobId=${jobId}&tab=settlement`
    }

    return normalizedLink
  },

  mapSystemMessage(item) {
    const style = SYSTEM_STYLE_MAP[item.type] || SYSTEM_STYLE_MAP.system
    return {
      ...item,
      unread: item.unread !== undefined ? !!item.unread : Number(item.isRead || 0) === 0,
      desc: item.content || item.desc || '',
      time: item.time || this.formatTime(item.createdAt),
      link: this.resolveSystemMessageLink(item),
      icon: style.icon,
      iconBg: style.iconBg,
      iconColor: style.iconColor,
      accentColor: style.accentColor,
      roleBadgeText: this.data.systemRoleBadgeText || '企业'
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
    get('/conversations').then((res) => {
      const list = Array.isArray(res.data) ? res.data : (res.data.list || [])
      const mapped = list.map((item) => ({
        ...item,
        avatarText: item.avatarText || (item.name ? item.name[0] : '聊'),
        avatarBg: item.avatarBg || '#3B82F6',
        lastMsg: item.lastMsg || '暂无消息',
        time: item.time || '',
        activeText: item.activeText || '',
        isOnline: !!item.isOnline
      }))
      const unread = mapped.reduce((sum, item) => sum + Number(item.unreadCount || 0), 0)
      this.setData({
        chatMessages: mapped,
        chatUnreadCount: unread,
        chatUnreadDisplay: unread > 99 ? '99+' : (unread ? String(unread) : '')
      })
    }).catch(() => {})

    const userRole = this.data.userRole || 'enterprise'
    const userId = this.getCurrentUserId()
    const requests = [
      get('/notifications', { page: 1, pageSize: 1000 }).catch(() => ({ data: { list: [] } }))
    ]

    if (userRole === 'worker') {
      requests.push(get('/wallet/transactions', { page: 1, pageSize: 1000 }).catch(() => ({ data: { list: [] } })))
    }

    Promise.all(requests).then(([notificationRes, walletRes]) => {
      const notifications = notificationRes.data.list || notificationRes.data || []
      const systemMessages = buildRoleSystemMessages({
        userRole,
        notifications: Array.isArray(notifications) ? notifications : [],
        transactions: walletRes ? walletRes.data : [],
        userId
      })
      const mapped = systemMessages.map((item) => this.mapSystemMessage(item))
      this.setSystemMessages(mapped)
    }).catch(() => {})
  },

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

  onTabChange(e) {
    this.setData({ currentTab: Number(e.currentTarget.dataset.index) })
  },

  onGoLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  onReadAll() {
    const { userRole, systemMessages } = this.data
    const userId = this.getCurrentUserId()
    const tasks = [post('/notifications/read-all').catch(() => null)]

    if (userRole === 'worker') {
      markWorkerSystemMessagesReadAll(userId, systemMessages)
    }

    Promise.all(tasks).then(() => {
      const nextMessages = systemMessages.map((item) => ({ ...item, unread: false, isRead: 1 }))
      this.setSystemMessages(nextMessages)
      if (userRole === 'worker') {
        this.loadMessages()
      }
      wx.showToast({ title: '已全部已读', icon: 'success' })
    }).catch(() => {
      this.loadMessages()
    })
  },

  openMessageLink(link) {
    const targetUrl = this.normalizeInternalLink(link)
    if (!targetUrl) return

    if (TAB_BAR_PAGE_PATHS.includes(targetUrl)) {
      wx.switchTab({ url: targetUrl })
      return
    }

    wx.navigateTo({
      url: targetUrl,
      fail: () => {
        wx.redirectTo({
          url: targetUrl,
          fail: () => {
            wx.showToast({ title: '暂不支持打开该通知', icon: 'none' })
          }
        })
      }
    })
  },

  onTapMsg(e) {
    const item = e.currentTarget.dataset.item || {}
    const userRole = this.data.userRole || 'enterprise'
    const userId = this.getCurrentUserId()
    const targetLink = this.resolveSystemMessageLink(item)

    if (item.sourceType === 'wallet') {
      if (item.unread && userRole === 'worker') {
        markWorkerSystemMessageRead(userId, item)
        this.loadMessages()
      }
      if (targetLink) {
        this.openMessageLink(targetLink)
      }
      return
    }

    if (item.id && item.unread) {
      const nextMessages = this.data.systemMessages.map((message) => (
        Number(message.id) === Number(item.id) ? { ...message, unread: false, isRead: 1 } : message
      ))
      this.setSystemMessages(nextMessages)
      put('/notifications/' + item.id + '/read').catch(() => {
        this.loadMessages()
      })
    }

    if (targetLink) {
      this.openMessageLink(targetLink)
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
