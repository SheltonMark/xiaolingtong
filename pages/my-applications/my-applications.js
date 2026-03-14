const { get, post } = require('../../utils/request')
const { normalizeImageUrl } = require('../../utils/image')

function isGenericCompanyName(name) {
  const text = String(name || '').trim()
  return !text || text === '企业' || text === '企业用户'
}

Page({
  data: {
    currentTab: 0,
    tabs: ['全部', '待确认', '已入选', '进行中', '已完成', '异常'],
    list: []
  },

  onShow() {
    this.loadApplications()
  },

  loadApplications() {
    get('/applications').then(res => {
      const rawList = res.data.list || res.data || []
      const baseList = rawList.map(item => this.normalizeApplication(item))
      this.enrichApplicationsByJobDetail(baseList).then(list => {
        this.setData({ list })
      }).catch(() => {
        this.setData({ list: baseList })
      })
    }).catch(() => {})
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
      pending: { text: '待确认', bg: 'amber', tabKey: '待确认' },
      accepted: { text: '待确认', bg: 'amber', tabKey: '待确认' },
      confirmed: { text: '已入选', bg: 'green', tabKey: '已入选' },
      working: { text: '进行中', bg: 'green', tabKey: '进行中' },
      done: { text: '已完成', bg: 'gray', tabKey: '已完成' },
      completed: { text: '已完成', bg: 'gray', tabKey: '已完成' },
      rejected: { text: '已拒绝', bg: 'rose', tabKey: '异常' },
      released: { text: '已释放', bg: 'rose', tabKey: '异常' },
      cancelled: { text: '已取消', bg: 'gray', tabKey: '异常' }
    }

    const statusInfo = statusMap[item.status] || { text: '待确认', bg: 'amber', tabKey: '待确认' }
    const company = job.companyName || user.companyName || user.nickname || item.companyName || '企业'
    const companyAvatarUrl = normalizeImageUrl(job.avatarUrl || user.avatarUrl || '')
    const salaryUnit = job.salaryUnit || (job.salaryType === 'piece' ? '元/件' : '元/时')

    return {
      id: item.id,
      jobId: job.id,
      company,
      companyAvatarUrl,
      title: job.title || '',
      salary: job.salary || 0,
      salaryUnit,
      location: job.location || '',
      description: job.description || '',
      date: job.dateRange || '',
      hours: job.workHours || '',
      status: item.status,
      statusText: statusInfo.text,
      statusBg: statusInfo.bg,
      tabKey: statusInfo.tabKey,
      alert: item.status === 'confirmed' ? '明天记得按时到岗' : '',
      stats: item.status === 'done' || item.status === 'completed' ? [
        { label: '工作时长', value: '8h', color: '#3B82F6' },
        { label: '应得工资', value: '¥320', color: '#10B981' }
      ] : null
    }
  },

  onTabChange(e) {
    this.setData({ currentTab: Number(e.currentTarget.dataset.index) })
  },

  onConfirmAttend(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认出勤',
      content: '确认明天按时到岗？',
      success: (res) => {
        if (res.confirm) {
          post('/jobs/' + id + '/confirm').then(() => {
            wx.showToast({ title: '已确认', icon: 'success' })
            this.loadApplications()
            setTimeout(() => wx.navigateTo({ url: '/pages/checkin/checkin?id=' + id }), 1500)
          }).catch(() => {})
        }
      }
    })
  },

  onViewDetail(e) {
    wx.navigateTo({ url: '/pages/job-detail/job-detail?id=' + e.currentTarget.dataset.id })
  },

  onGoCheckin(e) {
    wx.navigateTo({ url: '/pages/checkin/checkin?id=' + e.currentTarget.dataset.id })
  },

  onRate(e) {
    wx.navigateTo({ url: '/pages/rate/rate?id=' + e.currentTarget.dataset.id })
  }
})
