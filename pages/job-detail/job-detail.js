const { get, post } = require('../../utils/request')
const { normalizeImageList } = require('../../utils/image')

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
      const job = res.data || {}
      this.setData({
        job: {
          ...job,
          images: normalizeImageList(job.images)
        }
      })
      // 加载收藏状态
      this.loadFavStatus(id)
    }).catch(() => {})
  },

  loadFavStatus(id) {
    get('/favorites').then(res => {
      const list = res.data.list || res.data || []
      const isFav = list.some(item => item.targetType === 'job' && item.targetId === id)
      this.setData({ isFav })
    }).catch(() => {})
  },

  onSwiperChange(e) {
    this.setData({ swiperCurrent: e.detail.current })
  },

  onShow() {
    const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    this.setData({ userRole })
    // 重新加载收藏状态
    if (this.data.job.id) {
      this.loadFavStatus(this.data.job.id)
    }
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
    const phoneNumber = this.data.job?.company?.phone || ''
    if (!phoneNumber) {
      wx.showToast({ title: '暂无联系电话', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber, fail() {} })
  },
  onToggleFav() {
    const id = this.data.job.id
    post('/favorites/toggle', { targetType: 'job', targetId: id }).then(() => {
      this.setData({ isFav: !this.data.isFav })
      wx.showToast({ title: this.data.isFav ? '已收藏' : '已取消', icon: 'success' })
    }).catch(() => {})
  },

  onShareJob() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] })
  },
  onShareAppMessage() {
    const job = this.data.job || {}
    return {
      title: (job.title || '招工信息') + ' - 小灵通',
      path: '/pages/job-detail/job-detail?id=' + (job.id || '')
    }
  }
})
