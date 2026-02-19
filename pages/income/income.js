Page({
  data: {
    currentMonth: '2026年2月',
    monthIncome: '2,552',
    monthWithdraw: '800',
    monthOrders: 6,
    currentTab: 0,
    tabs: ['全部', '收入', '提现'],
    groups: [
      {
        date: '2月8日',
        items: [
          { id: 'i1', title: '工资结算', desc: '顺丰物流仓 · 包装工', detail: '8天 × 8h × 18元/h', amount: '+¥1,152', type: 'income' }
        ]
      },
      {
        date: '2月6日',
        items: [
          { id: 'i2', title: '提现到微信', desc: '微信零钱 · 已到账', detail: '', amount: '-¥800', type: 'withdraw' }
        ]
      },
      {
        date: '1月30日',
        items: [
          { id: 'i3', title: '工资结算', desc: '美华服装厂 · 缝纫工', detail: '15天 × 3200件 × 0.5元/件', amount: '+¥1,600', type: 'income' }
        ]
      },
      {
        date: '1月25日',
        items: [
          { id: 'i4', title: '工资结算', desc: '鑫达电子厂 · 组装工', detail: '10天 × 7h × 20元/h', amount: '+¥1,400', type: 'income' }
        ]
      }
    ]
  },
  onTabChange(e) { this.setData({ currentTab: Number(e.currentTarget.dataset.index) }) },
  onPrevMonth() { wx.showToast({ title: '上月', icon: 'none' }) },
  onNextMonth() { wx.showToast({ title: '下月', icon: 'none' }) }
})
