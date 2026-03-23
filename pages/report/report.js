const { post, upload } = require('../../utils/request')

Page({
  data: {
    targetId: '',
    targetType: 'post',
    types: ['虚假信息', '诈骗', '侵权', '色情低俗', '其他'],
    selectedType: '',
    form: { description: '' },
    images: []
  },
  onLoad(options) {
    this.setData({
      targetId: options.id || '',
      targetType: options.targetType || 'post'
    })
  },
  onTypeTap(e) { this.setData({ selectedType: e.currentTarget.dataset.tag }) },
  onInput(e) { this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value }) },
  onChooseImage() {
    if (this.data.images.length >= 4) return
    wx.chooseMedia({ count: 4 - this.data.images.length, mediaType: ['image'], success: (res) => {
      const newImages = res.tempFiles.map(f => f.tempFilePath)
      const uploads = newImages.map(path => upload(path))
      Promise.all(uploads).then(results => {
        const urls = results.map(r => r.data.url || r.data)
        this.setData({ images: [...this.data.images, ...urls] })
      }).catch(() => {
        this.setData({ images: [...this.data.images, ...newImages] })
      })
    }})
  },
  onDeleteImage(e) { this.setData({ images: this.data.images.filter((_, i) => i !== e.currentTarget.dataset.index) }) },
  onSubmit() {
    if (!this.data.selectedType || !this.data.form.description) {
      wx.showToast({ title: '请填写必填项', icon: 'none' }); return
    }
    wx.showLoading({ title: '提交中...' })
    post('/reports', {
      targetId: this.data.targetId,
      targetType: this.data.targetType || 'post',
      reason: this.data.selectedType,
      description: this.data.form.description,
      images: this.data.images
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '举报已提交', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }).catch(() => { wx.hideLoading() })
  }
})
