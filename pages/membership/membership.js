Page({
  data: {
    selectedIndex: 1,
    plans: [
      { id: 1, name: '月度会员', price: '29.9', unit: '/月', features: ['每日5次免费查看', '信息优先展示', '专属客服'] },
      { id: 2, name: '季度会员', price: '69.9', unit: '/季', tag: '推荐', features: ['每日10次免费查看', '信息优先展示', '专属客服', '数据分析'] },
      { id: 3, name: '年度会员', price: '199', unit: '/年', tag: '最划算', features: ['无限次免费查看', '信息置顶', '专属客服', '数据分析', '广告折扣'] }
    ]
  },
  onSelect(e) { this.setData({ selectedIndex: e.currentTarget.dataset.index }) },
  onPay() {
    const plan = this.data.plans[this.data.selectedIndex]
    wx.showModal({
      title: '开通' + plan.name,
      content: '支付 ¥' + plan.price + plan.unit,
      success: (res) => {
        if (res.confirm) wx.showToast({ title: '开通成功', icon: 'success' })
      }
    })
  }
})
