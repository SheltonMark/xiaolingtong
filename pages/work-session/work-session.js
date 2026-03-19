const { get, post, upload } = require('../../utils/request')
const { normalizeImageUrl } = require('../../utils/image')

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return hours + ':' + minutes
}

function normalizePhotoItem(item) {
  if (!item) return null
  if (typeof item === 'string') {
    return {
      slotId: null,
      url: normalizeImageUrl(item),
      uploadedAt: new Date().toISOString()
    }
  }
  if (item.url) {
    return {
      slotId: item.slotId === undefined || item.slotId === null ? null : Number(item.slotId),
      url: normalizeImageUrl(item.url),
      uploadedAt: item.uploadedAt || new Date().toISOString()
    }
  }
  return null
}

Page({
  data: {
    orderId: '',
    mode: 'hourly',
    loading: true,
    status: {},
    pieceStatus: {},
    photoRecords: [],
    uploadedPhotos: [],
    workers: [],
    anomalies: []
  },

  onLoad(options) {
    const orderId = options.orderId || ''
    const mode = options.mode || 'hourly'
    this.setData({ orderId, mode })
    if (orderId) {
      this.loadSession(orderId)
    }
  },

  onShow() {
    if (this.data.orderId) {
      this.loadSession(this.data.orderId)
    }
  },

  getPhotoStorageKey() {
    return 'workSessionPhotos:' + this.data.orderId
  },

  loadCachedPhotos() {
    const cached = wx.getStorageSync(this.getPhotoStorageKey()) || []
    return cached.map(normalizePhotoItem).filter(Boolean)
  },

  persistPhotos(photos) {
    wx.setStorageSync(this.getPhotoStorageKey(), photos)
  },

  buildPhotoRecords(job, photos) {
    const now = new Date()
    const workHoursParts = (job.workHours || '08:00-18:00').split('-')
    const startHour = parseInt(workHoursParts[0], 10) || 8
    const endHour = parseInt(workHoursParts[1], 10) || 18
    const normalizedPhotos = photos.map(normalizePhotoItem).filter(Boolean)

    return Array.from({ length: Math.max(1, Math.ceil((endHour - startHour) / 2)) }).map((_, index) => {
      const slotStart = startHour + index * 2
      const slotEnd = Math.min(slotStart + 2, endHour)
      const matchedPhoto = normalizedPhotos.find(photo => Number(photo.slotId) === slotStart) || normalizedPhotos.find(photo => {
        const uploadDate = new Date(photo.uploadedAt)
        return uploadDate.getHours() >= slotStart && uploadDate.getHours() < slotEnd
      })
      return {
        id: slotStart,
        timeRange: String(slotStart).padStart(2, '0') + ':00 - ' + String(slotEnd).padStart(2, '0') + ':00',
        status: matchedPhoto ? 'done' : (now.getHours() >= slotStart ? 'pending' : 'future'),
        uploadTime: matchedPhoto ? formatTime(new Date(matchedPhoto.uploadedAt)) : '',
        photoUrl: matchedPhoto ? matchedPhoto.url : ''
      }
    }).filter(item => item.status !== 'future')
  },

  loadSession(jobId) {
    this.setData({ loading: true })
    get('/work/session/' + jobId).then(res => {
      const data = res.data || res || {}
      const job = data.job || {}
      const checkins = data.checkins || []
      const logs = data.logs || []
      const allWorkers = data.workers || []
      const company = job.companyName || (job.user && job.user.companyName) || '企业'
      const cachedPhotos = this.loadCachedPhotos()

      const checkinMap = {}
      checkins.forEach(checkin => {
        checkinMap[checkin.workerId] = checkin
      })

      const dailyLogMap = {}
      logs.forEach(log => {
        const current = dailyLogMap[log.workerId] || {
          workerId: log.workerId,
          hours: 0,
          pieces: 0,
          anomalyType: 'normal',
          anomalyNote: '',
          checkInTime: '',
          checkOutTime: '',
          photoUrls: []
        }
        current.hours = Math.max(Number(current.hours || 0), Number(log.hours || 0))
        current.pieces = Math.max(Number(current.pieces || 0), Number(log.pieces || 0))
        current.anomalyType = log.anomalyType && log.anomalyType !== 'normal' ? log.anomalyType : current.anomalyType
        current.anomalyNote = log.anomalyNote || current.anomalyNote
        current.checkInTime = log.checkInTime || current.checkInTime
        current.checkOutTime = log.checkOutTime || current.checkOutTime
        current.photoUrls = Array.from(new Set([...(current.photoUrls || []), ...((log.photoUrls || []))]))
        dailyLogMap[log.workerId] = current
      })

      const workers = allWorkers.map(app => {
        const worker = app.worker || {}
        const checkin = checkinMap[worker.id]
        const log = dailyLogMap[worker.id] || {}
        const checkInTime = log.checkInTime || (checkin ? formatTime(new Date(checkin.checkInAt)) : '')
        const attendance = log.anomalyType || (checkInTime ? 'normal' : 'absent')
        return {
          id: worker.id,
          name: worker.nickname || worker.realName || '临工',
          attendance,
          attendanceText: this.getAttendanceText(attendance),
          checkInTime,
          checkOutTime: log.checkOutTime || '',
          hours: Number(log.hours || 0),
          pieces: Number(log.pieces || 0),
          note: log.anomalyNote || '',
          hourValue: log.hours !== undefined && log.hours !== null ? String(log.hours) : '',
          inputValue: log.pieces !== undefined && log.pieces !== null ? String(log.pieces) : ''
        }
      })

      const anomalyMap = {
        late: '迟到',
        early_leave: '早退',
        absent: '缺勤',
        injury: '受伤',
        fraud: '异常'
      }
      const anomalies = workers
        .filter(worker => worker.attendance && worker.attendance !== 'normal')
        .map(worker => ({
          id: worker.id,
          name: worker.name,
          type: anomalyMap[worker.attendance] || worker.attendance,
          time: worker.checkOutTime || worker.checkInTime || '',
          desc: worker.note || '已记录考勤异常'
        }))

      const totalPiecesToday = workers.reduce((sum, worker) => sum + Number(worker.inputValue || worker.pieces || 0), 0)
      const workHoursParts = (job.workHours || '08:00-18:00').split('-')
      const startTime = workHoursParts[0] || '08:00'
      const endTime = workHoursParts[1] || '18:00'
      const uploadPhotos = Array.from(new Map(
        [...cachedPhotos, ...(logs.flatMap(log => (log.photoUrls || []).map(url => ({ url, uploadedAt: log.updatedAt || log.createdAt || new Date().toISOString() }))))]
          .map(photo => [photo.url, normalizePhotoItem(photo)])
      ).values())

      this.persistPhotos(uploadPhotos)
      this.setData({
        loading: false,
        uploadedPhotos: uploadPhotos,
        photoRecords: this.buildPhotoRecords(job, uploadPhotos),
        workers,
        anomalies,
        status: {
          company,
          jobType: job.title || '临时工',
          hoursToday: workers.reduce((sum, worker) => sum + Number(worker.hourValue || worker.hours || 0), 0).toFixed(1),
          startTime,
          todayAttend: workers.filter(worker => worker.attendance !== 'absent').length,
          todayAnomaly: anomalies.length,
          estimateEnd: endTime
        },
        pieceStatus: {
          company,
          jobType: job.title || '临时工',
          piecesToday: totalPiecesToday,
          pricePerPiece: job.salary || 0,
          earningsToday: (totalPiecesToday * Number(job.salary || 0)).toFixed(0),
          todayAttend: workers.filter(worker => worker.attendance !== 'absent').length,
          todayAnomaly: anomalies.length
        }
      })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  getAttendanceText(attendance) {
    const map = {
      normal: '正常',
      late: '迟到',
      early_leave: '早退',
      absent: '缺勤',
      injury: '受伤',
      fraud: '异常'
    }
    return map[attendance] || '正常'
  },

  onTakePhoto(e) {
    const slotId = Number(e.currentTarget.dataset.id)
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath
        upload(path).then(r => {
          const photo = {
            slotId,
            url: r.data.url || r.data,
            uploadedAt: new Date().toISOString()
          }
          const uploadedPhotos = [
            ...this.data.uploadedPhotos.filter(item => Number(item.slotId) !== slotId),
            photo
          ]
          this.persistPhotos(uploadedPhotos)
          this.setData({
            uploadedPhotos,
            photoRecords: this.data.photoRecords.map(item => {
              if (item.id === slotId) {
                return {
                  ...item,
                  status: 'done',
                  uploadTime: formatTime(new Date(photo.uploadedAt)),
                  photoUrl: normalizeImageUrl(photo.url)
                }
              }
              return item
            })
          })
          wx.showToast({ title: '上传成功', icon: 'success' })
        }).catch(() => {
          wx.showToast({ title: '上传失败', icon: 'none' })
        })
      }
    })
  },

  onHourInput(e) {
    const id = Number(e.currentTarget.dataset.id)
    const value = e.detail.value
    this.setData({
      workers: this.data.workers.map(worker => worker.id === id ? { ...worker, hourValue: value } : worker)
    })
  },

  onTimeChange(e) {
    const id = Number(e.currentTarget.dataset.id)
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      workers: this.data.workers.map(worker => worker.id === id ? { ...worker, [field]: value } : worker)
    })
  },

  onSaveHours() {
    const payloads = this.data.workers
      .filter(worker => worker.hourValue !== '' || worker.checkOutTime)
      .map(worker => post('/work/log', {
        jobId: Number(this.data.orderId),
        workerId: worker.id,
        hours: Number(worker.hourValue || worker.hours || 0),
        checkInTime: worker.checkInTime || undefined,
        checkOutTime: worker.checkOutTime || undefined
      }))

    if (payloads.length === 0) {
      wx.showToast({ title: '请先录入工时', icon: 'none' })
      return
    }

    Promise.all(payloads).then(() => {
      wx.showToast({ title: '工时已保存', icon: 'success' })
      this.loadSession(this.data.orderId)
    }).catch(() => {})
  },

  onPieceInput(e) {
    const id = Number(e.currentTarget.dataset.id)
    const value = e.detail.value
    this.setData({
      workers: this.data.workers.map(worker => worker.id === id ? { ...worker, inputValue: value } : worker)
    })
  },

  onSubmitPieces() {
    const payloads = this.data.workers
      .filter(worker => worker.inputValue !== '')
      .map(worker => post('/work/log', {
        jobId: Number(this.data.orderId),
        workerId: worker.id,
        pieces: Number(worker.inputValue || worker.pieces || 0)
      }))

    if (payloads.length === 0) {
      wx.showToast({ title: '请录入计件数', icon: 'none' })
      return
    }

    Promise.all(payloads).then(() => {
      wx.showToast({ title: '计件已保存', icon: 'success' })
      this.loadSession(this.data.orderId)
    }).catch(() => {})
  },

  onRecordAnomaly() {
    wx.navigateTo({ url: '/pages/anomaly/anomaly?jobId=' + this.data.orderId })
  },

  buildAttendanceRecords() {
    const currentTime = formatTime(new Date())
    return this.data.workers.map(worker => {
      const attendance = worker.attendance || ((worker.checkInTime || worker.hourValue || worker.inputValue) ? 'normal' : 'absent')
      const hours = this.data.mode === 'hourly'
        ? Number(worker.hourValue || worker.hours || 0)
        : Number(worker.hours || 0)
      const pieces = this.data.mode === 'piece'
        ? Number(worker.inputValue || worker.pieces || 0)
        : Number(worker.pieces || 0)

      return {
        workerId: worker.id,
        attendance,
        checkInTime: attendance === 'absent' ? null : (worker.checkInTime || null),
        checkOutTime: attendance === 'absent' ? null : (worker.checkOutTime || currentTime),
        hours: attendance === 'absent' ? 0 : hours,
        pieces: attendance === 'absent' ? 0 : pieces,
        note: worker.note || ''
      }
    })
  },

  onFinishWork() {
    const records = this.buildAttendanceRecords()
    if (records.length === 0) {
      wx.showToast({ title: '暂无考勤数据', icon: 'none' })
      return
    }

    wx.showModal({
      title: '确认收工',
      content: '收工后将提交考勤报告并生成结算单，请确认工时、计件和异常都已录入完成。',
      success: (res) => {
        if (!res.confirm) return

        wx.showLoading({ title: '提交中...' })
        post('/work/attendance', {
          jobId: Number(this.data.orderId),
          records,
          photos: this.data.uploadedPhotos.map(item => item.url)
        }).then(() => {
          return post('/settlements/' + this.data.orderId + '/create')
        }).then(() => {
          wx.removeStorageSync(this.getPhotoStorageKey())
          wx.hideLoading()
          wx.showToast({ title: '已提交核验单', icon: 'success' })
          setTimeout(() => wx.redirectTo({
            url: '/pages/settlement/settlement?jobId=' + this.data.orderId + '&role=manager'
          }), 1200)
        }).catch(() => {
          wx.hideLoading()
        })
      }
    })
  }
})
