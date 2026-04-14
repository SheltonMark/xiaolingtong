const { get, post, upload, uploadVideo } = require('../../utils/request')
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
    jobTypes: [],
    benefits: [
      { label: '包午餐', selected: false },
      { label: '有空调', selected: false },
      { label: '包住宿', selected: false },
      { label: '有班车', selected: false },
      { label: '长期合作', selected: false },
      { label: '熟手优先', selected: false }
    ],
    images: [],
    videos: [],
    isUploading: false,
    isVideoUploading: false,
    submitting: false,
    phoneChecked: false,
    wechatChecked: false,
    wechatQrChecked: false,
    openCities: [],
    openCityNames: [],
    openCityIndex: 0,
    openCityId: 0
  },

  onLoad() {
    if (!auth.isLoggedIn()) { auth.goLogin(); return }
    this.checkCertAndInit()
  },

  // 发布招工前校验企业认证（以接口为准，避免 globalData 尚未同步）
  checkCertAndInit() {
    get('/auth/profile').then((res) => {
      const profile = res.data || res
      const certStatus = profile.certStatus || 'none'

      if (certStatus === 'pending') {
        wx.showModal({
          title: '认证审核中',
          content: '您的企业认证正在审核中，通过后即可发布招工',
          showCancel: false,
          success: () => wx.navigateBack()
        })
        return
      }

      if (certStatus !== 'approved') {
        wx.showModal({
          title: '需要企业认证',
          content: '发布招工前需要先完成企业认证',
          confirmText: '去认证',
          cancelText: '返回',
          success: (r) => {
            if (r.confirm) {
              wx.navigateTo({ url: '/pages/cert-enterprise/cert-enterprise' })
            } else {
              wx.navigateBack()
            }
          }
        })
        return
      }

      this.loadJobTypes()
      this.loadOpenCities()
      this.initContactInfo()
    }).catch(() => {
      this.loadJobTypes()
      this.loadOpenCities()
      this.initContactInfo()
    })
  },

  loadOpenCities() {
    get('/config/cities')
      .then((res) => {
        const openCities = res.data.list || []
        const openCityNames = openCities.map((c) => c.name).filter(Boolean)
        const savedName = wx.getStorageSync('currentCity') || '义乌'
        let idx = savedName ? openCityNames.indexOf(savedName) : -1
        if (idx < 0 && openCities.length) idx = 0
        const picked = openCities[idx]
        const openCityId =
          picked && picked.id != null && picked.id !== ''
            ? Number(picked.id)
            : 0
        this.setData({ openCities, openCityNames, openCityIndex: idx < 0 ? 0 : idx, openCityId })
      })
      .catch(() => {})
  },

  onOpenCityChange(e) {
    const idx = Number(e.detail.value)
    const list = this.data.openCities || []
    const city = list[idx]
    if (!city) return
    const openCityId =
      city.id != null && city.id !== '' ? Number(city.id) : 0
    this.setData({ openCityIndex: idx, openCityId })
  },

  loadJobTypes() {
    get('/config/job-types').then((res) => {
      const list = (res.data.list || []).map((item) => item.name).filter(Boolean)
      this.setData({ jobTypes: list })
    }).catch(() => {})
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

  onChooseVideo() {
    if (this.data.videos.length >= 1) {
      wx.showToast({ title: '最多上传1个视频', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      maxDuration: 60,
      success: (res) => {
        const file = res.tempFiles[0]
        this.setData({ isVideoUploading: true })
        uploadVideo(file.tempFilePath).then(result => {
          const url = (result.data && result.data.url) || result.data || ''
          if (url) {
            this.setData({ videos: [url] })
          }
        }).catch(() => {
          wx.showToast({ title: '视频上传失败', icon: 'none' })
        }).finally(() => {
          this.setData({ isVideoUploading: false })
        })
      }
    })
  },

  onDeleteVideo() {
    this.setData({ videos: [] })
  },

  onSubmit() {
    if (!auth.isLoggedIn()) { auth.goLogin(); return }
    if (this.data.submitting) {
      return
    }
    if (this.data.isUploading || this.data.isVideoUploading) {
      wx.showToast({ title: '文件上传中，请稍后提交', icon: 'none' })
      return
    }

    const { form, settleType, benefits, images, videos, phoneChecked, wechatChecked, wechatQrChecked } = this.data
    if (!form.title) { wx.showToast({ title: '请输入招工标题', icon: 'none' }); return }
    if (!form.jobType) { wx.showToast({ title: '\u8bf7\u9009\u62e9\u5de5\u79cd', icon: 'none' }); return }
    if (!form.price) { wx.showToast({ title: '请输入工价', icon: 'none' }); return }
    if (!form.headcount) { wx.showToast({ title: '请输入招工人数', icon: 'none' }); return }
    if (!form.startDate || !form.endDate) { wx.showToast({ title: '请选择工作日期', icon: 'none' }); return }
    if (!(this.data.openCityId > 0)) {
      wx.showToast({ title: '请选择地区', icon: 'none' })
      return
    }
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
      openCityId: this.data.openCityId,
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
      images,
      videos
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
