Page({
  data: {
    settleType: 0,
    form: {
      title: '', jobType: '', price: '', headcount: '',
      content: '', startDate: '', endDate: '',
      startTime: '08:00', endTime: '18:00', address: ''
    },
    jobTypes: ['电子组装', '包装工', '搬运工', '缝纫工', '焊接工', '质检员', '普工', '其他'],
    benefits: [
      { label: '包午餐', selected: true },
      { label: '有空调', selected: true },
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
    if (!form.title) { wx.showToast({ title: '请输入招工标题', icon: 'none' }); return }
    if (!form.price) { wx.showToast({ title: '请输入工厂出价', icon: 'none' }); return }
    if (!form.headcount) { wx.showToast({ title: '请输入招工人数', icon: 'none' }); return }
    wx.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1500)
  }
})
