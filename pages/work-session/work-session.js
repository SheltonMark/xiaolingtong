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
    savingRecords: false,
    submittingFinish: false,
    jobStatus: '',
    canFinishWork: true,
    finishButtonText: '确认收工',
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

  isWorkLocked(jobStatus = this.data.jobStatus) {
    return ['pending_settlement', 'settled', 'closed'].includes(jobStatus)
  },

  getFinishButtonText(jobStatus) {
    const map = {
      pending_settlement: '已提交收工',
      settled: '结算处理中',
      closed: '已完成'
    }
    return map[jobStatus] || '确认收工'
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
      const jobStatus = job.status || ''
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
        const pieces = Number(log.pieces || 0)
        return {
          id: worker.id,
          name: worker.nickname || worker.realName || '临工',
          attendance,
          attendanceText: this.getAttendanceText(attendance),
          checkInTime,
          checkOutTime: log.checkOutTime || '',
          hours: Number(log.hours || 0),
          pieces,
          note: log.anomalyNote || '',
          hourValue: log.hours !== undefined && log.hours !== null ? String(log.hours) : '',
          inputValue: log.pieces !== undefined && log.pieces !== null ? String(log.pieces) : '',
          todayPieces: pieces,
          totalPieces: pieces
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
          .map(photo => {
            const normalized = normalizePhotoItem(photo)
            return normalized ? [normalized.url, normalized] : null
          })
          .filter(Boolean)
      ).values())

      this.persistPhotos(uploadPhotos)
      this.setData({
        loading: false,
        jobStatus,
        canFinishWork: !this.isWorkLocked(jobStatus),
        finishButtonText: this.getFinishButtonText(jobStatus),
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
    if (!this.data.canFinishWork) {
      wx.showToast({ title: '当前记录已提交收工', icon: 'none' })
      return
    }

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

  onPieceInput(e) {
    const id = Number(e.currentTarget.dataset.id)
    const value = e.detail.value
    this.setData({
      workers: this.data.workers.map(worker => worker.id === id ? { ...worker, inputValue: value } : worker)
    })
  },

  collectDraftPayloads() {
    if (this.data.mode === 'hourly') {
      return this.data.workers
        .filter(worker => worker.hourValue !== '' || worker.checkOutTime)
        .map(worker => ({
          jobId: Number(this.data.orderId),
          workerId: worker.id,
          hours: Number(worker.hourValue || worker.hours || 0),
          checkInTime: worker.checkInTime || undefined,
          checkOutTime: worker.checkOutTime || undefined
        }))
    }

    return this.data.workers
      .filter(worker => worker.inputValue !== '')
      .map(worker => ({
        jobId: Number(this.data.orderId),
        workerId: worker.id,
        pieces: Number(worker.inputValue || worker.pieces || 0)
      }))
  },

  onSaveHours() {
    if (this.isWorkLocked()) {
      wx.showToast({ title: '当前记录已提交收工', icon: 'none' })
      return
    }
    if (this.data.savingRecords) {
      return
    }

    const drafts = this.collectDraftPayloads()
    if (drafts.length === 0) {
      wx.showToast({ title: this.data.mode === 'hourly' ? '请先录入工时或签退时间' : '请先录入计件数量', icon: 'none' })
      return
    }

    this.setData({ savingRecords: true })
    Promise.all(drafts.map(payload => post('/work/log', payload))).then(() => {
      wx.showToast({ title: this.data.mode === 'hourly' ? '记录已暂存' : '计件已暂存', icon: 'success' })
      this.loadSession(this.data.orderId)
    }).catch(() => {}).finally(() => {
      this.setData({ savingRecords: false })
    })
  },

  onSubmitPieces() {
    this.onSaveHours()
  },

  onRecordAnomaly() {
    if (!this.data.canFinishWork) {
      wx.showToast({ title: '当前记录已提交收工', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/anomaly/anomaly?jobId=' + this.data.orderId })
  },

  buildAttendanceRecords(options = {}) {
    const currentTime = options.currentTime || formatTime(new Date())
    const autoFillCheckoutTime = !!options.autoFillCheckoutTime
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
        name: worker.name,
        attendance,
        checkInTime: attendance === 'absent' ? null : (worker.checkInTime || null),
        checkOutTime: attendance === 'absent' ? null : (worker.checkOutTime || (autoFillCheckoutTime ? currentTime : null)),
        hours: attendance === 'absent' ? 0 : hours,
        pieces: attendance === 'absent' ? 0 : pieces,
        note: worker.note || ''
      }
    })
  },

  getWorkerNames(workers) {
    if (!workers || workers.length === 0) return ''
    const names = workers.map(worker => worker.name)
    if (names.length <= 3) {
      return names.join('、')
    }
    return names.slice(0, 3).join('、') + ` 等${names.length}人`
  },

  validateBeforeFinish() {
    const currentTime = formatTime(new Date())
    const records = this.buildAttendanceRecords({ currentTime, autoFillCheckoutTime: false })
    const activeRecords = records.filter(record => record.attendance !== 'absent')

    if (activeRecords.length === 0) {
      return {
        ok: false,
        message: '至少保留 1 名出勤人员后再确认收工'
      }
    }

    if (this.data.mode === 'hourly') {
      const invalidHours = activeRecords.filter(record => (
        ['normal', 'late', 'early_leave'].includes(record.attendance)
        && Number(record.hours || 0) <= 0
      ))
      if (invalidHours.length > 0) {
        return {
          ok: false,
          message: `${this.getWorkerNames(invalidHours)} 还未填写有效工时`
        }
      }
    } else {
      const invalidPieces = activeRecords.filter(record => (
        ['normal', 'late'].includes(record.attendance)
        && Number(record.pieces || 0) <= 0
      ))
      if (invalidPieces.length > 0) {
        return {
          ok: false,
          message: `${this.getWorkerNames(invalidPieces)} 还未填写计件数量`
        }
      }
    }

    const missingCheckoutWorkers = this.data.mode === 'hourly'
      ? activeRecords.filter(record => !record.checkOutTime)
      : []

    return {
      ok: true,
      currentTime,
      missingCheckoutWorkers,
      pendingPhotoCount: this.data.photoRecords.filter(item => item.status === 'pending').length
    }
  },

  submitFinish(records) {
    if (this.data.submittingFinish) {
      return
    }

    this.setData({ submittingFinish: true })
    wx.showLoading({ title: '提交中...' })
    post('/work/attendance', {
      jobId: Number(this.data.orderId),
      records: records.map(({ workerId, attendance, checkInTime, checkOutTime, hours, pieces, note }) => ({
        workerId,
        attendance,
        checkInTime,
        checkOutTime,
        hours,
        pieces,
        note
      })),
      photos: this.data.uploadedPhotos.map(item => item.url)
    }).then(() => {
      return post('/settlements/' + this.data.orderId + '/create')
    }).then((result) => {
      const payload = result.data || result || {}
      wx.removeStorageSync(this.getPhotoStorageKey())
      wx.hideLoading()
      wx.showToast({ title: payload.existing ? '已进入结算' : '已提交收工', icon: 'success' })
      this.setData({
        canFinishWork: false,
        finishButtonText: '已提交收工',
        jobStatus: 'pending_settlement'
      })
      setTimeout(() => wx.redirectTo({
        url: '/pages/settlement/settlement?jobId=' + this.data.orderId + '&role=manager'
      }), 1200)
    }).catch(() => {
      wx.hideLoading()
    }).finally(() => {
      this.setData({ submittingFinish: false })
    })
  },

  onFinishWork() {
    if (this.isWorkLocked()) {
      wx.showToast({ title: '当前记录已提交收工', icon: 'none' })
      return
    }
    if (this.data.submittingFinish) {
      return
    }

    const validation = this.validateBeforeFinish()
    if (!validation.ok) {
      wx.showToast({ title: validation.message, icon: 'none' })
      return
    }

    const continueFinish = (autoFillCheckoutTime) => {
      const records = this.buildAttendanceRecords({
        currentTime: validation.currentTime,
        autoFillCheckoutTime
      })
      const contentLines = ['收工后将提交考勤报告并生成结算单，请确认工时、计件和异常都已录入完成。']
      if (autoFillCheckoutTime) {
        contentLines.push(`未填写签退时间的人员将自动按 ${validation.currentTime} 收工。`)
      }
      if (validation.pendingPhotoCount > 0) {
        contentLines.push(`还有 ${validation.pendingPhotoCount} 个现场拍照时段未上传，请确认是否继续。`)
      }

      wx.showModal({
        title: '确认收工',
        content: contentLines.join('\n'),
        success: (res) => {
          if (!res.confirm) return
          this.submitFinish(records)
        }
      })
    }

    if (validation.missingCheckoutWorkers.length > 0) {
      wx.showModal({
        title: '补齐签退时间',
        content: `${this.getWorkerNames(validation.missingCheckoutWorkers)} 未填写签退时间，将按当前时间 ${validation.currentTime} 自动补齐后收工，是否继续？`,
        success: (res) => {
          if (!res.confirm) return
          continueFinish(true)
        }
      })
      return
    }

    continueFinish(false)
  }
})
