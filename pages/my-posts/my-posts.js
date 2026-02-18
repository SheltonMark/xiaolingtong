Page({
  data: {
    currentTab: 0,
    tabs: ['全部', '采购需求', '库存', '代加工'],
    posts: [
      {
        id: 'mp1', type: '采购需求', title: '304不锈钢保温杯采购',
        status: 'published', statusText: '已发布',
        publishTime: '2026-02-07', expireTime: '2026-03-07'
      },
      {
        id: 'mp2', type: '库存', title: 'ABS塑料外壳库存',
        status: 'reviewing', statusText: '待审核',
        publishTime: '2026-02-06', expireTime: ''
      },
      {
        id: 'mp3', type: '采购需求', title: 'Type-C数据线采购',
        status: 'rejected', statusText: '已驳回',
        publishTime: '2026-02-05', expireTime: '',
        rejectReason: '信息描述不完整，请补充规格参数'
      }
    ]
  },

  onTabChange(e) {
    this.setData({ currentTab: e.currentTarget.dataset.index })
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

  onDeletePost(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确认删除？',
      success: (res) => {
        if (res.confirm) {
          const posts = this.data.posts.filter(p => p.id !== id)
          this.setData({ posts })
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  }
})
