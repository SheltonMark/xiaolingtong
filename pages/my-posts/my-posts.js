Page({
  data: {
    currentTab: 0,
    tabs: ['全部', '采购需求', '工厂库存', '代加工'],
    posts: [
      {
        id: 'mp1', type: '采购需求', typeColor: 'blue',
        title: '保温杯3000个采购，304不锈钢材质，500ml容量',
        status: 'published', statusText: '已发布', statusColor: 'green', statusIcon: '✓',
        publishTime: '02-07', expireTime: '03-09',
        views: 1287, canPromote: true
      },
      {
        id: 'mp2', type: '工厂库存', typeColor: 'green',
        title: '蓝牙耳机现货5000副，TWS入耳式，支持主动降噪',
        status: 'reviewing', statusText: '待审核', statusColor: 'amber', statusIcon: '⏱',
        publishTime: '02-08', expireTime: '03-10',
        views: 0, canPromote: false
      },
      {
        id: 'mp3', type: '代加工', typeColor: 'amber',
        title: '手机壳代加工，TPU材质，500-1000个起订',
        status: 'rejected', statusText: '已驳回', statusColor: 'rose', statusIcon: '✕',
        publishTime: '02-06', expireTime: '',
        rejectReason: '信息描述不够详细，请补充加工工艺说明',
        views: 0, canPromote: false
      },
      {
        id: 'mp4', type: '采购需求', typeColor: 'blue',
        title: '塑料收纳箱2000个，PP材质，可折叠',
        status: 'offline', statusText: '已下架', statusColor: 'gray', statusIcon: '↓',
        publishTime: '01-05', expireTime: '02-04', expired: true,
        views: 0, canPromote: false
      }
    ]
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

  onDeletePost(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确认删除？',
      confirmColor: '#F43F5E',
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
