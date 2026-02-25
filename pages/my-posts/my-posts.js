const { get, del } = require('../../utils/request')

Page({
  data: {
    currentTab: 0,
    tabs: ['全部', '采购需求', '工厂库存', '代加工', '招工'],
    posts: []
  },

  onShow() {
    this.loadPosts()
  },

  loadPosts() {
    get('/posts/mine').then(res => {
      this.setData({ posts: res.data.list || res.data || [] })
    }).catch(() => {})
  },

  onTabChange(e) {
    this.setData({ currentTab: Number(e.currentTarget.dataset.index) })
  },

  getFilteredPosts() {
    const { currentTab, tabs, posts } = this.data
    if (currentTab === 0) return posts
    return posts.filter(p => p.type === tabs[currentTab])
  },

  onViewPost(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/post-detail/post-detail?id=' + id })
  },

  onPromotePost(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/promotion/promotion?id=' + id })
  },

  onGoSettlement(e) {
    const jobId = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/settlement/settlement?jobId=' + jobId })
  },

  onDeletePost(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确认删除？',
      confirmColor: '#F43F5E',
      success: (res) => {
        if (res.confirm) {
          del('/posts/' + id).then(() => {
            this.loadPosts()
            wx.showToast({ title: '已删除', icon: 'success' })
          }).catch(() => {})
        }
      }
    })
  }
})
