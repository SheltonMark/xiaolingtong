Page({
  data: {
    orderId: '',
    mode: 'hourly',
    // 计时模式数据
    status: {
      company: '顺丰物流仓',
      jobType: '包装工',
      hoursToday: '6.5',
      startTime: '08:00',
      todayAttend: 8,
      todayAnomaly: 1,
      estimateEnd: '18:00'
    },
    photoRecords: [
      { id: 'pr1', timeRange: '08:00 - 10:00', status: 'done', uploadTime: '10:02', image: '' },
      { id: 'pr2', timeRange: '10:00 - 12:00', status: 'done', uploadTime: '12:05', image: '' },
      { id: 'pr3', timeRange: '13:00 - 14:30', status: 'done', uploadTime: '14:32', image: '' },
      { id: 'pr4', timeRange: '14:30 - 16:00', status: 'pending', uploadTime: '', image: '' }
    ],
    // 计件模式数据
    pieceStatus: {
      company: '美华服装厂',
      jobType: '缝纫工',
      piecesToday: 450,
      pricePerPiece: 0.5,
      earningsToday: '225.00',
      startTime: '08:00',
      todayAttend: 20,
      todayAnomaly: 0
    },
    workers: [
      { id: 'w1', name: '张三', todayPieces: 120, totalPieces: 960, inputValue: '' },
      { id: 'w2', name: '李四', todayPieces: 95, totalPieces: 780, inputValue: '' },
      { id: 'w3', name: '王五', todayPieces: 110, totalPieces: 850, inputValue: '' },
      { id: 'w4', name: '赵六', todayPieces: 125, totalPieces: 1020, inputValue: '' }
    ],
    // 共用
    anomalies: [
      { id: 'an1', name: '王五', type: '早退', time: '14:30', desc: '身体不适提前离开，实际工时6小时' }
    ]
  },

  onLoad(options) {
    this.setData({
      orderId: options.orderId || '',
      mode: options.mode || 'hourly'
    })
  },

  onTakePhoto(e) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: () => {
        wx.showToast({ title: '上传成功', icon: 'success' })
      }
    })
  },

  onPieceInput(e) {
    const id = e.currentTarget.dataset.id
    const val = e.detail.value
    const workers = this.data.workers.map(w => w.id === id ? { ...w, inputValue: val } : w)
    this.setData({ workers })
  },

  onSubmitPieces() {
    const hasInput = this.data.workers.some(w => w.inputValue)
    if (!hasInput) {
      wx.showToast({ title: '请录入计件数', icon: 'none' })
      return
    }
    wx.showModal({
      title: '提交计件',
      content: '确认提交今日计件数据？需工厂现场负责人确认',
      success: (res) => {
        if (res.confirm) wx.showToast({ title: '提交成功', icon: 'success' })
      }
    })
  },

  onRecordAnomaly() {
    wx.navigateTo({ url: '/pages/anomaly/anomaly' })
  },

  onFinishWork() {
    wx.showModal({
      title: '确认收工',
      content: '收工后将生成结算单，请确保所有工时/计件记录准确',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已确认收工', icon: 'success' })
          setTimeout(() => wx.navigateTo({ url: '/pages/settlement/settlement?orderId=' + this.data.orderId + '&role=manager' }), 1500)
        }
      }
    })
  }
})
