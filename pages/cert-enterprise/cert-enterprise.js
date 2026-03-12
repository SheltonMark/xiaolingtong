const { get, post, upload } = require('../../utils/request')

Page({
  data: {
    form: { companyName: '', fullName: '', creditCode: '', legalPerson: '', contactName: '', phone: '', city: '', addressDetail: '' },
    licenseImage: '',
    idFrontImage: '',
    idBackImage: '',
    selectedType: '',
    typeOptions: ['工厂', '工贸一体', '电商', '贸易公司', '门店', '其他'],
    categoryNames: [],
    categoryIndex: -1,
    selectedCategory: ''
  },

  onLoad() {
    this._loadCategories()
  },

  _loadCategories() {
    get('/config/categories').then(res => {
      const d = res.data || res
      const list = d.list || []
      this.setData({ categoryNames: list.map(c => c.name) })
    }).catch(() => {})
  },

  onInput(e) {
    this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value })
  },
  onTypeTap(e) {
    this.setData({ selectedType: e.currentTarget.dataset.tag })
  },
  onCategoryChange(e) {
    const idx = e.detail.value
    this.setData({ categoryIndex: idx, selectedCategory: this.data.categoryNames[idx] })
  },
  onRegionChange(e) {
    const region = e.detail.value || []
    this.setData({ 'form.city': region.join(' ') })
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
  onSubmit() {
    const { form, licenseImage, selectedType, selectedCategory, idFrontImage, idBackImage } = this.data
    if (!form.companyName || !form.creditCode || !licenseImage || !selectedType || !form.contactName || !form.phone) {
      wx.showToast({ title: '请填写必填项', icon: 'none' }); return
    }
    wx.showLoading({ title: '提交中...' })
    post('/cert/enterprise', {
      companyName: form.companyName,
      creditCode: form.creditCode,
      legalPerson: form.legalPerson || form.contactName,
      contactName: form.contactName,
      contactPhone: form.phone,
      licenseImage,
      legalIdFront: idFrontImage,
      legalIdBack: idBackImage,
      companyType: selectedType,
      category: selectedCategory,
      address: [form.city, form.addressDetail].filter(Boolean).join(' ')
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '提交成功，等待审核', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }).catch(() => { wx.hideLoading() })
  }
})