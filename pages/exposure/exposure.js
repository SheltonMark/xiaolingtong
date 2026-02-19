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
      this.setData({ images: [...this.data.images, ...res.tempFiles.map(f => f.tempFilePath)] })
    }})
  },
  onDeleteImage(e) { this.setData({ images: this.data.images.filter((_, i) => i !== e.currentTarget.dataset.index) }) },
  onSubmit() {
    const { form, agreed } = this.data
    if (!form.company) { wx.showToast({ title: '请输入公司名称', icon: 'none' }); return }
    if (!form.contact) { wx.showToast({ title: '请输入对方姓名', icon: 'none' }); return }
    if (!form.description) { wx.showToast({ title: '请输入曝光内容', icon: 'none' }); return }
    if (!agreed) { wx.showToast({ title: '请同意曝光发布协议', icon: 'none' }); return }
    wx.showToast({ title: '提交成功', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1500)
  }
})
