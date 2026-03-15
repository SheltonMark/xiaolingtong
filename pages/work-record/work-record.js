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

    // 应用状态映射（与"我的报名"保持一致）
    const statusMap = {
      pending: { text: '待确认', bg: 'amber' },
      accepted: { text: '待确认', bg: 'amber' },
      confirmed: { text: '已入选', bg: 'green' },
      working: { text: '进行中', bg: 'green' },
      done: { text: '已完成', bg: 'gray' },
      completed: { text: '已完成', bg: 'gray' },
      rejected: { text: '已拒绝', bg: 'rose' },
      released: { text: '已释放', bg: 'rose' },
      cancelled: { text: '已取消', bg: 'gray' }
    }

    const appStatus = statusMap[order.status] || { text: '未知', bg: 'slate' }

    return {
      id: order.id,
      jobId: order.jobId,
      status: order.status,
      statusText: appStatus.text,
      statusBg: appStatus.bg,
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
      url: `/pages/settlement/settlement?jobId=${jobId}&applicationId=${id}&viewOnly=1`
    })
  }
})
