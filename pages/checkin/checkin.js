const { get, post, upload } = require('../../utils/request')

Page({
  data: {
    jobId: '',
    mode: 'hourly',
    isManagerFlow: false,
    jobInfo: {},
    distance: 0,
    maxDistance: 500,
    workers: [],
    photos: [],
    loading: true
  },

  onLoad(options) {
    const jobId = options.orderId || options.jobId || ''
    this.setData({
      jobId,
      mode: options.mode || 'hourly',
      isManagerFlow: !!jobId
    })
    if (jobId) {
      const cachedPhotos = wx.getStorageSync('workSessionPhotos:' + jobId) || []
      if (Array.isArray(cachedPhotos) && cachedPhotos.length > 0) {
        this.setData({ photos: cachedPhotos })
      }
      this.loadSession(jobId)
    }
    this.getLocation()
  },

  loadSession(jobId) {
    this.setData({ loading: true })
    get('/work/session/' + jobId).then(res => {
      const data = res.data || res || {}
      const job = data.job || {}
      const checkins = data.checkins || []
      const allWorkers = data.workers || []

      const checkinMap = {}
      checkins.forEach(c => {
        checkinMap[c.workerId] = c
      })

      const workers = allWorkers.map(app => {
        const w = app.worker || {}
        const c = checkinMap[w.id]
        let status = 'absent'
        let time = ''
        if (c) {
          const t = new Date(c.checkInAt)
          time = (t.getHours() + '').padStart(2, '0') + ':' + (t.getMinutes() + '').padStart(2, '0')
          status = 'ontime'
        }
        return {
          id: w.id,
          name: w.nickname || w.realName || '临工',
          status,
          time
        }
      })

      const checkedIn = workers.filter(w => w.status !== 'absent').length
      const company = job.companyName || (job.user && job.user.companyName) || '企业'

      this.setData({
        loading: false,
        workers,
        jobLat: job.lat || 0,
        jobLng: job.lng || 0,
        jobInfo: {
          company,
          title: job.title || '临时工',
          avatarText: company[0] || '企',
          date: job.dateStart ? job.dateStart.slice(5) : '',
          time: (job.workHours || '08:00-18:00').split('-')[0] || '08:00',
          total: workers.length,
          checkedIn,
          notCheckedIn: workers.length - checkedIn
        }
      })
      this.calcDistance()
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({ latitude: res.latitude, longitude: res.longitude })
        this.calcDistance()
      },
      fail: () => {}
    })
  },

  calcDistance() {
    const { latitude, longitude, jobLat, jobLng } = this.data
    if (!latitude || !longitude || !jobLat || !jobLng) return
    // Haversine 公式计算距离（米）
    const rad = Math.PI / 180
    const dLat = (jobLat - latitude) * rad
    const dLng = (jobLng - longitude) * rad
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(latitude * rad) * Math.cos(jobLat * rad) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = Math.round(6371000 * c)
    this.setData({ distance })
  },

  onCheckin() {
    if (this.data.distance > this.data.maxDistance) {
      wx.showToast({ title: '超出签到范围', icon: 'none' })
      return
    }
    post('/work/checkin', {
      jobId: Number(this.data.jobId),
      lat: this.data.latitude,
      lng: this.data.longitude,
      type: 'location'
    }).then(() => {
      wx.showToast({ title: '签到成功', icon: 'success' })
      this.loadSession(this.data.jobId)
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
          post('/work/checkin', {
            jobId: Number(this.data.jobId),
            workerId: id,
            type: 'manual'
          }).then(() => {
            wx.showToast({ title: '已签到', icon: 'success' })
            this.loadSession(this.data.jobId)
          }).catch(() => {})
        }
      }
    })
  },

  onCheckAll() {
    const absent = this.data.workers.filter(w => w.status === 'absent')
    if (absent.length === 0) {
      wx.showToast({ title: '全部已签到', icon: 'none' })
      return
    }
    wx.showModal({
      title: '全部签到',
      content: '确认为' + absent.length + '名未签到人员手动签到？',
      success: (res) => {
        if (res.confirm) {
          const promises = absent.map(w =>
            post('/work/checkin', {
              jobId: Number(this.data.jobId),
              workerId: w.id,
              type: 'manual'
            })
          )
          Promise.all(promises).then(() => {
            wx.showToast({ title: '已全部签到', icon: 'success' })
            this.loadSession(this.data.jobId)
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
          const photos = [...this.data.photos, ...urls]
          wx.setStorageSync('workSessionPhotos:' + this.data.jobId, photos)
          this.setData({ photos })
        }).catch(() => {
          const photos = [...this.data.photos, ...newPhotos]
          wx.setStorageSync('workSessionPhotos:' + this.data.jobId, photos)
          this.setData({ photos })
        })
      }
    })
  },

  onConfirmStart() {
    const notChecked = this.data.workers.filter(w => w.status === 'absent').length
    const msg = notChecked > 0
      ? '还有' + notChecked + '人未签到，确认开工？'
      : '确认所有人员已到位，开始工作？'
    wx.showModal({
      title: '确认开工',
      content: msg,
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync('workSessionPhotos:' + this.data.jobId, this.data.photos)
          wx.showToast({ title: '已确认开工', icon: 'success' })
          setTimeout(() => wx.redirectTo({
            url: '/pages/work-session/work-session?orderId=' + this.data.jobId + '&mode=' + this.data.mode
          }), 1500)
        }
      }
    })
  }
})
