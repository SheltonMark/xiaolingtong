const { post, upload } = require('../../utils/request')

Page({
  data: {
    form: { company: '', contact: '', amount: '', description: '' },
    images: [],
    agreed: true
  },
  onInput(e) { this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value }) },
  onToggleAgree() { this.setData({ agreed: !this.data.agreed }) },
  onChooseImage() {
    if (this.data.images.length >= 9) return
    wx.chooseMedia({ count: 9 - this.data.images.length, mediaType: ['image'], success: (res) => {
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
    const { form, agreed, images } = this.data
    if (!form.company && !form.contact) { wx.showToast({ title: '请至少填写公司或姓名', icon: 'none' }); return }
    if (!form.description) { wx.showToast({ title: '请输入曝光内容', icon: 'none' }); return }
    if (!agreed) { wx.showToast({ title: '请同意曝光发布协议', icon: 'none' }); return }
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
