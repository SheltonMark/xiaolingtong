Page({
  data: {
    types: ['虚假信息', '诈骗', '侵权', '色情低俗', '其他'],
    selectedType: '',
    form: { description: '' },
    images: []
  },
  onTypeTap(e) { this.setData({ selectedType: e.currentTarget.dataset.tag }) },
  onInput(e) { this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value }) },
  onChooseImage() {
    if (this.data.images.length >= 4) return
    wx.chooseMedia({ count: 4 - this.data.images.length, mediaType: ['image'], success: (res) => {
      this.setData({ images: [...this.data.images, ...res.tempFiles.map(f => f.tempFilePath)] })
    }})
  },
  onDeleteImage(e) { this.setData({ images: this.data.images.filter((_, i) => i !== e.currentTarget.dataset.index) }) },
  onSubmit() {
    if (!this.data.selectedType || !this.data.form.description) {
      wx.showToast({ title: '请填写必填项', icon: 'none' }); return
    }
    wx.showToast({ title: '举报已提交', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1500)
  }
})
