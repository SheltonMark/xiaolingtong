Page({
  data: {
    form: { company: '', description: '' },
    types: ['拖欠工资', '虚假招工', '环境恶劣', '强制加班', '克扣工资', '其他'],
    selectedType: '',
    images: []
  },
  onInput(e) { this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value }) },
  onTypeTap(e) { this.setData({ selectedType: e.currentTarget.dataset.tag }) },
  onChooseImage() {
    if (this.data.images.length >= 9) return
    wx.chooseMedia({ count: 9 - this.data.images.length, mediaType: ['image'], success: (res) => {
      this.setData({ images: [...this.data.images, ...res.tempFiles.map(f => f.tempFilePath)] })
    }})
  },
  onDeleteImage(e) { this.setData({ images: this.data.images.filter((_, i) => i !== e.currentTarget.dataset.index) }) },
  onSubmit() {
    if (!this.data.form.company || !this.data.selectedType || !this.data.form.description) {
      wx.showToast({ title: '请填写必填项', icon: 'none' }); return
    }
    wx.showToast({ title: '提交成功', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1500)
  }
})
