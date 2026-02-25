const { get, post } = require('../../utils/request')

Page({
  data: {
    postId: '',
    selectedIndex: 1,
    myBeans: 0,
    options: [
      { id: 1, name: '1天', desc: '适合紧急需求', beans: 100, tag: '', tagColor: '' },
      { id: 2, name: '3天', desc: '平均80灵豆/天', beans: 250, tag: '', tagColor: '' },
      { id: 3, name: '7天', desc: '平均70灵豆/天', beans: 500, tag: '推荐', tagColor: '#F97316' },
      { id: 4, name: '30天', desc: '平均50灵豆/天', beans: 1500, tag: '最划算', tagColor: '#F43F5E' }
    ]
  },
  onLoad(options) {
    if (options.id) this.setData({ postId: options.id })
    get('/beans/balance').then(res => {
      this.setData({ myBeans: res.data.balance || 0 })
    }).catch(() => {})
  },
  onSelect(e) { this.setData({ selectedIndex: Number(e.currentTarget.dataset.index) }) },
  onPay() {
    const opt = this.data.options[this.data.selectedIndex]
    if (this.data.myBeans < opt.beans) {
      wx.showModal({
        title: '灵豆不足',
        content: '当前灵豆不足，是否前往充值？',
        success: (res) => { if (res.confirm) wx.navigateTo({ url: '/pages/bean-recharge/bean-recharge' }) }
      })
      return
    }
    wx.showModal({
      title: '确认置顶',
      content: '消耗 ' + opt.beans + ' 灵豆，置顶' + opt.name,
      success: (res) => {
        if (res.confirm) {
          post('/promotions', { postId: this.data.postId, days: parseInt(opt.name), beans: opt.beans }).then(() => {
            wx.showToast({ title: '置顶成功', icon: 'success' })
            this.setData({ myBeans: this.data.myBeans - opt.beans })
          }).catch(() => {})
        }
      }
    })
  }
})
