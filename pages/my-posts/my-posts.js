const { get, del } = require('../../utils/request')

Page({
  data: {
    currentTab: 0,
    tabs: [
      { label: '全部', key: 'all' },
      { label: '采购需求', key: 'purchase' },
      { label: '工厂库存', key: 'stock' },
      { label: '代加工', key: 'process' },
      { label: '招工', key: 'job' }
    ],
    posts: []
  },

  onShow() {
    this.loadPosts()
  },

  loadPosts() {
    const tab = this.data.tabs[this.data.currentTab]
    const params = tab.key === 'all' ? {} : { type: tab.key }
    get('/posts/mine', params).then(res => {
      const list = res.data.list || res.data || []
      this.setData({ posts: this.mapPosts(list) })
    }).catch(() => {})
  },

  mapPosts(list) {
    const typeMap = {
      purchase: { label: '采购需求', color: 'blue' },
      stock: { label: '工厂库存', color: 'green' },
      process: { label: '代加工', color: 'amber' },
      job: { label: '招工', color: 'orange' }
    }
    const statusMap = {
      active: { text: '展示中', color: 'green' },
      expired: { text: '已过期', color: 'amber' },
      deleted: { text: '已删除', color: 'gray' }
    }
    return (Array.isArray(list) ? list : []).map(item => {
      const typeMeta = typeMap[item.type] || { label: '信息', color: 'blue' }
      const statusMeta = statusMap[item.status] || { text: '审核中', color: 'rose' }
      const createdAt = item.createdAt ? item.createdAt.substring(0, 10) : ''
      const expireAt = item.expireAt ? item.expireAt.substring(0, 10) : ''
      return {
        ...item,
        typeKey: item.type,
        type: typeMeta.label,
        typeColor: typeMeta.color,
        statusText: statusMeta.text,
        statusColor: statusMeta.color,
        publishTime: createdAt,
        expireTime: expireAt,
        expired: item.status === 'expired',
        views: Number(item.viewCount || 0),
        title: item.title || (item.content || '').slice(0, 36) || '未命名发布'
      }
    })
  },

  onTabChange(e) {
    this.setData({ currentTab: Number(e.currentTarget.dataset.index) }, () => {
      this.loadPosts()
    })
  },

  onViewPost(e) {
    const id = e.currentTarget.dataset.id
    const type = e.currentTarget.dataset.type
    const targetUrl = type === 'job'
      ? '/pages/job-detail/job-detail?id=' + id
      : '/pages/post-detail/post-detail?id=' + id
    wx.navigateTo({ url: targetUrl })
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
