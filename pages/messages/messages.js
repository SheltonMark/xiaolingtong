const { get, post, put } = require('../../utils/request')
const wsChat = require('../../utils/ws-chat')
const auth = require('../../utils/auth')
const { requestSubscribe } = require('../../utils/subscribe')
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

function getSystemNoticeCopy() {
  return {
    systemTabLabel: '\u7cfb\u7edf\u901a\u77e5',
    systemPanelTitle: '\u7cfb\u7edf\u901a\u77e5',
    systemPanelHint: '\u5e73\u53f0\u516c\u544a\u3001\u8ba4\u8bc1\u7ed3\u679c\u3001\u7ed3\u7b97\u63d0\u9192\u7b49\u6d88\u606f\u4f1a\u663e\u793a\u5728\u8fd9\u91cc\u3002',
    systemEmptyText: '\u6682\u65e0\u7cfb\u7edf\u901a\u77e5',
    systemEmptySubText: '\u540e\u53f0\u53d1\u5e03\u7684\u516c\u544a\u548c\u4e0e\u4f60\u76f8\u5173\u7684\u7cfb\u7edf\u63d0\u9192\u4f1a\u663e\u793a\u5728\u8fd9\u91cc\u3002',
    systemRoleBadgeText: ''
  }
}

function decodeHtmlEntities(value) {
  let text = String(value || '')
  if (!text || text.indexOf('&') === -1) return text
  const namedMap = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " }
  const decodeOnce = (input) => input.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos|nbsp);/g, (_, entity) => {
    if (entity[0] === '#') {
      const isHex = entity[1] === 'x' || entity[1] === 'X'
      const raw = isHex ? entity.slice(2) : entity.slice(1)
      const code = parseInt(raw, isHex ? 16 : 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : _
    }
    return namedMap[entity] || _
  })
  for (let i = 0; i < 3; i += 1) {
    const next = decodeOnce(text)
    if (next === text) break
    text = next
  }
  return text
}

function includesAny(text, keywords) {
  const source = String(text || '')
  return keywords.some((keyword) => source.includes(keyword))
}

function getSystemCategoryConfigs(userRole) {
  if (userRole === 'worker') {
    return [
      { key: 'order', title: '订单通知', hint: '报名、开工、考勤和完工相关提醒' },
      { key: 'wallet', title: '钱包通知', hint: '工资、提现和结算到账提醒' },
      { key: 'rating', title: '评价认证', hint: '评价、认证和信用相关提醒' },
      { key: 'platform', title: '平台通知', hint: '邀请、活动和系统公告' }
    ]
  }

  return [
    { key: 'work', title: '用工通知', hint: '报名、考勤、结算和评价提醒' },
    { key: 'promotion', title: '推广通知', hint: '广告、置顶和推广状态提醒' },
    { key: 'asset', title: '会员资产', hint: '会员、灵豆和返佣相关提醒' },
    { key: 'platform', title: '平台通知', hint: '认证结果与系统公告' }
  ]
}

function resolveSystemCategory(item, userRole) {
  const title = decodeHtmlEntities(item.title || '')
  const desc = decodeHtmlEntities(item.content || item.desc || '')
  const text = `${title} ${desc}`
  const type = String(item.type || '')

  if (userRole === 'worker') {
    if (
      item.sourceType === 'wallet' ||
      ['settlement', 'income', 'withdraw'].includes(type) ||
      includesAny(text, ['工资到账', '提现'])
    ) {
      return 'wallet'
    }
    if (type === 'job_apply') return 'order'
    if (type === 'cert') return 'rating'
    if (type === 'promotion' && includesAny(text, ['评价', '认证'])) return 'rating'
    return 'platform'
  }

  if (type === 'job_apply') return 'work'
  if (type === 'promotion' && includesAny(text, ['评价'])) return 'work'
  if (type === 'promotion' || includesAny(text, ['广告', '推广', '置顶'])) return 'promotion'
  if (type === 'invite') return 'asset'
  if (type === 'system' && includesAny(text, ['会员', '灵豆', '充值', '返佣'])) return 'asset'
  return 'platform'
}

function buildSystemSections(messages, userRole) {
  const configs = getSystemCategoryConfigs(userRole)
  const grouped = {}

  configs.forEach((config) => {
    grouped[config.key] = []
  })

  ;(Array.isArray(messages) ? messages : []).forEach((item) => {
    const key = resolveSystemCategory(item, userRole)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push({
      ...item,
      categoryKey: key
    })
  })

  return configs
    .map((config) => {
      const items = grouped[config.key] || []
      const unreadCount = items.filter((item) => item.unread).length
      return {
        key: config.key,
        title: config.title,
        hint: config.hint,
        count: items.length,
        unreadCount,
        unreadLabel: unreadCount > 0 ? String(unreadCount) + '\u6761\u672a\u8bfb' : '',
        items
      }
    })
    .filter((section) => section.count > 0)
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
    systemSections: [],
    noticeItems: [],
    noticeCountLabel: '',
    notLoggedIn: false,
    userRole: 'enterprise',
    systemTabLabel: '\u7cfb\u7edf\u901a\u77e5',
    systemPanelTitle: '\u7cfb\u7edf\u901a\u77e5',
    systemPanelHint: '\u5e73\u53f0\u516c\u544a\u3001\u8ba4\u8bc1\u7ed3\u679c\u3001\u7ed3\u7b97\u63d0\u9192\u7b49\u6d88\u606f\u4f1a\u663e\u793a\u5728\u8fd9\u91cc\u3002',
    systemEmptyText: '\u6682\u65e0\u7cfb\u7edf\u901a\u77e5',
    systemEmptySubText: '\u540e\u53f0\u53d1\u5e03\u7684\u516c\u544a\u548c\u4e0e\u4f60\u76f8\u5173\u7684\u7cfb\u7edf\u63d0\u9192\u4f1a\u663e\u793a\u5728\u8fd9\u91cc\u3002',
    systemRoleBadgeText: ''
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
        this.getTabBar().setData({ selected: userRole === 'enterprise' ? 3 : 2, userRole, unreadCount: 0 })
      }
      return
    }

    this.setData({
      notLoggedIn: false,
      currentTab: userRole === 'worker' ? 0 : this.data.currentTab,
      userRole,
      ...systemNoticeCopy
    })

    requestSubscribe()
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
    const title = decodeHtmlEntities(item.title || '')
    const desc = decodeHtmlEntities(item.content || item.desc || '')
    return {
      ...item,
      title,
      unread: item.unread !== undefined ? !!item.unread : Number(item.isRead || 0) === 0,
      desc,
      time: item.time || this.formatTime(item.createdAt),
      link: this.resolveSystemMessageLink(item),
      icon: style.icon,
      iconBg: style.iconBg,
      iconColor: style.iconColor,
      accentColor: style.accentColor,
      roleBadgeText: this.data.systemRoleBadgeText || '企业'
    }
  },

  mapNoticeItem(item) {
    return {
      id: item.id,
      title: decodeHtmlEntities(item.title || '\u7cfb\u7edf\u901a\u77e5'),
      content: decodeHtmlEntities(item.content || ''),
      time: this.formatTime(item.createdAt),
      createdAt: item.createdAt || ''
    }
  },

  syncTabBarUnread(totalUnread) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ unreadCount: Number(totalUnread) || 0 })
    }
  },

  setSystemMessages(systemMessages) {
    const systemUnreadCount = systemMessages.filter((m) => m.unread).length
    const systemSections = buildSystemSections(systemMessages, this.data.userRole || 'enterprise')
    this.setData({
      systemMessages,
      systemSections,
      systemUnreadCount,
      systemUnreadDisplay: systemUnreadCount > 99 ? '99+' : (systemUnreadCount ? String(systemUnreadCount) : '')
    })
    this.syncTabBarUnread((this.data.chatUnreadCount || 0) + systemUnreadCount)
  },

  loadMessages() {
    get('/conversations').then((res) => {
      const list = Array.isArray(res.data) ? res.data : (res.data.list || [])
      const mapped = list.map((item) => ({
        ...item,
        avatarText: item.avatarText || (item.name ? item.name[0] : '\u804a'),
        avatarBg: item.avatarBg || '#3B82F6',
        lastMsg: item.lastMsg || '\u6682\u65e0\u6d88\u606f',
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
      this.syncTabBarUnread(unread + (this.data.systemUnreadCount || 0))
    }).catch(() => {})

    const userRole = this.data.userRole || 'enterprise'
    const userId = this.getCurrentUserId()
    const notificationTask = get('/notifications', { page: 1, pageSize: 1000 }).catch(() => ({ data: { list: [] } }))
    const noticeTask = Promise.resolve({ data: [] })
    const walletTask = userRole === 'worker'
      ? get('/wallet/transactions', { page: 1, pageSize: 1000 }).catch(() => ({ data: { list: [] } }))
      : Promise.resolve(null)

    Promise.all([notificationTask, noticeTask, walletTask]).then(([notificationRes, noticeRes, walletRes]) => {
      const notifications = notificationRes.data.list || notificationRes.data || []
      const systemMessages = buildRoleSystemMessages({
        userRole,
        notifications: Array.isArray(notifications) ? notifications : [],
        transactions: walletRes ? walletRes.data : [],
        userId
      })
      const mapped = systemMessages.map((item) => this.mapSystemMessage(item))
      const noticeItems = (noticeRes.data.list || noticeRes.data || []).map((item) => this.mapNoticeItem(item))
      this.setData({
        noticeItems,
        noticeCountLabel: noticeItems.length > 0 ? String(noticeItems.length) + '\u6761' : ''
      })
      this.setSystemMessages(mapped)
    }).catch(() => {
      this.setData({ noticeItems: [], noticeCountLabel: '' })
    })
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
      post('/notifications/' + item.id + '/read').catch(() => {
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
