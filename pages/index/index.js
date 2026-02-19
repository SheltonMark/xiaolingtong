const mock = require('../../utils/mock')

Page({
  data: {
    userRole: 'enterprise', // enterprise | worker
    statusBarHeight: 0,
    // 企业端
    currentTab: 0,
    tabs: ['采购需求', '工厂库存', '代加工', '发布招工', '工厂名录'],
    purchaseList: [],
    stockList: [],
    processList: [],
    // 分类图标
    catePurchase: [
      { icon: '☰', label: '全部', bg: '#3B82F6', active: true },
      { icon: '🛒', label: '日用百货', bg: '#FFF7ED' },
      { icon: '📱', label: '电子数码', bg: '#E0F2FE' },
      { icon: '👗', label: '服装鞋帽', bg: '#FCE7F3' },
      { icon: '🔧', label: '五金工具', bg: '#EFF6FF' },
      { icon: '🏠', label: '厨房卫浴', bg: '#ECFDF5' },
      { icon: '🧸', label: '母婴玩具', bg: '#FFF1F2' }
    ],
    cateStock: [
      { icon: '☰', label: '全部', bg: '#3B82F6', active: true },
      { icon: '📱', label: '电子数码', bg: '#E0F2FE' },
      { icon: '🛒', label: '日用百货', bg: '#FFF7ED' },
      { icon: '👗', label: '服装鞋帽', bg: '#FCE7F3' },
      { icon: '🔧', label: '五金工具', bg: '#EFF6FF' },
      { icon: '📦', label: '家具家电', bg: '#F3E8FF' }
    ],
    cateProcess: [
      { icon: '☰', label: '全部', bg: '#3B82F6', active: true },
      { icon: '🧪', label: '注塑加工', bg: '#FFFBEB' },
      { icon: '⚙️', label: 'CNC加工', bg: '#EFF6FF' },
      { icon: '🎨', label: '丝印印刷', bg: '#F3E8FF' },
      { icon: '🧵', label: '缝纫加工', bg: '#FCE7F3' },
      { icon: '🏗', label: '模具制造', bg: '#ECFDF5' }
    ],
    cateJob: [
      { icon: '☰', label: '全部', bg: '#3B82F6', active: true },
      { icon: '🔌', label: '电子组装', bg: '#E0F2FE' },
      { icon: '📦', label: '包装工', bg: '#FFFBEB' },
      { icon: '🧵', label: '缝纫工', bg: '#FCE7F3' },
      { icon: '🏭', label: '仓储物流', bg: '#ECFDF5' },
      { icon: '✅', label: '质检', bg: '#F3E8FF' }
    ],
    cateFactory: [
      { icon: '☰', label: '全部', bg: '#3B82F6', active: true },
      { icon: '🔌', label: '电子组装', bg: '#E0F2FE' },
      { icon: '⚙️', label: '模具加工', bg: '#FFFBEB' },
      { icon: '🧪', label: '注塑', bg: '#FFF7ED' },
      { icon: '👗', label: '服装纺织', bg: '#FCE7F3' },
      { icon: '🔧', label: '五金加工', bg: '#EFF6FF' }
    ],
    factoryList: [
      { id: 'f1', name: '东莞市鑫达电子科技有限公司', type: '电子组装', location: '东莞长安', scale: '500+员工', scaleBg: '#ECFDF5', scaleColor: '#10B981', years: 3 },
      { id: 'f2', name: '深圳市精密模具制造厂', type: '模具加工', location: '深圳宝安', scale: '100+员工', scaleBg: '#FFFBEB', scaleColor: '#F59E0B', years: 2 }
    ],
    // 临工端
    jobList: [],
    filterLabels: ['工种', '计费方式', '距离', '工价']
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    const menuBtn = wx.getMenuButtonBoundingClientRect()
    const navBarHeight = menuBtn.top + menuBtn.height
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight,
      menuHeight: menuBtn.height,
      menuTop: menuBtn.top,
      navBarHeight: navBarHeight
    })
  },

  onShow() {
    const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    this.setData({ userRole })
    this.loadData()
    // 设置自定义 tabBar 选中态和角色
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0, userRole })
    }
  },

  loadData() {
    if (this.data.userRole === 'enterprise') {
      this.setData({
        purchaseList: mock.purchaseList,
        stockList: mock.stockList,
        processList: mock.processList || [],
        jobListEnterprise: mock.jobListEnterprise
      })
    } else {
      this.setData({ jobList: mock.jobListWorker })
    }
  },

  onTabChange(e) {
    this.setData({ currentTab: e.currentTarget.dataset.index })
  },

  onSearch() {
    wx.navigateTo({ url: '/pages/category/category' })
  },

  onNotification() {
    wx.switchTab({ url: '/pages/messages/messages' })
  },

  onCardTap(e) {
    const { id } = e.detail
    wx.navigateTo({ url: '/pages/post-detail/post-detail?id=' + id })
  },

  onJobTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/job-detail/job-detail?id=' + id })
  },

  onWechat(e) {
    wx.showToast({ title: '已复制微信号', icon: 'success' })
  },

  onPhone(e) {
    wx.makePhoneCall({ phoneNumber: '13800138000', fail() {} })
  },

  // 长按城市切换角色（调试用）
  onSwitchRole() {
    const newRole = this.data.userRole === 'enterprise' ? 'worker' : 'enterprise'
    getApp().globalData.userRole = newRole
    wx.setStorageSync('userRole', newRole)
    this.setData({ userRole: newRole })
    this.loadData()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0, userRole: newRole })
    }
    wx.showToast({ title: '已切换为' + (newRole === 'enterprise' ? '企业端' : '临工端'), icon: 'none' })
  }
})
