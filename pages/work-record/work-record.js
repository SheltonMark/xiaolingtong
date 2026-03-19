const { get } = require('../../utils/request')

Page({
  data: {
    orders: [],
    loading: true
  },

  onShow() {
    this.loadOrders()
  },

  onPullDownRefresh() {
    this.loadOrders().then(() => wx.stopPullDownRefresh())
  },

  loadOrders() {
    this.setData({ loading: true })
    return get('/work/orders').then(res => {
      const orders = (res.data || res || []).map(item => this.formatOrder(item))
      this.setData({ orders, loading: false })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  formatOrder(item) {
    const stageMap = {
      checkin: { text: '待签到', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
      working: { text: '进行中', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
      settlement: { text: '待结算', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
      done: { text: '已完成', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' }
    }
    const stage = stageMap[item.stage] || stageMap.checkin
    const company = (item.user && item.user.companyName) || item.companyName || '未知企业'
    const avatarText = company[0] || '企'
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
    const avatarColor = colors[item.id % colors.length]

    let dateRange = ''
    if (item.dateStart && item.dateEnd) {
      dateRange = item.dateStart.slice(5) + ' ~ ' + item.dateEnd.slice(5)
    } else if (item.dateStart) {
      dateRange = item.dateStart.slice(5)
    }

    return {
      id: item.id,
      company,
      avatarText,
      avatarColor,
      jobType: item.title || item.jobType || '临时工',
      salary: item.salaryType === 'piece' ? (item.salary + '元/件') : (item.salary + '元/时'),
      dateRange,
      workerCount: item.needCount || 0,
      mode: item.salaryType === 'piece' ? 'piece' : 'hourly',
      stage: item.stage,
      stageText: stage.text,
      stageColor: stage.color,
      stageBg: stage.bg
    }
  },

  onOrderTap(e) {
    const { id, stage, mode } = e.currentTarget.dataset
    const routes = {
      checkin: '/pages/checkin/checkin?orderId=' + id + '&mode=' + mode,
      working: '/pages/work-session/work-session?orderId=' + id + '&mode=' + mode,
      settlement: '/pages/settlement/settlement?jobId=' + id,
      done: '/pages/settlement/settlement?jobId=' + id + '&viewOnly=1'
    }
    wx.navigateTo({ url: routes[stage] })
  }
})
