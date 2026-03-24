const { get } = require('../../utils/request')
const { normalizeImageList } = require('../../utils/image')
const auth = require('../../utils/auth')

Page({
  data: {
    statusBarHeight: 0,
    menuHeight: 0,
    currentTab: 0,
    tabs: ['全部', '虚假信息', '欺诈行为', '欠薪欠款'],
    list: [],
    refreshing: false
  },
  onTabChange(e) { this.setData({ currentTab: Number(e.currentTarget.dataset.index) }) },
  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    const menuBtn = wx.getMenuButtonBoundingClientRect()
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight,
      menuHeight: menuBtn.height
    })
    this.loadList()
  },
  loadList() {
    get('/exposures').then(res => {
      this.setData({ list: (res.data.list || res.data || []).map(item => ({
        ...item,
        images: normalizeImageList(item.images)
      })), refreshing: false })
    }).catch(() => {
      this.setData({ refreshing: false })
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
    if (!auth.isLoggedIn()) { auth.goLogin(); return }
    wx.navigateTo({ url: '/pages/exposure/exposure' })
  },
  onPreviewImage(e) {
    wx.previewImage({ current: e.currentTarget.dataset.current, urls: e.currentTarget.dataset.urls })
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
      this.getTabBar().setData({ selected: 1, userRole })
    }
  },
  onShareAppMessage(res) {
    const id = res.target && res.target.dataset && res.target.dataset.id
    const company = res.target && res.target.dataset && res.target.dataset.company
    if (id) {
      return {
        title: (company || '诚信风险信息') + ' - 小灵通诚信榜',
        path: getApp().getSharePath('/pages/exposure-detail/exposure-detail?id=' + id)
      }
    }
    return { title: '小灵通诚信榜', path: getApp().getSharePath('/pages/exposure-board/exposure-board') }
  }
})
