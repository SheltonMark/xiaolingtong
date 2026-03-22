const { get, post, upload } = require('../../utils/request')
const { normalizeImageUrl } = require('../../utils/image')

const ATTENDANCE_OPTIONS = [
  { value: 'normal', label: '正常' },
  { value: 'late', label: '迟到' },
  { value: 'early_leave', label: '早退' },
  { value: 'absent', label: '缺勤' },
  { value: 'injury', label: '受伤' },
  { value: 'fraud', label: '其他异常' }
]

function formatClock(date, includeSeconds = false) {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return includeSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`
}

function parseClock(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3] || 0)
  if (
    !Number.isInteger(hours)
    || !Number.isInteger(minutes)
    || !Number.isInteger(seconds)
    || hours < 0
    || hours > 23
    || minutes < 0
    || minutes > 59
    || seconds < 0
    || seconds > 59
  ) {
    return null
  }
  return { hours, minutes, seconds }
}

function calculateHours(checkInTime, checkOutTime) {
  const start = parseClock(checkInTime)
  const end = parseClock(checkOutTime)
  if (!start || !end) return 0
  const startSeconds = start.hours * 3600 + start.minutes * 60 + start.seconds
  const endSeconds = end.hours * 3600 + end.minutes * 60 + end.seconds
  if (endSeconds < startSeconds) return 0
  return Math.round(((endSeconds - startSeconds) / 3600) * 100) / 100
}

function formatHoursText(hours) {
  const value = Number(hours || 0)
  return `${value.toFixed(1)}h`
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

function getCheckoutRuleHint(rule) {
  if (!rule || !rule.plannedCheckOutTime) return ''
  return `计划签退 ${rule.plannedCheckOutTime}，正常窗口 ${rule.checkoutWindowStartTime}-${rule.checkoutWindowEndTime}`
}

function getAttendanceText(attendanceStatus) {
  const map = {
    normal: '正常',
    late: '迟到',
    early_leave: '早退',
    absent: '缺勤',
    injury: '受伤',
    fraud: '其他异常'
  }
  return map[attendanceStatus] || '正常'
}

Page({
  data: {
    orderId: '',
    mode: 'hourly',
    loading: true,
    savingRecords: false,
    submittingFinish: false,
    hasDraftChanges: false,
    currentClock: '',
    quickCheckoutWorkerId: null,
    statusSavingWorkerId: null,
    jobInfo: {},
    jobStatus: '',
    canFinishWork: true,
    finishButtonText: '确认收工',
    lockedActionText: '去结算',
    attendanceOptions: ATTENDANCE_OPTIONS,
    status: {},
    pieceStatus: {},
    photoRecords: [],
    uploadedPhotos: [],
    workers: []
  },

  onLoad(options) {
    this.dirtyWorkerIds = new Set()
    const orderId = options.orderId || ''
    const mode = options.mode || 'hourly'
    this.setData({ orderId, mode })
    this.startClock()
    if (orderId) {
      this.loadSession(orderId)
    }
  },

  onShow() {
    this.startClock()
    if (this.data.orderId) {
      this.loadSession(this.data.orderId)
    }
  },

  onHide() {
    this.stopClock()
  },

  onUnload() {
    this.stopClock()
  },

  startClock() {
    this.syncCurrentClock()
    if (this.clockTimer || this.data.mode !== 'hourly') return
    this.clockTimer = setInterval(() => this.syncCurrentClock(), 1000)
  },

  stopClock() {
    if (!this.clockTimer) return
    clearInterval(this.clockTimer)
    this.clockTimer = null
  },

  syncCurrentClock() {
    const currentClock = formatClock(new Date(), true)
    const workers = (this.data.workers || []).map(worker => {
      if (this.data.mode !== 'hourly' || worker.checkedOut || worker.signingOut) {
        return worker
      }
      return {
        ...worker,
        checkoutButtonText: worker.checkoutDisabled ? '签退' : `${currentClock} 签退`
      }
    })
    this.setData({ currentClock, workers })
  },

  syncDraftChangeFlag() {
    const hasDraftChanges = !!(this.dirtyWorkerIds && this.dirtyWorkerIds.size > 0)
    if (this.data.hasDraftChanges !== hasDraftChanges) {
      this.setData({ hasDraftChanges })
    }
  },

  markWorkerDirty(workerId) {
    if (!this.dirtyWorkerIds) this.dirtyWorkerIds = new Set()
    this.dirtyWorkerIds.add(Number(workerId))
    this.syncDraftChangeFlag()
  },

  clearWorkerDirty(workerId) {
    if (!this.dirtyWorkerIds) return
    this.dirtyWorkerIds.delete(Number(workerId))
    this.syncDraftChangeFlag()
  },

  resetDirtyWorkers() {
    this.dirtyWorkerIds = new Set()
    this.syncDraftChangeFlag()
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

  getLockedActionText(jobStatus) {
    const map = {
      pending_settlement: '去结算',
      settled: '查看结算',
      closed: '查看结果'
    }
    return map[jobStatus] || '去结算'
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
        timeRange: `${String(slotStart).padStart(2, '0')}:00 - ${String(slotEnd).padStart(2, '0')}:00`,
        status: matchedPhoto ? 'done' : (now.getHours() >= slotStart ? 'pending' : 'future'),
        uploadTime: matchedPhoto ? formatClock(new Date(matchedPhoto.uploadedAt)) : '',
        photoUrl: matchedPhoto ? matchedPhoto.url : ''
      }
    }).filter(item => item.status !== 'future')
  },

  normalizeHourlyWorker(item) {
    const attendanceStatus = item.attendanceStatus || item.attendance || 'normal'
    const checkedOut = !!item.checkedOut || !!item.checkOutTime
    const canQuickCheckout = !!item.canQuickCheckout || (!!item.checkInTime && !checkedOut && attendanceStatus !== 'absent')
    const checkoutDisabled = !this.data.canFinishWork || !canQuickCheckout
    return {
      id: Number(item.workerId || item.id),
      displayName: item.displayName || item.name || '临工',
      attendanceStatus,
      attendanceStatusText: item.attendanceStatusText || getAttendanceText(attendanceStatus),
      statusSource: item.statusSource || 'system',
      statusNote: item.statusNote || item.note || '',
      checkInTime: item.checkInTime || '',
      checkOutTime: item.checkOutTime || '',
      hours: Number(item.hours || 0),
      hoursText: formatHoursText(item.hours || 0),
      checkedOut,
      canQuickCheckout,
      checkoutDisabled,
      signingOut: false,
      remarkExpanded: false,
      editingCheckoutTime: false,
      manualCheckoutTime: item.checkOutTime ? String(item.checkOutTime).slice(0, 5) : '',
      checkoutButtonText: checkedOut ? '已签退' : (checkoutDisabled ? '签退' : `${this.data.currentClock || formatClock(new Date(), true)} 签退`)
    }
  },

  buildFallbackHourlyWorkers(allWorkers, checkins, logs) {
    const checkinMap = {}
    checkins.forEach(checkin => {
      checkinMap[checkin.workerId] = checkin
    })

    const dailyLogMap = {}
    logs.forEach(log => {
      const current = dailyLogMap[log.workerId] || {
        workerId: log.workerId,
        hours: 0,
        anomalyType: 'normal',
        anomalyNote: '',
        checkInTime: '',
        checkOutTime: ''
      }
      current.hours = Math.max(Number(current.hours || 0), Number(log.hours || 0))
      current.anomalyType = log.anomalyType && log.anomalyType !== 'normal' ? log.anomalyType : current.anomalyType
      current.anomalyNote = log.anomalyNote || current.anomalyNote
      current.checkInTime = log.checkInTime || current.checkInTime
      current.checkOutTime = log.checkOutTime || current.checkOutTime
      dailyLogMap[log.workerId] = current
    })

    return allWorkers.map(app => {
      const worker = app.worker || {}
      const checkin = checkinMap[worker.id]
      const log = dailyLogMap[worker.id] || {}
      const checkInTime = log.checkInTime || (checkin ? formatClock(new Date(checkin.checkInAt), true) : '')
      const checkOutTime = log.checkOutTime || ''
      const hours = Number(log.hours || calculateHours(checkInTime, checkOutTime) || 0)
      const attendanceStatus = log.anomalyType || (checkInTime ? 'normal' : 'absent')
      return this.normalizeHourlyWorker({
        workerId: worker.id,
        displayName: worker.name || worker.nickname || '临工',
        attendanceStatus,
        statusNote: log.anomalyNote || '',
        checkInTime,
        checkOutTime,
        hours,
        checkedOut: !!checkOutTime,
        canQuickCheckout: !!checkInTime && !checkOutTime
      })
    })
  },

  buildHourlyStatus(job, company, summary, workers, checkoutRule) {
    return {
      company,
      jobType: job.title || '临时工',
      hoursToday: workers.reduce((sum, worker) => sum + Number(worker.hours || 0), 0).toFixed(1),
      startTime: (job.workHours || '08:00-18:00').split('-')[0] || '08:00',
      todayAttend: summary.presentCount,
      todayAnomaly: summary.abnormalCount,
      checkedOutCount: summary.checkedOutCount,
      estimateEnd: (job.workHours || '08:00-18:00').split('-')[1] || '18:00',
      checkoutRuleHint: getCheckoutRuleHint(checkoutRule)
    }
  },

  setHourlyWorkers(workers) {
    const summary = {
      presentCount: workers.filter(worker => worker.attendanceStatus !== 'absent').length,
      abnormalCount: workers.filter(worker => worker.attendanceStatus !== 'normal').length,
      checkedOutCount: workers.filter(worker => !!worker.checkedOut).length
    }
    this.setData({
      workers,
      status: this.buildHourlyStatus(
        this.data.jobInfo,
        this.data.status.company || '',
        summary,
        workers,
        this.data.status.checkoutRule
      )
    })
  },

  loadSession(jobId) {
    this.setData({ loading: true })
    get('/work/session/' + jobId).then(res => {
      const data = res.data || res || {}
      const job = data.job || {}
      const logs = data.logs || []
      const checkins = data.checkins || []
      const allWorkers = data.workers || []
      const sessionWorkers = data.sessionWorkers || []
      const jobStatus = job.status || ''
      const canFinishWork = !this.isWorkLocked(jobStatus)
      const company = job.companyName || (job.user && job.user.companyName) || '企业'
      const checkoutRule = data.checkoutRule || null
      const cachedPhotos = this.loadCachedPhotos()
      const uploadPhotos = Array.from(new Map(
        [...cachedPhotos, ...(logs.flatMap(log => (log.photoUrls || []).map(url => ({ url, uploadedAt: log.updatedAt || log.createdAt || new Date().toISOString() }))))]
          .map(photo => {
            const normalized = normalizePhotoItem(photo)
            return normalized ? [normalized.url, normalized] : null
          })
          .filter(Boolean)
      ).values())

      const pieceWorkers = allWorkers.map(app => {
        const worker = app.worker || {}
        const matchedLog = logs.find(log => Number(log.workerId) === Number(worker.id)) || {}
        const pieces = Number(matchedLog.pieces || 0)
        return {
          id: worker.id,
          displayName: worker.name || worker.nickname || '临工',
          inputValue: matchedLog.pieces !== undefined && matchedLog.pieces !== null ? String(matchedLog.pieces) : '',
          pieces,
          todayPieces: pieces,
          totalPieces: pieces
        }
      })

      const hourlyWorkers = (sessionWorkers.length ? sessionWorkers : this.buildFallbackHourlyWorkers(allWorkers, checkins, logs))
        .map(item => this.normalizeHourlyWorker(item))
        .map(worker => ({
          ...worker,
          checkoutDisabled: !canFinishWork || !worker.canQuickCheckout,
          checkoutButtonText: worker.checkedOut
            ? '已签退'
            : ((!canFinishWork || !worker.canQuickCheckout) ? '签退' : `${this.data.currentClock || formatClock(new Date(), true)} 签退`)
        }))
      const summary = data.summary || {
        presentCount: hourlyWorkers.filter(worker => worker.attendanceStatus !== 'absent').length,
        abnormalCount: hourlyWorkers.filter(worker => worker.attendanceStatus !== 'normal').length,
        checkedOutCount: hourlyWorkers.filter(worker => !!worker.checkedOut).length
      }
      const totalPiecesToday = pieceWorkers.reduce((sum, worker) => sum + Number(worker.inputValue || worker.pieces || 0), 0)

      this.persistPhotos(uploadPhotos)
      this.resetDirtyWorkers()
      this.setData({
        loading: false,
        jobInfo: job,
        jobStatus,
        canFinishWork,
        finishButtonText: this.getFinishButtonText(jobStatus),
        lockedActionText: this.getLockedActionText(jobStatus),
        uploadedPhotos: uploadPhotos,
        photoRecords: this.buildPhotoRecords(job, uploadPhotos),
        workers: this.data.mode === 'hourly' ? hourlyWorkers : pieceWorkers,
        status: {
          ...this.buildHourlyStatus(job, company, summary, hourlyWorkers, checkoutRule),
          checkoutRule
        },
        pieceStatus: {
          company,
          jobType: job.title || '临时工',
          piecesToday: totalPiecesToday,
          pricePerPiece: job.salary || 0,
          earningsToday: (totalPiecesToday * Number(job.salary || 0)).toFixed(0),
          todayAttend: pieceWorkers.length,
          todayAnomaly: 0
        }
      }, () => {
        if (this.data.mode === 'hourly') {
          this.syncCurrentClock()
        }
      })
    }).catch(() => {
      this.setData({ loading: false })
    })
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
                  uploadTime: formatClock(new Date(photo.uploadedAt)),
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

  onPieceInput(e) {
    const id = Number(e.currentTarget.dataset.id)
    const value = e.detail.value
    this.markWorkerDirty(id)
    this.setData({
      workers: this.data.workers.map(worker => worker.id === id ? { ...worker, inputValue: value } : worker)
    })
  },

  applyQuickCheckout(workerId, result) {
    const workers = (this.data.workers || []).map(worker => {
      if (Number(worker.id) !== Number(workerId)) return worker
      const attendanceStatus = result.attendanceStatus || result.anomalyType || worker.attendanceStatus
      const hours = Number(result.hours || 0)
      return {
        ...worker,
        attendanceStatus,
        attendanceStatusText: result.attendanceStatusText || getAttendanceText(attendanceStatus),
        statusSource: result.statusSource || worker.statusSource,
        statusNote: result.statusNote !== undefined ? result.statusNote : worker.statusNote,
        checkInTime: result.checkInTime || worker.checkInTime,
        checkOutTime: result.checkOutTime || worker.checkOutTime,
        manualCheckoutTime: result.checkOutTime ? String(result.checkOutTime).slice(0, 5) : worker.manualCheckoutTime,
        hours,
        hoursText: formatHoursText(hours),
        checkedOut: true,
        canQuickCheckout: false,
        checkoutDisabled: true,
        checkoutButtonText: '已签退',
        signingOut: false
      }
    })
    this.setHourlyWorkers(workers)
  },

  onQuickCheckout(e) {
    if (!this.data.canFinishWork || this.isWorkLocked()) {
      wx.showToast({ title: '当前记录已提交收工', icon: 'none' })
      return
    }

    const workerId = Number(e.currentTarget.dataset.id)
    const worker = (this.data.workers || []).find(item => Number(item.id) === workerId)
    if (!worker || !worker.checkInTime) {
      wx.showToast({ title: '请先签到', icon: 'none' })
      return
    }
    if (worker.checkedOut || worker.signingOut) {
      return
    }

    this.setData({
      quickCheckoutWorkerId: workerId,
      workers: this.data.workers.map(item => item.id === workerId ? { ...item, signingOut: true, checkoutButtonText: '签退中...' } : item)
    })

    post('/work/log/quick-checkout', {
      jobId: Number(this.data.orderId),
      workerId
    }).then(res => {
      const result = res.data || res || {}
      this.applyQuickCheckout(workerId, result)
      wx.showToast({ title: '已签退', icon: 'success' })
    }).catch(() => {
      this.setData({
        workers: this.data.workers.map(item => item.id === workerId ? {
          ...item,
          signingOut: false,
          checkoutButtonText: `${this.data.currentClock} 签退`
        } : item)
      })
      wx.showToast({ title: '签退失败，请重试', icon: 'none' })
    }).finally(() => {
      if (this.data.quickCheckoutWorkerId === workerId) {
        this.setData({ quickCheckoutWorkerId: null })
      }
    })
  },

  onToggleRemark(e) {
    const workerId = Number(e.currentTarget.dataset.id)
    this.setData({
      workers: this.data.workers.map(worker => worker.id === workerId
        ? { ...worker, remarkExpanded: !worker.remarkExpanded }
        : worker)
    })
  },

  onRemarkInput(e) {
    const workerId = Number(e.currentTarget.dataset.id)
    const statusNote = e.detail.value
    this.setData({
      workers: this.data.workers.map(worker => worker.id === workerId ? { ...worker, statusNote } : worker)
    })
  },

  onStatusChange(e) {
    const workerId = Number(e.currentTarget.dataset.id)
    const option = ATTENDANCE_OPTIONS[Number(e.detail.value)] || ATTENDANCE_OPTIONS[0]
    const worker = (this.data.workers || []).find(item => item.id === workerId)
    if (!worker) return

    this.setData({
      statusSavingWorkerId: workerId,
      workers: this.data.workers.map(item => item.id === workerId ? {
        ...item,
        attendanceStatus: option.value,
        attendanceStatusText: option.label
      } : item)
    })

    post('/work/log/status', {
      jobId: Number(this.data.orderId),
      workerId,
      attendanceStatus: option.value,
      statusNote: worker.statusNote || ''
    }).then(res => {
      const result = res.data || res || {}
      const workers = this.data.workers.map(item => {
        if (item.id !== workerId) return item
        const nextStatus = result.attendanceStatus || option.value
        const isAbsent = nextStatus === 'absent'
        return {
          ...item,
          attendanceStatus: nextStatus,
          attendanceStatusText: result.attendanceStatusText || option.label,
          statusSource: result.statusSource || 'manual',
          statusNote: result.statusNote !== undefined ? result.statusNote : item.statusNote,
          checkInTime: isAbsent ? '' : item.checkInTime,
          checkOutTime: isAbsent ? '' : item.checkOutTime,
          manualCheckoutTime: isAbsent ? '' : item.manualCheckoutTime,
          checkedOut: isAbsent ? false : item.checkedOut,
          canQuickCheckout: isAbsent ? false : item.canQuickCheckout,
          checkoutDisabled: isAbsent ? true : item.checkoutDisabled,
          hours: isAbsent ? 0 : item.hours,
          hoursText: isAbsent ? formatHoursText(0) : item.hoursText,
          checkoutButtonText: isAbsent ? '签退' : item.checkoutButtonText
        }
      })
      this.setHourlyWorkers(workers)
      wx.showToast({ title: '状态已更新', icon: 'success' })
    }).catch(() => {
      wx.showToast({ title: '状态保存失败', icon: 'none' })
      this.loadSession(this.data.orderId)
    }).finally(() => {
      if (this.data.statusSavingWorkerId === workerId) {
        this.setData({ statusSavingWorkerId: null })
      }
    })
  },

  onRemarkBlur(e) {
    const workerId = Number(e.currentTarget.dataset.id)
    const worker = (this.data.workers || []).find(item => item.id === workerId)
    if (!worker) return

    post('/work/log/status', {
      jobId: Number(this.data.orderId),
      workerId,
      attendanceStatus: worker.attendanceStatus,
      statusNote: e.detail.value || worker.statusNote || ''
    }).then(res => {
      const result = res.data || res || {}
      const workers = this.data.workers.map(item => item.id === workerId ? {
        ...item,
        statusNote: result.statusNote !== undefined ? result.statusNote : (e.detail.value || '')
      } : item)
      this.setHourlyWorkers(workers)
    }).catch(() => {
      wx.showToast({ title: '备注保存失败', icon: 'none' })
    })
  },

  onToggleEditCheckoutTime(e) {
    const workerId = Number(e.currentTarget.dataset.id)
    this.setData({
      workers: this.data.workers.map(worker => worker.id === workerId
        ? { ...worker, editingCheckoutTime: !worker.editingCheckoutTime, remarkExpanded: true }
        : worker)
    })
  },

  onManualCheckoutChange(e) {
    const workerId = Number(e.currentTarget.dataset.id)
    const checkOutTime = e.detail.value
    const worker = (this.data.workers || []).find(item => item.id === workerId)
    if (!worker) return

    post('/work/log', {
      jobId: Number(this.data.orderId),
      workerId,
      attendance: worker.attendanceStatus,
      note: worker.statusNote || '',
      checkInTime: worker.checkInTime || undefined,
      checkOutTime
    }).then(res => {
      const result = res.data || res || {}
      const hours = Number(result.hours || calculateHours(worker.checkInTime, result.checkOutTime || checkOutTime))
      const attendanceStatus = result.anomalyType || worker.attendanceStatus
      const workers = this.data.workers.map(item => item.id === workerId ? {
        ...item,
        attendanceStatus,
        attendanceStatusText: getAttendanceText(attendanceStatus),
        checkOutTime: result.checkOutTime || checkOutTime,
        manualCheckoutTime: (result.checkOutTime || checkOutTime || '').slice(0, 5),
        hours,
        hoursText: formatHoursText(hours),
        checkedOut: !!(result.checkOutTime || checkOutTime),
        editingCheckoutTime: false,
        checkoutDisabled: !item.canQuickCheckout || !!(result.checkOutTime || checkOutTime),
        checkoutButtonText: '已签退'
      } : item)
      this.setHourlyWorkers(workers)
      wx.showToast({ title: '签退时间已更新', icon: 'success' })
    }).catch(() => {
      wx.showToast({ title: '更新时间失败', icon: 'none' })
    })
  },

  collectDraftPayloads() {
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
      wx.showToast({ title: '请先录入计件数量', icon: 'none' })
      return
    }

    this.setData({ savingRecords: true })
    Promise.all(drafts.map(payload => post('/work/log', payload))).then(() => {
      this.resetDirtyWorkers()
      wx.showToast({ title: '计件已暂存', icon: 'success' })
      this.loadSession(this.data.orderId)
    }).catch(() => {}).finally(() => {
      this.setData({ savingRecords: false })
    })
  },

  onSubmitPieces() {
    this.onSaveHours()
  },

  buildAttendanceRecords(options = {}) {
    const currentTime = options.currentTime || formatClock(new Date(), true)
    const autoFillCheckoutTime = !!options.autoFillCheckoutTime
    return this.data.workers.map(worker => {
      const attendance = this.data.mode === 'hourly'
        ? (worker.attendanceStatus || ((worker.checkInTime || worker.checkOutTime) ? 'normal' : 'absent'))
        : ((worker.inputValue || worker.pieces) ? 'normal' : 'absent')
      const checkOutTime = this.data.mode === 'hourly'
        ? (attendance === 'absent'
          ? null
          : (worker.checkOutTime || (autoFillCheckoutTime && worker.checkInTime ? currentTime : null)))
        : null
      const hours = this.data.mode === 'hourly'
        ? (attendance === 'absent'
          ? 0
          : Number(worker.hours || calculateHours(worker.checkInTime, checkOutTime)))
        : Number(worker.hours || 0)
      const pieces = this.data.mode === 'piece'
        ? (attendance === 'absent' ? 0 : Number(worker.inputValue || worker.pieces || 0))
        : Number(worker.pieces || 0)

      return {
        workerId: worker.id,
        name: worker.displayName,
        attendance,
        checkInTime: attendance === 'absent' ? null : (worker.checkInTime || null),
        checkOutTime,
        hours,
        pieces,
        note: worker.statusNote || ''
      }
    })
  },

  getWorkerNames(workers) {
    if (!workers || workers.length === 0) return ''
    const names = workers.map(worker => worker.displayName || worker.name)
    if (names.length <= 3) {
      return names.join('、')
    }
    return `${names.slice(0, 3).join('、')} 等${names.length}人`
  },

  validateBeforeFinish() {
    const currentTime = formatClock(new Date(), true)
    const records = this.buildAttendanceRecords({ currentTime, autoFillCheckoutTime: false })
    const activeRecords = records.filter(record => record.attendance !== 'absent')

    if (activeRecords.length === 0) {
      return {
        ok: false,
        message: '至少保留 1 名出勤人员后再确认收工'
      }
    }

    if (this.data.mode === 'piece') {
      const invalidPieces = activeRecords.filter(record => Number(record.pieces || 0) <= 0)
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
      missingCheckoutWorkers
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
      this.resetDirtyWorkers()
      this.setData({
        canFinishWork: false,
        finishButtonText: '已提交收工',
        lockedActionText: '去结算',
        jobStatus: 'pending_settlement'
      })
      setTimeout(() => wx.redirectTo({
        url: '/pages/job-process/job-process?jobId=' + this.data.orderId + '&tab=settlement&role=manager'
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
      const contentLines = ['收工后将提交考勤并生成结算单，请确认记录已核对完成。']
      if (autoFillCheckoutTime) {
        contentLines.push(`未签退人员将按 ${validation.currentTime} 自动补齐签退时间。`)
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
        content: `${this.getWorkerNames(validation.missingCheckoutWorkers)} 还未签退，将按当前时间 ${validation.currentTime} 自动补齐后收工，是否继续？`,
        success: (res) => {
          if (!res.confirm) return
          continueFinish(true)
        }
      })
      return
    }

    continueFinish(false)
  },

  onGoSettlement() {
    if (!this.data.orderId) return
    wx.redirectTo({
      url: '/pages/job-process/job-process?jobId=' + this.data.orderId + '&tab=settlement&role=manager'
    })
  }
})
