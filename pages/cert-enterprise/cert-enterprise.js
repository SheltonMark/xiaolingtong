const { get, post, upload } = require('../../utils/request')
const features = require('../../utils/features')

Page({
  data: {
    certSmsEnabled: features.certSmsVerificationEnabled,
    form: {
      companyName: '',
      fullName: '',
      creditCode: '',
      legalPerson: '',
      contactName: '',
      phone: '',
      city: '',
      addressDetail: ''
    },
    licenseImage: '',
    idFrontImage: '',
    idBackImage: '',
    selectedType: '',
    typeOptions: ['工厂', '工贸一体', '电商', '贸易公司', '门店', '其他'],
    categoryNames: [],
    categoryIndex: -1,
    selectedCategory: '',
    smsCode: '',
    smsSessionId: 0,
    verificationToken: '',
    smsCountdown: 0,
    verifyingSms: false,
    lastCheckedSmsCode: ''
  },

  onLoad() {
    this._loadCategories()
  },

  onUnload() {
    this.clearSmsTimer()
  },

  _loadCategories() {
    get('/config/categories').then(res => {
      const d = res.data || res
      const list = d.list || []
      this.setData({ categoryNames: list.map(c => c.name) })
    }).catch(() => {})
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    const updates = { ['form.' + field]: value }

    if (field === 'phone') {
      Object.assign(updates, {
        smsSessionId: 0,
        smsCode: '',
        verificationToken: '',
        verifyingSms: false,
        lastCheckedSmsCode: ''
      })
    }

    this.setData(updates)
  },

  onSmsCodeInput(e) {
    if (!this.data.certSmsEnabled) return
    const smsCode = String(e.detail.value || '').replace(/\D/g, '').slice(0, 6)
    const updates = { smsCode }
    if (smsCode !== this.data.lastCheckedSmsCode) {
      updates.verificationToken = ''
    }
    this.setData(updates, () => {
      if (smsCode.length === 6) {
        this.checkSmsCode({ silent: true })
      }
    })
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

  clearSmsTimer() {
    if (this.smsTimer) {
      clearInterval(this.smsTimer)
      this.smsTimer = null
    }
  },

  startSmsCountdown() {
    this.clearSmsTimer()
    let remain = 60
    this.setData({ smsCountdown: remain })
    this.smsTimer = setInterval(() => {
      remain -= 1
      if (remain <= 0) {
        this.clearSmsTimer()
        this.setData({ smsCountdown: 0 })
        return
      }
      this.setData({ smsCountdown: remain })
    }, 1000)
  },

  getUploadUrl(res) {
    return (res && res.data && res.data.url) || (res && res.data) || ''
  },

  runOcr(api, imageUrl, applyFields) {
    if (!imageUrl) return
    wx.showLoading({ title: '识别中...' })
    post(api, { imageUrl }).then((res) => {
      wx.hideLoading()
      const data = res.data || res || {}
      const fields = data.fields || {}
      applyFields(fields, data)
      if (data.recognized) {
        wx.showToast({ title: '识别成功，可手动修改', icon: 'none' })
      }
    }).catch(() => {
      wx.hideLoading()
    })
  },

  onUploadLicense() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath
        upload(path).then((r) => {
          const imageUrl = this.getUploadUrl(r) || path
          this.setData({ licenseImage: imageUrl })
          this.runOcr('/cert/ocr/business-license', imageUrl, (fields) => {
            const updates = {}
            if (fields.companyName) updates['form.companyName'] = fields.companyName
            if (fields.fullName) updates['form.fullName'] = fields.fullName
            if (fields.creditCode) updates['form.creditCode'] = fields.creditCode
            if (fields.legalPerson) updates['form.legalPerson'] = fields.legalPerson
            if (fields.address) updates['form.addressDetail'] = fields.address
            if (Object.keys(updates).length) this.setData(updates)
          })
        }).catch(() => this.setData({ licenseImage: path }))
      }
    })
  },

  onUploadIdFront() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath
        upload(path).then((r) => {
          const imageUrl = this.getUploadUrl(r) || path
          this.setData({ idFrontImage: imageUrl })
        }).catch(() => this.setData({ idFrontImage: path }))
      }
    })
  },

  onUploadIdBack() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath
        upload(path).then((r) => {
          const imageUrl = this.getUploadUrl(r) || path
          this.setData({ idBackImage: imageUrl })
        }).catch(() => this.setData({ idBackImage: path }))
      }
    })
  },

  onSendSms() {
    if (!this.data.certSmsEnabled) return
    const phone = (this.data.form.phone || '').trim()
    if (this.data.smsCountdown > 0) return
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

    wx.showLoading({ title: '发送中...' })
    post('/cert/sms/send', {
      phone,
      scene: 'enterprise_cert'
    }).then((res) => {
      wx.hideLoading()
      const data = res.data || res || {}
      const smsCode = String(data.debugCode || this.data.smsCode || '').replace(/\D/g, '').slice(0, 6)
      this.setData({
        smsSessionId: data.sessionId || 0,
        smsCode,
        verificationToken: '',
        verifyingSms: false,
        lastCheckedSmsCode: ''
      })
      this.startSmsCountdown()
      if (smsCode.length === 6) {
        this.checkSmsCode({ silent: true })
      }
      wx.showToast({
        title: data.debugCode ? `验证码 ${data.debugCode}` : '验证码已发送',
        icon: 'none'
      })
    }).catch(() => {
      wx.hideLoading()
    })
  },

  checkSmsCode(options = {}) {
    if (!this.data.certSmsEnabled) return Promise.resolve(true)
    const { silent = false } = options
    const smsCode = (this.data.smsCode || '').trim()
    if (this.data.verifyingSms) return Promise.resolve(false)
    if (!this.data.smsSessionId) {
      if (!silent) {
        wx.showToast({ title: '请先发送验证码', icon: 'none' })
      }
      return Promise.resolve(false)
    }
    if (smsCode.length !== 6) {
      if (!silent) {
        wx.showToast({ title: '请输入6位验证码', icon: 'none' })
      }
      return Promise.resolve(false)
    }
    if (this.data.verificationToken && this.data.lastCheckedSmsCode === smsCode) {
      return Promise.resolve(true)
    }

    this.setData({ verifyingSms: true })
    wx.showLoading({ title: '校验中...' })
    return post('/cert/sms/check', {
      sessionId: this.data.smsSessionId,
      code: smsCode
    }).then((res) => {
      const data = res.data || res || {}
      this.setData({
        verificationToken: data.verificationToken || '',
        lastCheckedSmsCode: smsCode
      })
      wx.showToast({ title: '验证成功', icon: 'success' })
      return true
    }).catch(() => {
      this.setData({ verificationToken: '' })
      return false
    }).finally(() => {
      wx.hideLoading()
      this.setData({ verifyingSms: false })
    })
  },

  onCheckSms() {
    if (!this.data.certSmsEnabled) return
    if (!this.data.smsSessionId) {
      wx.showToast({ title: '请先发送验证码', icon: 'none' })
      return
    }
    if (!this.data.smsCode) {
      wx.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }

    wx.showLoading({ title: '校验中...' })
    post('/cert/sms/check', {
      sessionId: this.data.smsSessionId,
      code: this.data.smsCode
    }).then((res) => {
      wx.hideLoading()
      const data = res.data || res || {}
      this.setData({ verificationToken: data.verificationToken || '' })
      wx.showToast({ title: '验证成功', icon: 'success' })
    }).catch(() => {
      wx.hideLoading()
    })
  },

  onSubmit() {
    const { form, licenseImage, selectedType, selectedCategory, idFrontImage, idBackImage, verificationToken } = this.data
    if (!form.companyName || !form.creditCode || !licenseImage || !selectedType || !form.contactName || !form.phone) {
      wx.showToast({ title: '请填写必填项', icon: 'none' })
      return
    }
    if (!/^1\d{10}$/.test((form.phone || '').trim())) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    if (this.data.certSmsEnabled && this.data.verifyingSms) {
      wx.showToast({ title: '验证码校验中', icon: 'none' })
      return
    }
    if (this.data.certSmsEnabled && !verificationToken) {
      const smsCode = (this.data.smsCode || '').trim()
      if (smsCode.length === 6) {
        this.checkSmsCode().then((passed) => {
          if (passed) this.onSubmit()
        })
        return
      }
      wx.showToast({ title: '请先完成短信验证', icon: 'none' })
      return
    }

    wx.showLoading({ title: '提交中...' })
    const payload = {
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
    }

    if (this.data.certSmsEnabled) {
      payload.verificationToken = verificationToken
    }

    post('/cert/enterprise', payload).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '提交成功，等待审核', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }).catch(() => {
      wx.hideLoading()
    })
  }
})
