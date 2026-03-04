const { get } = require('../../utils/request')

Page({
  data: {
    userRole: 'enterprise', // enterprise | worker
    statusBarHeight: 0,
    // 企业端
    currentTab: 0,
    tabs: ['采购需求', '工厂库存', '代加工', '发布招工'],
    purchaseList: [],
    stockList: [],
    processList: [],
    // 分类图标
    catePurchase: [
      { icon: '\ue625', label: '日用百货', bg: '#FFF7ED', iconColor: '#F97316' },
      { icon: '\ue605', label: '电子数码', bg: '#E0F2FE', iconColor: '#3B82F6' },
      { icon: '\ue8c7', label: '服装鞋帽', bg: '#FCE7F3', iconColor: '#EC4899' },
      { icon: '\ue659', label: '五金工具', bg: '#EFF6FF', iconColor: '#6366F1' },
      { icon: '\ue832', label: '厨房卫浴', bg: '#ECFDF5', iconColor: '#10B981' },
      { icon: '\ue626', label: '母婴玩具', bg: '#FFF1F2', iconColor: '#F43F5E' }
    ],
    cateStock: [
      { icon: '\ue605', label: '电子数码', bg: '#E0F2FE', iconColor: '#3B82F6' },
      { icon: '\ue625', label: '日用百货', bg: '#FFF7ED', iconColor: '#F97316' },
      { icon: '\ue8c7', label: '服装鞋帽', bg: '#FCE7F3', iconColor: '#EC4899' },
      { icon: '\ue659', label: '五金工具', bg: '#EFF6FF', iconColor: '#6366F1' },
      { icon: '\ue670', label: '家具家电', bg: '#F3E8FF', iconColor: '#8B5CF6' }
    ],
    cateProcess: [
      { icon: '\ue6a0', label: '注塑加工', bg: '#FFFBEB', iconColor: '#F59E0B' },
      { icon: '\ue659', label: 'CNC加工', bg: '#EFF6FF', iconColor: '#6366F1' },
      { icon: '\ue63b', label: '丝印印刷', bg: '#F3E8FF', iconColor: '#8B5CF6' },
      { icon: '\ue617', label: '缝纫加工', bg: '#FCE7F3', iconColor: '#EC4899' },
      { icon: '\ue770', label: '模具制造', bg: '#ECFDF5', iconColor: '#10B981' }
    ],
    cateJob: [
      { icon: '\ue687', label: '电子组装', bg: '#E0F2FE', iconColor: '#3B82F6' },
      { icon: '\ue670', label: '包装工', bg: '#FFFBEB', iconColor: '#F59E0B' },
      { icon: '\ue617', label: '缝纫工', bg: '#FCE7F3', iconColor: '#EC4899' },
      { icon: '\ue610', label: '仓储物流', bg: '#ECFDF5', iconColor: '#10B981' },
      { icon: '\ue786', label: '质检', bg: '#F3E8FF', iconColor: '#8B5CF6' }
    ],
    cateFactory: [
      { icon: '\ue687', label: '电子组装', bg: '#E0F2FE', iconColor: '#3B82F6' },
      { icon: '\ue770', label: '模具加工', bg: '#FFFBEB', iconColor: '#F59E0B' },
      { icon: '\ue6a0', label: '注塑', bg: '#FFF7ED', iconColor: '#F97316' },
      { icon: '\ue8c7', label: '服装纺织', bg: '#FCE7F3', iconColor: '#EC4899' },
      { icon: '\ue659', label: '五金加工', bg: '#EFF6FF', iconColor: '#6366F1' }
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
    // 等渲染完成后精确测量固定头部高度
    setTimeout(() => this.measureHeader(), 100)
  },

  measureHeader() {
    wx.createSelectorQuery().select('.fixed-header').boundingClientRect(rect => {
      if (rect) {
        this.setData({ headerHeight: rect.height })
      }
    }).exec()
  },

  onShow() {
    const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    this.setData({ userRole })
    this.loadData()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0, userRole })
    }
    setTimeout(() => this.measureHeader(), 100)
  },

  loadData() {
    if (this.data.userRole === 'enterprise') {
      get('/posts', { type: 'purchase' }).then(res => {
        this.setData({ purchaseList: this._mapPosts(res.data.list || res.data || []) })
      }).catch(() => {})
      get('/posts', { type: 'stock' }).then(res => {
        this.setData({ stockList: this._mapPosts(res.data.list || res.data || []) })
      }).catch(() => {})
      get('/posts', { type: 'process' }).then(res => {
        this.setData({ processList: this._mapPosts(res.data.list || res.data || []) })
      }).catch(() => {})
      get('/jobs').then(res => {
        this.setData({ jobListEnterprise: res.data.list || res.data || [] })
      }).catch(() => {})
    } else {
      get('/jobs').then(res => {
        this.setData({ jobList: res.data.list || res.data || [] })
      }).catch(() => {})
    }
  },

  _mapPosts(list) {
    return (Array.isArray(list) ? list : []).map(item => ({
      ...item,
      companyName: (item.user && item.user.nickname) || item.title || '',
      avatarText: item.user && item.user.nickname ? item.user.nickname[0] : '',
      time: item.createdAt ? item.createdAt.substring(0, 10) : ''
    }))
  },

  onTabChange(e) {
    this.setData({ currentTab: e.currentTarget.dataset.index })
    // tab切换时重新加载数据
    this.loadDataByCategory()
  },

  onCategoryTap(e) {
    const { label } = e.currentTarget.dataset
    const currentTab = this.data.currentTab

    // 根据当前tab确定要更新的分类数组
    let cateKey = ''
    if (currentTab === 0) cateKey = 'catePurchase'
    else if (currentTab === 1) cateKey = 'cateStock'
    else if (currentTab === 2) cateKey = 'cateProcess'
    else if (currentTab === 3) cateKey = 'cateJob'
    else if (currentTab === 4) cateKey = 'cateFactory'

    if (!cateKey) return

    // 更新分类选中状态
    const categories = this.data[cateKey].map(item => ({
      ...item,
      active: item.label === label ? !item.active : false
    }))

    this.setData({ [cateKey]: categories })

    // 重新加载数据
    this.loadDataByCategory()
  },

  loadDataByCategory() {
    const currentTab = this.data.currentTab

    // 获取当前选中的分类
    let selectedCategory = null
    if (currentTab === 0) {
      const active = this.data.catePurchase.find(c => c.active)
      selectedCategory = active ? active.label : null
    } else if (currentTab === 1) {
      const active = this.data.cateStock.find(c => c.active)
      selectedCategory = active ? active.label : null
    } else if (currentTab === 2) {
      const active = this.data.cateProcess.find(c => c.active)
      selectedCategory = active ? active.label : null
    } else if (currentTab === 3) {
      const active = this.data.cateJob.find(c => c.active)
      selectedCategory = active ? active.label : null
    }

    // 构建查询参数
    const params = {}
    if (selectedCategory) {
      params.industry = selectedCategory
    }

    // 根据当前tab加载对应数据
    if (this.data.userRole === 'enterprise') {
      if (currentTab === 0) {
        get('/posts', { type: 'purchase', ...params }).then(res => {
          this.setData({ purchaseList: this._mapPosts(res.data.list || res.data || []) })
        }).catch(() => {})
      } else if (currentTab === 1) {
        get('/posts', { type: 'stock', ...params }).then(res => {
          this.setData({ stockList: this._mapPosts(res.data.list || res.data || []) })
        }).catch(() => {})
      } else if (currentTab === 2) {
        get('/posts', { type: 'process', ...params }).then(res => {
          this.setData({ processList: this._mapPosts(res.data.list || res.data || []) })
        }).catch(() => {})
      } else if (currentTab === 3) {
        get('/jobs', params).then(res => {
          this.setData({ jobListEnterprise: res.data.list || res.data || [] })
        }).catch(() => {})
      }
    }
  },

  onSearch() {
    wx.navigateTo({ url: '/pages/category/category' })
  },

  onViewMore() {
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
    const id = e.detail ? e.detail.id : (e.currentTarget.dataset.id || '')
    // 从列表中找到对应项的微信号
    const allItems = [
      ...(this.data.purchaseList || []),
      ...(this.data.stockList || []),
      ...(this.data.processList || []),
      ...(this.data.jobListEnterprise || []),
      ...(this.data.jobList || [])
    ]
    const item = allItems.find(i => i.id === id)
    const wechat = item ? item.wechat : ''
    if (!wechat) {
      wx.showToast({ title: '暂无微信号', icon: 'none' })
      return
    }
    wx.showModal({
      title: '微信号',
      content: wechat,
      confirmText: '复制',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({ data: wechat })
        }
      }
    })
  },

  onPhone(e) {
    wx.makePhoneCall({ phoneNumber: '13800138000', fail() {} })
  },

  onChat(e) {
    wx.navigateTo({ url: '/pages/chat/chat' })
  },

  onReport(e) {
    const id = e.detail ? e.detail.id : (e.currentTarget.dataset.id || '')
    wx.navigateTo({ url: '/pages/report/report?id=' + id })
  },

  onShare(e) {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] })
  },

  onApply(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/job-detail/job-detail?id=' + id })
  },

  onPreviewImage(e) {
    wx.previewImage({ current: e.currentTarget.dataset.current, urls: e.currentTarget.dataset.urls })
  },

  onPublishJob() {
    wx.navigateTo({ url: '/pages/post-job/post-job' })
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
