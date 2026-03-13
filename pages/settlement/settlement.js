const { get } = require('../../utils/request')

Page({
  data: {
    currentTab: 0,
    tabs: [
      { label: '招工管理', key: 'recruitment' },
      { label: '工资结算', key: 'settlement' }
    ],
    jobs: [],
    settlements: []
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const tab = this.data.tabs[this.data.currentTab]
    if (tab.key === 'recruitment') {
      this.loadRecruitmentJobs()
    } else {
      this.loadSettlements()
    }
  },

  loadRecruitmentJobs() {
    get('/jobs/mine').then(res => {
      const list = res.data.list || res.data || []
      this.setData({ jobs: this.mapRecruitmentJobs(list) })
    }).catch(() => {})
  },

  loadSettlements() {
    get('/jobs/mine').then(res => {
      const list = res.data.list || res.data || []
      const settlements = list.filter(job =>
        ['pending_settlement', 'settled', 'working', 'closed'].includes(job.status)
      )
      this.setData({ settlements: this.mapSettlements(settlements) })
    }).catch(() => {})
  },

  mapRecruitmentJobs(list) {
    const statusMap = {
      recruiting: { text: '招工中', color: 'green' },
      full: { text: '已满员', color: 'amber' },
      working: { text: '进行中', color: 'green' },
      pending_settlement: { text: '待结算', color: 'amber' },
      settled: { text: '已结算', color: 'green' },
      closed: { text: '已关闭', color: 'gray' }
    }
    return (Array.isArray(list) ? list : []).map(item => {
      const statusMeta = statusMap[item.status] || { text: '招工中', color: 'green' }
      return {
        ...item,
        statusText: statusMeta.text,
        statusColor: statusMeta.color,
        dateRange: item.dateRange || '',
        appliedCount: item.appliedCount || 0,
        needCount: item.needCount || 0,
        salary: item.salary || 0,
        salaryUnit: item.salaryUnit || '元/天'
      }
    })
  },

  mapSettlements(list) {
    const statusMap = {
      pending_settlement: { text: '待结算', color: 'amber' },
      settled: { text: '已结算', color: 'green' },
      working: { text: '进行中', color: 'green' },
      closed: { text: '已关闭', color: 'gray' }
    }
    return (Array.isArray(list) ? list : []).map(item => {
      const statusMeta = statusMap[item.status] || { text: '待结算', color: 'amber' }
      return {
        ...item,
        statusText: statusMeta.text,
        statusColor: statusMeta.color,
        dateRange: item.dateRange || '',
        totalWorkers: item.totalWorkers || 0,
        totalHours: item.totalHours || 0,
        factoryTotal: item.factoryTotal || 0
      }
    })
  },

  onTabChange(e) {
    this.setData({ currentTab: Number(e.currentTarget.dataset.index) }, () => {
      this.loadData()
    })
  },

  onViewJobDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/job-detail/job-detail?id=' + id })
  },

  onViewSettlementDetail(e) {
    const jobId = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/settlement-detail/settlement-detail?jobId=' + jobId })
  }
})
