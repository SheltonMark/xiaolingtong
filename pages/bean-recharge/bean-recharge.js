Page({
  data: {
    balance: 128,
    selectedIndex: 1,
    packages: [
      { id: 1, beans: 50, price: '5', tag: '', tagColor: '', save: '' },
      { id: 2, beans: 200, price: '18', tag: '热门', tagColor: '#F97316', save: '2' },
      { id: 3, beans: 500, price: '40', tag: '', tagColor: '', save: '10' },
      { id: 4, beans: 1000, price: '68', tag: '', tagColor: '', save: '32' },
      { id: 5, beans: 2000, price: '128', tag: '', tagColor: '', save: '72' },
      { id: 6, beans: 5000, price: '298', tag: '最划算', tagColor: '#F43F5E', save: '202' }
    ],
    records: [
      { id: 'r1', title: '查看联系方式', desc: '***贸易公司 · 02-07', amount: '-10灵豆', type: 'expense' },
      { id: 'r2', title: '查看联系方式', desc: '***电子科技 · 02-05', amount: '-10灵豆', type: 'expense' },
      { id: 'r3', title: '充值200灵豆', desc: '微信支付 · 02-01', amount: '+200灵豆', type: 'income' }
    ]
  },
  onSelect(e) { this.setData({ selectedIndex: Number(e.currentTarget.dataset.index) }) },
  onViewAll() {
    wx.navigateTo({ url: '/pages/bean-detail/bean-detail' })
  },
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
