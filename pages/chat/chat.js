Page({
  data: {
    inputText: '',
    scrollToView: '',
    otherAvatarText: '张',
    myAvatarText: '鑫',
    messages: [
      { id: 1, from: 'other', text: '你好，我们这边有现货304不锈钢保温杯，500ml的，请问你需要什么颜色？', time: '14:30' },
      { id: 2, from: 'me', text: '黑色和白色各1500个，能做logo定制吗？', time: '14:31' },
      { id: 3, from: 'other', text: '可以的，这是我们之前做的样品图，你看一下：', time: '14:32' },
      { id: 4, from: 'me', text: '不错，单价多少？3000个的话能优惠吗？', time: '14:33' },
      { id: 5, from: 'other', text: '3000个的话可以给你12元/个，含logo丝印，交期25天，你看可以吗？', time: '14:35' }
    ]
  },
  onMsgInput(e) { this.setData({ inputText: e.detail.value }) },
  onSend() {
    if (!this.data.inputText.trim()) return
    const newMsg = { id: Date.now(), from: 'me', text: this.data.inputText, time: new Date().getHours() + ':' + String(new Date().getMinutes()).padStart(2, '0') }
    this.setData({ messages: [...this.data.messages, newMsg], inputText: '', scrollToView: 'msg-' + newMsg.id })
  },
  onChooseImage() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: () => {
      wx.showToast({ title: '图片已发送', icon: 'success' })
    }})
  }
})
