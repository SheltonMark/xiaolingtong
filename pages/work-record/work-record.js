Page({
  data: {
    status: {
      company: '鑫达电子厂',
      jobType: '电子组装工',
      hoursToday: '6.5',
      startTime: '08:00',
      todayAttend: 12,
      todayAnomaly: 1,
      estimateEnd: '18:00'
    },
    photoRecords: [
      { id: 'pr1', timeRange: '08:00-10:00', status: 'done', uploadTime: '10:02' },
      { id: 'pr2', timeRange: '10:00-12:00', status: 'done', uploadTime: '12:05' },
      { id: 'pr3', timeRange: '14:00-16:00', status: 'pending', uploadTime: '' }
    ],
    anomalies: [
      { id: 'an1', name: '王五', type: '早退', time: '14:30', desc: '身体不适提前离开，实际工时6小时' }
    ]
  },

  onTakePhoto(e) {
    const id = e.currentTarget.dataset.id
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: () => {
        wx.showToast({ title: '上传成功', icon: 'success' })
      }
    })
  },

  onRecordAnomaly() {
    wx.showToast({ title: '异常记录功能开发中', icon: 'none' })
  },

  onFinishWork() {
    wx.showModal({
      title: '确认收工',
      content: '收工后将生成结算单，请确保所有工时记录准确',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已确认收工', icon: 'success' })
          setTimeout(() => wx.navigateTo({ url: '/pages/settlement/settlement' }), 1500)
        }
      }
    })
  }
})
