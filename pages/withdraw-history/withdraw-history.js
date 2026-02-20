Page({
  data: {
    summary: {
      totalAmount: '3,200',
      totalCount: 5,
      balance: '520'
    },
    records: [
      { id: 'w1', amount: '520', time: '02-18 10:15', statusText: '处理中', statusType: 'pending', statusIcon: '⏱' },
      { id: 'w2', amount: '800', time: '02-06 14:30', statusText: '已到账', statusType: 'success', statusIcon: '✓' },
      { id: 'w3', amount: '1,200', time: '01-28 09:20', statusText: '已到账', statusType: 'success', statusIcon: '✓' },
      { id: 'w4', amount: '680', time: '01-15 16:40', statusText: '提现失败（实名信息不匹配）', statusType: 'fail', statusIcon: '✕' },
      { id: 'w5', amount: '1,000', time: '01-10 11:00', statusText: '已到账', statusType: 'success', statusIcon: '✓' }
    ]
  }
})
