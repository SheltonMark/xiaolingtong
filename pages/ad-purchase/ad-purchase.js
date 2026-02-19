Page({
  data: {
    selectedSlot: 0,
    linkType: 0,
    form: { startDate: '2026-02-15', endDate: '2026-02-21' },
    slots: [
      { name: '首页Banner广告', price: 200 },
      { name: '信息流推荐位', price: 100 }
    ],
    days: 7,
    unitPrice: 200,
    totalPrice: 1400,
    adImage: ''
  },
  onSlotChange(e) {
    const idx = Number(e.currentTarget.dataset.index)
    const price = this.data.slots[idx].price
    this.setData({ selectedSlot: idx, unitPrice: price, totalPrice: price * this.data.days })
  },
  onLinkChange(e) { this.setData({ linkType: Number(e.currentTarget.dataset.index) }) },
  onStartDateChange(e) {
    this.setData({ 'form.startDate': e.detail.value })
    this._calcDays()
  },
  onEndDateChange(e) {
    this.setData({ 'form.endDate': e.detail.value })
    this._calcDays()
  },
  _calcDays() {
    const { startDate, endDate } = this.data.form
    if (startDate && endDate) {
      const d = Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000) + 1
      const days = d > 0 ? d : 0
      this.setData({ days, totalPrice: days * this.data.unitPrice })
    }
  },
  onUploadAd() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: (res) => {
      this.setData({ adImage: res.tempFiles[0].tempFilePath })
    }})
  },
  onDeleteAd() { this.setData({ adImage: '' }) },
  onPay() {
    wx.showModal({
      title: '确认支付',
      content: '支付 ¥' + this.data.totalPrice + '，投放' + this.data.days + '天',
      success: (res) => { if (res.confirm) wx.showToast({ title: '购买成功', icon: 'success' }) }
    })
  }
})
