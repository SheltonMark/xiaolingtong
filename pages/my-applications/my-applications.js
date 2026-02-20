Page({
  data: {
    currentTab: 0,
    tabs: ['全部', '待确认', '已入选', '进行中', '已完成'],
    list: [
      {
        id: 'a1', company: '鑫达电子厂',
        title: '电子组装工', salary: '20元/时',
        status: 'confirm', statusText: '待确认出勤', statusBg: 'amber',
        tabKey: '待确认',
        date: '02-10 至 02-17', hours: '08:00-18:00',
        alert: '明天开工，请在今天18:00前确认出勤，逾期将释放名额',
        stats: null
      },
      {
        id: 'a2', company: '顺丰物流仓',
        title: '包装工', salary: '18元/时',
        status: 'ongoing', statusText: '进行中', statusBg: 'green',
        tabKey: '进行中',
        date: '02-01 至 02-28', hours: '08:30-17:30',
        alert: '',
        stats: [
          { label: '已出勤(天)', value: '8', color: '#3B82F6' },
          { label: '累计工时(h)', value: '64', color: '#F97316' },
          { label: '预计收入', value: '¥1152', color: '#F59E0B' }
        ]
      },
      {
        id: 'a3', company: '美华服装厂',
        title: '缝纫工', salary: '计件0.5元/件',
        status: 'done', statusText: '已完成', statusBg: 'gray',
        tabKey: '已完成',
        date: '01-15 至 01-30', hours: '',
        alert: '',
        stats: [
          { label: '出勤(天)', value: '15', color: '#1E293B' },
          { label: '完成(件)', value: '3200', color: '#1E293B' },
          { label: '已结算', value: '¥1600', color: '#10B981' }
        ]
      },
      {
        id: 'a4', company: '恒通五金厂',
        title: '焊工', salary: '25元/时',
        status: 'rejected', statusText: '未入选', statusBg: 'rose',
        tabKey: '',
        date: '报名时间：01-20', hours: '',
        alert: '', stats: null
      }
    ]
  },

  onTabChange(e) {
    this.setData({ currentTab: Number(e.currentTarget.dataset.index) })
  },

  onConfirmAttend(e) {
    wx.showModal({
      title: '确认出勤',
      content: '确认明天按时到岗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已确认', icon: 'success' })
          setTimeout(() => wx.navigateTo({ url: '/pages/checkin/checkin?id=' + e.currentTarget.dataset.id }), 1500)
        }
      }
    })
  },

  onViewDetail(e) {
    wx.navigateTo({ url: '/pages/job-detail/job-detail?id=' + e.currentTarget.dataset.id })
  },

  onGoCheckin(e) {
    wx.navigateTo({ url: '/pages/checkin/checkin?id=' + e.currentTarget.dataset.id })
  },

  onRate(e) {
    wx.showToast({ title: '评价功能开发中', icon: 'none' })
  }
})
