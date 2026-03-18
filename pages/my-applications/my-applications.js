const { get, post } = require('../../utils/request')
const { normalizeImageUrl } = require('../../utils/image')

function isGenericCompanyName(name) {
  const text = String(name || '').trim()
  return !text || text === '企业' || text === '企业用户'
}

function formatJobDate(job) {
  if (job.dateRange) return job.dateRange
  if (job.dateStart && job.dateEnd) return `${job.dateStart} ~ ${job.dateEnd}`
  return ''
}

Page({
  data: {
    currentTab: 0,
    tabs: ['全部', '待审核', '待出勤', '进行中', '已完成'],
    list: [],
    filteredList: []
  },

  onShow() {
    this.loadApplications()
  },

  loadApplications() {
    get('/applications').then(res => {
      const rawList = res.data.list || res.data || []
      const baseList = rawList.map(item => this.normalizeApplication(item))
      this.enrichApplicationsByJobDetail(baseList).then(list => {
        this.setData({ list }, () => this.applyFilter())
      }).catch(() => {
        this.setData({ list: baseList }, () => this.applyFilter())
      })
    }).catch(() => {})
  },

  applyFilter() {
    const tab = this.data.tabs[this.data.currentTab] || '全部'
    const list = Array.isArray(this.data.list) ? this.data.list : []
    const filteredList = tab === '全部'
      ? list
      : list.filter(item => item.tabKey === tab)
    this.setData({ filteredList })
  },

  enrichApplicationsByJobDetail(list) {
    const source = Array.isArray(list) ? list : []
    const missingNameItems = source.filter(item => item.jobId && isGenericCompanyName(item.company))
    if (missingNameItems.length === 0) return Promise.resolve(source)

    const requestByJobId = {}
    const requests = missingNameItems.map(item => {
      const jobId = item.jobId
      if (!requestByJobId[jobId]) {
        requestByJobId[jobId] = get('/jobs/' + jobId)
          .then(res => ({ jobId, detail: res.data || {} }))
          .catch(() => ({ jobId, detail: {} }))
      }
      return requestByJobId[jobId]
    })

    return Promise.all(requests).then(results => {
      const detailMap = {}
      results.forEach(({ jobId, detail }) => {
        const company = detail && detail.company ? detail.company : {}
        detailMap[jobId] = {
          companyName: company.name || detail.companyName || '',
          avatarUrl: normalizeImageUrl(company.avatarUrl || detail.avatarUrl || '')
        }
      })

      return source.map(item => {
        const detail = detailMap[item.jobId]
        if (!detail) return item
        return {
          ...item,
          company: isGenericCompanyName(detail.companyName) ? item.company : detail.companyName,
          companyAvatarUrl: detail.avatarUrl || item.companyAvatarUrl
        }
      })
    })
  },

  normalizeApplication(item) {
    const job = item.job || {}
    const user = job.user || {}

    // 状态映射
    const statusMap = {
      pending: { text: '待审核', bg: 'amber', tabKey: '待审核' },
      accepted: { text: '待出勤', bg: 'blue', tabKey: '待出勤', canConfirmAttendance: true },
      confirmed: { text: '待开工', bg: 'blue', tabKey: '进行中', canCheckin: true },
      working: { text: '进行中', bg: 'green', tabKey: '进行中', canCheckin: true, showPulse: true },
      done: { text: '已完成', bg: 'gray', tabKey: '已完成', canRate: true },
      rejected: { text: '未通过', bg: 'rose', tabKey: '全部' },
      released: { text: '已释放', bg: 'gray', tabKey: '全部' },
      cancelled: { text: '已取消', bg: 'gray', tabKey: '全部' }
    }

    const statusInfo = statusMap[item.status] || { text: '待审核', bg: 'amber', tabKey: '待审核' }
    const company = job.companyName || user.companyName || user.nickname || item.companyName || '企业'
    const companyAvatarUrl = normalizeImageUrl(job.avatarUrl || user.avatarUrl || '')
    const salaryUnit = job.salaryUnit || (job.salaryType === 'piece' ? '元/件' : '元/时')

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
      tabKey: statusInfo.tabKey,
      canConfirmAttendance: !!statusInfo.canConfirmAttendance,
      canCheckin: !!statusInfo.canCheckin,
      canRate: !!statusInfo.canRate,
      showPulse: !!statusInfo.showPulse,
      alert: item.status === 'accepted'
        ? '如确认出勤，请尽快确认，避免名额释放'
        : item.status === 'confirmed'
          ? '已确认出勤，请按时签到开工'
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
      content: '确认明天按时到岗？',
      success: (res) => {
        if (res.confirm) {
          post('/jobs/' + jobId + '/confirm').then(() => {
            wx.showToast({ title: '已确认', icon: 'success' })
            this.loadApplications()
            setTimeout(() => wx.navigateTo({ url: '/pages/checkin/checkin?jobId=' + jobId }), 1500)
          }).catch(() => {})
        }
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
