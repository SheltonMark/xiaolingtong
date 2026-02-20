Page({
  data: {
    balance: 128,
    totalIn: 528,
    totalOut: 400,
    currentTab: 0,
    tabs: ['全部', '收入', '支出'],
    allGroups: [
      {
        month: '2026年2月',
        items: [
          { id: 1, type: 'expense', title: '查看联系方式', desc: '***贸易公司 · 02-07 14:30', amount: '-10' },
          { id: 2, type: 'expense', title: '查看联系方式', desc: '***电子科技 · 02-05 09:15', amount: '-10' },
          { id: 3, type: 'income', title: '充值200灵豆', desc: '微信支付 · 02-01 10:22', amount: '+200' }
        ]
      },
      {
        month: '2026年1月',
        items: [
          { id: 4, type: 'expense', title: '查看联系方式', desc: '***五金加工厂 · 01-28 16:45', amount: '-10' },
          { id: 5, type: 'expense', title: '信息置顶推广', desc: '采购需求#p1 · 01-20 11:30', amount: '-50' },
          { id: 6, type: 'income', title: '新用户注册赠送', desc: '系统赠送 · 01-15 08:00', amount: '+50' },
          { id: 7, type: 'income', title: '充值200灵豆', desc: '微信支付 · 01-10 15:08', amount: '+200' }
        ]
      }
    ],
    groups: []
  },

  onLoad() {
    this.filterList()
  },

  onTabChange(e) {
    this.setData({ currentTab: Number(e.currentTarget.dataset.index) })
    this.filterList()
  },

  filterList() {
    const tab = this.data.currentTab
    if (tab === 0) {
      this.setData({ groups: this.data.allGroups })
      return
    }
    const filterType = tab === 1 ? 'income' : 'expense'
    const groups = this.data.allGroups.map(g => ({
      month: g.month,
      items: g.items.filter(i => i.type === filterType)
    })).filter(g => g.items.length > 0)
    this.setData({ groups })
  }
})