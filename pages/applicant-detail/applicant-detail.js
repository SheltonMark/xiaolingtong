const { get } = require('../../utils/request')

Page({
  data: {
    applicant: {},
    loading: true,
    error: null
  },

  onLoad(options) {
    if (options.applicationId) {
      this.loadApplicantDetail(options.applicationId)
    }
  },

  loadApplicantDetail(applicationId) {
    this.setData({ loading: true, error: null })
    get('/applications/' + applicationId + '/detail').then(res => {
      this.setData({
        applicant: res.data || {},
        loading: false
      })
    }).catch((err) => {
      this.setData({
        error: err.message || '加载失败',
        loading: false
      })
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      })
    })
  },

  onSelectSupervisor() {
    const { applicant } = this.data
    if (!applicant.worker.isSupervisorCandidate) {
      wx.showToast({
        title: '该临工不符合主管条件',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '选择主管',
      content: `确认选择 ${applicant.worker.nickname} 作为主管吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '功能开发中',
            icon: 'none'
          })
        }
      }
    })
  },

  onBack() {
    wx.navigateBack()
  }
})
