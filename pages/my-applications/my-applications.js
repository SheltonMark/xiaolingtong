const { get, post } = require('../../utils/request')

Page({
  data: {
    currentTab: 0,
    tabs: ['全部', '待确认', '已入选', '进行中', '已完成'],
    list: []
  },

  onShow() {
    this.loadApplications()
  },

  loadApplications() {
    get('/applications').then(res => {
      const rawList = res.data.list || res.data || []
      const list = rawList.map(item => this.normalizeApplication(item))
      this.setData({ list })
    }).catch(() => {})
  },

  normalizeApplication(item) {
    const job = item.job || {}
    const user = job.user || {}

    // 状态映射
    const statusMap = {
      pending: { text: '待确认', bg: 'amber', tabKey: '待确认' },
      accepted: { text: '已入选', bg: 'green', tabKey: '已入选' },
      confirmed: { text: '进行中', bg: 'green', tabKey: '进行中' },
      completed: { text: '已完成', bg: 'gray', tabKey: '已完成' },
      rejected: { text: '未通过', bg: 'rose', tabKey: '待确认' },
      cancelled: { text: '已取消', bg: 'gray', tabKey: '待确认' }
    }

    const statusInfo = statusMap[item.status] || { text: '待确认', bg: 'amber', tabKey: '待确认' }

    return {
      id: item.id,
      jobId: job.id,
      company: user.nickname || user.companyName || '企业',
      title: job.title || '',
      salary: job.salary || 0,
      salaryUnit: job.salaryUnit || '元/天',
      location: job.location || '',
      description: job.description || '',
      date: job.dateRange || '',
      hours: job.workHours || '',
      status: item.status,
      statusText: statusInfo.text,
      statusBg: statusInfo.bg,
      tabKey: statusInfo.tabKey,
      alert: item.status === 'confirmed' ? '明天记得按时到岗' : '',
      stats: item.status === 'completed' ? [
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
