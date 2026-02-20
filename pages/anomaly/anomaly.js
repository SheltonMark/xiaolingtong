Page({
  data: {
    selectedWorker: { name: '王五', jobType: '电子组装工', hours: '6' },
    types: [
      { key: 'early', icon: '🚪', label: '早退' },
      { key: 'late', icon: '⏰', label: '迟到' },
      { key: 'switch', icon: '🔄', label: '换岗' },
      { key: 'absent', icon: '🚫', label: '旷工' },
      { key: 'injury', icon: '🤕', label: '工伤' },
      { key: 'other', icon: '📝', label: '其他' }
    ],
    selectedType: 'early',
    time: '14:30',
    actualHours: 6,
    desc: '',
    photos: []
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
        this.setData({ photos: [...this.data.photos, ...newPhotos] })
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
          wx.showToast({ title: '提交成功', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 1500)
        }
      }
    })
  }
})
