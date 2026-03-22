const { get, post, upload } = require('../../utils/request')

Page({
  data: {
    jobId: '',
    mode: 'hourly',
    jobInfo: {},
    distance: null,
    maxDistance: 500,
    workers: [],
    photos: [],
    loading: true,
    isSupervisor: false,
    hasSupervisor: false,
    canCheckin: false,
    canConfirmStart: false,
    hasStartedToday: false,
    startedAt: '',
    startedBy: '',
    checkinBlockedReason: '',
    checkinWindowStart: '',
    checkinWindowEnd: '',
    currentApplicationStatus: '',
    submittingStart: false,
    latitude: null,
    longitude: null,
    locationReady: false,
    canCheckinButton: false,
    localBlockedReason: '',
    locationError: ''
  },

  onLoad(options) {
    const jobId = options.orderId || options.jobId || ''
    this.setData({
      jobId,
      mode: options.mode || 'hourly'
    })
    if (jobId) {
      const cachedPhotos = wx.getStorageSync('workSessionPhotos:' + jobId) || []
      if (Array.isArray(cachedPhotos) && cachedPhotos.length > 0) {
        this.setData({ photos: cachedPhotos })
      }
      this.loadSession(jobId)
    }
    this.getLocation(true)
  },

  loadSession(jobId) {
    this.setData({ loading: true })
    get('/work/session/' + jobId).then(res => {
      const data = res.data || res || {}
      const job = data.job || {}
      const checkins = data.checkins || []
      const allWorkers = data.workers || []
      const sessionWorkers = data.sessionWorkers || []
      const startedPhotos = Array.isArray(data.startedPhotos) ? data.startedPhotos : []
      const workers = Array.isArray(sessionWorkers) && sessionWorkers.length > 0
        ? sessionWorkers.map(item => ({
            id: item.workerId,
            name: item.displayName || '临工',
            status: item.checkInTime ? (item.attendanceStatus === 'late' ? 'late' : 'ontime') : 'absent',
            time: item.checkInTime ? String(item.checkInTime).slice(0, 5) : ''
          }))
        : allWorkers.map(app => {
            const worker = app.worker || {}
            const checkin = checkins.find(item => Number(item.workerId) === Number(worker.id))
            let status = 'absent'
            let time = ''
            if (checkin) {
              const checkinTime = new Date(checkin.checkInAt)
              time = `${`${checkinTime.getHours()}`.padStart(2, '0')}:${`${checkinTime.getMinutes()}`.padStart(2, '0')}`
              status = 'ontime'
            }
            return {
              id: worker.id,
              name: worker.name || worker.nickname || '临工',
              status,
              time
            }
          })

      const checkedIn = workers.filter(worker => worker.status !== 'absent').length
      const company = job.companyName || (job.user && job.user.companyName) || '企业'
      const [startTime] = String(job.workHours || '08:00-18:00').split('-')
      const photos = this.data.photos.length > 0 ? this.data.photos : startedPhotos

      this.setData({
        loading: false,
        workers,
        photos,
        jobLat: Number(job.lat) || 0,
        jobLng: Number(job.lng) || 0,
        isSupervisor: !!data.isSupervisor,
        hasSupervisor: !!data.hasSupervisor,
        canCheckin: !!data.canCheckin,
        canConfirmStart: !!data.canConfirmStart,
        hasStartedToday: !!data.hasStartedToday,
        startedAt: data.startedAt || '',
        startedBy: data.startedBy || '',
        checkinBlockedReason: data.checkinBlockedReason || '',
        checkinWindowStart: data.checkinWindowStart || '',
        checkinWindowEnd: data.checkinWindowEnd || '',
        currentApplicationStatus: data.currentApplicationStatus || '',
        jobInfo: {
          company,
          title: job.title || '临时工',
          avatarText: company[0] || '企',
          date: job.dateStart ? job.dateStart.slice(5) : '',
          time: startTime || '08:00',
          total: workers.length,
          checkedIn,
          notCheckedIn: workers.length - checkedIn
        }
      }, () => {
        this.calcDistance()
        this.updateCheckinState()
      })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  getLocation(silent = false) {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude,
          locationError: ''
        }, () => {
          this.calcDistance()
          this.updateCheckinState()
          if (!silent) {
            wx.showToast({ title: '位置已刷新', icon: 'none' })
          }
        })
      },
      fail: () => {
        const locationError = '定位信息获取失败，请授权定位后重试'
        this.setData({
          latitude: null,
          longitude: null,
          distance: null,
          locationError
        }, () => {
          this.updateCheckinState()
          if (!silent) {
            wx.showToast({ title: locationError, icon: 'none' })
          }
        })
      }
    })
  },

  calcDistance() {
    const { latitude, longitude, jobLat, jobLng } = this.data
    if (!latitude || !longitude || !jobLat || !jobLng) {
      this.setData({ distance: null })
      return
    }

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

  updateCheckinState() {
    const { canCheckin, checkinBlockedReason, distance, maxDistance, latitude, longitude, jobLat, jobLng, locationError } = this.data
    const hasUserLocation = !!latitude && !!longitude
    const hasJobLocation = !!jobLat && !!jobLng
    let localBlockedReason = ''

    if (!hasJobLocation) {
      localBlockedReason = '岗位未配置签到坐标'
    } else if (!hasUserLocation) {
      localBlockedReason = locationError || '定位信息获取失败，请刷新位置'
    } else if (distance === null || distance === undefined) {
      localBlockedReason = '正在计算位置距离'
    } else if (distance > maxDistance) {
      localBlockedReason = `当前位置距签到点 ${distance}m，已超出范围`
    }

    const locationReady = hasUserLocation && hasJobLocation && distance !== null
    this.setData({
      locationReady,
      localBlockedReason,
      canCheckinButton: !!canCheckin && !localBlockedReason && !checkinBlockedReason
    })
  },

  onCheckin() {
    if (this.data.localBlockedReason) {
      wx.showToast({ title: this.data.localBlockedReason, icon: 'none' })
      return
    }
    if (!this.data.canCheckin) {
      wx.showToast({ title: this.data.checkinBlockedReason || '当前不可打卡', icon: 'none' })
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
    this.getLocation(false)
  },

  onManualCheckin(e) {
    if (!this.data.isSupervisor) {
      wx.showToast({ title: '仅临工管理员可代打卡', icon: 'none' })
      return
    }
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '手动签到',
      content: '确认将该工人标记为已签到？',
      success: (res) => {
        if (!res.confirm) return
        post('/work/checkin', {
          jobId: Number(this.data.jobId),
          workerId: id,
          type: 'manual'
        }).then(() => {
          wx.showToast({ title: '已签到', icon: 'success' })
          this.loadSession(this.data.jobId)
        }).catch(() => {})
      }
    })
  },

  onCheckAll() {
    if (!this.data.isSupervisor) {
      wx.showToast({ title: '仅临工管理员可批量签到', icon: 'none' })
      return
    }
    const absent = this.data.workers.filter(worker => worker.status === 'absent')
    if (absent.length === 0) {
      wx.showToast({ title: '全部已签到', icon: 'none' })
      return
    }
    wx.showModal({
      title: '全部签到',
      content: `确认将 ${absent.length} 名未签到人员标记为已签到？`,
      success: (res) => {
        if (!res.confirm) return
        const promises = absent.map(worker => post('/work/checkin', {
          jobId: Number(this.data.jobId),
          workerId: worker.id,
          type: 'manual'
        }))
        Promise.all(promises).then(() => {
          wx.showToast({ title: '已全部签到', icon: 'success' })
          this.loadSession(this.data.jobId)
        }).catch(() => {})
      }
    })
  },

  onTakePhoto() {
    wx.chooseMedia({
      count: 9 - this.data.photos.length,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        const newPhotos = res.tempFiles.map(file => file.tempFilePath)
        const uploads = newPhotos.map(path => upload(path))
        Promise.all(uploads).then(results => {
          const urls = results.map(result => result.data.url || result.data)
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
    if (!this.data.isSupervisor) {
      wx.showToast({ title: '仅临工管理员可确认开工', icon: 'none' })
      return
    }
    if (this.data.hasStartedToday || !this.data.canConfirmStart) {
      wx.showToast({ title: this.data.startedAt ? '今日已确认开工' : '当前不可确认开工', icon: 'none' })
      return
    }
    if (this.data.submittingStart) {
      return
    }

    const notChecked = this.data.workers.filter(worker => worker.status === 'absent').length
    const content = notChecked > 0
      ? `还有 ${notChecked} 人未签到，确认开工？`
      : '确认所有人员已到位，开始工作？'

    wx.showModal({
      title: '确认开工',
      content,
      success: (res) => {
        if (!res.confirm) return
        this.setData({ submittingStart: true })
        post('/work/session/' + this.data.jobId + '/start', {
          photos: this.data.photos
        }).then((response) => {
          const result = response.data || response || {}
          const photos = Array.isArray(result.photoUrls) && result.photoUrls.length > 0
            ? result.photoUrls
            : this.data.photos
          wx.setStorageSync('workSessionPhotos:' + this.data.jobId, photos)
          this.setData({
            photos,
            hasStartedToday: true,
            canConfirmStart: false,
            startedAt: result.startedAt || this.data.startedAt,
            startedBy: result.startedBy || this.data.startedBy
          })
          wx.showToast({ title: '已确认开工', icon: 'success' })
          setTimeout(() => wx.redirectTo({
            url: '/pages/work-session/work-session?orderId=' + this.data.jobId + '&mode=' + this.data.mode
          }), 1200)
        }).catch(() => {}).finally(() => {
          this.setData({ submittingStart: false })
          this.loadSession(this.data.jobId)
        })
      }
    })
  }
})
