const { get, post } = require('../../utils/request')

Page({
  data: {
    userRole: 'worker',
    swiperCurrent: 0,
    isFav: false,
    job: {}
  },

  onLoad(options) {
    if (options.id) {
      this.loadJob(options.id)
    }
  },

  loadJob(id) {
    get('/jobs/' + id).then(res => {
      this.setData({ job: res.data || {} })
    }).catch(() => {})
  },

  onSwiperChange(e) {
    this.setData({ swiperCurrent: e.detail.current })
  },

  onShow() {
    const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    this.setData({ userRole })
  },

  onApply() {
    wx.showModal({
      title: '确认报名',
      content: '报名后等待平台分配，开工前一天需确认出勤',
      success: (res) => {
        if (res.confirm) {
          post('/jobs/' + this.data.job.id + '/apply').then(() => {
            wx.showToast({ title: '报名成功', icon: 'success' })
          }).catch(() => {})
        }
      }
    })
  },

  onGoSettlement() {
    wx.navigateTo({ url: '/pages/settlement/settlement?jobId=' + this.data.job.id })
  },

  onCallPhone() {
    wx.makePhoneCall({ phoneNumber: '13900005678', fail() {} })
  },
  onToggleFav() {
    const id = this.data.job.id
    post('/favorites/toggle', { targetType: 'job', targetId: id }).then(() => {
      this.setData({ isFav: !this.data.isFav })
      wx.showToast({ title: this.data.isFav ? '已收藏' : '已取消', icon: 'success' })
    }).catch(() => {})
  },

  onShareJob() {
    const job = this.data.job
    const title = job.title || '招工信息'
    const path = `/pages/job-detail/job-detail?id=${job.id}`
    this._lastSharePayload = { title, path }
  },

  onShareAppMessage(res) {
    const id = (res && res.target && res.target.dataset && res.target.dataset.id) || ''
    if (id && this.data.job.id == id) {
      const job = this.data.job
      return {
        title: job.title || '招工信息',
        path: `/pages/job-detail/job-detail?id=${job.id}`
      }
    }
    return this._lastSharePayload || {
      title: '招工信息',
      path: `/pages/job-detail/job-detail?id=${this.data.job.id}`
    }
  }
})
