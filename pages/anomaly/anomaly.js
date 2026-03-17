const { get, post, upload } = require('../../utils/request')

Page({
  data: {
    jobId: '',
    workerOptions: [],
    selectedWorker: { id: '', name: '请选择工人', jobType: '考勤异常', hours: 0 },
    types: [
      { key: 'early_leave', icon: '\ue832', label: '早退' },
      { key: 'late', icon: '\ue648', label: '迟到' },
      { key: 'absent', icon: '\ue65e', label: '缺勤' },
      { key: 'injury', icon: '\ue601', label: '受伤' }
    ],
    selectedType: 'early_leave',
    time: '18:00',
    actualHours: 0,
    desc: '',
    photos: []
  },

  onLoad(options) {
    const jobId = options.jobId || ''
    this.setData({ jobId })
    if (jobId) {
      this.loadWorkers(jobId)
    }
  },

  loadWorkers(jobId) {
    get('/work/session/' + jobId).then(res => {
      const data = res.data || res || {}
      const checkins = data.checkins || []
      const logs = data.logs || []
      const workers = (data.workers || []).map(app => {
        const worker = app.worker || {}
        const log = logs.find(item => item.workerId === worker.id) || {}
        const checkin = checkins.find(item => item.workerId === worker.id)
        return {
          id: worker.id,
          name: worker.nickname || worker.realName || '临工',
          hours: Number(log.hours || 0),
          checkInTime: log.checkInTime || (checkin ? new Date(checkin.checkInAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '')
        }
      })
      this.setData({
        workerOptions: workers,
        selectedWorker: workers[0]
          ? {
              id: workers[0].id,
              name: workers[0].name,
              jobType: '考勤异常',
              hours: workers[0].hours
            }
          : this.data.selectedWorker
      })
    }).catch(() => {})
  },

  onSelectWorker() {
    if (this.data.workerOptions.length === 0) {
      wx.showToast({ title: '暂无可选工人', icon: 'none' })
      return
    }
    wx.showActionSheet({
      itemList: this.data.workerOptions.map(item => item.name),
      success: (res) => {
        const worker = this.data.workerOptions[res.tapIndex]
        this.setData({
          selectedWorker: {
            id: worker.id,
            name: worker.name,
            jobType: '考勤异常',
            hours: worker.hours
          },
          actualHours: worker.hours || 0
        })
      }
    })
  },

  onTypeTap(e) {
    this.setData({ selectedType: e.currentTarget.dataset.key })
  },

  onTimePick(e) {
    this.setData({ time: e.detail.value })
  },

  onDescInput(e) {
    this.setData({ desc: e.detail.value })
  },

  onAddPhoto() {
    wx.chooseMedia({
      count: 3 - this.data.photos.length,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        const newPhotos = res.tempFiles.map(file => file.tempFilePath)
        const uploads = newPhotos.map(path => upload(path))
        Promise.all(uploads).then(results => {
          const urls = results.map(item => item.data.url || item.data)
          this.setData({ photos: [...this.data.photos, ...urls] })
        }).catch(() => {
          this.setData({ photos: [...this.data.photos, ...newPhotos] })
        })
      }
    })
  },

  onSubmit() {
    if (!this.data.selectedWorker.id) {
      wx.showToast({ title: '请选择工人', icon: 'none' })
      return
    }
    if (!this.data.desc.trim()) {
      wx.showToast({ title: '请填写情况说明', icon: 'none' })
      return
    }

    wx.showModal({
      title: '确认提交',
      content: '异常记录将进入考勤核验单，确认提交？',
      confirmColor: '#F43F5E',
      success: (res) => {
        if (!res.confirm) return

        wx.showLoading({ title: '提交中...' })
        post('/work/anomaly', {
          jobId: Number(this.data.jobId),
          targetWorkerId: Number(this.data.selectedWorker.id),
          anomalyType: this.data.selectedType,
          anomalyNote: this.data.desc,
          time: this.data.time,
          hours: Number(this.data.actualHours || 0),
          photoUrls: this.data.photos
        }).then(() => {
          wx.hideLoading()
          wx.showToast({ title: '提交成功', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 1000)
        }).catch(() => {
          wx.hideLoading()
        })
      }
    })
  }
})
