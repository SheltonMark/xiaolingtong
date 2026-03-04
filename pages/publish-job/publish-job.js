const { post, upload } = require('../../utils/request')

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
      location: '',
      contactName: '',
      contactPhone: ''
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
        const uploads = newImages.map(path => upload(path))
        Promise.all(uploads).then(results => {
          const urls = results.map(r => r.data.url || r.data)
          this.setData({ images: [...this.data.images, ...urls] })
        }).catch(() => {
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
    const { form, salaryMode, salaryModes, selectedBenefits, images } = this.data
    if (!form.title || !form.salary || !form.need) {
      wx.showToast({ title: '请填写必填项', icon: 'none' })
      return
    }
    if (!form.startDate || !form.endDate) {
      wx.showToast({ title: '请选择工作日期', icon: 'none' })
      return
    }
    if (!form.location) {
      wx.showToast({ title: '请输入工作地点', icon: 'none' })
      return
    }
    if (!form.contactName) {
      wx.showToast({ title: '请输入联系人', icon: 'none' })
      return
    }
    if (!form.contactPhone) {
      wx.showToast({ title: '请输入联系电话', icon: 'none' })
      return
    }
    const data = {
      title: form.title,
      jobType: form.jobType,
      salary: Number(form.salary),
      salaryType: salaryMode === 0 ? 'hourly' : 'piece',
      salaryUnit: salaryMode === 0 ? '元/时' : '元/件',
      needCount: Number(form.need),
      description: form.description,
      dateStart: form.startDate,
      dateEnd: form.endDate,
      workHours: `${form.startTime || '08:00'}-${form.endTime || '18:00'}`,
      location: form.location,
      contactName: form.contactName,
      contactPhone: form.contactPhone,
      benefits: selectedBenefits,
      images
    }
    wx.showLoading({ title: '发布中...' })
    post('/jobs', data).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '发布成功', icon: 'success' })
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 1500)
    }).catch(() => {
      wx.hideLoading()
    })
  }
})
