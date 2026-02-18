Page({
  data: {
    form: { name: '', idCard: '', phone: '', smsCode: '' },
    skills: ['组装工', '包装工', '缝纫工', '搬运工', '质检员', '焊工', '叉车工', '普工'],
    selectedSkills: [],
    frontImage: '',
    backImage: ''
  },
  onInput(e) { this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value }) },
  onSkillTap(e) {
    const tag = e.currentTarget.dataset.tag
    let s = [...this.data.selectedSkills]
    const idx = s.indexOf(tag)
    idx > -1 ? s.splice(idx, 1) : s.push(tag)
    this.setData({ selectedSkills: s })
  },
  onGetCode() {
    if (!this.data.form.phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' }); return
    }
    wx.showToast({ title: '验证码已发送', icon: 'success' })
  },
  onUploadFront() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: (res) => {
      this.setData({ frontImage: res.tempFiles[0].tempFilePath })
    }})
  },
  onUploadBack() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: (res) => {
      this.setData({ backImage: res.tempFiles[0].tempFilePath })
    }})
  },
  onSubmit() {
    const { form, frontImage, backImage } = this.data
    if (!form.name || !form.idCard || !form.phone || !frontImage || !backImage) {
      wx.showToast({ title: '请填写必填项', icon: 'none' }); return
    }
    wx.showToast({ title: '提交成功，等待审核', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1500)
  }
})
