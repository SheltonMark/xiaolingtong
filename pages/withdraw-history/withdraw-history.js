const { get } = require('../../utils/request')
const { buildWalletRecordsModel, getRoleMeta } = require('../../utils/wallet-records')

Page({
  data: {
    userRole: 'enterprise',
    detailPageTitle: '钱包明细',
    totalIncomeLabel: '累计返佣',
    tabs: [],
    currentTab: 'all',
    summary: {
      totalIncome: '0.00',
      totalWithdraw: '0.00',
      balance: '0.00'
    },
    records: [],
    displayRecords: []
  },

  onLoad(options = {}) {
    const currentTab = ['all', 'income', 'withdraw'].includes(options.tab) ? options.tab : 'all'
    this.setData({ currentTab })
  },

  onShow() {
    const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    const roleMeta = getRoleMeta(userRole)

    this.setData({
      userRole,
      detailPageTitle: roleMeta.detailPageTitle,
      totalIncomeLabel: roleMeta.totalIncomeLabel,
      tabs: [
        { key: 'all', label: '全部' },
        { key: 'income', label: roleMeta.incomeTabLabel },
        { key: 'withdraw', label: '提现' }
      ]
    })

    this.loadRecords()
  },

  loadRecords() {
    Promise.all([
      get('/wallet/transactions', { page: 1, pageSize: 1000 }).catch(() => ({ data: { list: [] } })),
      get('/wallet').catch(() => ({ data: {} }))
    ]).then(([txRes, walletRes]) => {
      const { records, summary } = buildWalletRecordsModel({
        wallet: walletRes.data || {},
        transactions: txRes.data,
        userRole: this.data.userRole
      })

      this.setData({
        records,
        summary
      }, () => {
        this.applyFilter()
      })
    })
  },

  applyFilter() {
    const { currentTab, records } = this.data
    const displayRecords = currentTab === 'all'
      ? records
      : records.filter((item) => item.type === currentTab)

    this.setData({ displayRecords })
  },

  onTabChange(e) {
    const currentTab = e.currentTarget.dataset.key
    this.setData({ currentTab }, () => {
      this.applyFilter()
    })
  }
})
