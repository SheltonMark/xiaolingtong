const { get, post } = require('../../utils/request')

const REF_TITLE_MAP = {
  settlement: '工资到账',
  bean_recharge: '邀请返佣',
  refund: '退款到账'
}

Page({
  data: {
    userRole: 'enterprise',
    balance: '0.00',
    totalIncome: '0.00',
    records: [],
    showWithdrawModal: false,
    withdrawAmount: '',
    withdrawLimit: '0.00',
    maxWithdrawPerTime: 200,
    withdrawSubmitting: false
  },

  onShow() {
    const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    this.setData({ userRole })
    this.loadWallet()
  },

  formatDateTime(raw) {
    if (!raw) return ''
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return String(raw).replace('T', ' ').slice(0, 16)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${mm}-${dd} ${hh}:${mi}`
  },

  mapWalletRecord(item) {
    const isIncome = item.type === 'income' || item.type === 'commission' || item.type === 'refund'
    const title = REF_TITLE_MAP[item.refType] || (isIncome ? '收入到账' : '提现')
    const amount = Number(item.amount || 0)
    const amountText = `${isIncome ? '+' : '-'}${Math.abs(amount).toFixed(2)}`
    const statusText = item.status === 'pending'
      ? '处理中'
      : (item.status === 'failed' ? '失败' : '成功')
    return {
      ...item,
      type: isIncome ? 'income' : 'withdraw',
      title,
      desc: `${this.formatDateTime(item.createdAt)} · ${statusText}`,
      amount: amountText
    }
  },

  loadWallet() {
    get('/wallet').then(res => {
      const d = res.data || {}
      const balance = Number(d.balance || 0)
      this.setData({
        balance: balance.toFixed(2),
        totalIncome: Number(d.totalIncome || 0).toFixed(2),
        withdrawLimit: Math.min(balance, this.data.maxWithdrawPerTime).toFixed(2)
      })
    }).catch(() => {})

    get('/wallet/transactions', { page: 1, pageSize: 5 }).then(res => {
      const payload = res.data || {}
      const list = Array.isArray(payload) ? payload : (payload.list || [])
      const records = list.map((item) => this.mapWalletRecord(item))
      this.setData({ records })
    }).catch(() => {})
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
    wx.navigateTo({ url: '/pages/withdraw-history/withdraw-history' })
  },

  onGoIncome() {
    wx.navigateTo({ url: '/pages/income/income' })
  }
})
