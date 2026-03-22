const { get, post, upload } = require('../../utils/request')
const wsChat = require('../../utils/ws-chat')
const { normalizeImageUrl } = require('../../utils/image')

const VOICE_PREFIX = '__VOICE__'

Page({
  data: {
    conversationId: '',
    inputText: '',
    scrollToView: '',
    otherAvatarUrl: '',
    otherAvatarText: '',
    otherName: '',
    otherActiveText: '',
    otherIsOnline: false,
    myAvatarUrl: '',
    myAvatarText: '',
    messages: [],
    keyboardHeight: 0,
    voiceMode: false,
    hasRecordAuth: false,
    recording: false,
    recordingSeconds: 0,
    cancelVoice: false,
    playingVoiceUrl: '',
    timeMarkText: ''
  },
  onLoad(options) {
    if (options.id) {
      this.setData({ conversationId: Number(options.id) || '' }, () => {
        this.loadMessages(this.data.conversationId)
      })
    }
    const app = getApp()
    const userInfo = app.globalData.userInfo || {}
    const nickname = userInfo.nickname || ''
    this.setData({
      myAvatarUrl: normalizeImageUrl(userInfo.avatarUrl || ''),
      myAvatarText: nickname ? nickname[0] : '我'
    })

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
    if (this.data.conversationId) {
      this.loadMessages(this.data.conversationId)
    }
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
      const messagesWithTime = list.map(msg => ({ ...msg, showTime: true }))

      // 从后端返回的 otherUser 获取对方信息
      const otherUser = res.data && res.data.otherUser
      if (otherUser) {
        this.setData({
          otherAvatarUrl: normalizeImageUrl(otherUser.avatarUrl || ''),
          otherAvatarText: otherUser.name ? otherUser.name[0] : '对',
          otherName: otherUser.name || '对方',
          otherActiveText: otherUser.activeText || '',
          otherIsOnline: !!otherUser.isOnline
        })
      } else {
        // 兼容旧逻辑：从消息中提取对方头像
        const app = getApp()
        const myId = Number((app.globalData.userInfo && app.globalData.userInfo.id) || 0)
        const otherMsg = rawList.find(m => Number(m.senderId) !== myId && m.sender)
        if (otherMsg && otherMsg.sender) {
          this.setData({
            otherAvatarUrl: normalizeImageUrl(otherMsg.sender.avatarUrl || ''),
            otherAvatarText: otherMsg.sender.nickname ? otherMsg.sender.nickname[0] : '对',
            otherName: otherMsg.sender.nickname || '对方',
            otherActiveText: '',
            otherIsOnline: false
          })
        }
      }

      this.setData({ messages: messagesWithTime }, () => this.scrollToBottom())
    }).catch(() => {})
  },
  parseMessageDate(value) {
    if (value === undefined || value === null || value === '') return null
    if (typeof value === 'number') {
      const ts = value < 1e12 ? value * 1000 : value
      const date = new Date(ts)
      return isNaN(date.getTime()) ? null : date
    }
    const text = String(value).trim()
    if (!text) return null

    let date = new Date(text)
    if (isNaN(date.getTime()) && text.includes('-')) {
      date = new Date(text.replace(/-/g, '/'))
    }
    if (isNaN(date.getTime())) return null
    return date
  },
  formatMessageTime(timeStr) {
    if (!timeStr) return ''
    const date = this.parseMessageDate(timeStr)
    if (!date) return String(timeStr)

    const now = new Date()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const timeText = `${hours}:${minutes}`
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const dayDiff = Math.floor((startOfToday - startOfDate) / (24 * 60 * 60 * 1000))

    if (dayDiff === 0) {
      return timeText
    }
    if (dayDiff === 1) {
      return `昨天 ${timeText}`
    }
    if (dayDiff > 1 && dayDiff < 7) {
      const weekdayMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      return `${weekdayMap[date.getDay()]} ${timeText}`
    }

    const month = date.getMonth() + 1
    const day = date.getDate()
    const sameYear = date.getFullYear() === now.getFullYear()
    if (sameYear) {
      return `${month}月${day}日 ${timeText}`
    }

    return `${date.getFullYear()}年${month}月${day}日 ${timeText}`
  },

  normalizeMessage(item = {}) {
    const app = getApp()
    const currentUserId = (app.globalData.userInfo && app.globalData.userInfo.id) || 0
    const senderId = Number(item.senderId || 0)
    const from = senderId === Number(currentUserId) ? 'me' : 'other'
    const rawTime = item.createdAt || item.time || ''
    const base = {
      id: item.id,
      from,
      time: this.formatMessageTime(rawTime),
      rawTime, // 保存原始时间用于计算
      senderId,
      conversationId: Number(item.conversationId || this.data.conversationId || 0)
    }

    if (item.type === 'image') {
      return { ...base, type: 'image', image: normalizeImageUrl(item.content), text: '' }
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

  // 计算消息是否应该显示时间（距离上一条显示时间的消息超过5分钟）
  shouldShowTime(newMessage) {
    return !!newMessage
  },

  onWsEvent(event, data) {
    if (event !== 'new_message' || !data) return
    const message = this.normalizeMessage(data)
    if (Number(message.conversationId) !== Number(this.data.conversationId)) return
    if ((this.data.messages || []).some(item => Number(item.id) === Number(message.id))) return

    // 计算是否显示时间
    message.showTime = this.shouldShowTime(message)

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

      // 计算是否显示时间
      message.showTime = this.shouldShowTime(message)

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
