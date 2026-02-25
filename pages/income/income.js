const { get } = require('../../utils/request')

Page({
  data: {
    currentMonth: '',
    monthIncome: '0',
    monthWithdraw: '0',
    monthOrders: 0,
    currentTab: 0,
    tabs: ['全部', '收入', '提现'],
    groups: [],
    year: 2026,
    month: 2
  },
  onLoad() {
    const now = new Date()
    this.setData({ year: now.getFullYear(), month: now.getMonth() + 1 })
    this.loadIncome()
  },
  loadIncome() {
    const { year, month } = this.data
    this.setData({ currentMonth: year + '年' + month + '月' })
    get('/wallet/income', { year, month }).then(res => {
      const d = res.data || {}
      this.setData({
        monthIncome: d.monthIncome || '0',
        monthWithdraw: d.monthWithdraw || '0',
        monthOrders: d.monthOrders || 0,
        groups: d.groups || []
      })
    }).catch(() => {})
  },
  onTabChange(e) { this.setData({ currentTab: Number(e.currentTarget.dataset.index) }) },
  onPrevMonth() {
    let { year, month } = this.data
    month--
    if (month < 1) { month = 12; year-- }
    this.setData({ year, month })
    this.loadIncome()
  },
  onNextMonth() {
    let { year, month } = this.data
    month++
    if (month > 12) { month = 1; year++ }
    this.setData({ year, month })
    this.loadIncome()
  }
})
