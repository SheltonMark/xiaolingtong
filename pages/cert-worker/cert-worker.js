Page({
  data: {
    form: { name: '', idCard: '', phone: '' },
    skills: ['电子组装', '包装工', '缝纫工', '仓储物流', '质检', '焊接', '叉车'],
    selectedSkills: [],
    frontImage: '',
    backImage: ''
  },
  onInput(e) { this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value }) },
  onSkillTap(e) {
    const tag = e.currentTarget.dataset.tag
    let s = this.data.selectedSkills
    const idx = s.indexOf(tag)
    idx > -1 ? s.splice(idx, 1) : s.push(tag)
    this.setData({ selectedSkills: s })
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
    if (!form.name || !form.idCard || !frontImage || !backImage) {
      wx.showToast({ title: '请填写必填项', icon: 'none' }); return
    }
    wx.showToast({ title: '提交成功，等待审核', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1500)
  }
})
