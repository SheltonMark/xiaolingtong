const { get, post } = require('../../utils/request')

Page({
  data: {
    pageTitle: '用工流程',
    viewOnly: false,
    role: 'enterprise',
    jobId: '',
    activeTab: 'settlement',
    applicantFilter: 'all',
    applicantTabs: [],
    manageJob: {},
    manageSummary: {},
    applicants: [],
    filteredApplicants: [],
    job: {},
    steps: [],
    workers: [],
    fees: {},
    attendance: null,
    settlementReady: false,
    settlementStatus: '',
    currentWorkerSettlement: null
  },

  onLoad(options) {
    const jobId = options.jobId || ''
    const requestedTab = options.tab || 'settlement'
    const role = options.role || (getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise')
    const isWorker = role === 'worker'

    this.setData({
      jobId,
      role: isWorker ? 'worker' : role,
      viewOnly: options.viewOnly === '1' || isWorker,
      activeTab: isWorker ? 'settlement' : requestedTab,
      pageTitle: isWorker ? '工资结算' : '用工流程'
    })

    if (jobId) {
      this.loadManage(jobId)
      this.loadSettlement(jobId)
      this.loadAttendance(jobId)
    }
  },

  onTabChange(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  buildApplicantTabs(summary) {
    const base = summary || {}
    return [
      { key: 'all', label: '全部', count: (base.totalCount || 0) },
      { key: 'pending', label: '待审核', count: (base.pendingCount || 0) },
      { key: 'accepted', label: '已录用', count: (base.acceptedCount || 0) },
      { key: 'confirmed', label: '已到岗', count: (base.confirmedCount || 0) },
      { key: 'rejected', label: '已拒绝', count: (base.rejectedCount || 0) }
    ]
  },

  updateFilteredApplicants() {
    const filter = this.data.applicantFilter
    const applicants = this.data.applicants || []
    const filteredApplicants = filter === 'all'
      ? applicants
      : applicants.filter(item => {
          if (filter === 'confirmed') return ['confirmed', 'working', 'done'].includes(item.status)
          return item.status === filter
        })
    this.setData({ filteredApplicants })
  },

  loadManage(jobId) {
    get('/jobs/' + jobId + '/manage').then(res => {
      const data = res.data || res || {}
      const summary = {
        ...data.summary,
        totalCount: (data.applicants || []).length
      }
      this.setData({
        manageJob: data.job || {},
        manageSummary: summary,
        applicants: data.applicants || [],
        applicantTabs: this.buildApplicantTabs(summary),
        job: Object.keys(this.data.job || {}).length ? this.data.job : {
          company: (data.job || {}).companyName || '',
          jobType: (data.job || {}).title || '',
          dateRange: (data.job || {}).dateRange || '',
          totalWorkers: summary.confirmedCount || 0
        }
      })
      this.updateFilteredApplicants()
    }).catch(() => {})
  },

  loadSettlement(jobId) {
    get('/settlements/' + jobId).then(res => {
      const data = res.data || res || {}
      this.setData({
        settlementReady: true,
        settlementStatus: data.status || '',
        job: { ...(this.data.job || {}), ...(data.job || {}), enterpriseId: (data.job || {}).enterpriseId || '' },
        steps: data.steps || [],
        workers: data.workers || [],
        fees: data.fees || {},
        currentWorkerSettlement: data.currentWorkerSettlement || null
      })
    }).catch(() => {
      this.setData({ settlementReady: false })
    })
  },

  loadAttendance(jobId) {
    get('/work/attendance/' + jobId).then(res => {
      const data = res.data || res || {}
      const statusMap = {
        normal: { text: '正常', color: 'st-status-green', icon: '✅' },
        late: { text: '迟到', color: 'st-status-amber', icon: '⚠️' },
        early_leave: { text: '早退', color: 'st-status-amber', icon: '⚠️' },
        absent: { text: '缺勤', color: 'st-status-rose', icon: '❌' },
        injury: { text: '受伤', color: 'st-status-rose', icon: '🏥' }
      }
      const records = (data.records || []).map(item => {
        const status = statusMap[item.attendance] || statusMap.normal
        return { ...item, statusText: status.text, statusColor: status.color, statusIcon: status.icon }
      })
      this.setData({
        attendance: {
          ...data,
          records,
          photos: data.photos || [],
          summary: data.summary || { totalExpected: 0, totalPresent: 0, totalAbsent: 0 }
        }
      })
    }).catch(() => {})
  },

  onApplicantFilterChange(e) {
    this.setData({ applicantFilter: e.currentTarget.dataset.key }, () => this.updateFilteredApplicants())
  },

  onAcceptApplicant(e) {
    const workerId = e.currentTarget.dataset.id
    wx.showModal({
      title: '录用临工',
      content: '录用后该工人将进入待出勤确认阶段。',
      success: (res) => {
        if (!res.confirm) return
        post('/jobs/' + this.data.jobId + '/applications/' + workerId + '/accept').then(() => {
          wx.showToast({ title: '已录用', icon: 'success' })
          this.loadManage(this.data.jobId)
        }).catch(() => {})
      }
    })
  },

  onRejectApplicant(e) {
    const workerId = e.currentTarget.dataset.id
    wx.showModal({
      title: '拒绝报名',
      content: '确认拒绝该工人的报名？',
      confirmColor: '#F43F5E',
      success: (res) => {
        if (!res.confirm) return
        post('/jobs/' + this.data.jobId + '/applications/' + workerId + '/reject').then(() => {
          wx.showToast({ title: '已拒绝', icon: 'success' })
          this.loadManage(this.data.jobId)
        }).catch(() => {})
      }
    })
  },

  onSetSupervisor(e) {
    const workerId = e.currentTarget.dataset.id
    wx.showModal({
      title: '设置主管',
      content: '设置后该临工将负责现场签到和考勤提交。',
      success: (res) => {
        if (!res.confirm) return
        post('/jobs/' + this.data.jobId + '/supervisor', { workerId }).then(() => {
          wx.showToast({ title: '已设置主管', icon: 'success' })
          this.loadManage(this.data.jobId)
          this.loadAttendance(this.data.jobId)
        }).catch(() => {})
      }
    })
  },

  onViewAll() {
    wx.showToast({ title: '查看全部明细', icon: 'none' })
  },

  onConfirmAttendance() {
    wx.showModal({
      title: '确认考勤',
      content: '确认后将进入结算流程，请确保考勤数据无误。',
      success: (res) => {
        if (!res.confirm) return
        post('/work/attendance/' + this.data.jobId + '/confirm').then(() => {
          wx.showToast({ title: '考勤已确认', icon: 'success' })
          this.loadAttendance(this.data.jobId)
          this.loadSettlement(this.data.jobId)
        }).catch(() => {})
      }
    })
  },

  onPreviewAttendancePhotos() {
    const photos = (this.data.attendance && this.data.attendance.photos) || []
    if (!photos.length) {
      wx.showToast({ title: '暂无现场照片', icon: 'none' })
      return
    }
    wx.previewImage({ current: photos[0], urls: photos })
  },

  onDisputeAttendance() {
    wx.showModal({
      title: '提出异议',
      content: '请联系管理员核实考勤数据。',
      showCancel: false
    })
  },

  onSubmitSettlement() {
    wx.showModal({
      title: '提交结算单',
      content: '提交后将通知临工确认工时，超时将自动确认。',
      success: (res) => {
        if (!res.confirm) return
        post('/settlements/' + this.data.jobId + '/confirm').then(() => {
          wx.showToast({ title: '已提交', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 1500)
        }).catch(() => {})
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
      content: '支付后工资将自动发放至临工钱包。',
      success: (res) => {
        if (!res.confirm) return
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
              fail() {
                wx.showToast({ title: '支付取消', icon: 'none' })
              }
            })
          }
        }).catch(() => {})
      }
    })
  },

  onRateEnterprise() {
    const enterpriseId = (this.data.job && this.data.job.enterpriseId) || ''
    wx.navigateTo({
      url: '/pages/rate/rate?jobId=' + this.data.jobId + '&enterpriseId=' + enterpriseId
    })
  }
})
