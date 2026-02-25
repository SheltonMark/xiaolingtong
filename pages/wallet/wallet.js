const { get, post } = require('../../utils/request')

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
  loadWallet() {
    get('/wallet').then(res => {
      const d = res.data || {}
      this.setData({
        balance: (d.balance || 0).toFixed(2),
        totalIncome: (d.totalIncome || 0).toFixed(2)
      })
    }).catch(() => {})
    get('/wallet/transactions').then(res => {
      this.setData({ records: res.data.list || res.data || [] })
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
  },
  onGoBeanShop() {
    wx.navigateTo({ url: '/pages/bean-recharge/bean-recharge' })
  },
  onGoSettlement() {
    wx.navigateTo({ url: '/pages/settlement/settlement' })
  },
  onGoHelp() {
    wx.navigateTo({ url: '/pages/settings/settings' })
  },
  onShow() {
    const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    this.setData({ userRole })
  }
})
