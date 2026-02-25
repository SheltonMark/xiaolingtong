const { post, upload } = require('../../utils/request')

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
      const path = res.tempFiles[0].tempFilePath
      upload(path).then(r => this.setData({ licenseImage: r.data.url || r.data }))
        .catch(() => this.setData({ licenseImage: path }))
    }})
  },
  onUploadIdFront() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: (res) => {
      const path = res.tempFiles[0].tempFilePath
      upload(path).then(r => this.setData({ idFrontImage: r.data.url || r.data }))
        .catch(() => this.setData({ idFrontImage: path }))
    }})
  },
  onUploadIdBack() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: (res) => {
      const path = res.tempFiles[0].tempFilePath
      upload(path).then(r => this.setData({ idBackImage: r.data.url || r.data }))
        .catch(() => this.setData({ idBackImage: path }))
    }})
  },
  onSelectAddress() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({ 'form.address': res.address, 'form.latitude': res.latitude, 'form.longitude': res.longitude })
      }
    })
  },
  onSubmit() {
    const { form, licenseImage, selectedType, idFrontImage, idBackImage } = this.data
    if (!form.companyName || !form.creditCode || !licenseImage || !selectedType) {
      wx.showToast({ title: '请填写必填项', icon: 'none' }); return
    }
    wx.showLoading({ title: '提交中...' })
    post('/cert/enterprise', {
      companyName: form.companyName,
      creditCode: form.creditCode,
      contactName: form.contactName,
      phone: form.phone,
      licenseImage,
      idFrontImage,
      idBackImage,
      companyType: selectedType,
      address: form.address
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '提交成功，等待审核', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }).catch(() => { wx.hideLoading() })
  }
})
