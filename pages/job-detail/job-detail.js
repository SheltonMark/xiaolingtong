const { get, post } = require('../../utils/request')
const { normalizeImageList } = require('../../utils/image')

Page({
  data: {
    userRole: 'worker',
    swiperCurrent: 0,
    isFav: false,
    job: {},
    applications: [],
    showApplications: false,
    applicationsLoading: false
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
      // 如果是企业端，加载应聘者列表
      if (this.data.userRole === 'enterprise') {
        this.loadApplications(id)
      }
    }).catch(() => {})
  },

  loadApplications(jobId) {
    this.setData({ applicationsLoading: true })
    get('/jobs/' + jobId + '/applications').then(res => {
      const applications = res.data.list || res.data || []
      this.setData({
        applications: applications.map(app => ({
          ...app,
          statusText: this.getApplicationStatusText(app.status),
          statusColor: this.getApplicationStatusColor(app.status)
        })),
        showApplications: true
      })
    }).catch(() => {
      this.setData({ showApplications: false })
    }).finally(() => {
      this.setData({ applicationsLoading: false })
    })
  },

  getApplicationStatusText(status) {
    const statusMap = {
      pending: '待审核',
      accepted: '已接受',
      confirmed: '已确认',
      rejected: '已拒绝',
      cancelled: '已取消',
      working: '进行中',
      done: '已完成'
    }
    return statusMap[status] || status
  },

  getApplicationStatusColor(status) {
    const colorMap = {
      pending: 'amber',
      accepted: 'green',
      confirmed: 'green',
      rejected: 'red',
      cancelled: 'gray',
      working: 'blue',
      done: 'gray'
    }
    return colorMap[status] || 'gray'
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
      // 如果是企业端，重新加载应聘者列表
      if (userRole === 'enterprise') {
        this.loadApplications(this.data.job.id)
      }
    }
  },

  onAcceptApplication(e) {
    const appId = e.currentTarget.dataset.appId
    wx.showModal({
      title: '确认接受',
      content: '接受该应聘者的报名？',
      success: (res) => {
        if (res.confirm) {
          post('/jobs/' + this.data.job.id + '/applications/' + appId + '/accept').then(() => {
            wx.showToast({ title: '已接受', icon: 'success' })
            this.loadApplications(this.data.job.id)
          }).catch(() => {})
        }
      }
    })
  },

  onRejectApplication(e) {
    const appId = e.currentTarget.dataset.appId
    wx.showModal({
      title: '确认拒绝',
      content: '拒绝该应聘者的报名？',
      success: (res) => {
        if (res.confirm) {
          post('/jobs/' + this.data.job.id + '/applications/' + appId + '/reject').then(() => {
            wx.showToast({ title: '已拒绝', icon: 'success' })
            this.loadApplications(this.data.job.id)
          }).catch(() => {})
        }
      }
    })
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
    const myId = getApp().globalData.userInfo && getApp().globalData.userInfo.id
    const isOwner = myId && String(job.userId || job.enterpriseId) === String(myId)
    var title = job.title || '招工信息'
    if (!isOwner) {
      title = '朋友在招' + title + '｜能去吗？'
    }
    return {
      title: title,
      path: getApp().getSharePath('/pages/job-detail/job-detail?id=' + (job.id || ''))
    }
  }
})
