const { get } = require('../../utils/request')

const TITLE_MAP = {
  settlement: '工资到账',
  bean_recharge: '返佣到账',
  refund: '退款到账'
}

Page({
  data: {
    currentMonth: '',
    monthIncome: '0.00',
    monthWithdraw: '0.00',
    monthOrders: 0,
    currentTab: 0,
    tabs: ['全部', '收入', '提现'],
    allGroups: [],
    groups: [],
    year: 2026,
    month: 1
  },

  onLoad() {
    const now = new Date()
    this.setData({ year: now.getFullYear(), month: now.getMonth() + 1 })
    this.loadIncome()
  },

  isIncomeType(type) {
    return type === 'income' || type === 'commission' || type === 'refund'
  },

  formatMonthKey(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  },

  formatDateKey(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  },

  formatDateLabel(dateKey) {
    return dateKey.slice(5).replace('-', '/')
  },

  formatTime(date) {
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  },

  toRecord(item) {
    const date = new Date(item.createdAt)
    if (Number.isNaN(date.getTime())) return null
    const isIncome = this.isIncomeType(item.type)
    const amount = Number(item.amount || 0)
    const amountText = `${isIncome ? '+' : '-'}${Math.abs(amount).toFixed(2)}`
    const title = TITLE_MAP[item.refType] || (isIncome ? '收入到账' : '提现')
    const statusText = item.status === 'pending'
      ? '处理中'
      : (item.status === 'failed' ? '失败' : '成功')
    return {
      id: item.id,
      type: isIncome ? 'income' : 'withdraw',
      title,
      desc: `${this.formatTime(date)} · ${statusText}`,
      detail: item.remark || '',
      amount: amountText,
      status: item.status || '',
      refType: item.refType || '',
      amountValue: Math.abs(amount),
      createdAt: item.createdAt,
      dateKey: this.formatDateKey(date)
    }
  },

  buildGroups(records) {
    const map = {}
    records.forEach((rec) => {
      if (!map[rec.dateKey]) map[rec.dateKey] = []
      map[rec.dateKey].push(rec)
    })
    return Object.keys(map)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((dateKey) => ({ date: this.formatDateLabel(dateKey), items: map[dateKey] }))
  },

  filterList() {
    const { currentTab, allGroups } = this.data
    if (currentTab === 0) {
      this.setData({ groups: allGroups })
      return
    }
    const filterType = currentTab === 1 ? 'income' : 'withdraw'
    const groups = allGroups
      .map((group) => ({
        date: group.date,
        items: group.items.filter((item) => item.type === filterType)
      }))
      .filter((group) => group.items.length > 0)
    this.setData({ groups })
  },

  loadIncome() {
    const { year, month } = this.data
    const monthDisplay = `${year}年${month}月`
    const monthKey = `${year}-${String(month).padStart(2, '0')}`
    this.setData({ currentMonth: monthDisplay })

    get('/wallet/transactions', { page: 1, pageSize: 200 }).then((res) => {
      const payload = res.data || {}
      const list = Array.isArray(payload) ? payload : (payload.list || [])
      const monthRecords = list
        .map((item) => this.toRecord(item))
        .filter(Boolean)
        .filter((item) => this.formatMonthKey(new Date(item.createdAt)) === monthKey)

      const monthIncome = monthRecords
        .filter((item) => item.type === 'income' && item.status === 'success')
        .reduce((sum, item) => sum + item.amountValue, 0)
      const monthWithdraw = monthRecords
        .filter((item) => item.type === 'withdraw' && item.status === 'success')
        .reduce((sum, item) => sum + item.amountValue, 0)
      const monthOrders = monthRecords.filter((item) => item.refType === 'settlement').length

      const allGroups = this.buildGroups(monthRecords)
      this.setData({
        monthIncome: monthIncome.toFixed(2),
        monthWithdraw: monthWithdraw.toFixed(2),
        monthOrders,
        allGroups
      })
      this.filterList()
    }).catch(() => {})
  },

  onTabChange(e) {
    this.setData({ currentTab: Number(e.currentTarget.dataset.index) })
    this.filterList()
  },

  onPrevMonth() {
    let { year, month } = this.data
    month -= 1
    if (month < 1) {
      month = 12
      year -= 1
    }
    this.setData({ year, month })
    this.loadIncome()
  },

  onNextMonth() {
    let { year, month } = this.data
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
    this.setData({ year, month })
    this.loadIncome()
  }
})
