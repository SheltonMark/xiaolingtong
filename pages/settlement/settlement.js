const { get, post } = require('../../utils/request')

Page({
  data: {
    viewOnly: false,
    role: 'enterprise',
    jobId: '',
    job: {},
    steps: [],
    workers: [],
    fees: {}
  },

  onLoad(options) {
    const jobId = options.jobId || ''
    this.setData({ jobId })
    if (options.viewOnly === '1') {
      this.setData({ viewOnly: true })
    }
    if (options.role) {
      this.setData({ role: options.role })
    } else {
      const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
      if (userRole === 'worker') {
        this.setData({ role: 'worker', viewOnly: true })
      }
    }
    if (jobId) this.loadSettlement(jobId)
  },

  loadSettlement(jobId) {
    get('/settlements/' + jobId).then(res => {
      const d = res.data || {}
      this.setData({
        job: d.job || {},
        steps: d.steps || [],
        workers: d.workers || [],
        fees: d.fees || {}
      })
    }).catch(() => {})
  },

  onViewAll() {
    wx.showToast({ title: '查看全部明细', icon: 'none' })
  },

  onSubmitSettlement() {
    wx.showModal({
      title: '提交结算单',
      content: '提交后将通知临工确认工时，超时将自动确认',
      success: (res) => {
        if (res.confirm) {
          post('/settlements/' + this.data.jobId + '/confirm').then(() => {
            wx.showToast({ title: '已提交', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 1500)
          }).catch(() => {})
        }
      }
    })
  },

  onPay() {
    wx.showModal({
      title: '确认支付',
      content: '支付后工资将自动发放至临工钱包',
      success: (res) => {
        if (res.confirm) {
          post('/settlements/' + this.data.jobId + '/pay').then(() => {
            wx.showToast({ title: '支付成功', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 1500)
          }).catch(() => {})
        }
      }
    })
  }
})
