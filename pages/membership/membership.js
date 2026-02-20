Page({
  data: {
    userInfo: { avatarText: '鑫' },
    selectedIndex: 0,
    plans: [
      { id: 1, name: '月度会员', desc: '适合短期采购需求', price: '99', original: '199', unit: '月', tag: '', tagColor: '' },
      { id: 2, name: '季度会员', desc: '平均每月仅¥79', price: '238', original: '597', unit: '季', tag: '推荐', tagColor: '#F97316' },
      { id: 3, name: '年度会员', desc: '平均每月仅¥66，最划算', price: '799', original: '2,388', unit: '年', tag: '省¥1400', tagColor: '#F43F5E' }
    ]
  },
  onSelect(e) { this.setData({ selectedIndex: Number(e.currentTarget.dataset.index) }) },
  onPay() {
    const plan = this.data.plans[this.data.selectedIndex]
    wx.showModal({
      title: '开通' + plan.name,
      content: '支付 ¥' + plan.price + '/' + plan.unit,
      success: (res) => {
        if (res.confirm) wx.showToast({ title: '开通成功', icon: 'success' })
      }
    })
  }
})
