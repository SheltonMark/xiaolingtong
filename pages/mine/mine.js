const { get, del } = require('../../utils/request')

Page({
  data: {
    userRole: 'enterprise',
    statusBarHeight: 0,
    menuHeight: 0,
    currentTab: 0,
    enterpriseInfo: { avatarText: '' },
    workerInfo: { avatarText: '' },
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
      app.globalData.beanBalance = user.beanBalance || 0
      app.globalData.isMember = user.isMember || false
      this.setData({
        nickname: user.nickname || '',
        avatarUrl: user.avatarUrl || '',
        beanBalance: user.beanBalance || 0,
        isMember: user.isMember || false,
        creditScore: user.creditScore || 100
      })
    }).catch(() => {})
    // 加载我的发布
    if (this.data.userRole === 'enterprise') {
      get('/posts/mine').then(res => {
        const list = res.data.list || res.data || []
        const mapped = this.mapMyPosts(list)
        this.setData({ myPosts: mapped.slice(0, 3) })
      }).catch(() => {})
    }
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
      expired: { text: '已过期', color: '#F59E0B' },
      deleted: { text: '已删除', color: '#94A3B8' }
    }
    return (Array.isArray(list) ? list : []).map(item => {
      const typeMeta = typeMap[item.type] || { label: '信息', color: 'blue' }
      const statusMeta = statusMap[item.status] || { text: '审核中', color: '#F97316' }
      const title = item.title || (item.content || '').slice(0, 28) || '未命名发布'
      return {
        ...item,
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
    wx.navigateTo({ url: '/pages/post-detail/post-detail?id=' + e.currentTarget.dataset.id })
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
