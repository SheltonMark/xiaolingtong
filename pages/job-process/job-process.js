const { get, post } = require('../../utils/request')
const { normalizeImageUrl } = require('../../utils/image')

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

function getRoleText(role) {
  const map = {
    enterprise: '企业工作台',
    manager: '主管视角',
    worker: '工人视角'
  }
  return map[role] || '用工流程'
}

function getPageTitle(role) {
  const map = {
    enterprise: '用工流程',
    manager: '考勤与结算',
    worker: '工资结算'
  }
  return map[role] || '用工流程'
}

function getTabLabel(tab) {
  const map = {
    applications: '报名处理',
    attendance: '考勤汇总',
    settlement: '结算明细'
  }
  return map[tab] || '用工流程'
}

function getTabTone(tab) {
  const map = {
    applications: 'blue',
    attendance: 'amber',
    settlement: 'green'
  }
  return map[tab] || 'blue'
}

function getTabHint(role, tab) {
  if (role === 'worker') {
    return '可查看工时、收益、支付状态，并在可确认时完成本人结算确认。'
  }
  if (role === 'manager') {
    return tab === 'attendance'
      ? '这里展示主管提交的考勤汇总和现场照片，也可切换查看结算结果。'
      : '这里展示按考勤汇总生成的结算单，供主管复核支付进度。'
  }
  if (tab === 'applications') {
    return '报名筛选和录用处理统一在这里完成。'
  }
  if (tab === 'attendance') {
    return '主管提交后，企业在这里确认考勤汇总，再进入结算。'
  }
  return '考勤确认后自动生成结算单，支付和回执都在这里统一查看。'
}

function buildTabs(role) {
  if (role === 'worker') return []
  if (role === 'manager') {
    return [
      { key: 'attendance', label: '考勤汇总' },
      { key: 'settlement', label: '结算明细' }
    ]
  }
  return [
    { key: 'applications', label: '报名管理' },
    { key: 'attendance', label: '考勤汇总' },
    { key: 'settlement', label: '结算明细' }
  ]
}

function resolveRole(role) {
  if (role === 'worker' || role === 'manager') return role
  return 'enterprise'
}

function resolveActiveTab(role, requestedTab) {
  const allowedTabs = buildTabs(role).map(item => item.key)
  if (role === 'worker') return 'settlement'
  if (allowedTabs.includes(requestedTab)) return requestedTab
  return allowedTabs[0] || 'settlement'
}

function normalizeTimeText(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return text
  const hours = match[1].padStart(2, '0')
  const minutes = match[2]
  const seconds = (match[3] || '00').padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

function getAttendanceMeta(status, confirmedAt) {
  const normalized = status || 'submitted'
  if (normalized === 'confirmed') {
    return {
      status: normalized,
      statusText: '已确认汇总单',
      statusHint: confirmedAt ? `企业已于 ${confirmedAt} 确认` : '企业已确认，等待进入结算'
    }
  }
  return {
    status: normalized,
    statusText: '待确认汇总单',
    statusHint: '确认后将按这份汇总单进入结算'
  }
}

Page({
  data: {
    pageTitle: '用工流程',
    viewOnly: false,
    role: 'enterprise',
    jobId: '',
    workflowTabs: [],
    activeTab: 'settlement',
    headerTitle: '用工流程',
    headerSubtitle: '',
    headerRoleLabel: '企业工作台',
    headerStatusLabel: '报名处理',
    headerStatusTone: 'blue',
    headerHint: '',
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
    const storedRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    const role = resolveRole(options.role || storedRole)
    const requestedTab = options.tab || (role === 'enterprise' ? 'applications' : role === 'manager' ? 'attendance' : 'settlement')
    const activeTab = resolveActiveTab(role, requestedTab)
    const isWorker = role === 'worker'

    this.setData({
      jobId,
      role,
      workflowTabs: buildTabs(role),
      viewOnly: options.viewOnly === '1' || isWorker,
      activeTab,
      pageTitle: getPageTitle(role)
    }, () => this.refreshHeader())

    if (jobId) {
      if (role === 'enterprise') this.loadManage(jobId)
      if (!(role === 'enterprise' && activeTab === 'applications')) {
        this.loadActiveTabData(jobId, activeTab)
      }
    }
  },

  loadActiveTabData(jobId, activeTab) {
    if (!jobId) return
    if (activeTab === 'applications' && this.data.role === 'enterprise') {
      this.loadManage(jobId)
      return
    }
    if (activeTab === 'attendance') {
      this.loadAttendance(jobId)
      return
    }
    this.loadSettlement(jobId)
  },

  refreshHeader() {
    const manageJob = this.data.manageJob || {}
    const job = this.data.job || {}
    const attendanceJob = (this.data.attendance && this.data.attendance.job) || {}
    const title = manageJob.title || job.title || job.jobType || attendanceJob.title || '用工流程'
    const companyName = manageJob.companyName || job.companyName || job.company || attendanceJob.company || ''
    const dateRange = manageJob.dateRange || job.dateRange || attendanceJob.date || ''
    const subtitle = [companyName, dateRange].filter(Boolean).join(' · ')

    this.setData({
      headerTitle: title,
      headerSubtitle: subtitle,
      headerRoleLabel: getRoleText(this.data.role),
      headerStatusLabel: getTabLabel(this.data.activeTab),
      headerStatusTone: getTabTone(this.data.activeTab),
      headerHint: getTabHint(this.data.role, this.data.activeTab)
    })
  },

  onTabChange(e) {
    const activeTab = e.currentTarget.dataset.tab
    if (!activeTab || activeTab === this.data.activeTab) return
    this.setData({ activeTab }, () => {
      this.refreshHeader()
      this.loadActiveTabData(this.data.jobId, activeTab)
    })
  },

  buildApplicantTabs(summary, applicants) {
    const base = summary || {}
    const list = Array.isArray(applicants) ? applicants : []
    const useList = list.length > 0
    const counts = {
      totalCount: useList ? list.length : (base.totalCount || 0),
      pendingCount: useList ? list.filter(item => item.status === 'pending').length : (base.pendingCount || 0),
      acceptedCount: useList ? list.filter(item => item.status === 'accepted').length : (base.acceptedCount || 0),
      confirmedCount: useList ? list.filter(item => item.status === 'confirmed').length : (base.confirmedCount || 0),
      workingCount: useList ? list.filter(item => item.status === 'working').length : (base.workingCount || 0),
      doneCount: useList ? list.filter(item => item.status === 'done').length : (base.doneCount || 0),
      rejectedCount: useList ? list.filter(item => item.status === 'rejected').length : (base.rejectedCount || 0)
    }
    return [
      { key: 'all', label: '全部', count: counts.totalCount },
      { key: 'pending', label: '待审核', count: counts.pendingCount },
      { key: 'accepted', label: '已录用', count: counts.acceptedCount },
      { key: 'confirmed', label: '已确认', count: counts.confirmedCount },
      { key: 'working', label: '进行中', count: counts.workingCount },
      { key: 'done', label: '已完工', count: counts.doneCount },
      { key: 'rejected', label: '已拒绝', count: counts.rejectedCount }
    ]
  },

  updateFilteredApplicants() {
    const filter = this.data.applicantFilter
    const applicants = this.data.applicants || []
    const filteredApplicants = filter === 'all'
      ? applicants
      : applicants.filter(item => item.status === filter)
    this.setData({ filteredApplicants })
  },

  normalizeApplicant(item) {
    const applicant = item || {}
    const worker = applicant.worker || {}
    const rawName = applicant.name || applicant.workerName || applicant.realName || applicant.nickname || worker.realName || worker.nickname || ''
    const name = String(rawName || '').trim() || '临工'
    const avatarUrl = normalizeImageUrl(applicant.avatarUrl || worker.avatarUrl || '')
    return {
      ...applicant,
      name,
      avatarUrl,
      avatarText: name.charAt(0) || '工'
    }
  },

  loadManage(jobId) {
    get('/jobs/' + jobId + '/manage').then(res => {
      const data = res.data || res || {}
      const applicants = (data.applicants || []).map(item => this.normalizeApplicant(item))
      const summary = {
        ...data.summary,
        totalCount: applicants.length,
        pendingCount: applicants.filter(item => item.status === 'pending').length,
        acceptedCount: applicants.filter(item => item.status === 'accepted').length,
        confirmedCount: applicants.filter(item => item.status === 'confirmed').length,
        workingCount: applicants.filter(item => item.status === 'working').length,
        doneCount: applicants.filter(item => item.status === 'done').length,
        rejectedCount: applicants.filter(item => item.status === 'rejected').length,
        activeCount: applicants.filter(item => ['confirmed', 'working', 'done'].includes(item.status)).length
      }
      this.setData({
        manageJob: data.job || {},
        manageSummary: summary,
        applicants,
        applicantTabs: this.buildApplicantTabs(summary, applicants),
        job: Object.keys(this.data.job || {}).length ? this.data.job : {
          company: (data.job || {}).companyName || '',
          jobType: (data.job || {}).title || '',
          dateRange: (data.job || {}).dateRange || '',
          totalWorkers: summary.activeCount || 0
        }
      }, () => this.refreshHeader())
      this.updateFilteredApplicants()
    }).catch(() => {})
  },

  loadSettlement(jobId) {
    get('/settlements/' + jobId).then(res => {
      const data = res.data || res || {}
      if (data.exists === false) {
        this.setData({
          settlementReady: false,
          settlementStatus: '',
          job: { ...(this.data.job || {}), ...(data.job || {}), enterpriseId: (data.job || {}).enterpriseId || '' },
          steps: [],
          workers: [],
          fees: data.fees || {},
          currentWorkerSettlement: null
        }, () => this.refreshHeader())
        return
      }
      this.setData({
        settlementReady: true,
        settlementStatus: data.status || '',
        job: { ...(this.data.job || {}), ...(data.job || {}), enterpriseId: (data.job || {}).enterpriseId || '' },
        steps: data.steps || [],
        workers: data.workers || [],
        fees: data.fees || {},
        currentWorkerSettlement: data.currentWorkerSettlement || null
      }, () => this.refreshHeader())
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
        return {
          ...item,
          checkInTime: normalizeTimeText(item.checkInTime),
          checkOutTime: normalizeTimeText(item.checkOutTime),
          statusText: status.text,
          statusColor: status.color,
          statusIcon: status.icon
        }
      })
      const attendanceMeta = getAttendanceMeta(data.status, data.confirmedAt)
      const attendanceJob = data.job || {}
      this.setData({
        job: {
          ...(this.data.job || {}),
          title: this.data.job.title || attendanceJob.title || '',
          jobType: this.data.job.jobType || attendanceJob.title || '',
          company: this.data.job.company || attendanceJob.company || '',
          dateRange: this.data.job.dateRange || attendanceJob.date || ''
        },
        attendance: {
          ...data,
          records,
          photos: data.photos || [],
          summary: data.summary || { totalExpected: 0, totalPresent: 0, totalAbsent: 0 },
          status: attendanceMeta.status,
          statusText: attendanceMeta.statusText,
          statusHint: attendanceMeta.statusHint
        }
      }, () => this.refreshHeader())
    }).catch(() => {})
  },

  onApplicantFilterChange(e) {
    const key = (e.detail && e.detail.key) || e.currentTarget.dataset.key
    this.setData({ applicantFilter: key }, () => this.updateFilteredApplicants())
  },

  onAcceptApplicant(e) {
    const workerId = (e.detail && e.detail.id) || e.currentTarget.dataset.id
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
    const workerId = (e.detail && e.detail.id) || e.currentTarget.dataset.id
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

  onConfirmAttendance() {
    if (this.data.attendance && this.data.attendance.status === 'confirmed') {
      wx.showToast({ title: '汇总单已确认', icon: 'none' })
      this.setData({ activeTab: 'settlement' }, () => {
        this.refreshHeader()
        this.loadSettlement(this.data.jobId)
      })
      return
    }
    wx.showModal({
      title: '确认考勤汇总单',
      content: '确认后将按这份考勤汇总单生成结算明细，请先核对考勤数据无误。',
      success: (res) => {
        if (!res.confirm) return
        post('/work/attendance/' + this.data.jobId + '/confirm').then(() => {
          wx.showToast({ title: '考勤汇总单已确认', icon: 'success' })
          this.loadAttendance(this.data.jobId)
          this.loadSettlement(this.data.jobId)
          this.setData({ activeTab: 'settlement' }, () => this.refreshHeader())
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
      title: '提出考勤异议',
      content: '如对考勤汇总单有异议，请联系管理员核实后再进入结算。',
      showCancel: false
    })
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
          const payData = data && data.data ? data.data : data
          if (!payData || !payData.prepay_id) {
            console.error('job process settlement payment missing prepay_id', payData)
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
              console.error('job process settlement payment requestPayment fail', err)
              showPaymentFailure(err, '微信支付拉起失败，请稍后重试')
            }
          })
        }).catch((err) => {
          console.error('job process settlement payment create order fail', err)
          wx.showModal({
            title: '下单失败',
            content: getErrorMessage(err, '结算支付下单失败，请稍后重试'),
            showCancel: false
          })
        })
        return
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
