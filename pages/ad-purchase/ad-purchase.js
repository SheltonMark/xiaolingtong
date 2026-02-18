Page({
  data: {
    selectedIndex: 0,
    plans: [
      { id: 1, name: '首页Banner', desc: '首页顶部轮播位，日均曝光5000+', price: '299', unit: '/天', tag: '热门' },
      { id: 2, name: '列表置顶', desc: '信息列表前3位展示，精准触达', price: '99', unit: '/天' },
      { id: 3, name: '搜索推荐', desc: '搜索结果优先展示，按点击计费', price: '0.5', unit: '/次' }
    ]
  },
  onSelect(e) { this.setData({ selectedIndex: e.currentTarget.dataset.index }) },
  onPay() {
    const plan = this.data.plans[this.data.selectedIndex]
    wx.showModal({
      title: '购买' + plan.name,
      content: '支付 ¥' + plan.price + plan.unit,
      success: (res) => { if (res.confirm) wx.showToast({ title: '购买成功', icon: 'success' }) }
    })
  }
})
