const { get } = require('../../utils/request')

Page({
  data: {
    orders: []
  },

  onShow() {
    // TODO: 需要后端增加工单列表接口
    // get('/work/orders').then(res => {
    //   this.setData({ orders: res.data || [] })
    // }).catch(() => {})
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
