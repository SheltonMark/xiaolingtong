Page({
  data: {
    form: {
      title: '',
      jobType: '',
      salary: '',
      need: '',
      description: '',
      startDate: '',
      endDate: '',
      startTime: '08:00',
      endTime: '18:00',
      location: ''
    },
    salaryMode: 0,
    salaryModes: ['按小时', '按件'],
    jobTypes: ['电子组装', '包装工', '缝纫工', '仓储物流', '质检', '其他'],
    jobTypeIndex: -1,
    benefits: ['包午餐', '有空调', '包住宿', '有班车', '长期合作', '熟手优先'],
    selectedBenefits: [],
    images: []
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
  },

  onJobTypeChange(e) {
    this.setData({ jobTypeIndex: e.detail.value, 'form.jobType': this.data.jobTypes[e.detail.value] })
  },

  onSalaryModeChange(e) {
    this.setData({ salaryMode: e.currentTarget.dataset.index })
  },

  onDateChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
  },

  onTimeChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
  },

  onBenefitTap(e) {
    const tag = e.currentTarget.dataset.tag
    let selected = this.data.selectedBenefits
    const idx = selected.indexOf(tag)
    if (idx > -1) {
      selected.splice(idx, 1)
    } else {
      selected.push(tag)
    }
    this.setData({ selectedBenefits: selected })
  },

  onChooseImage() {
    if (this.data.images.length >= 9) return
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
    if (!form.title || !form.salary || !form.need) {
      wx.showToast({ title: '请填写必填项', icon: 'none' })
      return
    }
    wx.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 1500)
  }
})
