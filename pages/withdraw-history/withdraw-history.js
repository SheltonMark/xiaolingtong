const { get } = require('../../utils/request')

Page({
  data: {
    summary: {},
    records: []
  },
  onShow() {
    get('/wallet/transactions', { type: 'withdraw' }).then(res => {
      const list = res.data || []
      const totalAmount = list.filter(r => r.statusType === 'success').reduce((sum, r) => sum + Number(String(r.amount).replace(',', '')), 0)
      this.setData({
        records: list,
        summary: {
          totalAmount: totalAmount.toLocaleString(),
          totalCount: list.length,
          balance: getApp().globalData.userInfo ? getApp().globalData.userInfo.walletBalance || '0' : '0'
        }
      })
    }).catch(() => {})
  }
})
