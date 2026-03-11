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
      this.setData({ balance: res.data.beanBalance || 0 })
    }).catch(() => {})
    get('/beans/transactions').then(res => {
      this.setData({ records: res.data || [] })
    }).catch(() => {})
  },
  onSelect(e) { this.setData({ selectedIndex: Number(e.currentTarget.dataset.index) }) },
  onViewAll() {
    wx.navigateTo({ url: '/pages/bean-detail/bean-detail' })
  },
  // 轮询获取余额，等待支付回调处理完成
  async pollBalance(maxRetries = 10, delayMs = 500) {
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
      try {
        const res = await get('/beans/balance')
        if (res.data && res.data.beanBalance > 0) {
          this.setData({ balance: res.data.beanBalance })
          return true
        }
      } catch (e) {
        // 继续轮询
      }
    }
    return false
  },
  onPay() {
    const pkg = this.data.packages[this.data.selectedIndex]
    wx.showModal({
      title: '确认支付',
      content: '支付 ¥' + pkg.price + ' 获得 ' + pkg.beans + ' 灵豆',
      success: (res) => {
        if (res.confirm) {
          post('/beans/recharge', { amount: pkg.beans, price: Number(pkg.price) }).then((res) => {
            const payData = res.data || res
            if (payData.prepay_id) {
              wx.requestPayment({
                timeStamp: payData.timeStamp,
                nonceStr: payData.nonceStr,
                package: payData.package,
                signType: payData.signType || 'RSA',
                paySign: payData.paySign,
                success: () => {
                  wx.showToast({ title: '充值成功', icon: 'success' })
                  // 支付成功后轮询获取余额，等待后端支付回调处理完成
                  this.pollBalance()
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
