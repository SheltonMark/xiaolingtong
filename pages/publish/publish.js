const { get, post, upload } = require('../../utils/request')
const auth = require('../../utils/auth')
const { getDefaultContactProfile } = require('../../utils/contact-profile')
const { normalizeImageUrl } = require('../../utils/image')

const DEFAULT_FORM = {
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
}

function buildFallbackContactInfo() {
  const app = getApp()
  const userInfo = app.globalData.userInfo || {}
  return {
    name: userInfo.nickname || '',
    phone: userInfo.phone || '',
    wechat: '',
    wechatQrImage: ''
  }
}

Page({
  data: {
    typeIndex: 0,
    form: { ...DEFAULT_FORM },
    images: [],
    isUploading: false,
    submitting: false,
    categoryOptions: [],
    deliveryOptions: ['7天内', '15天内', '30天内', '45天内', '60天内'],
    validityOptions: ['7天', '15天', '30天', '60天', '90天'],
    validityIndex: 2,
    contactInfo: buildFallbackContactInfo(),
    phoneChecked: false,
    wechatChecked: false,
    wechatQrChecked: false
  },

  onLoad() {
    if (!auth.isLoggedIn()) { auth.goLogin(); return }
    this.loadCategories()
    this.initContactInfo()
  },

  loadCategories() {
    get('/config/categories').then((res) => {
      const payload = res.data || res || {}
      const list = (payload.list || []).map((item) => item && item.name).filter(Boolean)
      this.setData({
        categoryOptions: list,
        'form.category': list.includes(this.data.form.category) ? this.data.form.category : ''
      })
    }).catch(() => {
      this.setData({
        categoryOptions: [],
        'form.category': ''
      })
    })
  },

  resetDraft() {
    this.setData({
      typeIndex: 0,
      form: { ...DEFAULT_FORM },
      images: [],
      validityIndex: 2
    })
    this.initContactInfo()
  },

  initContactInfo() {
    const fallback = buildFallbackContactInfo()
    getDefaultContactProfile().then((profile) => {
      const contactInfo = {
        name: profile.contactName || fallback.name,
        phone: profile.phone || fallback.phone,
        wechat: profile.wechatId || '',
        wechatQrImage: normalizeImageUrl(profile.wechatQrImage || '')
      }
      this.setData({
        contactInfo,
        phoneChecked: !!contactInfo.phone,
        wechatChecked: !!contactInfo.wechat,
        wechatQrChecked: false
      })
    }).catch(() => {
      this.setData({
        contactInfo: fallback,
        phoneChecked: !!fallback.phone,
        wechatChecked: !!fallback.wechat,
        wechatQrChecked: false
      })
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
    const nextCategory = this.data.categoryOptions[e.detail.value] || ''
    this.setData({ 'form.category': nextCategory })
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

  onToggleWechatQr() {
    if (!this.data.contactInfo.wechatQrImage && !this.data.wechatQrChecked) {
      wx.showToast({ title: '请先在联系方式中上传二维码', icon: 'none' })
      return
    }
    this.setData({ wechatQrChecked: !this.data.wechatQrChecked })
  },

  onManageContactInfo() {
    this._shouldRefreshContact = true
    wx.navigateTo({ url: '/pages/contact-profile/contact-profile' })
  },

  onPreviewWechatQr() {
    const url = this.data.contactInfo.wechatQrImage
    if (!url) return
    wx.previewImage({ current: url, urls: [url] })
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
        const uploads = newImages.map(path => upload(path))
        this.setData({ isUploading: true })
        Promise.allSettled(uploads).then(results => {
          const urls = results
            .filter(r => r.status === 'fulfilled')
            .map(r => (r.value.data && r.value.data.url) || r.value.data || '')
            .filter(Boolean)
          const failCount = results.length - urls.length
          if (urls.length) {
            this.setData({ images: [...this.data.images, ...urls] })
          }
          if (failCount > 0) {
            wx.showToast({ title: `有${failCount}张上传失败，请重试`, icon: 'none' })
          }
        }).finally(() => {
          this.setData({ isUploading: false })
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
    if (!auth.isLoggedIn()) { auth.goLogin(); return }
    if (this.data.submitting) {
      return
    }
    if (this.data.isUploading) {
      wx.showToast({ title: '图片上传中，请稍后提交', icon: 'none' })
      return
    }

    const { form, phoneChecked, wechatChecked, wechatQrChecked, images, typeIndex, contactInfo } = this.data
    const types = ['purchase', 'stock', 'process']
    const contactName = (contactInfo.name || '').trim()
    const contactPhone = (contactInfo.phone || '').trim()
    const contactWechat = (contactInfo.wechat || '').trim()
    const contactWechatQr = contactInfo.wechatQrImage || ''

    if (!form.productName && typeIndex !== 2) {
      wx.showToast({ title: '请输入物品名称', icon: 'none' })
      return
    }
    if (typeIndex === 2 && !form.processType) {
      wx.showToast({ title: '请输入加工类型', icon: 'none' })
      return
    }
    if (!form.category) {
      wx.showToast({ title: '请选择品类', icon: 'none' })
      return
    }
    if (!phoneChecked && !wechatChecked && !wechatQrChecked) {
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
    if (wechatQrChecked && !contactWechatQr) {
      wx.showToast({ title: '请先上传微信二维码', icon: 'none' })
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
      contactWechatQr,
      showPhone: phoneChecked,
      showWechat: wechatChecked,
      showWechatQr: wechatQrChecked,
      validityDays: Number(this.data.validityOptions[this.data.validityIndex].replace('天', ''))
    }

    wx.showLoading({ title: '发布中...' })
    this.setData({ submitting: true })
    post('/posts', data).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '发布成功', icon: 'success' })
      this.resetDraft()
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 1500)
    }).catch(() => {
      wx.hideLoading()
    }).finally(() => {
      this.setData({ submitting: false })
    })
  },

  onShow() {
    const loggedIn = auth.isLoggedIn()
    if (loggedIn) {
      this.loadCategories()
    }
    if (this._shouldRefreshContact && loggedIn) {
      this._shouldRefreshContact = false
      this.initContactInfo()
    }
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null
    if (tabBar) {
      const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
      tabBar.setData({ selected: 2, userRole })
      if (typeof tabBar.loadUnread === 'function') {
        tabBar.loadUnread()
      }
    }
  }
})
