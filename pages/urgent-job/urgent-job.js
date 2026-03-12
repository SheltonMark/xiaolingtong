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
    // 从后端获取急招价格配置
    get('/jobs/urgent/pricing').then(res => {
      const list = (res.data && res.data.list) || res.list || []
      const options = list.map((item, index) => {
        const opt = {
          id: index + 1,
          name: `${item.durationDays}天`,
          days: item.durationDays,
          beans: item.beanCost,
          desc: `${Math.round(item.beanCost / item.durationDays)} 灵豆/天`
        }
        if (item.durationDays === 7) {
          opt.tag = '推荐'
          opt.tagColor = '#F97316'
        } else if (item.durationDays === 30) {
          opt.tag = '最划算'
          opt.tagColor = '#F43F5E'
        }
        return opt
      })

      this.setData({
        options,
        selectedIndex: options.findIndex(o => o.days === 7) || 0,
        pricingLoaded: true
      })
    }).catch(() => {
      // 降级：使用默认价格
      const urgentCostPerDay = 100
      const options = [
        { id: 1, name: '1天', days: 1, beans: urgentCostPerDay * 1, desc: `${urgentCostPerDay} 灵豆/天` },
        { id: 2, name: '3天', days: 3, beans: urgentCostPerDay * 3, desc: `${urgentCostPerDay} 灵豆/天` },
        { id: 3, name: '7天', days: 7, beans: urgentCostPerDay * 7, desc: `${urgentCostPerDay} 灵豆/天`, tag: '推荐', tagColor: '#F97316' },
        { id: 4, name: '30天', days: 30, beans: urgentCostPerDay * 30, desc: `${urgentCostPerDay} 灵豆/天`, tag: '最划算', tagColor: '#F43F5E' }
      ]
      this.setData({
        options,
        selectedIndex: 2,
        pricingLoaded: true
      })
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
