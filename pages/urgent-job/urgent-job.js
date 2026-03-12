const { get, post } = require('../../utils/request')

const TAG_MAP = {
  7: { text: '推荐', color: '#F97316' },
  30: { text: '最划算', color: '#F43F5E' }
}

Page({
  data: {
    jobId: '',
    jobInfo: null,
    selectedIndex: 0,
    pricingLoaded: false,
    myBeans: 0,
    options: []
  },
  onLoad(options) {
    if (options.id) {
      this.setData({ jobId: options.id })
      this._loadJobInfo(options.id)
    }
    this._loadPricing()
    get('/beans/balance').then(res => {
      const d = res.data || res
      this.setData({ myBeans: d.beanBalance || d.balance || 0 })
    }).catch(() => {})
  },

  _loadPricing() {
    // 从后端获取急招价格配置（包含会员折扣）
    get('/jobs/urgent/pricing').then(res => {
      const d = res.data || res
      const list = Array.isArray(d.list) ? d.list : []
      const options = list
        .map((item, index) => {
          const days = Number(item.durationDays || 0)
          const beans = Number(item.beanCost || 0)
          const originBeans = Number(item.originalBeanCost || beans)
          const dailyCost = days > 0 ? Math.ceil(beans / days) : beans
          const tag = TAG_MAP[days] || {}
          const desc = item.isDiscounted
            ? `会员折后 ${beans} 灵豆（原价 ${originBeans}）`
            : `约 ${dailyCost} 灵豆/天`
          return {
            id: index + 1,
            name: `${days}天`,
            desc,
            beans,
            days,
            tag: tag.text || '',
            tagColor: tag.color || ''
          }
        })
        .filter(item => item.days > 0 && item.beans >= 0)
        .sort((a, b) => a.days - b.days)

      this.setData({
        options,
        selectedIndex: options.findIndex(o => o.days === 7) >= 0 ? options.findIndex(o => o.days === 7) : 0,
        pricingLoaded: options.length > 0
      })
    }).catch(() => {
      this.setData({ options: [], pricingLoaded: false })
      wx.showToast({ title: '价格加载失败', icon: 'none' })
    })
  },

  _loadJobInfo(id) {
    get('/jobs/' + id).then(res => {
      const d = res.data || res
      this.setData({
        jobInfo: {
          title: d.title || '未命名',
          salary: d.salary || 0,
          salaryUnit: d.salaryUnit || '元/天',
          image: (d.images && d.images[0]) || ''
        }
      })
    }).catch(() => {})
  },

  onSelect(e) { this.setData({ selectedIndex: Number(e.currentTarget.dataset.index) }) },

  onPay() {
    const opt = this.data.options[this.data.selectedIndex]
    if (!this.data.pricingLoaded || !opt) {
      wx.showToast({ title: '价格未加载', icon: 'none' })
      return
    }
    if (this.data.myBeans < opt.beans) {
      wx.showModal({
        title: '灵豆不足',
        content: '当前灵豆不足，是否前往充值？',
        success: (res) => { if (res.confirm) wx.navigateTo({ url: '/pages/bean-recharge/bean-recharge' }) }
      })
      return
    }
    wx.showModal({
      title: '确认设置急招',
      content: '消耗 ' + opt.beans + ' 灵豆，设置急招' + opt.name,
      success: (res) => {
        if (res.confirm) {
          post('/jobs/' + this.data.jobId + '/set-urgent', {
            durationDays: opt.days
          }).then((res) => {
            const d = res.data || res
            wx.showToast({ title: '设置成功', icon: 'success' })
            const nextBeans = d.beanBalance !== undefined ? d.beanBalance : (this.data.myBeans - opt.beans)
            this.setData({ myBeans: nextBeans })
            setTimeout(() => wx.navigateBack(), 1500)
          }).catch(() => {})
        }
      }
    })
  }
})
