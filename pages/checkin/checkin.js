Page({
  data: {
    jobInfo: {
      company: '鑫达电子厂',
      date: '2026-02-12',
      time: '08:00-18:00',
      total: 15,
      checkedIn: 12,
      notCheckedIn: 3
    },
    distance: 55,
    maxDistance: 500,
    workers: [
      { id: 'w1', name: '张三', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=60&h=60&fit=crop', time: '07:55', status: 'ontime', statusText: '已签到' },
      { id: 'w2', name: '李四', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop', time: '08:02', status: 'late', statusText: '迟到' },
      { id: 'w3', name: '王五', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop', time: '', status: 'absent', statusText: '未签到' }
    ]
  },

  onCheckin() {
    if (this.data.distance > this.data.maxDistance) {
      wx.showToast({ title: '超出签到范围', icon: 'none' })
      return
    }
    wx.showToast({ title: '签到成功', icon: 'success' })
  },

  onManualCheckin(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '手动签到',
      content: '确认为该工人手动签到？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已签到', icon: 'success' })
        }
      }
    })
  },

  onConfirmStart() {
    wx.showModal({
      title: '确认开工',
      content: '确认所有人员已到位，开始工作？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已确认开工', icon: 'success' })
        }
      }
    })
  }
})
