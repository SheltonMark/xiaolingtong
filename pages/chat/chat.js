const { get, post, upload } = require('../../utils/request')
const wsChat = require('../../utils/ws-chat')

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
    voiceMode: false,
    hasRecordAuth: false,
    recording: false,
    recordingSeconds: 0,
    cancelVoice: false,
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
      this.clearRecordTimer()
      const shouldCancel = !!this.pendingCancelVoice
      this.pendingCancelVoice = false
      this.setData({ recording: false, recordingSeconds: 0, cancelVoice: false })
      if (shouldCancel) {
        wx.showToast({ title: '已取消发送', icon: 'none' })
        return
      }
      if ((res.duration || 0) < 800) {
        wx.showToast({ title: '说话时间太短', icon: 'none' })
        return
      }
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
      this.clearRecordTimer()
      this.pendingCancelVoice = false
      this.setData({ recording: false, recordingSeconds: 0, cancelVoice: false })
      wx.showToast({ title: '录音失败', icon: 'none' })
    })

    wx.getSetting({
      success: (res) => {
        if (res.authSetting && res.authSetting['scope.record']) {
          this.setData({ hasRecordAuth: true })
        }
      }
    })
  },
  onShow() {
    wsChat.connect()
    if (!this._wsUnsubscribe) {
      this._wsUnsubscribe = wsChat.subscribe((event, data) => this.onWsEvent(event, data))
    }
  },
  onHide() {
    if (this._wsUnsubscribe) {
      this._wsUnsubscribe()
      this._wsUnsubscribe = null
    }
  },
  clearRecordTimer() {
    if (this.recordTimer) {
      clearInterval(this.recordTimer)
      this.recordTimer = null
    }
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
      senderId,
      conversationId: Number(item.conversationId || this.data.conversationId || 0)
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
  onWsEvent(event, data) {
    if (event !== 'new_message' || !data) return
    const message = this.normalizeMessage(data)
    if (Number(message.conversationId) !== Number(this.data.conversationId)) return
    if ((this.data.messages || []).some(item => Number(item.id) === Number(message.id))) return
    this.setData({
      messages: [...this.data.messages, message]
    }, () => this.scrollToBottom())
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
  onTapVoiceIcon() {
    if (this.data.recording) return
    if (this.data.voiceMode) {
      this.setData({ voiceMode: false })
      return
    }
    this.ensureRecordPermission().then((ok) => {
      if (!ok) return
      this.setData({ voiceMode: true, keyboardHeight: 0 })
    })
  },
  ensureRecordPermission() {
    return new Promise((resolve) => {
      wx.authorize({
        scope: 'scope.record',
        success: () => {
          this.setData({ hasRecordAuth: true })
          resolve(true)
        },
        fail: () => {
          wx.openSetting({
            success: (res) => {
              const enabled = !!(res.authSetting && res.authSetting['scope.record'])
              this.setData({ hasRecordAuth: enabled })
              resolve(enabled)
            },
            fail: () => resolve(false)
          })
        }
      })
    })
  },
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
  onVoiceTouchStart(e) {
    if (!this.data.voiceMode || this.data.recording || !this.recorderManager) return
    this.clearRecordTimer()
    this.recordStartAt = Date.now()
    this.recordStartY = e.touches && e.touches[0] ? e.touches[0].clientY : 0
    this.pendingCancelVoice = false
    this.setData({ recording: true, cancelVoice: false, recordingSeconds: 0 })
    this.recordTimer = setInterval(() => {
      const seconds = Math.max(0, Math.floor((Date.now() - this.recordStartAt) / 1000))
      if (seconds !== this.data.recordingSeconds) {
        this.setData({ recordingSeconds: seconds })
      }
    }, 200)
    this.recorderManager.start({
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3'
    })
  },
  onVoiceTouchMove(e) {
    if (!this.data.recording) return
    const moveY = e.touches && e.touches[0] ? e.touches[0].clientY : 0
    const cancel = (this.recordStartY - moveY) > 70
    if (cancel !== this.data.cancelVoice) {
      this.setData({ cancelVoice: cancel })
    }
  },
  onVoiceTouchEnd() {
    if (!this.data.recording || !this.recorderManager) return
    this.pendingCancelVoice = this.data.cancelVoice
    this.recorderManager.stop()
  },
  onVoiceTouchCancel() {
    if (!this.data.recording || !this.recorderManager) return
    this.pendingCancelVoice = true
    this.recorderManager.stop()
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
    if (this._wsUnsubscribe) {
      this._wsUnsubscribe()
      this._wsUnsubscribe = null
    }
    if (this.audioContext) {
      this.audioContext.destroy()
      this.audioContext = null
    }
    this.clearRecordTimer()
    if (this.recorderManager && this.data.recording) {
      this.pendingCancelVoice = true
      this.recorderManager.stop()
    }
  }
})
