Page({
  data: {
    viewOnly: false,
    role: 'enterprise', // manager | enterprise
    job: {
      company: '鑫达电子厂',
      avatarText: '鑫',
      jobType: '电子组装工',
      dateRange: '02-10 至 02-17 · 共7天',
      totalWorkers: 12,
      totalHours: 840,
      factoryTotal: '21,000'
    },
    steps: [
      { label: '临时管理员已确认', time: '02-17 18:30', done: true },
      { label: '平台已审核', time: '02-17 19:00', done: true },
      { label: '等待工厂付款', time: '48小时内', done: false }
    ],
    workers: [
      { name: '张三', hours: 70, factoryPay: '1,750', workerPay: '1,400', confirmed: true },
      { name: '李四', hours: 64, factoryPay: '1,600', workerPay: '1,280', confirmed: false }
    ],
    fees: {
      factoryTotal: '21,000.00',
      platformFee: '4,200.00',
      managerFee: '420.00',
      workerTotal: '16,380.00'
    }
  },

  onViewAll() {
    wx.showToast({ title: '查看全部明细', icon: 'none' })
  },

  onLoad(options) {
    if (options.viewOnly === '1') {
      this.setData({ viewOnly: true })
    }
    if (options.role) {
      this.setData({ role: options.role })
    } else {
      const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
      // 临工进来看到的是只读视图
      if (userRole === 'worker') {
        this.setData({ role: 'worker', viewOnly: true })
      }
    }
  },

  onSubmitSettlement() {
    wx.showModal({
      title: '提交结算单',
      content: '提交后将通知临工确认工时，超时将自动确认',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已提交', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 1500)
        }
      }
    })
  },

  onPay() {
    wx.showModal({
      title: '确认支付',
      content: '支付后工资将自动发放至临工钱包',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '支付成功', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 1500)
        }
      }
    })
  }
})
