Page({
  data: {
    currentTab: 0,
    tabs: ['全部', '待确认', '已入选', '进行中', '已完成'],
    list: [
      {
        id: 'a1', company: '鑫达电子厂', avatar: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=60&h=60&fit=crop', title: '电子组装工', salary: '20元/时',
        status: 'confirm', statusText: '待确认出勤', statusColor: '#F59E0B',
        date: '02-10 08:00', alert: '明天开工，请在今天18:00前确认出勤',
        stats: null
      },
      {
        id: 'a2', company: '顺丰包装厂', avatar: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=60&h=60&fit=crop', title: '包装工', salary: '18元/时',
        status: 'ongoing', statusText: '进行中', statusColor: '#10B981',
        date: '02-12 至 02-14', alert: '',
        stats: [
          { label: '已出勤', value: '8天' },
          { label: '累计工时', value: '64h' },
          { label: '预计收入', value: '¥1152' }
        ]
      },
      {
        id: 'a3', company: '华美五金厂', avatar: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=60&h=60&fit=crop', title: '计件工', salary: '0.5元/件',
        status: 'done', statusText: '已完成', statusColor: '#94A3B8',
        date: '01-20 至 02-03', alert: '',
        stats: [
          { label: '出勤', value: '15天' },
          { label: '完成', value: '3200件' },
          { label: '已结算', value: '¥1600' }
        ]
      },
      {
        id: 'a4', company: '鑫达电子厂', avatar: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=60&h=60&fit=crop', title: '质检员', salary: '22元/时',
        status: 'rejected', statusText: '未入选', statusColor: '#F43F5E',
        date: '报名于 02-05', alert: '',
        stats: null
      }
    ]
  },

  onTabChange(e) {
    this.setData({ currentTab: e.currentTarget.dataset.index })
  },

  onConfirmAttend(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认出勤',
      content: '确认明天按时到岗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已确认', icon: 'success' })
        }
      }
    })
  },

  onViewDetail(e) {
    wx.navigateTo({ url: '/pages/job-detail/job-detail?id=' + e.currentTarget.dataset.id })
  }
})
