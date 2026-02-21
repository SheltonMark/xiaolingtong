Page({
  data: {
    userRole: 'enterprise',
    statusBarHeight: 0,
    menuHeight: 0,
    currentTab: 0,
    enterpriseInfo: { avatarText: '鑫' },
    workerInfo: { avatarText: '张' },
    // 企业端
    enterpriseTabs: ['我的动态', '浏览记录', '对接记录'],
    enterpriseFuncs: [
      { icon: '\ue8a0', label: '我的发布', bg: '#EFF6FF', iconColor: '#3B82F6', url: '/pages/my-posts/my-posts' },
      { icon: '\ue624', label: '灵豆充值', bg: '#FFF7ED', iconColor: '#F97316', url: '/pages/bean-recharge/bean-recharge' },
      { icon: '\ue786', label: '企业认证', bg: '#ECFDF5', iconColor: '#10B981', url: '/pages/cert-enterprise/cert-enterprise' },
      { icon: '\ue619', label: '我要招工', bg: '#FFF1F2', iconColor: '#F43F5E', url: '/pages/post-job/post-job' },
      { icon: '\ue670', label: '用工管理', bg: '#E0F2FE', iconColor: '#6366F1', url: '/pages/my-posts/my-posts' },
      { icon: '\ue611', label: '工资结算', bg: '#FFFBEB', iconColor: '#F59E0B', url: '/pages/settlement/settlement' }
    ],
    // 临工端
    workerTabs: ['接单记录', '浏览记录'],
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
    this.setData({ userRole, currentTab: 0 })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: userRole === 'enterprise' ? 4 : 3, userRole })
    }
  },

  onTabChange(e) {
    this.setData({ currentTab: e.currentTarget.dataset.index })
  },

  onFuncTap(e) {
    const { url } = e.currentTarget.dataset
    if (url) wx.navigateTo({ url })
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
