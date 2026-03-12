const { get } = require('../../utils/request')

const TYPE_MAP = {
  recharge: '灵豆充值',
  unlock_contact: '解锁联系方式',
  promote: '信息推广',
  reward: '奖励',
  membership: '会员权益',
  invite_reward: '邀请奖励',
  income: '灵豆收入'
}

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
      const d = res.data || res
      this.setData({
        balance: d.beanBalance || 0,
        totalIn: d.totalIn || 0,
        totalOut: Math.abs(d.totalOut || 0)
      })
    }).catch(() => {})

    get('/beans/transactions', { pageSize: 200 }).then(res => {
      const d = res.data || res
      const list = d.list || d || []
      if (!Array.isArray(list)) { this.setData({ allGroups: [], groups: [] }); return }

      // 映射字段
      const mapped = list.map(item => {
        const isIncome = item.amount > 0
        return {
          id: item.id,
          type: isIncome ? 'income' : 'expense',
          title: TYPE_MAP[item.type] || item.remark || '灵豆变动',
          desc: item.remark || '',
          amount: (isIncome ? '+' : '') + item.amount,
          createdAt: item.createdAt || ''
        }
      })

      // 按月分组
      const map = {}
      mapped.forEach(item => {
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