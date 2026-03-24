const { get, del, post } = require('../../utils/request')
const { normalizeImageUrl } = require('../../utils/image')
const auth = require('../../utils/auth')

function formatDate(value) {
  if (!value) return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
    return trimmed.slice(0, 10)
  }
  if (typeof value === 'number') {
    const ts = value < 1e12 ? value * 1000 : value
    const parsed = new Date(ts)
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
}

function getFavoriteDate(item) {
  return formatDate(
    item.createdAt ||
    item.favoritedAt ||
    item.favoriteAt ||
    item.created_at ||
    item.updatedAt
  )
}

function isGenericCompanyName(name) {
  const text = String(name || '').trim()
  return !text || text === '企业' || text === '企业用户'
}

function formatJobDate(job) {
  if (job.dateRange) return job.dateRange
  if (job.dateStart && job.dateEnd) return `${job.dateStart} ~ ${job.dateEnd}`
  return ''
}

Page({
  data: {
    userRole: 'enterprise',
    statusBarHeight: 0,
    menuHeight: 0,
    currentTab: 0,
    notLoggedIn: false,
    guestFuncs: [],
    enterpriseInfo: { avatarText: '' },
    workerInfo: { avatarText: '' },
    myPosts: [],
    favorites: [],
    myApplications: [],
    walletBalance: '0.00',
    // 企业端
    enterpriseTabs: ['我的动态', '我的收藏'],
    enterpriseFuncs: [
      { icon: '\ue8a0', label: '我的发布', bg: '#EFF6FF', iconColor: '#3B82F6', url: '/pages/my-posts/my-posts' },
      { icon: '\ue624', label: '灵豆充值', bg: '#FFF7ED', iconColor: '#F97316', url: '/pages/bean-recharge/bean-recharge' },
      { icon: '\ue786', label: '企业认证', bg: '#ECFDF5', iconColor: '#10B981', url: '/pages/cert-enterprise/cert-enterprise' },
      { icon: '\ue619', label: '我要招工', bg: '#FFF1F2', iconColor: '#F43F5E', url: '/pages/post-job/post-job' },
      { icon: '\ue61c', label: '招工管理', bg: '#FFF7ED', iconColor: '#D97706', url: '/pages/job-manage/job-manage' },
      { icon: '\ue611', label: '工资结算', bg: '#FFFBEB', iconColor: '#F59E0B', url: '/pages/settlement/settlement' },
      { icon: '\ue661', label: '我的邀请', bg: '#F0F9FF', iconColor: '#0EA5E9', url: '/pages/my-invites/my-invites' },
      { icon: '\ue63b', label: '广告投放', bg: '#F3E8FF', iconColor: '#8B5CF6', url: '/pages/ad-purchase/ad-purchase' },
      { icon: '\ue605', label: '联系方式', bg: '#EEF2FF', iconColor: '#4F46E5', url: '/pages/contact-profile/contact-profile' }
    ],
    myPosts: [],
    // 临工端
    workerTabs: ['接单记录', '我的收藏'],
    workerFuncs: [
      { icon: '\ue620', label: '我的报名', bg: '#E0F2FE', iconColor: '#3B82F6', url: '/pages/my-applications/my-applications' },
      { icon: '\ue611', label: '我的钱包', bg: '#FFF7ED', iconColor: '#F97316', url: '/pages/wallet/wallet' },
      { icon: '\ue670', label: '收入明细', bg: '#EFF6FF', iconColor: '#6366F1', url: '/pages/income/income' },
      { icon: '\ue614', label: '实名认证', bg: '#ECFDF5', iconColor: '#10B981', url: '/pages/cert-worker/cert-worker' },
      { icon: '\ue8a0', label: '临工管理', bg: '#FFF1F2', iconColor: '#F43F5E', url: '/pages/work-record/work-record' }
    ]
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    const menuBtn = wx.getMenuButtonBoundingClientRect()
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight,
      menuHeight: menuBtn.height,
      menuRight: sysInfo.windowWidth - menuBtn.left
    })
  },

  onShow() {
    const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    const avatarUrl = getApp().globalData.avatarUrl || wx.getStorageSync('avatarUrl') || ''
    const notLoggedIn = !auth.isLoggedIn()
    this.setData({
      userRole,
      currentTab: 0,
      avatarUrl,
      notLoggedIn,
      guestFuncs: userRole === 'worker' ? this.data.workerFuncs : this.data.enterpriseFuncs
    })
    if (!notLoggedIn) {
      this.loadProfile()
    }
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null
    if (tabBar) {
      tabBar.setData({ selected: userRole === 'enterprise' ? 4 : 3, userRole })
      if (typeof tabBar.loadUnread === 'function') {
        tabBar.loadUnread()
      }
    }
  },

  onGoLogin() {
    auth.goLogin()
  },

  requireLogin() {
    if (auth.isLoggedIn()) return true
    auth.goLogin()
    return false
  },

  loadProfile() {
    get('/auth/profile').then(res => {
      const user = res.data
      const app = getApp()
      app.globalData.userInfo = user
      app.globalData.avatarUrl = user.avatarUrl || ''
      app.globalData.beanBalance = user.beanBalance || 0
      app.globalData.isMember = !!(user.isMember && user.memberExpireAt && new Date(user.memberExpireAt) > new Date())
      app.globalData.memberExpireAt = user.memberExpireAt || null

      // 认证状态
      const certStatus = user.certStatus || 'none'
      const certName = user.certName || ''
      const isVerified = user.isVerified || false
      let certBadge = ''
      if (certStatus === 'approved') {
        certBadge = '已认证'
      } else if (certStatus === 'pending') {
        certBadge = '审核中'
      } else if (certStatus === 'rejected') {
        certBadge = '未通过'
      } else {
        certBadge = '未认证'
      }

      this.setData({
        nickname: user.nickname || '',
        avatarUrl: normalizeImageUrl(user.avatarUrl || ''),
        beanBalance: user.beanBalance || 0,
        isMember: user.isMember || false,
        creditScore: user.creditScore || 100,
        certStatus,
        certBadge,
        certName,
        isVerified
      })
    }).catch(() => {})
    // 加载我的发布（所有类型的最近3条）
    if (this.data.userRole === 'enterprise') {
      Promise.all([
        get('/posts/mine').catch(() => ({ data: { list: [] } })),
        get('/jobs/mine').catch(() => ({ data: { list: [] } }))
      ]).then(([postsRes, jobsRes]) => {
        const postsList = postsRes.data.list || postsRes.data || []
        const jobsList = jobsRes.data.list || jobsRes.data || []
        const allPosts = [...postsList, ...jobsList]
        // 按创建时间排序，取最近3条
        const sortedPosts = allPosts.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime()
          const timeB = new Date(b.createdAt || 0).getTime()
          return timeB - timeA
        })
        const mapped = this.mapMyPosts(sortedPosts)
        this.setData({ myPosts: mapped.slice(0, 3) })
      })
    }
    // 加载我的收藏（只显示3条）
    get('/favorites').then(res => {
      const list = res.data.list || res.data || []
      // 格式化日期
      const formatted = list.map(item => ({
        ...item,
        displayDate: getFavoriteDate(item)
      }))
      this.setData({ favorites: formatted.slice(0, 3) })
    }).catch(() => {})
    // 加载钱包余额（企业端和临工端都需要）
    get('/wallet').then(res => {
      const d = res.data || {}
      this.setData({ walletBalance: Number(d.balance || 0).toFixed(2) })
    }).catch(() => {})
    // 临工端加载接单记录
    if (this.data.userRole === 'worker') {
      this.loadWorkerApplications()
    }
  },

  loadWorkerApplications() {
    get('/applications').then(res => {
      const rawList = res.data.list || res.data || []
      const baseList = rawList.map(item => this.normalizeApplication(item))
      this.enrichApplicationsByJobDetail(baseList).then(list => {
        this.setData({ myApplications: list.slice(0, 3) })
      }).catch(() => {
        this.setData({ myApplications: baseList.slice(0, 3) })
      })
    }).catch(() => {})
  },

  enrichApplicationsByJobDetail(list) {
    const source = Array.isArray(list) ? list : []
    const missingNameItems = source.filter(item => item.jobId && isGenericCompanyName(item.company))
    if (missingNameItems.length === 0) return Promise.resolve(source)

    const requestByJobId = {}
    const requests = missingNameItems.map(item => {
      const jobId = item.jobId
      if (!requestByJobId[jobId]) {
        requestByJobId[jobId] = get('/jobs/' + jobId)
          .then(res => ({ jobId, detail: res.data || {} }))
          .catch(() => ({ jobId, detail: {} }))
      }
      return requestByJobId[jobId]
    })

    return Promise.all(requests).then(results => {
      const detailMap = {}
      results.forEach(({ jobId, detail }) => {
        const company = detail && detail.company ? detail.company : {}
        detailMap[jobId] = {
          companyName: company.name || detail.companyName || '',
          avatarUrl: normalizeImageUrl(company.avatarUrl || detail.avatarUrl || '')
        }
      })

      return source.map(item => {
        const detail = detailMap[item.jobId]
        if (!detail) return item
        return {
          ...item,
          company: isGenericCompanyName(detail.companyName) ? item.company : detail.companyName,
          companyAvatarUrl: detail.avatarUrl || item.companyAvatarUrl
        }
      })
    })
  },

  normalizeApplication(item) {
    const job = item.job || {}
    const user = job.user || {}

    const statusMap = {
      pending: { text: '待审核', bg: 'amber', tabKey: '待审核' },
      accepted: { text: '待出勤', bg: 'blue', tabKey: '待出勤', canConfirmAttendance: true },
      confirmed: { text: '待开工', bg: 'blue', tabKey: '进行中', canOpenCheckin: true, checkinActionText: '查看签到' },
      working: { text: '进行中', bg: 'green', tabKey: '进行中', canOpenCheckin: true, checkinActionText: '打卡签到', showPulse: true },
      done: { text: '已完成', bg: 'gray', tabKey: '已完成', canRate: true },
      rejected: { text: '未通过', bg: 'rose', tabKey: '全部' },
      released: { text: '已释放', bg: 'gray', tabKey: '全部' },
      cancelled: { text: '已取消', bg: 'gray', tabKey: '全部' }
    }

    const statusInfo = statusMap[item.status] || statusMap.pending
    const company = job.companyName || user.companyName || user.nickname || item.companyName || '企业'
    const companyAvatarUrl = normalizeImageUrl(job.avatarUrl || user.avatarUrl || '')
    const salaryUnit = job.salaryUnit || (job.salaryType === 'piece' ? '元/件' : '元/时')

    return {
      id: item.id,
      applicationId: item.id,
      jobId: job.id,
      enterpriseId: job.userId || user.id || 0,
      company,
      companyAvatarUrl,
      title: job.title || '',
      salary: job.salary || 0,
      salaryUnit,
      location: job.location || '',
      description: job.description || '',
      date: formatJobDate(job),
      hours: job.workHours || '',
      status: item.status,
      statusText: statusInfo.text,
      statusBg: statusInfo.bg,
      tabKey: statusInfo.tabKey,
      canConfirmAttendance: !!statusInfo.canConfirmAttendance,
      canOpenCheckin: !!statusInfo.canOpenCheckin,
      checkinActionText: statusInfo.checkinActionText || '查看签到',
      canRate: !!statusInfo.canRate,
      showPulse: !!statusInfo.showPulse,
      alert: item.status === 'accepted'
        ? '如确认出勤，请尽快确认，避免名额释放'
        : item.status === 'confirmed'
          ? '已确认出勤，请在签到时间内完成签到，如未设置临工管理员将无法打卡'
          : item.status === 'working'
            ? '已进入工作中，可查看签到记录和当前状态'
          : ''
    }
  },

  getJobDisplayState(item, fallbackStatus) {
    const statusMeta = fallbackStatus || { text: '审核中', color: '#F43F5E' }
    const timeState = item.timeState || ''

    if (timeState === 'settlement') {
      return { text: '待结算', color: '#F59E0B' }
    }

    if (timeState === 'end_overdue') {
      return { text: '待考勤', color: '#F59E0B' }
    }

    if (timeState === 'start_overdue') {
      return { text: '已过开工', color: '#F59E0B' }
    }

    if (timeState === 'ended' && !['settled', 'closed'].includes(item.status)) {
      return { text: '已结束', color: '#94A3B8' }
    }

    return {
      text: statusMeta.text,
      color: statusMeta.color
    }
  },

  getDeletePath(type, id) {
    return (type === 'job' ? '/jobs/' : '/posts/') + id
  },

  getPostMetaText(item) {
    if (item.type === 'job') {
      if (Number(item.pendingCount || 0) > 0) return `待处理 ${item.pendingCount} 人`
      if (Number(item.appliedCount || 0) > 0) return `已报名 ${item.appliedCount} 人`
      if (Number(item.needCount || 0) > 0) return `需招 ${item.needCount} 人`
      return '招工进行中'
    }
    return `${Number(item.viewCount || 0)}次浏览`
  },

  mapMyPosts(list) {
    const typeMap = {
      purchase: { label: '采购需求', color: 'blue' },
      stock: { label: '工厂库存', color: 'green' },
      process: { label: '代加工', color: 'amber' },
      job: { label: '招工', color: 'orange' }
    }
    const statusMap = {
      active: { text: '展示中', color: '#10B981' },
      pending: { text: '审核中', color: '#F97316' },
      rejected: { text: '未通过', color: '#F43F5E' },
      expired: { text: '已过期', color: '#F59E0B' },
      deleted: { text: '已删除', color: '#94A3B8' },
      recruiting: { text: '招工中', color: '#10B981' },
      full: { text: '已满员', color: '#F59E0B' },
      working: { text: '进行中', color: '#3B82F6' },
      pending_settlement: { text: '待结算', color: '#F97316' },
      settled: { text: '已结算', color: '#10B981' },
      closed: { text: '已关闭', color: '#94A3B8' }
    }
    return (Array.isArray(list) ? list : []).map(item => {
      const typeMeta = typeMap[item.type] || { label: '信息', color: 'blue' }
      const statusMeta = statusMap[item.status] || { text: '审核中', color: '#F97316' }
      const jobDisplay = item.type === 'job' ? this.getJobDisplayState(item, statusMeta) : null
      const title = item.title || (item.content || '').slice(0, 28) || '未命名发布'
      return {
        ...item,
        uniqueKey: `${item.type}-${item.id}`,
        typeKey: item.type,
        type: typeMeta.label,
        typeColor: typeMeta.color,
        date: item.createdAt ? item.createdAt.substring(0, 10) : '',
        title,
        desc: item.content || '',
        views: Number(item.viewCount || 0),
        metaText: this.getPostMetaText(item),
        statusText: jobDisplay ? jobDisplay.text : statusMeta.text,
        statusColor: jobDisplay ? jobDisplay.color : statusMeta.color
      }
    })
  },

  onTabChange(e) {
    this.setData({ currentTab: e.currentTarget.dataset.index })
  },

  onFuncTap(e) {
    if (!this.requireLogin()) return
    const { url } = e.currentTarget.dataset
    if (url) wx.navigateTo({ url })
  },

  onTapPost(e) {
    const { id, type } = e.currentTarget.dataset
    const targetUrl = type === 'job'
      ? '/pages/job-detail/job-detail?id=' + id
      : '/pages/post-detail/post-detail?id=' + id
    wx.navigateTo({ url: targetUrl })
  },

  onTapFavorite(e) {
    const { id, type } = e.currentTarget.dataset
    let targetUrl = ''
    if (type === 'post') {
      targetUrl = '/pages/post-detail/post-detail?id=' + id
    } else if (type === 'job') {
      targetUrl = '/pages/job-detail/job-detail?id=' + id
    } else if (type === 'exposure') {
      targetUrl = '/pages/exposure-detail/exposure-detail?id=' + id
    }
    if (targetUrl) wx.navigateTo({ url: targetUrl })
  },

  onViewAllPosts() {
    wx.navigateTo({ url: '/pages/my-posts/my-posts' })
  },

  onViewAllFavorites() {
    wx.navigateTo({ url: '/pages/my-favorites/my-favorites' })
  },

  onViewFavorite(e) {
    const { id, type } = e.currentTarget.dataset
    let targetUrl = ''
    if (type === 'post') {
      targetUrl = '/pages/post-detail/post-detail?id=' + id
    } else if (type === 'job') {
      targetUrl = '/pages/job-detail/job-detail?id=' + id
    } else if (type === 'exposure') {
      targetUrl = '/pages/exposure-detail/exposure-detail?id=' + id
    }
    if (targetUrl) wx.navigateTo({ url: targetUrl })
  },

  onCancelFavorite(e) {
    const { id, type } = e.currentTarget.dataset
    wx.showModal({
      title: '取消收藏',
      content: '确定要取消收藏这条信息吗？',
      confirmColor: '#F43F5E',
      success: (res) => {
        if (!res.confirm) return
        post('/favorites/toggle', { targetType: type, targetId: id }).then(() => {
          wx.showToast({ title: '已取消收藏', icon: 'success' })
          this.loadProfile()
        }).catch(() => {})
      }
    })
  },

  onDeletePost(e) {
    const id = e.currentTarget.dataset.id
    const type = e.currentTarget.dataset.type || 'post'
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定删除这条发布吗？',
      confirmColor: '#F43F5E',
      success: (res) => {
        if (!res.confirm) return
        del(this.getDeletePath(type, id)).then(() => {
          wx.showToast({ title: '删除成功', icon: 'success' })
          this.loadProfile()
        }).catch(() => {})
      }
    })
  },

  onSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  onTapCertStatus() {
    if (!this.requireLogin()) return
    if (this.data.certStatus === 'approved') return
    const targetUrl = this.data.userRole === 'worker'
      ? '/pages/cert-worker/cert-worker'
      : '/pages/cert-enterprise/cert-enterprise'
    wx.navigateTo({ url: targetUrl })
  },

  onMembership() {
    wx.navigateTo({ url: '/pages/membership/membership' })
  },

  onWallet() {
    wx.navigateTo({ url: '/pages/wallet/wallet' })
  },

  onBeanRecharge() {
    wx.navigateTo({ url: '/pages/bean-detail/bean-detail' })
  },

  onViewJobDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/job-detail/job-detail?id=' + id })
  }
})
