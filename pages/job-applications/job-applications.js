const { get, post } = require('../../utils/request')

Page({
  data: {
    job: {},
    applications: [],
    pendingApps: [],
    acceptedApps: [],
    confirmedApps: [],
    rejectedApps: [],
    loading: false
  },

  onLoad(options) {
    if (options.jobId) {
      this.loadJobDetail(options.jobId)
      this.loadApplications(options.jobId)
    }
  },

  onShow() {
    if (this.data.job.id) {
      this.loadApplications(this.data.job.id)
    }
  },

  loadJobDetail(jobId) {
    get('/jobs/' + jobId).then(res => {
      const job = res.data || {}
      const statusMap = {
        recruiting: { text: '招工中', color: 'green' },
        full: { text: '已满员', color: 'amber' },
        working: { text: '进行中', color: 'green' },
        pending_settlement: { text: '待结算', color: 'amber' },
        settled: { text: '已结算', color: 'green' },
        closed: { text: '已关闭', color: 'gray' }
      }
      const statusMeta = statusMap[job.status] || { text: '招工中', color: 'green' }
      this.setData({
        job: {
          ...job,
          statusText: statusMeta.text,
          statusColor: statusMeta.color,
          needCount: job.need || 0,
          appliedCount: job.applied || 0
        }
      })
    }).catch(() => {})
  },

  loadApplications(jobId) {
    this.setData({ loading: true })
    get('/jobs/' + jobId + '/applications').then(res => {
      const data = res.data || {}
      // 后端返回分组数据：{ pending: [], accepted: [], confirmed: [], rejected: [] }
      const pending = (data.pending || []).map(app => this.formatApplication(app))
      const accepted = (data.accepted || []).map(app => this.formatApplication(app))
      const confirmed = (data.confirmed || []).map(app => this.formatApplication(app))
      const rejected = (data.rejected || []).map(app => this.formatApplication(app))

      this.setData({
        applications: [...pending, ...accepted, ...confirmed, ...rejected],
        pendingApps: pending,
        acceptedApps: accepted,
        confirmedApps: confirmed,
        rejectedApps: rejected,
        loading: false
      })
    }).catch((err) => {
      console.error('Failed to load applications:', err)
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    })
  },

  formatApplication(app) {
    const workerInfo = app.worker || {}
    return {
      id: app.id,
      workerName: workerInfo.nickname || '未知',
      creditScore: workerInfo.creditScore || 0,
      totalOrders: workerInfo.totalOrders || 0,
      status: app.status
    }
  },

  onAcceptApplication(e) {
    const applicationId = e.currentTarget.dataset.id
    const jobId = e.currentTarget.dataset.jobId

    wx.showModal({
      title: '确认接受',
      content: '确认接受该临工的报名吗？',
      success: (res) => {
        if (res.confirm) {
          this.acceptApplication(jobId, applicationId)
        }
      }
    })
  },

  acceptApplication(jobId, applicationId) {
    post(`/jobs/${jobId}/applications/${applicationId}/accept`, { action: 'accepted' })
      .then(() => {
        wx.showToast({ title: '已接受', icon: 'success' })
        this.loadApplications(jobId)
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '操作失败', icon: 'none' })
      })
  },

  onRejectApplication(e) {
    const applicationId = e.currentTarget.dataset.id
    const jobId = e.currentTarget.dataset.jobId

    wx.showModal({
      title: '确认拒绝',
      content: '确认拒绝该临工的报名吗？',
      success: (res) => {
        if (res.confirm) {
          this.rejectApplication(jobId, applicationId)
        }
      }
    })
  },

  rejectApplication(jobId, applicationId) {
    post(`/jobs/${jobId}/applications/${applicationId}/accept`, { action: 'rejected' })
      .then(() => {
        wx.showToast({ title: '已拒绝', icon: 'success' })
        this.loadApplications(jobId)
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '操作失败', icon: 'none' })
      })
  }
})
