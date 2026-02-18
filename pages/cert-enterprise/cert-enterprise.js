Page({
  data: {
    form: { companyName: '', creditCode: '', legalPerson: '', phone: '', address: '' },
    licenseImage: ''
  },
  onInput(e) {
    this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value })
  },
  onUploadLicense() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: (res) => {
      this.setData({ licenseImage: res.tempFiles[0].tempFilePath })
    }})
  },
  onSubmit() {
    const { form, licenseImage } = this.data
    if (!form.companyName || !form.creditCode || !licenseImage) {
      wx.showToast({ title: '请填写必填项', icon: 'none' }); return
    }
    wx.showToast({ title: '提交成功，等待审核', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1500)
  }
})
