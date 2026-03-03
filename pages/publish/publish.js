const { post, upload } = require('../../utils/request')

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
      name: '',
      phone: '',
      wechat: ''
    },
    phoneChecked: false,
    wechatChecked: false
  },

  onLoad() {
    this.initContactInfo()
  },

  initContactInfo() {
    const app = getApp()
    const userInfo = app.globalData.userInfo || {}
    const contactInfo = {
      name: userInfo.nickname || '',
      phone: userInfo.phone || '',
      wechat: ''
    }
    this.setData({
      contactInfo,
      phoneChecked: !!contactInfo.phone,
      wechatChecked: !!contactInfo.wechat
    })
  },

  onTypeChange(e) {
    this.setData({ typeIndex: Number(e.currentTarget.dataset.index) })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
  },

  onContactInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['contactInfo.' + field]: e.detail.value })
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
        // 上传图片
        const uploads = newImages.map(path => upload(path))
        Promise.all(uploads).then(results => {
          const urls = results.map(r => r.data.url || r.data)
          this.setData({ images: [...this.data.images, ...urls] })
        }).catch(() => {
          // 上传失败时用本地路径占位
          this.setData({ images: [...this.data.images, ...newImages] })
        })
      }
    })
  },

  onDeleteImage(e) {
    const idx = e.currentTarget.dataset.index
    const images = this.data.images.filter((_, i) => i !== idx)
    this.setData({ images })
  },

  onSubmit() {
    const { form, phoneChecked, wechatChecked, images, typeIndex, contactInfo } = this.data
    const types = ['purchase', 'stock', 'process']
    const contactName = (contactInfo.name || '').trim()
    const contactPhone = (contactInfo.phone || '').trim()
    const contactWechat = (contactInfo.wechat || '').trim()
    if (!form.productName && typeIndex !== 2) {
      wx.showToast({ title: '请输入物品名称', icon: 'none' })
      return
    }
    if (typeIndex === 2 && !form.processType) {
      wx.showToast({ title: '请输入加工类型', icon: 'none' })
      return
    }
    if (!phoneChecked && !wechatChecked) {
      wx.showToast({ title: '请至少选择一种联系方式', icon: 'none' })
      return
    }
    if (!contactName) {
      wx.showToast({ title: '请输入联系人', icon: 'none' })
      return
    }
    if (phoneChecked && !contactPhone) {
      wx.showToast({ title: '请填写手机号', icon: 'none' })
      return
    }
    if (wechatChecked && !contactWechat) {
      wx.showToast({ title: '请填写微信号', icon: 'none' })
      return
    }
    const data = {
      type: types[typeIndex],
      title: typeIndex === 2 ? form.processType : form.productName,
      category: form.category,
      spec: form.spec,
      quantity: form.quantity ? Number(form.quantity) : undefined,
      price: form.price ? Number(form.price) : undefined,
      priceMin: form.priceMin ? Number(form.priceMin) : undefined,
      priceMax: form.priceMax ? Number(form.priceMax) : undefined,
      quality: form.quality,
      deliveryDays: form.deliveryDays,
      processDesc: form.processDesc,
      description: form.description,
      minOrder: form.minOrder ? Number(form.minOrder) : undefined,
      capacity: form.capacity,
      images,
      contactName,
      contactPhone,
      contactWechat,
      showPhone: phoneChecked,
      showWechat: wechatChecked,
      validityDays: Number(this.data.validityOptions[this.data.validityIndex].replace('天', ''))
    }
    wx.showLoading({ title: '发布中...' })
    post('/posts', data).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '发布成功', icon: 'success' })
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 1500)
    }).catch(() => {
      wx.hideLoading()
    })
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
      this.getTabBar().setData({ selected: 2, userRole })
    }
  }
})
