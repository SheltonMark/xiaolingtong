const { get, post } = require('../../utils/request')

function getErrorMessage(err, fallback) {
  return (err && (err.message || err.errMsg)) || fallback
}

function showPaymentFailure(err, fallback) {
  const errMsg = String((err && err.errMsg) || '')
  if (errMsg.includes('cancel')) {
    wx.showToast({ title: '支付已取消', icon: 'none' })
    return
  }
  wx.showModal({
    title: '支付失败',
    content: getErrorMessage(err, fallback),
    showCancel: false
  })
}

Page({
  data: {
    viewOnly: false,
    role: 'enterprise',
    jobId: '',
    job: {},
    steps: [],
    workers: [],
    fees: {}
  },

  onLoad(options) {
    const jobId = options.jobId || ''
    this.setData({ jobId })
    if (options.viewOnly === '1') {
      this.setData({ viewOnly: true })
    }
    if (options.role) {
      this.setData({ role: options.role })
    } else {
      const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
      if (userRole === 'worker') {
        this.setData({ role: 'worker', viewOnly: true })
      }
    }
    if (jobId) this.loadSettlement(jobId)
  },

  loadSettlement(jobId) {
    get('/settlements/' + jobId).then(res => {
      const d = res.data || {}
      this.setData({
        job: d.job || {},
        steps: d.steps || [],
        workers: d.workers || [],
        fees: d.fees || {}
      })
    }).catch(() => {})
  },

  onViewAll() {
    wx.showToast({ title: '查看全部明细', icon: 'none' })
  },

  onSubmitSettlement() {
    wx.showModal({
      title: '提交结算单',
      content: '提交后将通知临工按已确认的考勤汇总单核对工时与收益，超时将自动确认。',
      success: (res) => {
        if (!res.confirm) return
        post('/settlements/' + this.data.jobId + '/confirm').then(() => {
          wx.showToast({ title: '已提交', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 1500)
        }).catch(() => {})
      }
    })
  },

  onPay() {
    wx.showModal({
      title: '确认支付',
      content: '支付后工资将自动发放至临工钱包。',
      success: (res) => {
        if (!res.confirm) return
        post('/settlements/' + this.data.jobId + '/pay').then((data) => {
          const payData = data && data.data ? data.data : data
          if (!payData || !payData.prepay_id) {
            console.error('settlement payment missing prepay_id', payData)
            wx.showModal({
              title: '支付失败',
              content: '支付参数缺失，请稍后重试',
              showCancel: false
            })
            return
          }
          wx.requestPayment({
            timeStamp: payData.timeStamp,
            nonceStr: payData.nonceStr,
            package: payData.package,
            signType: payData.signType || 'RSA',
            paySign: payData.paySign,
            success() {
              wx.showToast({ title: '支付成功', icon: 'success' })
              setTimeout(() => wx.navigateBack(), 1500)
            },
            fail(err) {
              console.error('settlement payment requestPayment fail', err)
              showPaymentFailure(err, '微信支付拉起失败，请稍后重试')
            }
          })
        }).catch((err) => {
          console.error('settlement payment create order fail', err)
          wx.showModal({
            title: '下单失败',
            content: getErrorMessage(err, '结算支付下单失败，请稍后重试'),
            showCancel: false
          })
        })
      }
    })
  }
})
