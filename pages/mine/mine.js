const { get, del } = require('../../utils/request')
const { normalizeImageUrl } = require('../../utils/image')

Page({
  data: {
    userRole: 'enterprise',
    statusBarHeight: 0,
    menuHeight: 0,
    currentTab: 0,
    enterpriseInfo: { avatarText: '' },
    workerInfo: { avatarText: '' },
    myPosts: [],
    favorites: [],
    myApplications: [],
    // 企业端
    enterpriseTabs: ['我的动态', '我的收藏'],
    enterpriseFuncs: [
      { icon: '\ue8a0', label: '我的发布', bg: '#EFF6FF', iconColor: '#3B82F6', url: '/pages/my-posts/my-posts' },
      { icon: '\ue624', label: '灵豆充值', bg: '#FFF7ED', iconColor: '#F97316', url: '/pages/bean-recharge/bean-recharge' },
      { icon: '\ue786', label: '企业认证', bg: '#ECFDF5', iconColor: '#10B981', url: '/pages/cert-enterprise/cert-enterprise' },
      { icon: '\ue619', label: '我要招工', bg: '#FFF1F2', iconColor: '#F43F5E', url: '/pages/post-job/post-job' },
      { icon: '\ue611', label: '工资结算', bg: '#FFFBEB', iconColor: '#F59E0B', url: '/pages/settlement/settlement' }
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
    this.setData({ userRole, currentTab: 0, avatarUrl })
    this.loadProfile()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: userRole === 'enterprise' ? 4 : 3, userRole })
    }
  },

  loadProfile() {
    get('/auth/profile').then(res => {
      const user = res.data
      const app = getApp()
      app.globalData.userInfo = user
      app.globalData.avatarUrl = user.avatarUrl || ''
      app.globalData.beanBalance = user.beanBalance || 0
      app.globalData.isMember = user.isMember || false

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
    // 加载我的收藏
    get('/favorites').then(res => {
      const list = res.data.list || res.data || []
      this.setData({ favorites: list.slice(0, 3) })
    }).catch(() => {})
    // 临工端加载接单记录
    if (this.data.userRole === 'worker') {
      get('/applications').then(res => {
        const rawList = res.data.list || res.data || []
        const list = rawList.map(item => this.normalizeApplication(item)).slice(0, 3)
        this.setData({ myApplications: list })
      }).catch(() => {})
    }
  },

  normalizeApplication(item) {
    const job = item.job || {}
    const user = job.user || {}

    // 状态映射
    const statusMap = {
      pending: { text: '待确认', bg: 'amber', tabKey: '待确认' },
      accepted: { text: '已入选', bg: 'green', tabKey: '已入选' },
      confirmed: { text: '进行中', bg: 'green', tabKey: '进行中' },
      completed: { text: '已完成', bg: 'gray', tabKey: '已完成' },
      rejected: { text: '未通过', bg: 'rose', tabKey: '待确认' },
      cancelled: { text: '已取消', bg: 'gray', tabKey: '待确认' }
    }

    const statusInfo = statusMap[item.status] || { text: '待确认', bg: 'amber', tabKey: '待确认' }

    return {
      id: item.id,
      jobId: job.id,
      company: user.nickname || user.companyName || '企业',
      title: job.title || '',
      salary: job.salary || 0,
      salaryUnit: job.salaryUnit || '元/天',
      location: job.location || '',
      description: job.description || '',
      date: job.dateRange || '',
      hours: job.workHours || '',
      status: item.status,
      statusText: statusInfo.text,
      statusBg: statusInfo.bg,
      tabKey: statusInfo.tabKey
    }

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
      const title = item.title || (item.content || '').slice(0, 28) || '未命名发布'
      return {
        ...item,
        typeKey: item.type,
        type: typeMeta.label,
        typeColor: typeMeta.color,
        date: item.createdAt ? item.createdAt.substring(0, 10) : '',
        title,
        desc: item.content || '',
        views: Number(item.viewCount || 0),
        statusText: statusMeta.text,
        statusColor: statusMeta.color
      }
    })
  },

  onTabChange(e) {
    this.setData({ currentTab: e.currentTarget.dataset.index })
  },

  onFuncTap(e) {
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

  onDeletePost(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定删除这条发布吗？',
      confirmColor: '#F43F5E',
      success: (res) => {
        if (!res.confirm) return
        del('/posts/' + id).then(() => {
          wx.showToast({ title: '删除成功', icon: 'success' })
          this.loadProfile()
        }).catch(() => {})
      }
    })
  },

  onSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  onMembership() {
    wx.navigateTo({ url: '/pages/membership/membership' })
  },

  onWallet() {
    wx.navigateTo({ url: '/pages/wallet/wallet' })
  },

  onBeanRecharge() {
    wx.navigateTo({ url: '/pages/bean-detail/bean-detail' })
  }
})
