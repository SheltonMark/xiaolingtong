const { get, post } = require('../../utils/request')
const config = require('../../utils/config')

Page({
  data: {
    conversationId: '',
    inputText: '',
    scrollToView: '',
    otherAvatarText: '',
    myAvatarText: '',
    messages: []
  },
  onLoad(options) {
    if (options.id) {
      this.setData({ conversationId: options.id })
      this.loadMessages(options.id)
    }
    const app = getApp()
    const nickname = (app.globalData.userInfo && app.globalData.userInfo.nickname) || ''
    this.setData({ myAvatarText: nickname ? nickname[0] : '我' })
  },
  loadMessages(id) {
    get('/conversations/' + id + '/messages').then(res => {
      const list = res.data || []
      this.setData({ messages: list })
      if (list.length) {
        this.setData({ scrollToView: 'msg-' + list[list.length - 1].id })
      }
    }).catch(() => {})
  },
  onMsgInput(e) { this.setData({ inputText: e.detail.value }) },
  onSend() {
    if (!this.data.inputText.trim()) return
    const text = this.data.inputText
    const time = new Date().getHours() + ':' + String(new Date().getMinutes()).padStart(2, '0')
    const tempMsg = { id: Date.now(), from: 'me', text, time }
    this.setData({ messages: [...this.data.messages, tempMsg], inputText: '', scrollToView: 'msg-' + tempMsg.id })
    post('/conversations/' + this.data.conversationId + '/send', { content: text }).catch(() => {})
  },
  onChooseImage() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: () => {
      wx.showToast({ title: '图片已发送', icon: 'success' })
    }})
  }
})
