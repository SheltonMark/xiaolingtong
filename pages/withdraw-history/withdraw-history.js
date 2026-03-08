const { get } = require('../../utils/request')

Page({
  data: {
    summary: {},
    records: []
  },
  onShow() {
    // 加载提现记录和当前余额
    Promise.all([
      get('/wallet/transactions', { type: 'withdraw' }),
      get('/wallet')
    ]).then(([txRes, walletRes]) => {
      const list = txRes.data || []
      const walletData = walletRes.data || {}
      const totalAmount = list.filter(r => r.statusType === 'success').reduce((sum, r) => sum + Number(String(r.amount).replace(',', '')), 0)

      this.setData({
        records: list,
        summary: {
          totalAmount: totalAmount.toLocaleString(),
          totalCount: list.length,
          balance: (walletData.balance || 0).toFixed(2)
        }
      })
    }).catch(() => {})
  }
})
