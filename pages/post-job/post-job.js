const { post, upload } = require('../../utils/request')
const auth = require('../../utils/auth')
const { getDefaultContactProfile } = require('../../utils/contact-profile')
const { normalizeImageUrl } = require('../../utils/image')

Page({
  data: {
    settleType: 0,
    form: {
      title: '',
      jobType: '',
      price: '',
      headcount: '',
      content: '',
      startDate: '',
      endDate: '',
      startTime: '08:00',
      endTime: '18:00',
      address: '',
      contactName: '',
      contactPhone: '',
      contactWechat: '',
      contactWechatQr: '',
      lat: null,
      lng: null
    },
    jobTypes: ['电子组装', '包装工', '搬运工', '缝纫工', '焊接工', '质检员', '普工', '其他'],
    benefits: [
      { label: '包午餐', selected: false },
      { label: '有空调', selected: false },
      { label: '包住宿', selected: false },
      { label: '有班车', selected: false },
      { label: '长期合作', selected: false },
      { label: '熟手优先', selected: false }
    ],
    images: [],
    isUploading: false,
    submitting: false,
    phoneChecked: false,
    wechatChecked: false,
    wechatQrChecked: false
  },

  onLoad() {
    if (!auth.isLoggedIn()) { auth.goLogin(); return }
    this.initContactInfo()
  },

  initContactInfo() {
    getDefaultContactProfile().then((profile) => {
      this.setData({
        'form.contactName': profile.contactName || '',
        'form.contactPhone': profile.phone || '',
        'form.contactWechat': profile.wechatId || '',
        'form.contactWechatQr': normalizeImageUrl(profile.wechatQrImage || ''),
        phoneChecked: !!profile.phone,
        wechatChecked: !!profile.wechatId,
        wechatQrChecked: false
      })
    }).catch(() => {})
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
  },

  onSettleChange(e) {
    this.setData({ settleType: Number(e.currentTarget.dataset.index) })
  },

  onJobTypeChange(e) {
    this.setData({ 'form.jobType': this.data.jobTypes[e.detail.value] })
  },

  onStartDateChange(e) {
    this.setData({ 'form.startDate': e.detail.value })
  },

  onEndDateChange(e) {
    this.setData({ 'form.endDate': e.detail.value })
  },

  onStartTimeChange(e) {
    this.setData({ 'form.startTime': e.detail.value })
  },

  onEndTimeChange(e) {
    this.setData({ 'form.endTime': e.detail.value })
  },

  onChooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          'form.address': res.address || res.name,
          'form.lat': res.latitude,
          'form.lng': res.longitude
        })
      },
      fail() {}
    })
  },

  onToggleBenefit(e) {
    const idx = e.currentTarget.dataset.index
    const key = 'benefits[' + idx + '].selected'
    this.setData({ [key]: !this.data.benefits[idx].selected })
  },

  onTogglePhone() {
    this.setData({ phoneChecked: !this.data.phoneChecked })
  },

  onToggleWechat() {
    this.setData({ wechatChecked: !this.data.wechatChecked })
  },

  onToggleWechatQr() {
    if (!this.data.form.contactWechatQr && !this.data.wechatQrChecked) {
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
    const url = this.data.form.contactWechatQr
    if (!url) return
    wx.previewImage({ current: url, urls: [url] })
  },

  onChooseImage() {
    if (this.data.images.length >= 9) return
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
            wx.showToast({ title: `有${failCount}张图片上传失败，请重试`, icon: 'none' })
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

    const { form, settleType, benefits, images, phoneChecked, wechatChecked, wechatQrChecked } = this.data
    if (!form.title) { wx.showToast({ title: '请输入招工标题', icon: 'none' }); return }
    if (!form.price) { wx.showToast({ title: '请输入工价', icon: 'none' }); return }
    if (!form.headcount) { wx.showToast({ title: '请输入招工人数', icon: 'none' }); return }
    if (!form.startDate || !form.endDate) { wx.showToast({ title: '请选择工作日期', icon: 'none' }); return }
    if (!form.address) { wx.showToast({ title: '请选择工作地点', icon: 'none' }); return }
    if (!form.contactName) { wx.showToast({ title: '请输入联系人', icon: 'none' }); return }
    if (!phoneChecked && !wechatChecked && !wechatQrChecked) {
      wx.showToast({ title: '请至少选择一种联系方式', icon: 'none' })
      return
    }
    if (phoneChecked && !form.contactPhone) { wx.showToast({ title: '请输入联系电话', icon: 'none' }); return }
    if (wechatChecked && !form.contactWechat) { wx.showToast({ title: '请填写微信号', icon: 'none' }); return }
    if (wechatQrChecked && !form.contactWechatQr) { wx.showToast({ title: '请先上传微信二维码', icon: 'none' }); return }

    const selectedBenefits = benefits.filter(b => b.selected).map(b => b.label)
    this.setData({ submitting: true })
    wx.showLoading({ title: '发布中...' })
    post('/jobs', {
      title: form.title,
      jobType: form.jobType,
      salary: Number(form.price),
      salaryType: settleType === 0 ? 'hourly' : 'piece',
      salaryUnit: settleType === 0 ? '元/时' : '元/件',
      needCount: Number(form.headcount),
      description: form.content,
      dateStart: form.startDate,
      dateEnd: form.endDate,
      workHours: `${form.startTime || '08:00'}-${form.endTime || '18:00'}`,
      location: form.address,
      lat: form.lat,
      lng: form.lng,
      contactName: form.contactName,
      contactPhone: form.contactPhone,
      contactWechat: form.contactWechat,
      contactWechatQr: form.contactWechatQr,
      showPhone: phoneChecked,
      showWechat: wechatChecked,
      showWechatQr: wechatQrChecked,
      benefits: selectedBenefits,
      images
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '发布成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }).catch(() => {
      wx.hideLoading()
    }).finally(() => {
      this.setData({ submitting: false })
    })
  },

  onShow() {
    if (this._shouldRefreshContact && auth.isLoggedIn()) {
      this._shouldRefreshContact = false
      this.initContactInfo()
    }
  }
})
