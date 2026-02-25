const { get, post } = require('../../utils/request')

Page({
  data: {
    swiperCurrent: 0,
    isFav: false,
    detail: {},
    contactUnlocked: false,
    contactInfo: {}
  },

  onLoad(options) {
    if (options.id) {
      this.loadDetail(options.id)
    }
  },

  loadDetail(id) {
    get('/posts/' + id).then(res => {
      const detail = res.data
      this.setData({ detail, contactUnlocked: detail.contactUnlocked || false })
      if (detail.contactUnlocked) {
        this.setData({ contactInfo: detail.contactInfo || {} })
      }
    }).catch(() => {})
  },

  onSwiperChange(e) {
    this.setData({ swiperCurrent: e.detail.current })
  },

  onUnlockContact() {
    wx.showModal({
      title: '查看联系方式',
      content: '消耗10灵豆查看联系方式，确认？',
      success: (res) => {
        if (res.confirm) {
          post('/posts/' + this.data.detail.id + '/unlock').then(r => {
            this.setData({ contactUnlocked: true, contactInfo: r.data || {} })
            wx.showToast({ title: '解锁成功', icon: 'success' })
          }).catch(() => {})
        }
      }
    })
  },

  onCopyWechat() {
    wx.setClipboardData({ data: this.data.contactInfo.wechat })
  },

  onCallPhone() {
    wx.makePhoneCall({ phoneNumber: '13800001234', fail() {} })
  },

  onChat() {
    wx.navigateTo({ url: '/pages/chat/chat?id=' + this.data.detail.id })
  },

  onShare() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] })
  },

  onReport() {
    wx.navigateTo({ url: '/pages/report/report?id=' + this.data.detail.id })
  },
  onToggleFav() {
    const id = this.data.detail.id
    post('/favorites/toggle', { targetType: 'post', targetId: id }).then(() => {
      this.setData({ isFav: !this.data.isFav })
      wx.showToast({ title: this.data.isFav ? '已收藏' : '已取消', icon: 'success' })
    }).catch(() => {})
  }
})
