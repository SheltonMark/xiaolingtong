const { get, post } = require('../../utils/request')
const { normalizeImageUrl, normalizeImageList } = require('../../utils/image')

Page({
  data: {
    userRole: 'enterprise', // enterprise | worker
    statusBarHeight: 0,
    currentCity: '东莞', // 当前选择的城市
    cityIndex: 0, // picker 当前索引
    cityNames: [], // picker 用的城市名数组
    cities: [], // 可选城市列表
    jobTypes: [], // 可选工种列表
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
    filterLabels: ['工种', '计费方式', '距离', '工价'],
    // 筛选状态
    filterJobType: '',
    filterSalaryType: '',
    filterDistance: '',
    filterSalaryRange: '',
    sortBy: 'default' // default | salary_asc | salary_desc | distance
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
    const currentCity = wx.getStorageSync('currentCity') || '东莞'
    this.setData({ userRole, currentCity })
    this.loadCities()
    this.loadJobTypes()
    this.loadData()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0, userRole })
    }
    setTimeout(() => this.measureHeader(), 100)
  },

  loadCities() {
    get('/config/cities').then(res => {
      const cities = res.data.list || []
      const cityNames = cities.map(c => c.name)
      let cityIndex = cityNames.indexOf(this.data.currentCity)
      if (cityIndex < 0 && cities.length > 0) {
        cityIndex = 0
        this.setData({ currentCity: cities[0].name })
        wx.setStorageSync('currentCity', cities[0].name)
      }
      this.setData({ cities, cityNames, cityIndex })
    }).catch(() => {})
  },

  loadJobTypes() {
    get('/config/job-types').then(res => {
      const jobTypes = res.data.list || []
      this.setData({ jobTypes })
    }).catch(() => {})
  },

  loadData() {
    if (this.data.userRole === 'enterprise') {
      // 使用 loadDataByCategory 替代，支持分类筛选
      this.loadDataByCategory()
    } else {
      this.loadWorkerJobs()
    }
  },

  loadWorkerJobs() {
    const params = {}
    if (this.data.filterJobType) params.keyword = this.data.filterJobType
    if (this.data.filterSalaryType) params.salaryType = this.data.filterSalaryType === '按小时' ? 'hourly' : 'piece'
    if (this.data.filterSalaryRange) {
      const range = this.data.filterSalaryRange
      if (range === '20元以下') params.maxSalary = 20
      else if (range === '20-30元') { params.minSalary = 20; params.maxSalary = 30 }
      else if (range === '30-50元') { params.minSalary = 30; params.maxSalary = 50 }
      else if (range === '50元以上') params.minSalary = 50
    }
    get('/jobs', params).then(res => {
      let list = res.data.list || res.data || []
      // 客户端排序（如果需要按距离排序，需要获取用户位置）
      if (this.data.sortBy === 'salary_desc') {
        list = list.sort((a, b) => b.salary - a.salary)
      } else if (this.data.sortBy === 'salary_asc') {
        list = list.sort((a, b) => a.salary - b.salary)
      }
      this.setData({ jobList: list })
    }).catch(() => {})
  },

  _mapPosts(list) {
    return (Array.isArray(list) ? list : []).map(item => {
      const verifiedName = item.companyName || ''
      const companyName = verifiedName || '企业用户'
      return {
        ...item,
        companyName,
        companyMeta: item.industry || '',
        avatarUrl: normalizeImageUrl((item.user && item.user.avatarUrl) || ''),
        images: normalizeImageList(item.images),
        avatarText: verifiedName ? companyName[0] : '企',
        time: item.createdAt ? item.createdAt.substring(0, 10) : '',
        wechat: item.contactWechat || item.wechat || '',
        phone: item.contactPhone || item.phone || ''
      }
    })
  },

  _getAllItems() {
    return [
      ...(this.data.purchaseList || []),
      ...(this.data.stockList || []),
      ...(this.data.processList || []),
      ...(this.data.jobListEnterprise || []),
      ...(this.data.jobList || [])
    ]
  },

  _buildSharePayloadById(id, type) {
    var item
    if (type === 'job') {
      var list = (this.data.jobList || []).concat(this.data.jobListEnterprise || [])
      item = list.find(function(i) { return String(i.id) === String(id) })
    } else {
      item = this._getAllItems().find(function(i) { return String(i.id) === String(id) })
    }
    if (!item) {
      return {
        title: '小灵通供需平台',
        path: '/pages/index/index'
      }
    }

    var isJob = type === 'job' || !!(item.salary || item.salaryUnit || item.need)
    var path = isJob
      ? '/pages/job-detail/job-detail?id=' + item.id
      : '/pages/post-detail/post-detail?id=' + item.id

    var shareTitle = item.title || (item.content ? String(item.content).slice(0, 28) : '') || '供需信息'
    // 根据转发者身份切换话术
    var myId = getApp().globalData.userInfo && getApp().globalData.userInfo.id
    if (myId && String(item.userId) !== String(myId)) {
      if (isJob) {
        shareTitle = '朋友在招' + shareTitle + '｜能去吗？'
      } else {
        shareTitle = '有人在找' + shareTitle + '｜你有货吗？'
      }
    }
    path = getApp().getSharePath(path)
    var payload = { title: shareTitle, path }
    if (item.images && item.images.length) payload.imageUrl = item.images[0]
    return payload
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
    } else {
      // 临工端
      get('/jobs', params).then(res => {
        this.setData({ jobList: res.data.list || res.data || [] })
      }).catch(() => {})
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
    const allItems = this._getAllItems()
    const item = allItems.find(i => String(i.id) === String(id))
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
    const id = e.detail ? e.detail.id : (e.currentTarget.dataset.id || '')
    const allItems = this._getAllItems()
    const item = allItems.find(i => String(i.id) === String(id))
    const phone = item ? item.phone : ''
    if (!phone) {
      wx.showToast({ title: '暂无电话号码', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: phone, fail() {} })
  },

  onChat(e) {
    const id = e.detail ? e.detail.id : (e.currentTarget.dataset.id || '')
    const allItems = this._getAllItems()
    const item = allItems.find(i => String(i.id) === String(id))
    const targetUserId = item && (item.userId || (item.user && item.user.id))

    if (!targetUserId) {
      wx.showToast({ title: '暂不支持该条信息直接聊天', icon: 'none' })
      return
    }

    post('/conversations/with-user/' + targetUserId).then(res => {
      const conversationId = res.data && res.data.id
      if (!conversationId) {
        wx.showToast({ title: '创建会话失败', icon: 'none' })
        return
      }
      wx.navigateTo({ url: '/pages/chat/chat?id=' + conversationId })
    }).catch(() => {})
  },

  onReport(e) {
    const id = e.detail ? e.detail.id : (e.currentTarget.dataset.id || '')
    wx.navigateTo({ url: '/pages/report/report?id=' + id })
  },

  onShare(e) {
    const id = (e.detail && e.detail.id) || (e.currentTarget.dataset && e.currentTarget.dataset.id) || ''
    this._lastSharePayload = this._buildSharePayloadById(id)
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] })
  },

  onShareAppMessage(res) {
    const id = (res && res.target && res.target.dataset && res.target.dataset.id) || ''
    const type = (res && res.target && res.target.dataset && res.target.dataset.type) || ''
    const payload = this._buildSharePayloadById(id, type)
    return payload && payload.path ? payload : (this._lastSharePayload || {
      title: '小灵通供需平台',
      path: getApp().getSharePath('/pages/index/index')
    })
  },

  onShareTimeline() {
    const payload = this._lastSharePayload || {
      title: '小灵通供需平台',
      path: '/pages/index/index'
    }
    const query = payload.path.includes('?') ? payload.path.split('?')[1] : ''
    const result = { title: payload.title || '小灵通供需平台', query }
    if (payload.imageUrl) result.imageUrl = payload.imageUrl
    return result
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
  },

  onPullDownRefresh() {
    this.loadData()
    setTimeout(() => wx.stopPullDownRefresh(), 800)
  },

  // picker 城市选择
  onCityChange(e) {
    const idx = e.detail.value
    const city = this.data.cities[idx]
    if (!city) return
    this.setData({ cityIndex: idx, currentCity: city.name })
    wx.setStorageSync('currentCity', city.name)
    this.loadData()
  },

  onFilterTap(e) {
    const type = e.currentTarget.dataset.type
    const actions = []

    if (type === 'jobType') {
      // 从后台配置获取工种列表
      if (this.data.jobTypes.length === 0) {
        wx.showToast({ title: '暂无可选工种', icon: 'none' })
        return
      }
      actions.push('全部', ...this.data.jobTypes.map(jt => jt.name))
    } else if (type === 'salaryType') {
      actions.push('全部', '按小时', '按件')
    } else if (type === 'distance') {
      actions.push('全部', '1km内', '3km内', '5km内', '10km内')
    } else if (type === 'salary') {
      actions.push('全部', '20元以下', '20-30元', '30-50元', '50元以上')
    }

    wx.showActionSheet({
      itemList: actions,
      success: (res) => {
        const selected = actions[res.tapIndex]
        if (type === 'jobType') {
          this.setData({ filterJobType: selected === '全部' ? '' : selected })
        } else if (type === 'salaryType') {
          this.setData({ filterSalaryType: selected === '全部' ? '' : selected })
        } else if (type === 'distance') {
          this.setData({ filterDistance: selected === '全部' ? '' : selected })
        } else if (type === 'salary') {
          this.setData({ filterSalaryRange: selected === '全部' ? '' : selected })
        }
        this.loadWorkerJobs()
      }
    })
  }
})
