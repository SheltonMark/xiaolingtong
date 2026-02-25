const { get } = require('../../utils/request')

Page({
  data: {
    balance: 0,
    totalIn: 0,
    totalOut: 0,
    currentTab: 0,
    tabs: ['全部', '收入', '支出'],
    allGroups: [],
    groups: []
  },

  onShow() {
    get('/beans/balance').then(res => {
      const d = res.data || {}
      this.setData({ balance: d.balance || 0, totalIn: d.totalIn || 0, totalOut: d.totalOut || 0 })
    }).catch(() => {})
    get('/beans/transactions').then(res => {
      const list = res.data || []
      // 按月分组
      const map = {}
      list.forEach(item => {
        const month = (item.createdAt || '').substring(0, 7).replace('-', '年') + '月'
        if (!map[month]) map[month] = []
        map[month].push(item)
      })
      const allGroups = Object.keys(map).map(month => ({ month, items: map[month] }))
      this.setData({ allGroups })
      this.filterList()
    }).catch(() => {})
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