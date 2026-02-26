const { get, post } = require('../../utils/request')

Page({
  data: {
    balance: 0,
    selectedIndex: 1,
    packages: [
      { id: 1, beans: 50, price: '5', tag: '', tagColor: '', save: '' },
      { id: 2, beans: 200, price: '18', tag: '热门', tagColor: '#F97316', save: '2' },
      { id: 3, beans: 500, price: '40', tag: '', tagColor: '', save: '10' },
      { id: 4, beans: 1000, price: '68', tag: '', tagColor: '', save: '32' },
      { id: 5, beans: 2000, price: '128', tag: '', tagColor: '', save: '72' },
      { id: 6, beans: 5000, price: '298', tag: '最划算', tagColor: '#F43F5E', save: '202' }
    ],
    records: []
  },
  onShow() {
    get('/beans/balance').then(res => {
      this.setData({ balance: res.data.balance || 0 })
    }).catch(() => {})
    get('/beans/transactions').then(res => {
      this.setData({ records: res.data || [] })
    }).catch(() => {})
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
        if (res.confirm) {
          post('/beans/recharge', { amount: pkg.beans, price: Number(pkg.price) }).then((data) => {
            if (data.prepay_id) {
              wx.requestPayment({
                timeStamp: data.timeStamp,
                nonceStr: data.nonceStr,
                package: data.package,
                signType: data.signType || 'RSA',
                paySign: data.paySign,
                success: () => {
                  wx.showToast({ title: '充值成功', icon: 'success' })
                  this.onShow()
                },
                fail() { wx.showToast({ title: '支付取消', icon: 'none' }) }
              })
            }
          }).catch(() => {})
        }
      }
    })
  }
})
