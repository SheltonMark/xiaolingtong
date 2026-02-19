Page({
  data: {
    typeIndex: 0,
    types: ['采购需求', '工厂库存', '代加工服务'],
    form: {
      title: '',
      productName: '',
      category: '',
      spec: '',
      quantity: '',
      price: '',
      deliveryDays: '',
      description: '',
      contact: '',
      phone: '',
      wechat: ''
    },
    images: [],
    categoryOptions: ['日用百货', '电子数码', '服装鞋帽', '五金工具', '厨房卫浴', '母婴玩具', '其他'],
    stockStatusIndex: 0,
    stockStatusOptions: ['现货', '预售']
  },

  onTypeChange(e) {
    this.setData({ typeIndex: e.currentTarget.dataset.index })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
  },

  onCategoryChange(e) {
    this.setData({ 'form.category': this.data.categoryOptions[e.detail.value] })
  },

  onStockStatusChange(e) {
    this.setData({ stockStatusIndex: e.detail.value })
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
    const { form } = this.data
    if (!form.title) {
      wx.showToast({ title: '请输入标题', icon: 'none' })
      return
    }
    if (!form.contact || !form.phone) {
      wx.showToast({ title: '请填写联系方式', icon: 'none' })
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
