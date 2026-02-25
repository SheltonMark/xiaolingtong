const { get, post } = require('../../utils/request')

Page({
  data: {
    currentTab: 0,
    tabs: ['全部', '待确认', '已入选', '进行中', '已完成'],
    list: []
  },

  onShow() {
    this.loadApplications()
  },

  loadApplications() {
    get('/applications').then(res => {
      this.setData({ list: res.data || [] })
    }).catch(() => {})
  },

  onTabChange(e) {
    this.setData({ currentTab: Number(e.currentTarget.dataset.index) })
  },

  onConfirmAttend(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认出勤',
      content: '确认明天按时到岗？',
      success: (res) => {
        if (res.confirm) {
          post('/jobs/' + id + '/confirm').then(() => {
            wx.showToast({ title: '已确认', icon: 'success' })
            this.loadApplications()
            setTimeout(() => wx.navigateTo({ url: '/pages/checkin/checkin?id=' + id }), 1500)
          }).catch(() => {})
        }
      }
    })
  },

  onViewDetail(e) {
    wx.navigateTo({ url: '/pages/job-detail/job-detail?id=' + e.currentTarget.dataset.id })
  },

  onGoCheckin(e) {
    wx.navigateTo({ url: '/pages/checkin/checkin?id=' + e.currentTarget.dataset.id })
  },

  onRate(e) {
    wx.navigateTo({ url: '/pages/rate/rate?id=' + e.currentTarget.dataset.id })
  }
})
