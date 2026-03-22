const { get, post } = require('../../utils/request')

Page({
  data: {
    jobId: '',
    ratedId: '',
    starOptions: [1, 2, 3, 4, 5],
    company: { name: '', jobType: '', dateRange: '' },
    rateItems: [
      { key: 'overall', label: '综合评分', score: 5 },
      { key: 'environment', label: '工作环境', score: 5 },
      { key: 'salary', label: '薪资准时', score: 5 },
      { key: 'management', label: '管理态度', score: 5 }
    ],
    tags: [
      { label: '环境整洁', selected: false },
      { label: '准时发薪', selected: false },
      { label: '管理规范', selected: false },
      { label: '福利好', selected: false },
      { label: '交通方便', selected: false },
      { label: '伙食不错', selected: false },
      { label: '加班较多', selected: false },
      { label: '管理严格', selected: false }
    ],
    content: '',
    submitting: false
  },

  onLoad(options) {
    const jobId = options.jobId || ''
    const ratedId = options.ratedId || options.enterpriseId || ''
    this.setData({ jobId, ratedId })
    if (jobId) {
      this.loadJobInfo(jobId)
    }
  },

  loadJobInfo(jobId) {
    get('/settlements/' + jobId).then(res => {
      const d = res.data || res || {}
      const job = d.job || {}
      this.setData({
        company: {
          name: job.company || '企业',
          jobType: job.jobType || '',
          dateRange: job.dateRange || ''
        }
      })
    }).catch(() => {})
  },

  onStarTap(e) {
    const { key, score } = e.currentTarget.dataset
    const rateItems = this.data.rateItems.map(item =>
      item.key === key ? { ...item, score } : item
    )
    this.setData({ rateItems })
  },

  onTagTap(e) {
    const idx = e.currentTarget.dataset.index
    const key = `tags[${idx}].selected`
    this.setData({ [key]: !this.data.tags[idx].selected })
  },

  onInput(e) {
    this.setData({ content: e.detail.value })
  },

  onSubmit() {
    const overallItem = this.data.rateItems.find(function(i) { return i.key === 'overall' })
    const overallScore = (overallItem && overallItem.score) || 5
    if (!this.data.jobId || !this.data.ratedId) {
      wx.showToast({ title: '缺少评价对象', icon: 'none' })
      return
    }
    wx.showModal({
      title: '确认提交',
      content: '评价提交后不可修改，确认提交？',
      success: (res) => {
        if (res.confirm) {
          const selectedTags = this.data.tags.filter(t => t.selected).map(t => t.label)
          this.setData({ submitting: true })
          post('/ratings', {
            jobId: Number(this.data.jobId),
            ratedId: Number(this.data.ratedId),
            score: overallScore,
            tags: selectedTags,
            comment: this.data.content
          }).then(() => {
            wx.showToast({ title: '评价成功', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 1500)
          }).catch((err) => {
            wx.showToast({ title: err && err.message ? err.message : '评价提交失败', icon: 'none' })
          }).finally(() => {
            this.setData({ submitting: false })
          })
        }
      }
    })
  }
})
