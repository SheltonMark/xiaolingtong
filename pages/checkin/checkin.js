const { post, upload } = require('../../utils/request')

Page({
  data: {
    orderId: '',
    mode: 'hourly',
    isManagerFlow: false,
    jobInfo: {},
    distance: 0,
    maxDistance: 500,
    workers: [],
    photos: []
  },

  onLoad(options) {
    if (options.orderId) {
      this.setData({ orderId: options.orderId, mode: options.mode || 'hourly', isManagerFlow: true })
    }
    this.getLocation()
  },

  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({ latitude: res.latitude, longitude: res.longitude })
      },
      fail: () => {}
    })
  },

  onCheckin() {
    if (this.data.distance > this.data.maxDistance) {
      wx.showToast({ title: '超出签到范围', icon: 'none' })
      return
    }
    post('/work/checkin', {
      latitude: this.data.latitude,
      longitude: this.data.longitude
    }).then(() => {
      wx.showToast({ title: '签到成功', icon: 'success' })
    }).catch(() => {})
  },

  onRefreshLocation() {
    this.getLocation()
    wx.showToast({ title: '位置已刷新', icon: 'none' })
  },

  onManualCheckin(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '手动签到',
      content: '确认为该工人手动签到？',
      success: (res) => {
        if (res.confirm) {
          post('/work/checkin', { workerId: id, manual: true }).then(() => {
            wx.showToast({ title: '已签到', icon: 'success' })
          }).catch(() => {})
        }
      }
    })
  },

  onCheckAll() {
    wx.showModal({
      title: '全部签到',
      content: '确认为所有未签到人员手动签到？',
      success: (res) => {
        if (res.confirm) {
          post('/work/checkin', { checkAll: true }).then(() => {
            wx.showToast({ title: '已全部签到', icon: 'success' })
          }).catch(() => {})
        }
      }
    })
  },

  onTakePhoto() {
    wx.chooseMedia({
      count: 9 - this.data.photos.length,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        const newPhotos = res.tempFiles.map(f => f.tempFilePath)
        const uploads = newPhotos.map(path => upload(path))
        Promise.all(uploads).then(results => {
          const urls = results.map(r => r.data.url || r.data)
          this.setData({ photos: [...this.data.photos, ...urls] })
        }).catch(() => {
          this.setData({ photos: [...this.data.photos, ...newPhotos] })
        })
      }
    })
  },

  onConfirmStart() {
    wx.showModal({
      title: '确认开工',
      content: '确认所有人员已到位，开始工作？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已确认开工', icon: 'success' })
          if (this.data.isManagerFlow) {
            setTimeout(() => wx.redirectTo({
              url: '/pages/work-session/work-session?orderId=' + this.data.orderId + '&mode=' + this.data.mode
            }), 1500)
          } else {
            setTimeout(() => wx.navigateBack(), 1500)
          }
        }
      }
    })
  }
})
