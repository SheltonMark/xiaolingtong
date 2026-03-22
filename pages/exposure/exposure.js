const { post, upload } = require('../../utils/request')

Page({
  data: {
    form: { company: '', contact: '', amount: '', description: '' },
    images: [],
    isUploading: false,
    agreed: true
  },
  onInput(e) { this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value }) },
  onToggleAgree() { this.setData({ agreed: !this.data.agreed }) },
  onChooseImage() {
    if (this.data.images.length >= 9) return
    wx.chooseMedia({ count: 9 - this.data.images.length, mediaType: ['image'], success: (res) => {
      const newImages = res.tempFiles.map(f => f.tempFilePath)
      const uploads = newImages.map(path => upload(path))
      this.setData({ isUploading: true })
      Promise.allSettled(uploads).then(results => {
        const urls = results
          .filter(r => r.status === 'fulfilled')
          .map(r => (r.value.data && r.value.data.url) || r.value.data || '')
          .filter(Boolean)
        const failCount = results.length - urls.length
        if (urls.length) {
          this.setData({ images: [...this.data.images, ...urls] })
        }
        if (failCount > 0) {
          wx.showToast({ title: `有${failCount}张图片上传失败，请重试`, icon: 'none' })
        }
      }).finally(() => {
        this.setData({ isUploading: false })
      })
    }})
  },
  onDeleteImage(e) { this.setData({ images: this.data.images.filter((_, i) => i !== e.currentTarget.dataset.index) }) },
  onSubmit() {
    if (this.data.isUploading) {
      wx.showToast({ title: '图片上传中，请稍后提交', icon: 'none' })
      return
    }
    const { form, agreed, images } = this.data
    if (!form.company && !form.contact) { wx.showToast({ title: '请至少填写公司或姓名', icon: 'none' }); return }
    if (!form.description) { wx.showToast({ title: '请输入线索说明', icon: 'none' }); return }
    if (!agreed) { wx.showToast({ title: '请同意线索提交说明', icon: 'none' }); return }
    wx.showLoading({ title: '提交中...' })
    post('/exposures', {
      company: form.company,
      contact: form.contact,
      amount: form.amount,
      description: form.description,
      images
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }).catch(() => { wx.hideLoading() })
  }
})
