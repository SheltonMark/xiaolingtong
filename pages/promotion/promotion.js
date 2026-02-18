Page({
  data: {
    selectedIndex: 0,
    options: [
      { id: 1, name: '置顶3天', desc: '信息在列表顶部展示3天', beans: 30, tag: '' },
      { id: 2, name: '置顶7天', desc: '信息在列表顶部展示7天', beans: 50, tag: '热门' },
      { id: 3, name: '精选推荐', desc: '出现在首页精选栏目', beans: 80, tag: '' },
      { id: 4, name: '全城推送', desc: '推送给全城匹配用户', beans: 150, tag: '效果最佳' }
    ],
    myBeans: 128
  },
  onSelect(e) { this.setData({ selectedIndex: e.currentTarget.dataset.index }) },
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
      title: '确认推广',
      content: '消耗 ' + opt.beans + ' 灵豆，' + opt.name,
      success: (res) => { if (res.confirm) wx.showToast({ title: '推广成功', icon: 'success' }) }
    })
  }
})
