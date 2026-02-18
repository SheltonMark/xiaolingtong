Page({
  data: {
    balance: '520.00',
    records: [
      { id: 'r1', title: '电子组装工结算', amount: '+¥1,400', time: '02-17 19:30', type: 'income' },
      { id: 'r2', title: '提现到微信', amount: '-¥800', time: '02-15 10:00', type: 'withdraw' },
      { id: 'r3', title: '包装工结算', amount: '+¥960', time: '02-10 18:00', type: 'income' }
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
  }
})
