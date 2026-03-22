const { get } = require('../../utils/request')

Page({
  data: {
    stage: 'all',
    loading: true,
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待处理' },
      { key: 'ongoing', label: '进行中' },
      { key: 'closed', label: '已完成' }
    ],
    jobs: [],
    summary: {
      publishedJobCount: 0,
      pendingJobCount: 0,
      ongoingJobCount: 0,
      closedJobCount: 0
    }
  },

  onLoad(options) {
    if (options.stage) {
      this.setData({ stage: options.stage })
    }
  },

  onShow() {
    this.loadJobs()
  },

  onPullDownRefresh() {
    this.loadJobs().finally(() => wx.stopPullDownRefresh())
  },

  onTabChange(e) {
    this.setData({ stage: e.currentTarget.dataset.key }, () => this.loadJobs())
  },

  loadJobs() {
    this.setData({ loading: true })
    return get('/jobs/manage/mine', { stage: this.data.stage }).then(res => {
      const list = (res.data && res.data.list) || res.list || res.data || []
      const summary = (res.data && res.data.summary) || this.data.summary
      this.setData({ jobs: list, summary, loading: false })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  onManageJob(e) {
    const { id, tab } = e.currentTarget.dataset
    wx.navigateTo({
      url: '/pages/job-process/job-process?jobId=' + id + '&tab=' + (tab || 'applications')
    })
  },

  onCreateJob() {
    wx.navigateTo({ url: '/pages/post-job/post-job' })
  }
})
