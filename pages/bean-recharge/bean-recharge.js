Page({
  data: {
    balance: 128,
    selectedIndex: 1,
    packages: [
      { id: 1, beans: 50, price: '9.9', tag: '' },
      { id: 2, beans: 120, price: '19.9', tag: '热门' },
      { id: 3, beans: 300, price: '39.9', tag: '超值' },
      { id: 4, beans: 600, price: '68', tag: '' },
      { id: 5, beans: 1500, price: '158', tag: '最划算' },
      { id: 6, beans: 3000, price: '298', tag: '' }
    ]
  },
  onSelect(e) { this.setData({ selectedIndex: e.currentTarget.dataset.index }) },
  onPay() {
    const pkg = this.data.packages[this.data.selectedIndex]
    wx.showModal({
      title: '确认支付',
      content: '支付 ¥' + pkg.price + ' 获得 ' + pkg.beans + ' 灵豆',
      success: (res) => {
        if (res.confirm) wx.showToast({ title: '充值成功', icon: 'success' })
      }
    })
  }
})
