Page({
  data: {
    orders: [
      {
        id: 'order1', company: '鑫达电子厂', avatarText: '鑫', avatarColor: '#10B981',
        jobType: '电子组装工', mode: 'hourly', dateRange: '02-10 至 02-17',
        workerCount: 15, stage: 'checkin', stageText: '待签到', stageColor: '#F59E0B', stageBg: '#FFFBEB',
        salary: '20元/时'
      },
      {
        id: 'order2', company: '顺丰物流仓', avatarText: '顺', avatarColor: '#3B82F6',
        jobType: '包装工', mode: 'hourly', dateRange: '02-01 至 02-28',
        workerCount: 8, stage: 'working', stageText: '工作中', stageColor: '#10B981', stageBg: '#ECFDF5',
        salary: '18元/时'
      },
      {
        id: 'order3', company: '美华服装厂', avatarText: '美', avatarColor: '#F97316',
        jobType: '缝纫工', mode: 'piece', dateRange: '02-15 至 02-20',
        workerCount: 20, stage: 'working', stageText: '工作中', stageColor: '#10B981', stageBg: '#ECFDF5',
        salary: '0.5元/件'
      },
      {
        id: 'order4', company: '恒通五金厂', avatarText: '恒', avatarColor: '#6366F1',
        jobType: '焊工', mode: 'hourly', dateRange: '01-20 至 01-25',
        workerCount: 10, stage: 'settlement', stageText: '待结算', stageColor: '#F59E0B', stageBg: '#FFFBEB',
        salary: '25元/时'
      },
      {
        id: 'order5', company: '华强电子', avatarText: '华', avatarColor: '#64748B',
        jobType: '质检员', mode: 'piece', dateRange: '01-10 至 01-15',
        workerCount: 6, stage: 'done', stageText: '已完成', stageColor: '#94A3B8', stageBg: '#F1F5F9',
        salary: '0.8元/件'
      }
    ]
  },

  onOrderTap(e) {
    const { id, stage, mode } = e.currentTarget.dataset
    const routes = {
      checkin: '/pages/checkin/checkin?orderId=' + id + '&mode=' + mode,
      working: '/pages/work-session/work-session?orderId=' + id + '&mode=' + mode,
      settlement: '/pages/settlement/settlement?orderId=' + id,
      done: '/pages/settlement/settlement?orderId=' + id + '&viewOnly=1'
    }
    wx.navigateTo({ url: routes[stage] })
  }
})
