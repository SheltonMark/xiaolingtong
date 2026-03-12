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
    records: []
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
      this.setData({
        balance: Number(d.balance || 0).toFixed(2),
        totalIncome: Number(d.totalIncome || 0).toFixed(2)
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
    wx.showModal({
      title: '提现',
      content: '将余额提现到微信零钱？',
      success: (res) => {
        if (res.confirm) {
          post('/wallet/withdraw', { amount: Number(this.data.balance) }).then(() => {
            wx.showToast({ title: '提现申请已提交', icon: 'success' })
            this.loadWallet()
          }).catch(() => {})
        }
      }
    })
  },

  onWithdrawHistory() {
    wx.navigateTo({ url: '/pages/withdraw-history/withdraw-history' })
  },

  onGoIncome() {
    wx.navigateTo({ url: '/pages/income/income' })
  }
})
