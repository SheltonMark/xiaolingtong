const { get } = require('../../utils/request')
const { normalizeImageUrl, normalizeImageList } = require('../../utils/image')

Page({
  data: {
    keyword: '',
    categoryIndex: -1,
    categories: ['全部', '日用百货', '电子数码', '服装鞋帽', '五金工具', '厨房卫浴', '母婴玩具'],
    cityIndex: -1,
    cities: ['全部', '东莞', '深圳', '广州', '佛山', '中山'],
    sortIndex: 0,
    sorts: ['最新发布', '距离最近', '价格最低'],
    searchResults: [],
    isSearching: false,
    postType: 'purchase' // 默认搜索采购需求
  },

  onLoad(options) {
    // 从首页传入的参数
    if (options.type) {
      this.setData({ postType: options.type })
    }
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearch() {
    const { keyword, categoryIndex, postType } = this.data

    if (!keyword.trim()) {
      wx.showToast({ title: '请输入搜索关键词', icon: 'none' })
      return
    }

    this.setData({ isSearching: true })

    const params = {
      type: postType,
      keyword: keyword.trim()
    }

    // 如果选择了分类（非全部），添加 industry 参数
    if (categoryIndex > 0) {
      params.industry = this.data.categories[categoryIndex]
    }

    get('/posts', params).then(res => {
      this.setData({
        searchResults: this._mapPosts(res.data.list || res.data || []),
        isSearching: false
      })
      if ((res.data.list || res.data || []).length === 0) {
        wx.showToast({ title: '未找到相关信息', icon: 'none' })
      }
    }).catch(() => {
      this.setData({ isSearching: false })
      wx.showToast({ title: '搜索失败', icon: 'none' })
    })
  },

  _mapPosts(list) {
    return (Array.isArray(list) ? list : []).map(item => ({
      ...item,
      companyName: (item.user && item.user.nickname) || item.title || '',
      avatarUrl: normalizeImageUrl((item.user && item.user.avatarUrl) || ''),
      avatarText: item.user && item.user.nickname ? item.user.nickname[0] : '',
      images: normalizeImageList(item.images),
      time: item.createdAt ? item.createdAt.substring(0, 10) : ''
    }))
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
    this.setData({ keyword: '', categoryIndex: -1, cityIndex: -1, sortIndex: 0, searchResults: [] })
  },

  onConfirm() {
    wx.navigateBack()
  },

  onCardTap(e) {
    const { id } = e.detail
    wx.navigateTo({ url: '/pages/post-detail/post-detail?id=' + id })
  }
})
