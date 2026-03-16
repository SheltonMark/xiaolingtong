const { get, post } = require('../../utils/request')
const { buildWalletRecordsModel, getRoleMeta } = require('../../utils/wallet-records')

Page({
  data: {
    userRole: 'enterprise',
    balance: '0.00',
    totalIncome: '0.00',
    totalIncomeLabel: '累计返佣',
    recordsSectionTitle: '最近记录',
    records: [],
    showWithdrawModal: false,
    withdrawAmount: '',
    withdrawLimit: '0.00',
    maxWithdrawPerTime: 200,
    withdrawSubmitting: false
  },

  onShow() {
    const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    const roleMeta = getRoleMeta(userRole)

    this.setData({
      userRole,
      totalIncomeLabel: roleMeta.totalIncomeLabel,
      recordsSectionTitle: roleMeta.recentRecordsLabel
    })

    this.loadWallet()
  },

  loadWallet() {
    Promise.all([
      get('/wallet').catch(() => ({ data: {} })),
      get('/wallet/transactions', { page: 1, pageSize: 1000 }).catch(() => ({ data: { list: [] } }))
    ]).then(([walletRes, txRes]) => {
      const wallet = walletRes.data || {}
      const { records, summary } = buildWalletRecordsModel({
        wallet,
        transactions: txRes.data,
        userRole: this.data.userRole
      })

      this.setData({
        balance: summary.balance,
        totalIncome: summary.totalIncome,
        records: records.slice(0, 5),
        withdrawLimit: Math.min(Number(summary.balance), this.data.maxWithdrawPerTime).toFixed(2)
      })
    })
  },

  onWithdraw() {
    if (Number(this.data.balance) <= 0) {
      wx.showToast({ title: '可提现余额不足', icon: 'none' })
      return
    }

    this.setData({
      showWithdrawModal: true,
      withdrawAmount: '',
      withdrawSubmitting: false,
      withdrawLimit: Math.min(Number(this.data.balance), this.data.maxWithdrawPerTime).toFixed(2)
    })
  },

  onCloseWithdrawModal() {
    if (this.data.withdrawSubmitting) return

    this.setData({
      showWithdrawModal: false,
      withdrawAmount: ''
    })
  },

  onModalTap() {},

  onWithdrawAmountInput(e) {
    const rawValue = String(e.detail.value || '')
    const normalized = rawValue
      .replace(/[^\d.]/g, '')
      .replace(/^\./, '')
      .replace(/\.{2,}/g, '.')
      .replace(/^(\d+\.\d{0,2}).*$/, '$1')
    const parts = normalized.split('.')
    const value = parts.length > 2
      ? `${parts[0]}.${parts.slice(1).join('')}`
      : normalized

    this.setData({ withdrawAmount: value })
  },

  validateWithdrawAmount() {
    const amountText = String(this.data.withdrawAmount || '').trim()
    if (!amountText) return '请输入提现金额'
    if (!/^\d+(\.\d{1,2})?$/.test(amountText)) return '请输入正确的提现金额'

    const amount = Number(amountText)
    if (!amount || amount <= 0) return '提现金额必须大于 0'
    if (amount > this.data.maxWithdrawPerTime) return '单次最多提现 200 元'
    if (amount > Number(this.data.balance)) return '提现金额不能超过可提现余额'
    return ''
  },

  onConfirmWithdraw() {
    if (this.data.withdrawSubmitting) return

    const error = this.validateWithdrawAmount()
    if (error) {
      wx.showToast({ title: error, icon: 'none' })
      return
    }

    const amount = Number(this.data.withdrawAmount)
    this.setData({ withdrawSubmitting: true })
    wx.showLoading({ title: '提交中...' })

    post('/wallet/withdraw', { amount }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '提现申请已提交', icon: 'success' })
      this.setData({
        showWithdrawModal: false,
        withdrawAmount: '',
        withdrawSubmitting: false
      })
      this.loadWallet()
    }).catch(() => {
      wx.hideLoading()
      this.setData({ withdrawSubmitting: false })
    })
  },

  onWithdrawHistory() {
    wx.navigateTo({ url: '/pages/withdraw-history/withdraw-history?tab=withdraw' })
  },

  onGoIncome() {
    wx.navigateTo({ url: '/pages/withdraw-history/withdraw-history?tab=all' })
  }
})
