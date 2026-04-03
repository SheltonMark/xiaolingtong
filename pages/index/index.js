const { get, post } = require('../../utils/request')
const { normalizeImageUrl, normalizeImageList } = require('../../utils/image')
const auth = require('../../utils/auth')
const { calculateDistanceForList, getUserLocation, filterByDistance } = require('../../utils/distance')
const { countSystemUnread } = require('../../utils/system-messages')
const DISTANCE_DEBUG = false

function normalizeBenefitItems(value) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (!item) return null
      if (typeof item === 'string') return { label: item, color: 'green' }
      if (item.label) return Object.assign({}, item, { color: item.color || 'green' })
      return null
    }).filter(Boolean)
  }
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return []
    try {
      return normalizeBenefitItems(JSON.parse(text))
    } catch (err) {
      return text.split(/[,\n，|]/).map((item) => item.trim()).filter(Boolean).map((label) => ({ label, color: 'green' }))
    }
  }
  return []
}

function normalizeBenefitTags(value) {
  return normalizeBenefitItems(value).map((item) => ({
    label: item.label,
    bg: '#ECFDF5',
    color: '#10B981'
  }))
}

function hasBenefitValue(value) {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'string') return !!value.trim()
  return !!value
}

function pickBenefitValue(primary, fallback) {
  return hasBenefitValue(primary) ? primary : fallback
}

function normalizeDisplayName(value) {
  return String(value || '').trim()
}

function isGenericEnterpriseName(value) {
  const text = normalizeDisplayName(value)
  if (!text) return true
  return text === '企业' || text === '企业用户' || /^用户\d+$/.test(text)
}

function resolveEnterpriseName(item) {
  const source = item || {}
  const user = source.user || {}
  const cert =
    source.enterpriseCert ||
    source.enterpriseCertification ||
    source.certification ||
    source.cert ||
    user.enterpriseCert ||
    user.enterpriseCertification ||
    user.certification ||
    user.cert ||
    {}

  const candidates = [
    source.companyName,
    source.publisherName,
    source.company,
    cert.companyName,
    user.companyName,
    user.realName,
    user.name,
    user.certName,
    user.nickname
  ]
    .map(normalizeDisplayName)
    .filter(Boolean)

  const preferred = candidates.find((name) => !isGenericEnterpriseName(name))
  return preferred || candidates[0] || '企业用户'
}

function getProcessModeLabel(item) {
  const direct = String((item && item.processModeLabel) || '').trim()
  if (direct) return direct
  const processMode = String(
    (item && item.processMode)
    || (item && item.fields && item.fields.processMode)
    || ''
  ).trim().toLowerCase()
  if (processMode === 'seeking') return '找代加工'
  if (processMode === 'offering') return '承接加工'
  return ''
}

function normalizeProcessContent(item) {
  const content = String((item && item.content) || '').trim()
  const modeLabel = getProcessModeLabel(item)
  if (!content || !modeLabel) return content
  const duplicatedPrefix = `承接${modeLabel}`
  return content.startsWith(duplicatedPrefix)
    ? `${modeLabel}${content.slice(duplicatedPrefix.length)}`
    : content
}

function getDefaultEnterpriseBanners() {
  return [
    {
      id: 'default-1',
      kind: 'default',
      title: '\u65b0\u7528\u6237\u4e13\u4eab',
      sub: '\u6ce8\u518c\u9001 50 \u7075\u8c46',
      bg: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)'
    },
    {
      id: 'default-2',
      kind: 'default',
      title: '\u4f1a\u5458\u7279\u6743',
      sub: '\u6bcf\u65e5\u514d\u8d39\u67e5\u770b\u8054\u7cfb\u65b9\u5f0f',
      bg: 'linear-gradient(135deg, #F97316 0%, #F59E0B 100%)'
    },
    {
      id: 'default-3',
      kind: 'default',
      title: '\u53d1\u5e03\u62db\u5de5',
      sub: '\u5feb\u901f\u627e\u5230\u9760\u8c31\u4e34\u5de5',
      bg: 'linear-gradient(135deg, #10B981 0%, #0EA5E9 100%)'
    }
  ]
}

const CATEGORY_FILTER_ICON_PRESETS = [
  { icon: '\ue625', bg: '#FFF7ED', iconColor: '#F97316' },
  { icon: '\ue605', bg: '#E0F2FE', iconColor: '#3B82F6' },
  { icon: '\ue8c7', bg: '#FCE7F3', iconColor: '#EC4899' },
  { icon: '\ue659', bg: '#EFF6FF', iconColor: '#6366F1' },
  { icon: '\ue832', bg: '#ECFDF5', iconColor: '#10B981' },
  { icon: '\ue626', bg: '#FFF1F2', iconColor: '#F43F5E' }
]

const JOB_FILTER_ICON_PRESETS = [
  { icon: '\ue687', bg: '#E0F2FE', iconColor: '#3B82F6' },
  { icon: '\ue670', bg: '#FFFBEB', iconColor: '#F59E0B' },
  { icon: '\ue617', bg: '#FCE7F3', iconColor: '#EC4899' },
  { icon: '\ue610', bg: '#ECFDF5', iconColor: '#10B981' },
  { icon: '\ue786', bg: '#F3E8FF', iconColor: '#8B5CF6' }
]

function buildIconFilters(items, presets) {
  return (items || []).filter(Boolean).map((item, index) => {
    const label = typeof item === 'string' ? item : item.name
    const iconUrl = typeof item === 'string' ? '' : (item.iconUrl || '')
    const preset = presets[index % presets.length]
    return {
      icon: iconUrl ? '' : preset.icon,
      iconUrl,
      label,
      bg: preset.bg,
      iconColor: preset.iconColor,
      active: false
    }
  })
}

Page({
  data: {
    userRole: 'enterprise', // enterprise | worker
    statusBarHeight: 0,
    currentCity: '东莞', // 当前选择的城市
    unreadCount: 0, // 未读消息总数
    cityIndex: 0, // picker 当前索引
    cityNames: [], // picker 用的城市名数组
    cities: [], // 可选城市列表
    jobTypes: [], // 可选工种列表
    searchKeyword: '', // 搜索关键词
    banners: [
      { id: 1, title: '新用户专享', sub: '注册送 50 灵豆', bg: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)' },
      { id: 2, title: '会员特权', sub: '每日免费查看联系方式', bg: 'linear-gradient(135deg, #F97316 0%, #F59E0B 100%)' },
      { id: 3, title: '发布招工', sub: '快速找到靠谱临工', bg: 'linear-gradient(135deg, #10B981 0%, #0EA5E9 100%)' }
    ],
    // 企业端
    currentTab: 0,
    tabs: ['采购需求', '工厂库存', '代加工', '招工'],
    jobViewMode: 'mine',
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
    // picker 选项
    jobTypeOptions: ['全部'],
    salaryTypeOptions: ['全部', '按小时', '按件'],
    distanceOptions: ['全部', '1km内', '3km内', '5km内', '10km内', '10km以上'],
    salaryOptions: ['全部', '20元以下', '20-30元', '30-50元', '50元以上'],
    jobTypeIndex: 0,
    salaryTypeIndex: 0,
    distanceIndex: 0,
    salaryIndex: 0,
    sortBy: 'default',
    // 用户位置
    userLocation: null, // {latitude, longitude}
    // 代加工筛选状态
    processFilterMode: '',
    processFilterModeLabel: '',
    processModeFilterOptions: ['全部', '承接加工', '找代加工'],
    processFilterCategory: '',
    processFilterDistance: '',
    processDistanceOptions: ['不限', '3km内', '5km内', '10km内'],
    processCategoryOptions: [],
    wechatCardVisible: false,
    wechatCard: {
      wechatId: '',
      wechatQrImage: ''
    }
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
    // 首次打开：检查协议和角色
    if (!wx.getStorageSync('policyHandled')) {
      wx.redirectTo({ url: '/pages/agreement-confirm/agreement-confirm' })
      return
    }
    if (!wx.getStorageSync('userRole')) {
      wx.redirectTo({ url: '/pages/identity/identity' })
      return
    }

    const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    const currentCity = wx.getStorageSync('currentCity') || '东莞'
    this.setData({ userRole, currentCity })
    this.loadCities()
    this.loadCategoryFilters()
    this.loadJobTypes()
    if (userRole === 'worker') {
      this.autoLocateAndLoadWorkerJobs()
    } else {
      const app = getApp()
      const ui = app.globalData.userInfo || {}
      this.setData({
        myAvatarUrl: ui.avatarUrl || app.globalData.avatarUrl || wx.getStorageSync('avatarUrl') || '',
        myName: ui.nickname || ui.name || wx.getStorageSync('nickname') || ''
      })
      this.loadHomeBanners()
      this.loadData()
    }
    this.loadUnreadCount()
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null
    if (tabBar) {
      tabBar.setData({ selected: 0, userRole })
      if (typeof tabBar.loadUnread === 'function') {
        tabBar.loadUnread()
      }
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

  loadCategoryFilters() {
    const loadByBiz = (bizType) => get('/config/categories', { bizType }).then(res => {
      const payload = res.data || res || {}
      return (payload.list || []).filter(item => item && item.name)
    }).catch(() => [])

    Promise.all([loadByBiz('purchase'), loadByBiz('stock'), loadByBiz('process')]).then(([pItems, sItems, prItems]) => {
      const updates = {}
      if (pItems.length) updates.catePurchase = buildIconFilters(pItems, CATEGORY_FILTER_ICON_PRESETS)
      if (sItems.length) {
        updates.cateStock = buildIconFilters(sItems, CATEGORY_FILTER_ICON_PRESETS)
        updates.stockCategoryOptions = sItems.map(i => i.name)
      }
      if (prItems.length) {
        updates.cateProcess = buildIconFilters(prItems, CATEGORY_FILTER_ICON_PRESETS)
        updates.processCategoryOptions = prItems.map(i => i.name)
      }
      if (Object.keys(updates).length) this.setData(updates)
    })
  },

  loadJobTypes() {
    get('/config/job-types').then(res => {
      const jobTypes = res.data.list || []
      const jobTypeOptions = ['全部', ...jobTypes.map(jt => jt.name)]
      this.setData({
        jobTypes,
        jobTypeOptions,
        cateJob: buildIconFilters(jobTypes.map((jt) => jt.name), JOB_FILTER_ICON_PRESETS)
      })
    }).catch(() => {})
  },

  loadHomeBanners() {
    get('/ads/home-banners').then(res => {
      const list = (res.data && res.data.list) || []
      if (Array.isArray(list) && list.length > 0) {
        this.setData({ banners: list })
      } else {
        this.setData({ banners: getDefaultEnterpriseBanners() })
      }
      // 无广告时保持默认 banners
    }).catch(() => {})
  },

  onAdBannerTap(e) {
    const { link, linkType } = e.currentTarget.dataset
    if (!link) return
    if (linkType === 'external') {
      wx.navigateTo({ url: '/pages/webview/webview?url=' + encodeURIComponent(link) })
    } else {
      wx.navigateTo({ url: link })
    }
  },

  loadData() {
    if (this.data.userRole === 'enterprise') {
      this._autoLocateEnterprise()
      this.loadDataByCategory()
    } else {
      this.autoLocateAndLoadWorkerJobs()
    }
  },

  _autoLocateEnterprise() {
    if (this.data.userLocation || this._enterpriseLocating) return
    this._enterpriseLocating = true
    getUserLocation().then(location => {
      this._enterpriseLocating = false
      this.setData({ userLocation: location }, () => {
        this.loadDataByCategory()
      })
    }).catch(() => {
      this._enterpriseLocating = false
    })
  },

  autoLocateAndLoadWorkerJobs() {
    if (this.data.userLocation) {
      this.loadWorkerJobs()
      return
    }

    if (this._autoLocating) {
      return
    }

    if (this._autoLocationDenied) {
      this.loadWorkerJobs()
      return
    }

    this._autoLocating = true
    wx.showLoading({ title: '获取位置中...' })
    getUserLocation().then((location) => {
      wx.hideLoading()
      this._autoLocating = false
      this._autoLocationDenied = false
      if (DISTANCE_DEBUG) {
        console.log('[distance-debug][index] auto user location success', location)
      }
      this.setData({ userLocation: location }, () => {
        this.loadWorkerJobs()
      })
    }).catch((error) => {
      wx.hideLoading()
      this._autoLocating = false
      if (DISTANCE_DEBUG) {
        console.warn('[distance-debug][index] auto user location failed', error)
      }
      const errMsg = String((error && error.errMsg) || '')
      const denied = errMsg.includes('auth deny') || errMsg.includes('auth denied') || errMsg.includes('scope.userLocation')
      if (denied) {
        this._autoLocationDenied = true
      }
      this.loadWorkerJobs()
    })
  },

  showLocationPermissionModal() {
    wx.showModal({
      title: '需要位置权限',
      content: '按距离筛选和距离展示需要获取您的位置信息，请在设置中开启位置权限',
      confirmText: '去设置',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting()
        }
      }
    })
  },

  loadWorkerJobs() {
    const params = {}
    if (this.data.filterJobType) params.jobType = this.data.filterJobType
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
      list = this._mapJobs(list)
      if (DISTANCE_DEBUG) {
        const sample = list.slice(0, 3).map(item => ({
          id: item.id,
          title: item.title,
          lat: item.lat,
          lng: item.lng,
          location: item.location
        }))
        console.log('[distance-debug][index] jobs loaded', {
          total: list.length,
          hasUserLocation: !!this.data.userLocation,
          filterDistance: this.data.filterDistance,
          sample
        })
      }

      // 如果有用户位置，计算距离
      if (this.data.userLocation) {
        calculateDistanceForList(this.data.userLocation, list).then(listWithDistance => {
          if (DISTANCE_DEBUG) {
            const withDistance = listWithDistance.filter(item => !!item.distanceText).length
            const sample = listWithDistance.slice(0, 3).map(item => ({
              id: item.id,
              distance: item.distance,
              distanceText: item.distanceText
            }))
            console.log('[distance-debug][index] distances calculated', {
              total: listWithDistance.length,
              withDistance,
              sample
            })
          }
          // 按距离筛选
          if (this.data.filterDistance) {
            listWithDistance = filterByDistance(listWithDistance, this.data.filterDistance)
            if (DISTANCE_DEBUG) {
              console.log('[distance-debug][index] after filterByDistance', {
                filterDistance: this.data.filterDistance,
                remaining: listWithDistance.length
              })
            }
          }
          // 排序
          if (this.data.sortBy === 'salary_desc') {
            listWithDistance = listWithDistance.sort((a, b) => b.salary - a.salary)
          } else if (this.data.sortBy === 'salary_asc') {
            listWithDistance = listWithDistance.sort((a, b) => a.salary - b.salary)
          } else if (this.data.sortBy === 'distance' && this.data.userLocation) {
            listWithDistance = listWithDistance.sort((a, b) => {
              if (a.distance === null) return 1
              if (b.distance === null) return -1
              return a.distance - b.distance
            })
          }
          this.setData({ jobList: listWithDistance })
        }).catch((error) => {
          if (DISTANCE_DEBUG) {
            console.warn('[distance-debug][index] calculateDistanceForList failed', error)
          }
          this.setData({ jobList: list })
        })
      } else {
        // 没有位置信息，直接排序
        if (this.data.sortBy === 'salary_desc') {
          list = list.sort((a, b) => b.salary - a.salary)
        } else if (this.data.sortBy === 'salary_asc') {
          list = list.sort((a, b) => a.salary - b.salary)
        }
        this.setData({ jobList: list })
      }
    }).catch(() => {})
  },

  _mapPosts(list) {
    return (Array.isArray(list) ? list : []).map(item => {
      const companyName = resolveEnterpriseName(item)
      const user = item.user || {}
      return {
        ...item,
        companyName,
        companyMeta: item.industry || '',
        processModeLabel: getProcessModeLabel(item),
        content: item.type === 'process' ? normalizeProcessContent(item) : item.content,
        avatarUrl: normalizeImageUrl((user.avatarUrl) || ''),
        images: normalizeImageList(item.images),
        avatarText: companyName ? companyName[0] : '企',
        time: item.createdAt ? item.createdAt.substring(0, 10) : '',
        contactWechat: item.contactWechat || item.wechat || '',
        contactWechatQr: item.contactWechatQr || item.wechatQrImage || '',
        contactPhone: item.contactPhone || item.phone || '',
        wechat: item.contactWechat || item.wechat || '',
        phone: item.contactPhone || item.phone || '',
        isMember: !!(user.isMember),
        address: item.address || item.location || '',
        lat: item.lat || null,
        lng: item.lng || null,
        distanceText: item.distanceText || ''
      }
    })
  },

  _mapJobs(list) {
    return (Array.isArray(list) ? list : []).map((item) => {
      const user = item.user || {}
      const companyName = resolveEnterpriseName(item)
      const benefitSource = pickBenefitValue(item.benefits, item.tags)
      const benefitTags = normalizeBenefitTags(benefitSource)
      const titleText = item.title || '\u62db\u5de5\u4fe1\u606f'
      const jobTypeText = item.jobType || item.jobTypeName || item.typeName || ''
      const need = item.need || item.needCount || 0
      const applied = item.applied || item.appliedCount || 0
      const allTags = Array.isArray(item.allTags) && item.allTags.length
        ? item.allTags
        : benefitTags.concat(item.workHours ? [{
            label: item.workHours,
            bg: '#EFF6FF',
            color: '#3B82F6'
          }] : [])
      return {
        ...item,
        need,
        applied,
        companyName,
        avatarUrl: normalizeImageUrl(item.avatarUrl || user.avatarUrl || ''),
        tags: benefitTags,
        benefits: normalizeBenefitItems(benefitSource),
        allTags,
        jobTypeText,
        jobCardTitle: jobTypeText
          ? (titleText === jobTypeText ? `\u9700\u8981${jobTypeText}${String(need)}\u4eba` : `${titleText} \u00b7 \u9700\u8981${jobTypeText}${String(need)}\u4eba`)
          : `${titleText} \u00b7 \u9700\u8981${String(need)}\u4eba`
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
      if (currentTab === 3) {
        params.jobType = selectedCategory
      } else {
        params.industry = selectedCategory
      }
    }

    // 根据当前tab加载对应数据
    if (this.data.userRole === 'enterprise') {
      if (currentTab === 0) {
        get('/posts', { type: 'purchase', ...params }).then(res => {
          this.setData({ purchaseList: this._mapPosts(res.data.list || res.data || []) })
        }).catch(() => {})
      } else if (currentTab === 1) {
        get('/posts', { type: 'stock', ...params }).then(res => {
          const list = this._mapPosts(res.data.list || res.data || [])
          this.setData({ stockList: list })
          if (this.data.userLocation) {
            calculateDistanceForList(this.data.userLocation, list).then(ld => {
              this.setData({ stockList: ld })
            }).catch(() => {})
          }
        }).catch(() => {})
      } else if (currentTab === 2) {
        this.loadProcessList(params)
      } else if (currentTab === 3) {
        get('/jobs/mine', params).then(res => {
          this.setData({ jobListEnterprise: this._mapJobs(res.data.list || res.data || []) })
        }).catch(() => {})
      }
    } else {
      // 临工端
      get('/jobs', params).then(res => {
        this.setData({ jobList: this._mapJobs(res.data.list || res.data || []) })
      }).catch(() => {})
    }
  },

  loadProcessList(extraParams) {
    const params = { type: 'process', ...(extraParams || {}) }
    if (this.data.processFilterMode) {
      params.processMode = this.data.processFilterMode
    }
    if (this.data.processFilterCategory) {
      params.industry = this.data.processFilterCategory
    }
    get('/posts', params).then(res => {
      let list = this._mapPosts(res.data.list || res.data || [])
      if (this.data.userLocation) {
        calculateDistanceForList(this.data.userLocation, list).then(listWithDistance => {
          if (this.data.processFilterDistance) {
            listWithDistance = filterByDistance(listWithDistance, this.data.processFilterDistance)
          }
          listWithDistance.sort((a, b) => {
            if (a.distance === null) return 1
            if (b.distance === null) return -1
            return a.distance - b.distance
          })
          this.setData({ processList: listWithDistance })
        }).catch(() => {
          this.setData({ processList: list })
        })
      } else {
        this.setData({ processList: list })
      }
    }).catch(() => {})
  },

  onJobManageCard(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/job-process/job-process?jobId=' + id + '&tab=applications' })
  },

  onJobSettleCard(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/job-process/job-process?jobId=' + id + '&tab=settlement' })
  },

  onSearch() {
    // 已移除，搜索框改为直接输入
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  onSearchConfirm(e) {
    const keyword = (e.detail.value || '').trim()
    this.setData({ searchKeyword: keyword })
    // 根据用户角色搜索不同内容
    if (this.data.userRole === 'worker') {
      this.loadJobList()
    } else {
      this.loadPostList()
    }
  },

  loadJobList() {
    const params = {}
    if (this.data.searchKeyword) {
      params.keyword = this.data.searchKeyword
    }
    get('/jobs', params).then(res => {
      const list = res.data.list || res.data || []
      if (this.data.userRole === 'worker') {
        this.setData({ jobList: this._mapJobs(list) })
      } else {
        this.setData({ jobListEnterprise: this._mapJobs(list) })
      }
    }).catch(() => {
      wx.showToast({ title: '搜索失败', icon: 'none' })
    })
  },

  loadPostList() {
    const params = {}
    if (this.data.searchKeyword) {
      params.keyword = this.data.searchKeyword
    }
    // 根据当前tab加载对应类型的帖子
    const currentTab = this.data.currentTab
    if (currentTab === 0) {
      params.type = 'purchase'
      get('/posts', params).then(res => {
        this.setData({ purchaseList: this._mapPosts(res.data.list || res.data || []) })
      }).catch(() => {
        wx.showToast({ title: '搜索失败', icon: 'none' })
      })
    } else if (currentTab === 1) {
      params.type = 'stock'
      get('/posts', params).then(res => {
        const list = this._mapPosts(res.data.list || res.data || [])
        this.setData({ stockList: list })
        if (this.data.userLocation) {
          calculateDistanceForList(this.data.userLocation, list).then(ld => this.setData({ stockList: ld })).catch(() => {})
        }
      }).catch(() => {
        wx.showToast({ title: '搜索失败', icon: 'none' })
      })
    } else if (currentTab === 2) {
      params.type = 'process'
      get('/posts', params).then(res => {
        this.setData({ processList: this._mapPosts(res.data.list || res.data || []) })
      }).catch(() => {
        wx.showToast({ title: '搜索失败', icon: 'none' })
      })
    } else if (currentTab === 3) {
      // 招工信息
      this.loadJobList()
    }
  },

  onNotification() {
    wx.switchTab({ url: '/pages/messages/messages' })
  },

  loadUnreadCount() {
    if (!auth.getToken()) return
    const userRole = this.data.userRole || getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    const conversationTask = get('/conversations').catch(() => ({ data: [] }))

    if (userRole === 'worker') {
      Promise.all([
        get('/notifications', { page: 1, pageSize: 1000 }).catch(() => ({ data: { list: [] } })),
        get('/wallet/transactions', { page: 1, pageSize: 1000 }).catch(() => ({ data: { list: [] } })),
        conversationTask
      ]).then(([notificationRes, walletRes, chatRes]) => {
        const notifications = notificationRes.data.list || notificationRes.data || []
        const systemUnread = countSystemUnread({
          userRole,
          notifications: Array.isArray(notifications) ? notifications : [],
          transactions: walletRes.data,
          userId: this.getCurrentUserId()
        })
        const chatList = (chatRes.data || chatRes)
        const chatCount = Array.isArray(chatList)
          ? chatList.reduce((sum, c) => sum + Number(c.unreadCount || 0), 0)
          : (chatList.list || []).reduce((sum, c) => sum + Number(c.unreadCount || 0), 0)
        this.setData({ unreadCount: systemUnread + chatCount })
      })
      return
    }

    Promise.all([
      get('/notifications/unread-count').catch(() => ({ data: { count: 0 } })),
      conversationTask
    ]).then(([notiRes, chatRes]) => {
      const notiCount = (notiRes.data || notiRes).count || 0
      const chatList = (chatRes.data || chatRes)
      const chatCount = Array.isArray(chatList)
        ? chatList.reduce((sum, c) => sum + Number(c.unreadCount || 0), 0)
        : (chatList.list || []).reduce((sum, c) => sum + Number(c.unreadCount || 0), 0)
      this.setData({ unreadCount: notiCount + chatCount })
    })
  },

  onCardTap(e) {
    const { id } = e.detail
    wx.navigateTo({ url: '/pages/post-detail/post-detail?id=' + id })
  },

  onJobTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/job-detail/job-detail?id=' + id })
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

  getPostOwnerId(item) {
    if (!item) return 0
    return Number(item.userId || (item.user && item.user.id) || 0)
  },

  isOwnerPost(item) {
    const currentUserId = this.getCurrentUserId()
    const ownerId = this.getPostOwnerId(item)
    return !!(currentUserId && ownerId && currentUserId === ownerId)
  },

  isPostUnlocked(item) {
    return this.isOwnerPost(item) || !!(item && item.contactUnlocked)
  },

  getPostItemById(id) {
    const allItems = this._getAllItems()
    return allItems.find(i => String(i.id) === String(id))
  },

  openWechatCard(item) {
    const wechatId = item.contactWechat || item.wechat || ''
    const wechatQrImage = item.contactWechatQr || item.wechatQrImage || ''
    if (!wechatId && !wechatQrImage) {
      wx.showToast({ title: '发布者未留微信信息', icon: 'none' })
      return
    }
    this.setData({
      wechatCardVisible: true,
      wechatCard: { wechatId, wechatQrImage }
    })
  },

  onCloseWechatCard() {
    this.setData({ wechatCardVisible: false })
  },

  onWechat(e) {
    const id = e.detail ? e.detail.id : (e.currentTarget.dataset.id || '')
    const item = this.getPostItemById(id)

    if (!item) {
      wx.showToast({ title: '信息不存在', icon: 'none' })
      return
    }

    if (this.isOwnerPost(item)) {
      wx.showToast({ title: '无需获取自己的微信', icon: 'none' })
      return
    }

    if (this.isPostUnlocked(item)) {
      this.openWechatCard(item)
      return
    }

    this._unlockContact(id, 'wechat')
  },

  onPhone(e) {
    const id = e.detail ? e.detail.id : (e.currentTarget.dataset.id || '')
    const item = this.getPostItemById(id)

    if (!item) {
      wx.showToast({ title: '信息不存在', icon: 'none' })
      return
    }

    if (this.isOwnerPost(item)) {
      wx.showToast({ title: '无需获取自己的电话', icon: 'none' })
      return
    }

    if (this.isPostUnlocked(item)) {
      if (!item.contactPhone) {
        wx.showToast({ title: '发布者未留电话', icon: 'none' })
        return
      }
      wx.makePhoneCall({ phoneNumber: item.contactPhone, fail() {} })
      return
    }

    this._unlockContact(id, 'phone')
  },

  _unlockContact(postId, type) {
    if (!auth.isLoggedIn()) { auth.goLogin(); return }
    const app = getApp()

    // 先获取解锁成本预览
    wx.showLoading({ title: '加载中...' })
    get('/posts/' + postId + '/unlock-preview').then((response) => {
      wx.hideLoading()
      const data = response.data || response

      // 如果已经解锁过了
      if (data.alreadyUnlocked) {
        wx.showToast({ title: '已解锁，无需重复解锁', icon: 'none' })
        return
      }

      const cost = data.cost || 0
      const baseCost = data.baseCost || 10
      const isMember = data.isMember || false
      const isFree = data.isFree || false
      const freeRemaining = data.freeRemaining || 0
      const beanBalance = data.beanBalance || 0
      const sufficient = data.sufficient

      // 会员免费提示
      if (isMember && isFree) {
        wx.showModal({
          title: '会员免费查看',
          content: `会员专享：今日还有 ${freeRemaining} 次免费查看机会，确认使用？`,
          confirmText: '确认',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) this._doUnlockContact(postId, type)
          }
        })
        return
      }

      // 会员折扣提示
      if (isMember && !isFree) {
        wx.showModal({
          title: '会员折扣',
          content: `会员专享5折优惠：需要 ${cost} 灵豆（原价 ${baseCost} 灵豆），当前余额 ${beanBalance} 灵豆，确认解锁？`,
          confirmText: '解锁',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) this._doUnlockContact(postId, type)
          }
        })
        return
      }

      // 非会员检查灵豆
      if (!sufficient) {
        wx.showModal({
          title: '灵豆不足',
          content: `当前灵豆余额为 ${beanBalance}，需要 ${cost} 灵豆才能解锁联系方式。`,
          confirmText: '去充值',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({ url: '/pages/bean-recharge/bean-recharge' })
            }
          }
        })
        return
      }

      // 非会员确认解锁
      wx.showModal({
        title: '解锁联系方式',
        content: `需要耗费 ${cost} 灵豆进行解锁，当前余额 ${beanBalance} 灵豆，确认解锁？`,
        confirmText: '解锁',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) this._doUnlockContact(postId, type)
        }
      })
    }).catch((err) => {
      wx.hideLoading()
      wx.showToast({ title: err.message || '获取解锁信息失败', icon: 'none' })
    })
  },

  _doUnlockContact(postId, type) {
    const app = getApp()
    wx.showLoading({ title: '解锁中...' })
    post('/posts/' + postId + '/unlock').then((response) => {
      wx.hideLoading()
      const data = response.data || response
      if (data.success === false) {
        wx.showToast({ title: data.message || '解锁失败', icon: 'none' })
        return
      }
      // 更新灵豆余额
      if (data.beanBalance !== undefined) {
        app.globalData.beanBalance = data.beanBalance
      }
      const cost = data.cost || 0
      const msg = cost === 0 ? '免费解锁成功' : `解锁成功，已扣 ${cost} 灵豆`
      wx.showToast({ title: msg, icon: 'success' })

      // 重新加载数据
      this.loadData()

      // 根据类型执行相应操作
      setTimeout(() => {
        if (type === 'wechat') {
          this.onWechat({ detail: { id: postId } })
        } else if (type === 'phone') {
          this.onPhone({ detail: { id: postId } })
        } else if (type === 'chat') {
          this.onChat({ detail: { id: postId } })
        }
      }, 1500)
    }).catch((err) => {
      wx.hideLoading()
      wx.showToast({ title: err.message || '解锁失败', icon: 'none' })
    })
  },

  onChat(e) {
    if (!auth.isLoggedIn()) { auth.goLogin(); return }
    const id = e.detail ? e.detail.id : (e.currentTarget.dataset.id || '')
    const item = this.getPostItemById(id)
    const targetUserId = this.getPostOwnerId(item)
    const postId = Number(item && item.id) || 0

    if (!item || !targetUserId) {
      wx.showToast({ title: '暂不支持该条信息直接聊天', icon: 'none' })
      return
    }

    if (this.isOwnerPost(item)) {
      wx.showToast({ title: '不能和自己对话', icon: 'none' })
      return
    }

    if (!this.isPostUnlocked(item)) {
      wx.showModal({
        title: '提示',
        content: '需要先解锁联系方式才能在线聊天',
        confirmText: '去解锁',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) this._unlockContact(id, 'chat')
        }
      })
      return
    }

    post('/conversations/with-user/' + targetUserId, { postId }).then(res => {
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
    wx.navigateTo({ url: '/pages/report/report?id=' + id + '&targetType=post' })
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
    if (!auth.isLoggedIn()) { auth.goLogin(); return }
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/job-detail/job-detail?id=' + id })
  },

  onJobChat(e) {
    if (!auth.isLoggedIn()) { auth.goLogin(); return }
    const id = e.currentTarget.dataset.id
    const item = (this.data.jobList || []).find((job) => String(job.id) === String(id))
    const targetUserId = Number((item && item.user && item.user.id) || item?.userId || item?.enterpriseId || 0)
    const jobId = Number((item && item.id) || 0)

    if (!item || !targetUserId || !jobId) {
      wx.showToast({ title: '暂不支持发起聊天', icon: 'none' })
      return
    }

    if (this.data.userRole === 'worker' && !item.hasApplied) {
      wx.showToast({ title: '请先报名该岗位', icon: 'none' })
      return
    }

    wx.showLoading({ title: '进入聊天中...' })
    post('/conversations/with-user/' + targetUserId, { jobId }).then((res) => {
      const conversationId = res.data && res.data.id
      if (!conversationId) {
        wx.showToast({ title: '创建会话失败', icon: 'none' })
        return
      }
      wx.navigateTo({ url: '/pages/chat/chat?id=' + conversationId })
    }).catch((err) => {
      wx.showToast({ title: (err && err.message) || '创建会话失败', icon: 'none' })
    }).finally(() => {
      wx.hideLoading()
    })
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
    if (newRole === 'worker') {
      this.autoLocateAndLoadWorkerJobs()
    } else {
      this.loadData()
    }
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

  onJobTypeChange(e) {
    const idx = e.detail.value
    const val = this.data.jobTypeOptions[idx]
    this.setData({ jobTypeIndex: idx, filterJobType: val === '全部' ? '' : val })
    this.loadWorkerJobs()
  },
  onSalaryTypeChange(e) {
    const idx = e.detail.value
    const val = this.data.salaryTypeOptions[idx]
    this.setData({ salaryTypeIndex: idx, filterSalaryType: val === '全部' ? '' : val })
    this.loadWorkerJobs()
  },
  onDistanceChange(e) {
    const idx = e.detail.value
    const val = this.data.distanceOptions[idx]
    if (DISTANCE_DEBUG) {
      console.log('[distance-debug][index] onDistanceChange', {
        idx,
        val,
        hasUserLocation: !!this.data.userLocation
      })
    }

    // 如果选择了距离筛选（非"全部"），需要获取用户位置
    if (val !== '全部' && !this.data.userLocation) {
      wx.showLoading({ title: '获取位置中...' })
      getUserLocation().then(location => {
        wx.hideLoading()
        if (DISTANCE_DEBUG) {
          console.log('[distance-debug][index] user location success', location)
        }
        this.setData({
          userLocation: location,
          distanceIndex: idx,
          filterDistance: val
        })
        this.loadWorkerJobs()
      }).catch(error => {
        wx.hideLoading()
        if (DISTANCE_DEBUG) {
          console.warn('[distance-debug][index] user location failed', error)
        }
        this.showLocationPermissionModal()
        // 重置为"全部"
        this.setData({ distanceIndex: 0, filterDistance: '' })
      })
    } else {
      this.setData({ distanceIndex: idx, filterDistance: val === '全部' ? '' : val })
      this.loadWorkerJobs()
    }
  },
  onSalaryChange(e) {
    const idx = e.detail.value
    const val = this.data.salaryOptions[idx]
    this.setData({ salaryIndex: idx, filterSalaryRange: val === '全部' ? '' : val })
    this.loadWorkerJobs()
  },

  onProcessModeFilter(e) {
    const mode = e.currentTarget.dataset.mode || ''
    this.setData({ processFilterMode: mode })
    this.loadProcessList()
  },

  onProcessModeFilterPicker(e) {
    const idx = Number(e.detail.value)
    const modeMap = ['', 'offering', 'seeking']
    const labelMap = ['', '承接加工', '找代加工']
    this.setData({
      processFilterMode: modeMap[idx] || '',
      processFilterModeLabel: labelMap[idx] || ''
    })
    this.loadProcessList()
  },

  onProcessCategoryFilter(e) {
    const idx = Number(e.detail.value)
    const allOptions = ['不限'].concat(this.data.processCategoryOptions)
    const val = allOptions[idx] || ''
    this.setData({ processFilterCategory: val === '不限' ? '' : val })
    this.loadProcessList()
  },

  onProcessDistanceFilter(e) {
    const idx = Number(e.detail.value)
    const val = this.data.processDistanceOptions[idx] || ''
    if (val !== '不限' && !this.data.userLocation) {
      wx.showLoading({ title: '获取位置中...' })
      getUserLocation().then((location) => {
        wx.hideLoading()
        this.setData({
          userLocation: location,
          processFilterDistance: val
        })
        this.loadProcessList()
      }).catch(() => {
        wx.hideLoading()
        this.showLocationPermissionModal()
        this.setData({ processFilterDistance: '' })
      })
    } else {
      this.setData({ processFilterDistance: val === '不限' ? '' : val })
      this.loadProcessList()
    }
  }
})
