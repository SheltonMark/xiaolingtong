const { post } = require('../../utils/request')

Page({
  data: {
    jobId: '',
    company: {},
    rateItems: [
      { key: 'overall', label: '综合评分', score: 4 },
      { key: 'environment', label: '工作环境', score: 5 },
      { key: 'salary', label: '薪资准时', score: 4 },
      { key: 'management', label: '管理态度', score: 3 }
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
    content: ''
  },

  onLoad(options) {
    if (options.jobId) this.setData({ jobId: options.jobId })
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
    wx.showModal({
      title: '确认提交',
      content: '评价提交后不可修改，确认提交？',
      success: (res) => {
        if (res.confirm) {
          const scores = {}
          this.data.rateItems.forEach(item => { scores[item.key] = item.score })
          const selectedTags = this.data.tags.filter(t => t.selected).map(t => t.label)
          post('/ratings', {
            jobId: this.data.jobId,
            scores,
            tags: selectedTags,
            content: this.data.content
          }).then(() => {
            wx.showToast({ title: '评价成功', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 1500)
          }).catch(() => {})
        }
      }
    })
  }
})
