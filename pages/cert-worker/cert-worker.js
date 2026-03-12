const { post, upload } = require('../../utils/request')

Page({
  data: {
    form: { name: '', idCard: '', phone: '' },
    skills: ['组装工', '包装工', '缝纫工', '搬运工', '质检员', '焊工', '叉车工', '普工'],
    selectedSkills: [],
    selectedSkillsMap: {},
    frontImage: '',
    backImage: ''
  },

  onInput(e) {
    this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value })
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

  onUploadFront() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath
        upload(path)
          .then((r) => this.setData({ frontImage: r.data.url || r.data }))
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
          .then((r) => this.setData({ backImage: r.data.url || r.data }))
          .catch(() => this.setData({ backImage: path }))
      }
    })
  },

  onSubmit() {
    const { form, frontImage, backImage, selectedSkills } = this.data
    if (!form.name || !form.idCard || !form.phone || !frontImage || !backImage) {
      wx.showToast({ title: '请填写必填项', icon: 'none' })
      return
    }

    wx.showLoading({ title: '提交中...' })
    post('/cert/worker', {
      realName: form.name,
      idNo: form.idCard,
      phone: form.phone,
      idFrontImage: frontImage,
      idBackImage: backImage,
      skills: selectedSkills
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '提交成功，等待审核', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }).catch(() => {
      wx.hideLoading()
    })
  }
})
