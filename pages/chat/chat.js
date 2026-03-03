const { get, post, upload } = require('../../utils/request')

const VOICE_PREFIX = '__VOICE__'

Page({
  data: {
    conversationId: '',
    inputText: '',
    scrollToView: '',
    otherAvatarText: '',
    myAvatarText: '',
    messages: [],
    keyboardHeight: 0,
    recording: false,
    playingVoiceUrl: ''
  },
  onLoad(options) {
    if (options.id) {
      this.setData({ conversationId: Number(options.id) || '' }, () => {
        this.loadMessages(this.data.conversationId)
      })
    }
    const app = getApp()
    const nickname = (app.globalData.userInfo && app.globalData.userInfo.nickname) || ''
    this.setData({ myAvatarText: nickname ? nickname[0] : '我' })

    this.recorderManager = wx.getRecorderManager()
    this.recorderManager.onStop((res) => {
      this.setData({ recording: false })
      const filePath = res.tempFilePath
      if (!filePath) return
      wx.showLoading({ title: '语音上传中...' })
      upload(filePath).then((uploadRes) => {
        const url = (uploadRes.data && uploadRes.data.url) || uploadRes.data
        if (!url) throw new Error('语音上传失败')
        const duration = Math.max(1, Math.round((res.duration || 0) / 1000))
        const payload = `${VOICE_PREFIX}${JSON.stringify({ url, duration })}`
        return this.sendPayload('text', payload)
      }).catch(() => {
        wx.showToast({ title: '语音发送失败', icon: 'none' })
      }).finally(() => {
        wx.hideLoading()
      })
    })
    this.recorderManager.onError(() => {
      this.setData({ recording: false })
      wx.showToast({ title: '录音失败', icon: 'none' })
    })
  },
  loadMessages(id) {
    if (!id) return
    get('/conversations/' + id + '/messages').then(res => {
      const rawList = (res.data && res.data.list) || []
      const list = rawList.map(item => this.normalizeMessage(item))
      this.setData({ messages: list }, () => this.scrollToBottom())
    }).catch(() => {})
  },
  normalizeMessage(item = {}) {
    const app = getApp()
    const currentUserId = (app.globalData.userInfo && app.globalData.userInfo.id) || 0
    const senderId = Number(item.senderId || 0)
    const from = senderId === Number(currentUserId) ? 'me' : 'other'
    const base = {
      id: item.id,
      from,
      time: item.time || '',
      senderId
    }

    if (item.type === 'image') {
      return { ...base, type: 'image', image: item.content, text: '' }
    }
    if (typeof item.content === 'string' && item.content.startsWith(VOICE_PREFIX)) {
      try {
        const voice = JSON.parse(item.content.slice(VOICE_PREFIX.length))
        return {
          ...base,
          type: 'voice',
          voiceUrl: voice.url,
          voiceDuration: Number(voice.duration || 1)
        }
      } catch (error) {}
    }
    return { ...base, type: 'text', text: item.content || '' }
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
    const text = (this.data.inputText || '').trim()
    if (!text) return
    this.sendPayload('text', text).then(() => {
      this.setData({ inputText: '' })
    }).catch(() => {
      wx.showToast({ title: '发送失败', icon: 'none' })
    })
  },
  sendPayload(type, content) {
    if (!this.data.conversationId) {
      wx.showToast({ title: '会话不存在', icon: 'none' })
      return Promise.reject(new Error('conversation missing'))
    }
    return post('/conversations/' + this.data.conversationId + '/send', { type, content }).then(res => {
      const message = this.normalizeMessage(res.data || {})
      this.setData({
        messages: [...this.data.messages, message],
        scrollToView: 'msg-' + message.id
      }, () => this.scrollToBottom())
    })
  },
  onChooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const filePath = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath
        if (!filePath) return
        wx.showLoading({ title: '图片上传中...' })
        upload(filePath).then((uploadRes) => {
          const url = (uploadRes.data && uploadRes.data.url) || uploadRes.data
          if (!url) throw new Error('图片上传失败')
          return this.sendPayload('image', url)
        }).catch(() => {
          wx.showToast({ title: '图片发送失败', icon: 'none' })
        }).finally(() => {
          wx.hideLoading()
        })
      }
    })
  },
  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    wx.previewImage({ current: url, urls: [url] })
  },
  onToggleVoice() {
    if (this.data.recording) {
      this.recorderManager.stop()
      return
    }
    this.setData({ recording: true })
    this.recorderManager.start({
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3'
    })
    wx.showToast({ title: '录音中，再点结束', icon: 'none' })
  },
  onPlayVoice(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    if (!this.audioContext) {
      this.audioContext = wx.createInnerAudioContext()
      this.audioContext.onEnded(() => {
        this.setData({ playingVoiceUrl: '' })
      })
      this.audioContext.onStop(() => {
        this.setData({ playingVoiceUrl: '' })
      })
      this.audioContext.onError(() => {
        this.setData({ playingVoiceUrl: '' })
      })
    }

    if (this.data.playingVoiceUrl === url) {
      this.audioContext.stop()
      this.setData({ playingVoiceUrl: '' })
      return
    }

    this.audioContext.stop()
    this.audioContext.src = url
    this.audioContext.play()
    this.setData({ playingVoiceUrl: url })
  },
  onUnload() {
    if (this.audioContext) {
      this.audioContext.destroy()
      this.audioContext = null
    }
    if (this.recorderManager && this.data.recording) {
      this.recorderManager.stop()
    }
  }
})
