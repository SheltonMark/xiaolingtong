const { post, upload } = require('../../utils/request')

Page({
  data: {
    selectedWorker: { name: '', jobType: '', hours: '' },
    types: [
      { key: 'early', icon: '\ue832', label: '早退' },
      { key: 'late', icon: '\ue648', label: '迟到' },
      { key: 'switch', icon: '\ue67c', label: '换岗' },
      { key: 'absent', icon: '\ue65e', label: '旷工' },
      { key: 'injury', icon: '\ue601', label: '工伤' },
      { key: 'other', icon: '\ue620', label: '其他' }
    ],
    selectedType: 'early',
    time: '14:30',
    actualHours: 6,
    desc: '',
    photos: []
  },

  onLoad(options) {
    if (options.workerName) {
      this.setData({ 'selectedWorker.name': options.workerName })
    }
  },

  onSelectWorker() {
    wx.showToast({ title: '选择工人', icon: 'none' })
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

  onSubmit() {
    if (!this.data.desc.trim()) {
      wx.showToast({ title: '请填写情况说明', icon: 'none' })
      return
    }
    wx.showModal({
      title: '确认提交',
      content: '异常记录将影响该工人本次工时结算，确认提交？',
      confirmColor: '#F43F5E',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '提交中...' })
          post('/work/anomaly', {
            workerName: this.data.selectedWorker.name,
            type: this.data.selectedType,
            time: this.data.time,
            actualHours: this.data.actualHours,
            notes: this.data.desc,
            photos: this.data.photos
          }).then(() => {
            wx.hideLoading()
            wx.showToast({ title: '提交成功', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 1500)
          }).catch(() => { wx.hideLoading() })
        }
      }
    })
  }
})
