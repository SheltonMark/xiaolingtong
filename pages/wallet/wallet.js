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
    withdrawSubmitting: false,
    canWithdraw: true,
    withdrawDisabledReason: '',
    withdrawSubmitHint: '',
    pendingWithdrawAction: null
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
        withdrawLimit: Math.min(Number(summary.balance), this.data.maxWithdrawPerTime).toFixed(2),
        canWithdraw: wallet.canWithdraw !== false,
        withdrawDisabledReason: wallet.withdrawDisabledReason || '',
        pendingWithdrawAction: wallet.pendingWithdrawAction || null
      })
    })
  },

  onWithdraw() {
    if (!this.data.canWithdraw) {
      wx.showToast({ title: this.data.withdrawDisabledReason || '提现通道暂不可用', icon: 'none' })
      return
    }
    if (this.data.pendingWithdrawAction && this.data.pendingWithdrawAction.confirmation) {
      this.startMerchantTransferConfirmation(this.data.pendingWithdrawAction)
      return
    }
    if (Number(this.data.balance) <= 0) {
      wx.showToast({ title: '可提现余额不足', icon: 'none' })
      return
    }

    this.setData({
      showWithdrawModal: true,
      withdrawAmount: '',
      withdrawSubmitting: false,
      withdrawSubmitHint: '',
      withdrawLimit: Math.min(Number(this.data.balance), this.data.maxWithdrawPerTime).toFixed(2)
    })
  },

  onCloseWithdrawModal() {
    if (this.data.withdrawSubmitting) return

    this.setData({
      showWithdrawModal: false,
      withdrawAmount: '',
      withdrawSubmitHint: ''
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

    if (this.data.pendingWithdrawAction && this.data.pendingWithdrawAction.confirmation) {
      this.setData({
        withdrawSubmitting: true,
        withdrawSubmitHint: this.data.pendingWithdrawAction.message || '请在微信中确认收款'
      })
      this.startMerchantTransferConfirmation(this.data.pendingWithdrawAction)
      return
    }

    const error = this.validateWithdrawAmount()
    if (error) {
      wx.showToast({ title: error, icon: 'none' })
      return
    }

    const amount = Number(this.data.withdrawAmount)
    this.setData({
      withdrawSubmitting: true,
      withdrawSubmitHint: '正在提交提现申请，请稍候...'
    })
    wx.showLoading({ title: '提交中...' })

    post('/wallet/withdraw', { amount }).then((res) => {
      const payload = this.normalizeWithdrawResponse(res)
      this.applyPendingWithdrawState(payload)
      wx.hideLoading()
      if (payload && payload.confirmation) {
        this.startMerchantTransferConfirmation(payload)
        return
      }
      wx.showToast({ title: '提现申请已提交', icon: 'success' })
      this.setData({
        showWithdrawModal: false,
        withdrawAmount: '',
        withdrawSubmitting: false,
        withdrawSubmitHint: ''
      })
      this.loadWallet()
    }).catch((error) => {
      wx.hideLoading()
      this.setData({
        withdrawSubmitting: false,
        withdrawSubmitHint: error && error.message ? error.message : '提现提交失败，请重试'
      })
      if (error && error.message) {
        wx.showToast({ title: error.message, icon: 'none' })
      }
    })
  },

  normalizeWithdrawResponse(res) {
    if (res && typeof res === 'object' && res.data && typeof res.data === 'object') {
      return res.data
    }
    return res || {}
  },

  applyPendingWithdrawState(payload) {
    if (!payload || typeof payload !== 'object') return

    const nextData = {}
    if (payload.balance !== undefined && payload.balance !== null) {
      const balance = Number(payload.balance || 0)
      if (Number.isFinite(balance)) {
        nextData.balance = balance.toFixed(2)
        nextData.withdrawLimit = Math.min(balance, this.data.maxWithdrawPerTime).toFixed(2)
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'confirmation')) {
      nextData.pendingWithdrawAction = payload.confirmation ? payload : null
    }
    if (payload.message) {
      nextData.withdrawSubmitHint = payload.message
    }

    if (Object.keys(nextData).length > 0) {
      this.setData(nextData)
    }
  },

  startMerchantTransferConfirmation(payload) {
    const confirmation = payload && payload.confirmation
    if (!confirmation) {
      this.setData({ withdrawSubmitting: false })
      wx.showToast({ title: (payload && payload.message) || '暂无可确认的提现', icon: 'none' })
      return
    }

    if (typeof wx.requestMerchantTransfer !== 'function') {
      const message = '当前微信版本不支持确认收款，请升级后重试'
      this.setData({
        withdrawSubmitting: false,
        withdrawSubmitHint: message
      })
      wx.showToast({ title: message, icon: 'none' })
      return
    }

    wx.hideLoading()
    wx.requestMerchantTransfer({
      mchId: confirmation.mchId,
      appId: confirmation.appId,
      package: confirmation.package,
      success: () => {
        wx.showToast({ title: '微信确认已提交', icon: 'success' })
        this.setData({
          pendingWithdrawAction: null,
          showWithdrawModal: false,
          withdrawAmount: '',
          withdrawSubmitting: false,
          withdrawSubmitHint: ''
        })
        this.loadWallet()
      },
      fail: (error) => {
        const errMsg = String((error && error.errMsg) || '')
        const message = /cancel/i.test(errMsg)
          ? '已取消微信确认，可稍后继续确认'
          : '微信确认失败，请重试'
        this.applyPendingWithdrawState(payload)
        this.setData({
          showWithdrawModal: true,
          withdrawSubmitting: false,
          withdrawSubmitHint: message
        })
        wx.showToast({ title: message, icon: 'none' })
      }
    })
  },

  onWithdrawHistory() {
    wx.navigateTo({ url: '/pages/withdraw-history/withdraw-history?tab=withdraw' })
  },

  onGoIncome() {
    wx.navigateTo({ url: '/pages/withdraw-history/withdraw-history?tab=all' })
  }
})
