const { get } = require('../../utils/request')

Page({
  data: {
    summary: {},
    records: []
  },
  onShow() {
    // 加载提现记录
    get('/wallet/transactions', { type: 'withdraw' }).then(res => {
      const list = res.data || []
      const totalAmount = list.filter(r => r.statusType === 'success').reduce((sum, r) => sum + Number(String(r.amount).replace(',', '')), 0)
      this.setData({
        records: list,
        summary: {
          totalAmount: totalAmount.toLocaleString(),
          totalCount: list.length
        }
      })
    }).catch(() => {})

    // 加载当前余额
    get('/wallet').then(res => {
      const d = res.data || {}
      this.setData({
        'summary.balance': (d.balance || 0).toFixed(2)
      })
    }).catch(() => {})
  }
})
