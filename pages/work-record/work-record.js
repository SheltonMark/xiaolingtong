const { get } = require('../../utils/request')

Page({
  data: {
    orders: [],
    loading: false,
    empty: false
  },

  onShow() {
    this.loadWorkOrders()
  },

  loadWorkOrders() {
    this.setData({ loading: true })
    get('/work/orders').then(res => {
      const orders = res.data || []
      this.setData({
        orders: orders.map(order => this.formatOrder(order)),
        empty: orders.length === 0,
        loading: false
      })
    }).catch(err => {
      console.error('Failed to load work orders:', err)
      this.setData({
        empty: true,
        loading: false
      })
    })
  },

  formatOrder(order) {
    const job = order.job || {}
    const company = order.company || {}

    // 异常类型映射
    const anomalyMap = {
      normal: '正常',
      early_leave: '早退',
      late: '迟到',
      injury: '受伤',
      absent: '缺勤'
    }

    return {
      id: order.id,
      jobId: order.jobId,
      jobTitle: job.title || '未知工作',
      location: job.location || '未知地点',
      date: order.date,
      hours: order.hours || 0,
      pieces: order.pieces || 0,
      salaryType: job.salaryType || 'hourly',
      salary: job.salary || 0,
      salaryUnit: job.salaryUnit || '元/时',
      companyName: company.name || '企业用户',
      companyAvatar: company.avatarUrl || '',
      anomalyType: order.anomalyType || 'normal',
      anomalyText: anomalyMap[order.anomalyType] || '正常',
      anomalyNote: order.anomalyNote || '',
      photoUrls: order.photoUrls || [],
      createdAt: order.createdAt
    }
  },

  onOrderTap(e) {
    const { id, jobId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/settlement/settlement?jobId=${jobId}&workLogId=${id}&viewOnly=1`
    })
  }
})
