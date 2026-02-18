Page({
  data: {
    keyword: '',
    categoryIndex: -1,
    categories: ['全部', '日用百货', '电子数码', '服装鞋帽', '五金工具', '厨房卫浴', '母婴玩具'],
    cityIndex: -1,
    cities: ['全部', '东莞', '深圳', '广州', '佛山', '中山'],
    sortIndex: 0,
    sorts: ['最新发布', '距离最近', '价格最低']
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearch() {
    wx.showToast({ title: '搜索: ' + this.data.keyword, icon: 'none' })
  },

  onCategoryTap(e) {
    this.setData({ categoryIndex: e.currentTarget.dataset.index })
  },

  onCityTap(e) {
    this.setData({ cityIndex: e.currentTarget.dataset.index })
  },

  onSortTap(e) {
    this.setData({ sortIndex: e.currentTarget.dataset.index })
  },

  onReset() {
    this.setData({ keyword: '', categoryIndex: -1, cityIndex: -1, sortIndex: 0 })
  },

  onConfirm() {
    wx.navigateBack()
  }
})
