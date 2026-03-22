const { get, post } = require('../../utils/request')

Page({
  data: {
    viewOnly: false,
    role: 'enterprise',
    jobId: '',
    activeTab: 'settlement',
    settlementReady: false,
    settlementStatus: '',
    job: {},
    steps: [],
    workers: [],
    fees: {},
    attendance: null,
    currentWorkerSettlement: null
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
    if (jobId) {
      this.loadSettlement(jobId)
      this.loadAttendance(jobId)
    }
  },

  onRateEnterprise() {
    const enterpriseId = (this.data.job && this.data.job.enterpriseId) || ''
    wx.navigateTo({
      url: '/pages/rate/rate?jobId=' + this.data.jobId + '&enterpriseId=' + enterpriseId
    })
  },

  onTabChange(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  loadSettlement(jobId) {
    get('/settlements/' + jobId).then(res => {
      const d = res.data || res || {}
      if (d.exists === false) {
        this.setData({
          settlementReady: false,
          settlementStatus: '',
          job: { ...d.job || {}, enterpriseId: (d.job || {}).enterpriseId || '' },
          steps: [],
          workers: [],
          fees: d.fees || {},
          currentWorkerSettlement: null
        })
        return
      }
      this.setData({
        settlementReady: true,
        settlementStatus: d.status || '',
        job: { ...d.job || {}, enterpriseId: (d.job || {}).enterpriseId || '' },
        steps: d.steps || [],
        workers: d.workers || [],
        fees: d.fees || {},
        currentWorkerSettlement: d.currentWorkerSettlement || null
      })
    }).catch(() => {
      this.setData({ settlementReady: false })
    })
  },

  loadAttendance(jobId) {
    get('/work/attendance/' + jobId).then(res => {
      const data = res.data || res || {}
      const statusMap = {
        normal: { text: '正常', color: 'text-fresh', icon: '✅' },
        late: { text: '迟到', color: 'text-warm', icon: '⚠️' },
        early_leave: { text: '早退', color: 'text-warm', icon: '⚠️' },
        absent: { text: '缺勤', color: 'text-rose', icon: '❌' },
        injury: { text: '受伤', color: 'text-rose', icon: '🏥' }
      }
      const records = (data.records || []).map(r => {
        const s = statusMap[r.attendance] || statusMap.normal
        return { ...r, statusText: s.text, statusColor: s.color, statusIcon: s.icon }
      })
      this.setData({
        attendance: {
          ...data,
          records,
          summary: data.summary || { totalExpected: 0, totalPresent: 0, totalAbsent: 0 },
          photos: data.photos || []
        }
      })
    }).catch(() => {})
  },

  onViewAll() {
    wx.showToast({ title: '查看全部明细', icon: 'none' })
  },

  onConfirmAttendance() {
    wx.showModal({
      title: '确认考勤汇总单',
      content: '确认后将按这份考勤汇总单生成结算明细，请先核对考勤数据无误',
      success: (res) => {
        if (res.confirm) {
          post('/work/attendance/' + this.data.jobId + '/confirm').then(() => {
            wx.showToast({ title: '考勤汇总单已确认', icon: 'success' })
            this.loadAttendance(this.data.jobId)
            this.loadSettlement(this.data.jobId)
          }).catch(() => {})
        }
      }
    })
  },

  onPreviewAttendancePhotos() {
    const photos = (this.data.attendance && this.data.attendance.photos) || []
    if (!photos.length) {
      wx.showToast({ title: '暂无现场照片', icon: 'none' })
      return
    }
    wx.previewImage({
      current: photos[0],
      urls: photos
    })
  },

  onDisputeAttendance() {
    wx.showModal({
      title: '提出考勤异议',
      content: '如对考勤汇总单有异议，请联系管理员核实后再进入结算',
      showCancel: false
    })
  },

  onSubmitSettlement() {
    wx.showModal({
      title: '提交结算单',
      content: '提交后将通知临工按已确认的考勤汇总单核对工时与收益，超时将自动确认',
      success: (res) => {
        if (res.confirm) {
          post('/settlements/' + this.data.jobId + '/confirm').then(() => {
            wx.showToast({ title: '已提交', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 1500)
          }).catch(() => {})
        }
      }
    })
  },

  onConfirmSettlement() {
    const currentWorkerSettlement = this.data.currentWorkerSettlement || {}
    if (!currentWorkerSettlement.canConfirm) {
      wx.showToast({ title: '当前暂无需确认', icon: 'none' })
      return
    }
    wx.showModal({
      title: '确认工时',
      content: '确认后将完成你的结算确认，请先核对工时与收益明细。',
      success: (res) => {
        if (!res.confirm) return
        post('/settlements/' + this.data.jobId + '/confirm').then(() => {
          wx.showToast({ title: '已确认', icon: 'success' })
          this.loadSettlement(this.data.jobId)
        }).catch(() => {})
      }
    })
  },

  onPay() {
    wx.showModal({
      title: '确认支付',
      content: '支付后工资将自动发放至临工钱包',
      success: (res) => {
        if (res.confirm) {
          post('/settlements/' + this.data.jobId + '/pay').then((data) => {
            if (data.prepay_id) {
              wx.requestPayment({
                timeStamp: data.timeStamp,
                nonceStr: data.nonceStr,
                package: data.package,
                signType: data.signType || 'RSA',
                paySign: data.paySign,
                success() {
                  wx.showToast({ title: '支付成功', icon: 'success' })
                  setTimeout(() => wx.navigateBack(), 1500)
                },
                fail() { wx.showToast({ title: '支付取消', icon: 'none' }) }
              })
            }
          }).catch(() => {})
        }
      }
    })
  }
})
