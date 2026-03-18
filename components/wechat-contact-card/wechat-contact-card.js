Component({
  properties: {
    visible: { type: Boolean, value: false },
    title: { type: String, value: '微信联系方式' },
    wechatId: { type: String, value: '' },
    wechatQrImage: { type: String, value: '' }
  },

  methods: {
    noop() {},

    onClose() {
      this.triggerEvent('close')
    },

    onCopy() {
      const value = (this.data.wechatId || '').trim()
      if (!value) {
        wx.showToast({ title: '暂无微信号', icon: 'none' })
        return
      }
      wx.setClipboardData({ data: value })
    }
  }
})
