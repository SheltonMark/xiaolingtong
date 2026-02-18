Page({
  data: {
    form: { companyName: '', creditCode: '', contactName: '', phone: '' },
    licenseImage: '',
    idFrontImage: '',
    idBackImage: '',
    selectedType: '',
    typeOptions: ['工厂', '工贸一体', '电商', '贸易公司', '门店', '其他']
  },
  onInput(e) {
    this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value })
  },
  onTypeTap(e) {
    this.setData({ selectedType: e.currentTarget.dataset.tag })
  },
  onUploadLicense() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: (res) => {
      this.setData({ licenseImage: res.tempFiles[0].tempFilePath })
    }})
  },
  onUploadIdFront() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: (res) => {
      this.setData({ idFrontImage: res.tempFiles[0].tempFilePath })
    }})
  },
  onUploadIdBack() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: (res) => {
      this.setData({ idBackImage: res.tempFiles[0].tempFilePath })
    }})
  },
  onSelectAddress() {
    wx.showToast({ title: '地址选择', icon: 'none' })
  },
  onSubmit() {
    const { form, licenseImage, selectedType } = this.data
    if (!form.companyName || !form.creditCode || !licenseImage || !selectedType) {
      wx.showToast({ title: '请填写必填项', icon: 'none' }); return
    }
    wx.showToast({ title: '提交成功，等待审核', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1500)
  }
})
