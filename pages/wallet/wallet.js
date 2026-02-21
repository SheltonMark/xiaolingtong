Page({
  data: {
    userRole: 'enterprise',
    balance: '520.00',
    totalIncome: '8,650.00',
    records: [
      { id: 'r1', title: '工资结算 · 顺丰物流仓', desc: '包装工 · 02-08', amount: '+¥1,152', type: 'income' },
      { id: 'r2', title: '提现到微信', desc: '02-06 · 已到账', amount: '-¥800', type: 'withdraw' },
      { id: 'r3', title: '工资结算 · 美华服装厂', desc: '缝纫工 · 01-30', amount: '+¥1,600', type: 'income' },
      { id: 'r4', title: '工资结算 · 鑫达电子厂', desc: '组装工 · 01-25', amount: '+¥1,400', type: 'income' }
    ]
  },
  onWithdraw() {
    wx.showModal({
      title: '提现',
      content: '将余额提现到微信零钱？',
      success: (res) => {
        if (res.confirm) wx.showToast({ title: '提现申请已提交', icon: 'success' })
      }
    })
  },
  onWithdrawHistory() {
    wx.navigateTo({ url: '/pages/withdraw-history/withdraw-history' })
  },
  onGoIncome() {
    wx.navigateTo({ url: '/pages/income/income' })
  },
  onGoBeanShop() {
    wx.navigateTo({ url: '/pages/bean-recharge/bean-recharge' })
  },
  onGoSettlement() {
    wx.navigateTo({ url: '/pages/settlement/settlement' })
  },
  onGoHelp() {
    wx.navigateTo({ url: '/pages/settings/settings' })
  },
  onShow() {
    const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    this.setData({ userRole })
  }
})
