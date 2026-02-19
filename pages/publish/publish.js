Page({
  data: {
    typeIndex: 0,
    form: {
      productName: '',
      category: '',
      spec: '',
      quantity: '',
      price: '',
      priceMin: '',
      priceMax: '',
      quality: '',
      deliveryDays: '',
      description: '',
      minOrder: '',
      processType: '',
      processDesc: '',
      capacity: ''
    },
    images: [],
    categoryOptions: ['日用百货', '电子数码', '服装鞋帽', '五金工具', '厨房卫浴', '母婴玩具', '其他'],
    deliveryOptions: ['7天内', '15天内', '30天内', '45天内', '60天内'],
    validityOptions: ['7天', '15天', '30天', '60天', '90天'],
    validityIndex: 2,
    contactInfo: {
      name: '王经理',
      phone: '138****1234',
      wechat: 'wang_trade_2024'
    },
    phoneChecked: true,
    wechatChecked: true
  },

  onTypeChange(e) {
    this.setData({ typeIndex: Number(e.currentTarget.dataset.index) })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
  },

  onCategoryChange(e) {
    this.setData({ 'form.category': this.data.categoryOptions[e.detail.value] })
  },

  onDeliveryChange(e) {
    this.setData({ 'form.deliveryDays': this.data.deliveryOptions[e.detail.value] })
  },

  onValidityChange(e) {
    this.setData({ validityIndex: e.detail.value })
  },

  onTogglePhone() {
    this.setData({ phoneChecked: !this.data.phoneChecked })
  },

  onToggleWechat() {
    this.setData({ wechatChecked: !this.data.wechatChecked })
  },

  onChooseImage() {
    if (this.data.images.length >= 9) {
      wx.showToast({ title: '最多9张图片', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: 9 - this.data.images.length,
      mediaType: ['image'],
      success: (res) => {
        const newImages = res.tempFiles.map(f => f.tempFilePath)
        this.setData({ images: [...this.data.images, ...newImages] })
      }
    })
  },

  onDeleteImage(e) {
    const idx = e.currentTarget.dataset.index
    const images = this.data.images.filter((_, i) => i !== idx)
    this.setData({ images })
  },

  onSubmit() {
    const { form, phoneChecked, wechatChecked } = this.data
    if (!form.productName && this.data.typeIndex !== 2) {
      wx.showToast({ title: '请输入物品名称', icon: 'none' })
      return
    }
    if (this.data.typeIndex === 2 && !form.processType) {
      wx.showToast({ title: '请输入加工类型', icon: 'none' })
      return
    }
    if (!phoneChecked && !wechatChecked) {
      wx.showToast({ title: '请至少选择一种联系方式', icon: 'none' })
      return
    }
    wx.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 1500)
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
      this.getTabBar().setData({ selected: 2, userRole })
    }
  }
})
