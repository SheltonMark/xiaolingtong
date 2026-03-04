const { post, upload } = require('../../utils/request')

Page({
  data: {
    settleType: 0,
    form: {
      title: '', jobType: '', price: '', headcount: '',
      content: '', startDate: '', endDate: '',
      startTime: '08:00', endTime: '18:00', address: '',
      contactName: '', contactPhone: ''
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
    images: []
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
        this.setData({ 'form.address': res.address || res.name })
      },
      fail() {}
    })
  },

  onToggleBenefit(e) {
    const idx = e.currentTarget.dataset.index
    const key = 'benefits[' + idx + '].selected'
    this.setData({ [key]: !this.data.benefits[idx].selected })
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
    const { form, settleType, benefits, images } = this.data
    if (!form.title) { wx.showToast({ title: '请输入招工标题', icon: 'none' }); return }
    if (!form.price) { wx.showToast({ title: '请输入工厂出价', icon: 'none' }); return }
    if (!form.headcount) { wx.showToast({ title: '请输入招工人数', icon: 'none' }); return }
    if (!form.startDate || !form.endDate) { wx.showToast({ title: '请选择工作日期', icon: 'none' }); return }
    if (!form.address) { wx.showToast({ title: '请选择工作地点', icon: 'none' }); return }
    if (!form.contactName) { wx.showToast({ title: '请输入联系人', icon: 'none' }); return }
    if (!form.contactPhone) { wx.showToast({ title: '请输入联系电话', icon: 'none' }); return }
    const selectedBenefits = benefits.filter(b => b.selected).map(b => b.label)
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
      contactName: form.contactName,
      contactPhone: form.contactPhone,
      benefits: selectedBenefits,
      images
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '发布成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }).catch(() => { wx.hideLoading() })
  }
})
