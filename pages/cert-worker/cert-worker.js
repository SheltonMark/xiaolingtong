const { post, upload } = require('../../utils/request')

Page({
  data: {
    form: { name: '', idCard: '', phone: '' },
    skills: ['组装工', '包装工', '缝纫工', '搬运工', '质检员', '焊工', '叉车工', '普工'],
    selectedSkills: [],
    selectedSkillsMap: {},
    frontImage: '',
    backImage: '',
    smsCode: '',
    smsSessionId: 0,
    verificationToken: '',
    smsCountdown: 0,
    verifyingSms: false,
    lastCheckedSmsCode: ''
  },

  onUnload() {
    this.clearSmsTimer()
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

  onSkillTap(e) {
    const tag = e.currentTarget.dataset.tag
    const selectedSkills = [...this.data.selectedSkills]
    const idx = selectedSkills.indexOf(tag)
    if (idx > -1) {
      selectedSkills.splice(idx, 1)
    } else {
      selectedSkills.push(tag)
    }

    const selectedSkillsMap = {}
    selectedSkills.forEach((item) => { selectedSkillsMap[item] = true })
    this.setData({ selectedSkills, selectedSkillsMap })
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

  onUploadFront() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath
        upload(path)
          .then((r) => {
            const imageUrl = this.getUploadUrl(r) || path
            this.setData({ frontImage: imageUrl })
            this.runOcr('/cert/ocr/id-card/front', imageUrl, (fields) => {
              const updates = {}
              if (fields.name) updates['form.name'] = fields.name
              if (fields.idCard) updates['form.idCard'] = fields.idCard
              if (Object.keys(updates).length) this.setData(updates)
            })
          })
          .catch(() => this.setData({ frontImage: path }))
      }
    })
  },

  onUploadBack() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath
        upload(path)
          .then((r) => {
            const imageUrl = this.getUploadUrl(r) || path
            this.setData({ backImage: imageUrl })
            this.runOcr('/cert/ocr/id-card/back', imageUrl, () => {})
          })
          .catch(() => this.setData({ backImage: path }))
      }
    })
  },

  onSendSms() {
    const phone = (this.data.form.phone || '').trim()
    if (this.data.smsCountdown > 0) return
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

    wx.showLoading({ title: '发送中...' })
    post('/cert/sms/send', {
      phone,
      scene: 'worker_cert'
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
    const { form, frontImage, backImage, selectedSkills, verificationToken } = this.data
    if (!form.name || !form.idCard || !form.phone || !frontImage || !backImage) {
      wx.showToast({ title: '请填写必填项', icon: 'none' })
      return
    }
    if (this.data.verifyingSms) {
      wx.showToast({ title: '验证码校验中', icon: 'none' })
      return
    }
    if (!verificationToken) {
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
    post('/cert/worker', {
      realName: form.name,
      idNo: form.idCard,
      phone: form.phone,
      idFrontImage: frontImage,
      idBackImage: backImage,
      skills: selectedSkills,
      verificationToken
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '提交成功，等待审核', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }).catch(() => {
      wx.hideLoading()
    })
  }
})
