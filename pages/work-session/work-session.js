const { get, post, upload } = require('../../utils/request')

Page({
  data: {
    orderId: '',
    mode: 'hourly',
    status: {},
    photoRecords: [],
    pieceStatus: {},
    workers: [],
    anomalies: []
  },

  onLoad(options) {
    this.setData({
      orderId: options.orderId || '',
      mode: options.mode || 'hourly'
    })
    // TODO: 加载工作会话数据
    // get('/work/session/' + options.orderId).then(...)
  },

  onTakePhoto(e) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath
        upload(path).then(r => {
          const photoUrl = r.data.url || r.data
          post('/work/log', { orderId: this.data.orderId, photoUrl }).then(() => {
            wx.showToast({ title: '上传成功', icon: 'success' })
          }).catch(() => {})
        }).catch(() => {
          wx.showToast({ title: '上传失败', icon: 'none' })
        })
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
        if (res.confirm) {
          const pieces = this.data.workers.filter(w => w.inputValue).map(w => ({
            workerId: w.id,
            count: Number(w.inputValue)
          }))
          post('/work/log', { orderId: this.data.orderId, pieces }).then(() => {
            wx.showToast({ title: '提交成功', icon: 'success' })
          }).catch(() => {})
        }
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
          setTimeout(() => wx.navigateTo({ url: '/pages/settlement/settlement?jobId=' + this.data.orderId + '&role=manager' }), 1500)
        }
      }
    })
  }
})
