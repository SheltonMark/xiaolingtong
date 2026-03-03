const { get, post } = require('../../utils/request')

Page({
  data: {
    conversationId: '',
    inputText: '',
    scrollToView: '',
    otherAvatarText: '',
    myAvatarText: '',
    messages: [],
    keyboardHeight: 0
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
      this.setData({ messages: list }, () => this.scrollToBottom())
    }).catch(() => {})
  },
  scrollToBottom() {
    const list = this.data.messages || []
    if (!list.length) return
    const lastId = 'msg-' + list[list.length - 1].id
    this.setData({ scrollToView: '' }, () => {
      this.setData({ scrollToView: lastId })
    })
  },
  onKeyboardHeightChange(e) {
    const height = (e.detail && e.detail.height) || 0
    if (height === this.data.keyboardHeight) return
    this.setData({ keyboardHeight: height }, () => this.scrollToBottom())
  },
  onInputFocus() {
    this.scrollToBottom()
  },
  onInputBlur() {
    if (this.data.keyboardHeight) {
      this.setData({ keyboardHeight: 0 })
    }
  },
  onMsgInput(e) { this.setData({ inputText: e.detail.value }) },
  onSend() {
    if (!this.data.inputText.trim()) return
    const text = this.data.inputText
    const time = new Date().getHours() + ':' + String(new Date().getMinutes()).padStart(2, '0')
    const tempMsg = { id: Date.now(), from: 'me', text, time }
    this.setData({ messages: [...this.data.messages, tempMsg], inputText: '', scrollToView: 'msg-' + tempMsg.id }, () => {
      this.scrollToBottom()
    })
    post('/conversations/' + this.data.conversationId + '/send', { content: text }).catch(() => {})
  },
  onChooseImage() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: () => {
      wx.showToast({ title: '图片已发送', icon: 'success' })
    }})
  }
})
