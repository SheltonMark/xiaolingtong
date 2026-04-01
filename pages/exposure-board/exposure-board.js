const { get } = require('../../utils/request')
const { normalizeImageList } = require('../../utils/image')
const auth = require('../../utils/auth')
const {
  DEFAULT_EXPOSURE_CATEGORIES,
  getExposureSettings
} = require('../../utils/exposure-settings')

function buildTabs(categories) {
  return [{ key: '', label: '全部', avatarText: '全' }].concat(categories || [])
}

function buildCategoryLabelMap(tabs) {
  const map = new Map()
  ;(tabs || []).forEach((tab) => {
    if (!tab || !tab.key) return
    const label = String(tab.label || '').trim()
    if (label) map.set(tab.key, label)
  })
  return map
}

function resolveAvatarText(item, categoryLabelMap) {
  const categoryKey = String((item && item.category) || '').trim()
  const labelFromTabs = categoryKey ? categoryLabelMap.get(categoryKey) : ''
  const labelFromApi = String((item && item.type) || '').trim()
  const label = labelFromTabs || labelFromApi
  return (label && label[0]) || (item && item.avatarText) || '风'
}

function resolvePublisherName(item) {
  const name = String((item && item.publisherName) || '').trim()
  return name || '已认证用户'
}

Page({
  data: {
    statusBarHeight: 0,
    menuHeight: 0,
    currentTab: 0,
    tabs: buildTabs(DEFAULT_EXPOSURE_CATEGORIES),
    list: [],
    refreshing: false,
    loading: true
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    const menuBtn = wx.getMenuButtonBoundingClientRect()
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight,
      menuHeight: menuBtn.height
    })
    this.loadSettingsAndList()
  },

  loadSettingsAndList() {
    this.setData({ loading: true })
    getExposureSettings()
      .then(({ categories }) => {
        this.setData({
          tabs: buildTabs(categories)
        })
      })
      .finally(() => {
        this.loadList()
      })
  },

  getCurrentCategory() {
    const tabs = this.data.tabs || []
    const current = tabs[this.data.currentTab] || {}
    return current.key || ''
  },

  onTabChange(e) {
    this.setData({
      currentTab: Number(e.currentTarget.dataset.index),
      loading: true
    })
    this.loadList()
  },

  loadList() {
    const category = this.getCurrentCategory()
    const query = category ? { category } : undefined

    get('/exposures', query).then((res) => {
      const payload = res.data || res || {}
      const list = Array.isArray(payload) ? payload : (payload.list || [])

      this.setData({
        list: list.map((item) => ({
          ...item,
          publisherName: resolvePublisherName(item),
          avatarText: resolveAvatarText(item, buildCategoryLabelMap(this.data.tabs)),
          images: normalizeImageList(item.images)
        })),
        refreshing: false,
        loading: false
      })
    }).catch(() => {
      this.setData({
        refreshing: false,
        loading: false
      })
    })
  },

  onRefresh() {
    this.setData({ refreshing: true })
    this.loadList()
  },

  onTapCard(e) {
    wx.navigateTo({ url: '/pages/exposure-detail/exposure-detail?id=' + e.currentTarget.dataset.id })
  },

  onPublishExposure() {
    if (!auth.isLoggedIn()) {
      auth.goLogin()
      return
    }
    wx.navigateTo({ url: '/pages/exposure/exposure' })
  },

  onPreviewImage(e) {
    wx.previewImage({
      current: e.currentTarget.dataset.current,
      urls: e.currentTarget.dataset.urls
    })
  },

  onShow() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null
    if (tabBar) {
      const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
      tabBar.setData({ selected: 1, userRole })
      if (typeof tabBar.loadUnread === 'function') {
        tabBar.loadUnread()
      }
    }
  },

  onShareAppMessage(res) {
    const id = res.target && res.target.dataset && res.target.dataset.id
    const type = res.target && res.target.dataset && res.target.dataset.type

    if (id) {
      return {
        title: (type || '维权经验') + ' - 小灵通维权吧',
        path: getApp().getSharePath('/pages/exposure-detail/exposure-detail?id=' + id)
      }
    }

    return {
      title: '小灵通维权吧',
      path: getApp().getSharePath('/pages/exposure-board/exposure-board')
    }
  }
})
