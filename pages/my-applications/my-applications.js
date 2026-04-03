const { get, post } = require('../../utils/request')
const { normalizeImageUrl } = require('../../utils/image')
const { formatSalaryUnit } = require('../../utils/salary')

const TAB_CONFIG = [
  { label: '全部', key: 'all', countKey: 'totalRecords' },
  { label: '待审核', key: 'pending', countKey: 'pendingRecords' },
  { label: '待出勤', key: 'accepted', countKey: 'awaitingAttendanceRecords' },
  { label: '进行中', key: 'ongoing', countKey: 'ongoingRecords' },
  { label: '已完成', key: 'done', countKey: 'completedRecords' }
]

function formatJobDate(job) {
  if (job.dateRange) return job.dateRange
  if (job.dateStart && job.dateEnd) return `${job.dateStart} ~ ${job.dateEnd}`
  return ''
}

function buildTabs(summary) {
  return TAB_CONFIG.map(tab => ({
    ...tab,
    count: Number(summary[tab.countKey] || 0)
  }))
}

function normalizeTabKey(value) {
  const key = String(value || '').trim()
  if (key === 'pending') return 'pending'
  if (key === 'accepted') return 'accepted'
  if (key === 'confirmed' || key === 'working' || key === 'ongoing') return 'ongoing'
  if (key === 'done') return 'done'
  return 'all'
}

function findTabIndexByKey(key) {
  const index = TAB_CONFIG.findIndex(tab => tab.key === key)
  return index >= 0 ? index : 0
}

Page({
  data: {
    currentTab: 0,
    tabs: buildTabs({}),
    list: [],
    filteredList: [],
    summary: {
      totalRecords: 0,
      activeRecords: 0,
      pendingRecords: 0,
      awaitingAttendanceRecords: 0,
      ongoingRecords: 0,
      completedRecords: 0
    }
  },

  onLoad(options) {
    this.applyRouteOptions(options)
  },

  onShow() {
    this.loadApplications()
  },

  applyRouteOptions(options = {}) {
    const nextTabKey = normalizeTabKey(options.tab || options.status)
    const nextTabIndex = findTabIndexByKey(nextTabKey)
    if (nextTabIndex !== this.data.currentTab) {
      this.setData({ currentTab: nextTabIndex })
    }
  },

  loadApplications() {
    get('/applications').then(res => {
      const rawList = res.data.list || res.data || []
      const summary = { ...this.data.summary, ...((res.data && res.data.summary) || {}) }
      const list = rawList.map(item => this.normalizeApplication(item))
      this.setData({ list, summary, tabs: buildTabs(summary) }, () => this.applyFilter())
    }).catch(() => {})
  },

  applyFilter() {
    const currentTab = this.data.tabs[this.data.currentTab] || { key: 'all' }
    const list = Array.isArray(this.data.list) ? this.data.list : []
    const filteredList = currentTab.key === 'all'
      ? list
      : list.filter(item => item.filterKey === currentTab.key)
    this.setData({ filteredList })
  },

  normalizeApplication(item) {
    const job = item.job || {}
    const user = job.user || {}
    const statusMap = {
      pending: { text: '待审核', bg: 'amber', filterKey: 'pending' },
      accepted: { text: '待出勤', bg: 'blue', filterKey: 'accepted', canConfirmAttendance: true },
      confirmed: { text: '待开工', bg: 'blue', filterKey: 'ongoing', canOpenCheckin: true, checkinActionText: '查看签到' },
      working: { text: '进行中', bg: 'green', filterKey: 'ongoing', canOpenCheckin: true, checkinActionText: '打卡签到', showPulse: true },
      done: { text: '已完成', bg: 'gray', filterKey: 'done', canRate: true },
      rejected: { text: '未通过', bg: 'rose', filterKey: 'all' },
      released: { text: '已释放', bg: 'gray', filterKey: 'all' },
      cancelled: { text: '已取消', bg: 'gray', filterKey: 'all' }
    }

    const statusInfo = statusMap[item.status] || statusMap.pending
    const company = job.companyName || user.companyName || user.nickname || item.companyName || '企业'
    const companyAvatarUrl = normalizeImageUrl(job.avatarUrl || user.avatarUrl || '')
    const salaryUnit = formatSalaryUnit(job.salaryUnit, job.salaryType)

    return {
      id: item.id,
      applicationId: item.id,
      jobId: job.id,
      enterpriseId: job.userId || user.id || 0,
      company,
      companyAvatarUrl,
      title: job.title || '',
      salary: job.salary || 0,
      salaryUnit,
      location: job.location || '',
      description: job.description || '',
      date: formatJobDate(job),
      hours: job.workHours || '',
      status: item.status,
      statusText: statusInfo.text,
      statusBg: statusInfo.bg,
      filterKey: statusInfo.filterKey,
      canConfirmAttendance: !!statusInfo.canConfirmAttendance,
      canOpenCheckin: !!statusInfo.canOpenCheckin,
      checkinActionText: statusInfo.checkinActionText || '查看签到',
      canRate: !!statusInfo.canRate,
      showPulse: !!statusInfo.showPulse,
      alert: item.status === 'accepted'
        ? '如确认出勤，请尽快确认，避免名额被释放。'
        : item.status === 'confirmed'
          ? '已确认出勤，请在签到时间内完成签到。'
          : item.status === 'working'
            ? '当前处于工作中，可查看签到记录和当前状态。'
            : ''
    }
  },

  onTabChange(e) {
    this.setData({ currentTab: Number(e.currentTarget.dataset.index) }, () => this.applyFilter())
  },

  onConfirmAttend(e) {
    const jobId = e.currentTarget.dataset.jobId
    wx.showModal({
      title: '确认出勤',
      content: '确认后需按时到岗，系统会继续保留你的录用资格。',
      success: (res) => {
        if (!res.confirm) return
        post('/jobs/' + jobId + '/confirm').then(() => {
          wx.showToast({ title: '已确认', icon: 'success' })
          this.loadApplications()
        }).catch(() => {})
      }
    })
  },

  onViewDetail(e) {
    wx.navigateTo({ url: '/pages/job-detail/job-detail?id=' + e.currentTarget.dataset.jobId })
  },

  onGoCheckin(e) {
    wx.navigateTo({ url: '/pages/checkin/checkin?jobId=' + e.currentTarget.dataset.jobId })
  },

  onRate(e) {
    const { jobId, enterpriseId } = e.currentTarget.dataset
    wx.navigateTo({ url: '/pages/rate/rate?jobId=' + jobId + '&enterpriseId=' + enterpriseId })
  }
})
