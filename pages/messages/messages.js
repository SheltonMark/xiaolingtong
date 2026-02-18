Page({
  data: {
    tabs: ['系统通知', '互动消息'],
    currentTab: 0,
    notifications: [
      { id: 'n1', icon: '📢', title: '认证审核通过', desc: '您的企业认证已通过审核', time: '02-17 10:00', read: false },
      { id: 'n2', icon: '💰', title: '结算到账', desc: '电子组装工结算 ¥1,400 已到账', time: '02-17 19:30', read: false },
      { id: 'n3', icon: '📋', title: '信息审核通过', desc: '您发布的采购信息已通过审核', time: '02-16 09:00', read: true }
    ],
    interactions: [
      { id: 'i1', avatar: '🏭', name: '鑫达电子厂', desc: '您已入选电子组装工岗位', time: '02-15', read: false },
      { id: 'i2', avatar: '👷', name: '张三', desc: '已报名您发布的招工信息', time: '02-14', read: true }
    ]
  },
  onTabChange(e) { this.setData({ currentTab: e.currentTarget.dataset.index }) },
  onTapItem(e) { wx.showToast({ title: '消息详情', icon: 'none' }) }
})
