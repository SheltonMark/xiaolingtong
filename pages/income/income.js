const { get } = require('../../utils/request')
const {
  buildRecordGroups,
  buildWalletRecordsModel,
  filterRecordsByMonth,
  getRoleMeta
} = require('../../utils/wallet-records')

Page({
  data: {
    userRole: 'enterprise',
    detailTitle: '收入明细',
    currentMonth: '',
    monthIncomeLabel: '本月收入',
    monthCountLabel: '收入笔数',
    monthIncome: '0.00',
    monthWithdraw: '0.00',
    monthOrders: 0,
    currentTab: 'all',
    tabs: [],
    allGroups: [],
    groups: [],
    year: 2026,
    month: 1
  },

  onLoad() {
    const now = new Date()
    this.setData({
      year: now.getFullYear(),
      month: now.getMonth() + 1
    })
  },

  onShow() {
    const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    const roleMeta = getRoleMeta(userRole)

    this.setData({
      userRole,
      detailTitle: roleMeta.incomePageTitle,
      monthIncomeLabel: roleMeta.monthIncomeLabel,
      monthCountLabel: roleMeta.monthCountLabel,
      tabs: [
        { key: 'all', label: '全部' },
        { key: 'income', label: roleMeta.incomeTabLabel },
        { key: 'withdraw', label: '提现' }
      ]
    })

    this.loadIncome()
  },

  filterList() {
    const { currentTab, allGroups } = this.data
    if (currentTab === 'all') {
      this.setData({ groups: allGroups })
      return
    }

    const groups = allGroups
      .map((group) => ({
        date: group.date,
        items: group.items.filter((item) => item.type === currentTab)
      }))
      .filter((group) => group.items.length > 0)

    this.setData({ groups })
  },

  loadIncome() {
    const { year, month } = this.data
    const currentMonth = `${year}年${month}月`
    this.setData({ currentMonth })

    Promise.all([
      get('/wallet').catch(() => ({ data: {} })),
      get('/wallet/transactions', { page: 1, pageSize: 1000 }).catch(() => ({ data: { list: [] } }))
    ]).then(([walletRes, txRes]) => {
      const { records } = buildWalletRecordsModel({
        wallet: walletRes.data || {},
        transactions: txRes.data,
        userRole: this.data.userRole
      })

      const monthRecords = filterRecordsByMonth(records, year, month)
      const monthIncome = monthRecords
        .filter((item) => item.type === 'income' && item.status === 'success')
        .reduce((sum, item) => sum + item.amountValue, 0)
      const monthWithdraw = monthRecords
        .filter((item) => item.type === 'withdraw' && item.status !== 'failed')
        .reduce((sum, item) => sum + item.amountValue, 0)
      const monthOrders = monthRecords
        .filter((item) => item.type === 'income' && item.status === 'success')
        .length

      this.setData({
        monthIncome: monthIncome.toFixed(2),
        monthWithdraw: monthWithdraw.toFixed(2),
        monthOrders,
        allGroups: buildRecordGroups(monthRecords)
      }, () => {
        this.filterList()
      })
    })
  },

  onTabChange(e) {
    const currentTab = e.currentTarget.dataset.key
    this.setData({ currentTab }, () => {
      this.filterList()
    })
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
