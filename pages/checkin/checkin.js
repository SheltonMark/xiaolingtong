Page({
  data: {
    jobInfo: {
      company: '鑫达电子厂',
      date: '02-10',
      time: '08:00-18:00',
      total: 15,
      checkedIn: 12,
      notCheckedIn: 3
    },
    distance: 55,
    maxDistance: 500,
    workers: [
      { id: 'w1', name: '张三', time: '07:55', status: 'ontime' },
      { id: 'w2', name: '李四', time: '07:58', status: 'ontime' },
      { id: 'w3', name: '王五', time: '08:02', status: 'late' },
      { id: 'w4', name: '赵六', time: '', status: 'absent' },
      { id: 'w5', name: '钱七', time: '', status: 'absent' }
    ],
    photos: [
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=120&h=120&fit=crop'
    ]
  },

  onCheckin() {
    if (this.data.distance > this.data.maxDistance) {
      wx.showToast({ title: '超出签到范围', icon: 'none' })
      return
    }
    wx.showToast({ title: '签到成功', icon: 'success' })
  },

  onRefreshLocation() {
    wx.showToast({ title: '位置已刷新', icon: 'none' })
  },

  onManualCheckin(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '手动签到',
      content: '确认为该工人手动签到？',
      success: (res) => {
        if (res.confirm) wx.showToast({ title: '已签到', icon: 'success' })
      }
    })
  },

  onCheckAll() {
    wx.showModal({
      title: '全部签到',
      content: '确认为所有未签到人员手动签到？',
      success: (res) => {
        if (res.confirm) wx.showToast({ title: '已全部签到', icon: 'success' })
      }
    })
  },

  onTakePhoto() {
    wx.chooseMedia({
      count: 9 - this.data.photos.length,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        const newPhotos = res.tempFiles.map(f => f.tempFilePath)
        this.setData({ photos: [...this.data.photos, ...newPhotos] })
      }
    })
  },

  onConfirmStart() {
    wx.showModal({
      title: '确认开工',
      content: '确认所有人员已到位，开始工作？',
      success: (res) => {
        if (res.confirm) wx.showToast({ title: '已确认开工', icon: 'success' })
      }
    })
  }
})
