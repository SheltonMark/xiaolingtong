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

    // 招工信息从 /jobs/mine 获取，其他从 /posts/mine 获取
    if (tab.key === 'job') {
      // 只显示招工
      get('/jobs/mine').then(res => {
        const list = res.data.list || res.data || []
        this.setData({ posts: this.mapPosts(list) })
      }).catch(() => {})
    } else if (tab.key === 'all') {
      // 全部：获取所有posts和jobs
      Promise.all([
        get('/posts/mine').catch(() => ({ data: { list: [] } })),
        get('/jobs/mine').catch(() => ({ data: { list: [] } }))
      ]).then(([postsRes, jobsRes]) => {
        const postsList = postsRes.data.list || postsRes.data || []
        const jobsList = jobsRes.data.list || jobsRes.data || []
        const allPosts = [...postsList, ...jobsList]
        this.setData({ posts: this.mapPosts(allPosts) })
      })
    } else {
      // 其他类型：只从posts获取
      get('/posts/mine', params).then(res => {
        const list = res.data.list || res.data || []
        this.setData({ posts: this.mapPosts(list) })
      }).catch(() => {})
    }
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
      pending: { text: '审核中', color: 'rose' },
      rejected: { text: '未通过', color: 'rose' },
      recruiting: { text: '招工中', color: 'green' },
      full: { text: '已满员', color: 'amber' },
      working: { text: '进行中', color: 'green' },
      pending_settlement: { text: '待结算', color: 'amber' },
      settled: { text: '已结算', color: 'green' },
      closed: { text: '已关闭', color: 'gray' },
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
        title: item.title || (item.content || '').slice(0, 36) || '未命名发布',
        desc: item.content || '',
        isPromoted: !!item.isPromoted,
        canPromote: !item.isPromoted && (item.status === 'active' || item.status === 'recruiting'),
        canSettle: item.type === 'job' && item.status === 'pending_settlement'
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
