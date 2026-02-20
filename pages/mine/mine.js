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
      { icon: '📋', label: '我的发布', bg: '#EFF6FF', url: '/pages/my-posts/my-posts' },
      { icon: '💎', label: '灵豆充值', bg: '#FFF7ED', url: '/pages/bean-recharge/bean-recharge' },
      { icon: '✅', label: '企业认证', bg: '#ECFDF5', url: '/pages/cert-enterprise/cert-enterprise' },
      { icon: '👷', label: '我要招工', bg: '#FFF1F2', url: '/pages/post-job/post-job' },
      { icon: '📊', label: '用工管理', bg: '#E0F2FE', url: '/pages/my-posts/my-posts' },
      { icon: '💰', label: '工资结算', bg: '#FFFBEB', url: '/pages/settlement/settlement' }
    ],
    // 临工端
    workerTabs: ['接单记录', '浏览记录'],
    workerFuncs: [
      { icon: '📝', label: '我的报名', bg: '#E0F2FE', url: '/pages/my-applications/my-applications' },
      { icon: '💰', label: '我的钱包', bg: '#FFF7ED', url: '/pages/wallet/wallet' },
      { icon: '💎', label: '灵豆商城', bg: '#FFFBEB', url: '/pages/bean-recharge/bean-recharge' },
      { icon: '📊', label: '收入明细', bg: '#EFF6FF', url: '/pages/income/income' },
      { icon: '🪪', label: '实名认证', bg: '#ECFDF5', url: '/pages/cert-worker/cert-worker' },
      { icon: '📋', label: '工作记录', bg: '#FFF1F2', url: '/pages/work-record/work-record' }
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
