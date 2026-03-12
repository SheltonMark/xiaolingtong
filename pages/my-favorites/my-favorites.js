const { get, post } = require('../../utils/request')

Page({
  data: {
    currentTab: 0,
    tabs: ['全部', '供需', '招工', '曝光'],
    allFavorites: [],
    displayList: []
  },

  onLoad() {
    this.loadFavorites()
  },

  onShow() {
    this.loadFavorites()
  },

  loadFavorites() {
    wx.showLoading({ title: '加载中...' })
    get('/favorites').then(res => {
      const list = res.data.list || res.data || []
      this.setData({ allFavorites: list })
      this.filterByTab()
      wx.hideLoading()
    }).catch(() => {
      wx.hideLoading()
    })
  },

  onTabChange(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ currentTab: index })
    this.filterByTab()
  },

  filterByTab() {
    const { currentTab, allFavorites } = this.data
    let displayList = []

    if (currentTab === 0) {
      // 全部
      displayList = allFavorites
    } else if (currentTab === 1) {
      // 供需
      displayList = allFavorites.filter(item => item.targetType === 'post')
    } else if (currentTab === 2) {
      // 招工
      displayList = allFavorites.filter(item => item.targetType === 'job')
    } else if (currentTab === 3) {
      // 曝光
      displayList = allFavorites.filter(item => item.targetType === 'exposure')
    }

    this.setData({ displayList })
  },

  onViewFavorite(e) {
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

  onCancelFavorite(e) {
    const { id, type } = e.currentTarget.dataset
    wx.showModal({
      title: '取消收藏',
      content: '确定要取消收藏这条信息吗？',
      confirmColor: '#F43F5E',
      success: (res) => {
        if (!res.confirm) return
        post('/favorites/toggle', { targetType: type, targetId: id }).then(() => {
          wx.showToast({ title: '已取消收藏', icon: 'success' })
          this.loadFavorites()
        }).catch(() => {})
      }
    })
  },

  onPullDownRefresh() {
    this.loadFavorites()
    setTimeout(() => wx.stopPullDownRefresh(), 800)
  }
})
