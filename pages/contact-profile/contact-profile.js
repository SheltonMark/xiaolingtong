const { get, put, upload } = require('../../utils/request')
const auth = require('../../utils/auth')
const { getDefaultContactProfile } = require('../../utils/contact-profile')
const { normalizeImageUrl } = require('../../utils/image')

Page({
  data: {
    loading: false,
    saving: false,
    uploadingQr: false,
    uploadingAvatar: false,
    avatarUrl: '',
    avatarText: '',
    avatarColor: '#3B82F6',
    verifiedPhone: '',
    phoneVerified: false,
    form: {
      nickname: '',
      contactName: '',
      phone: '',
      wechatId: '',
      wechatQrImage: ''
    }
  },

  onLoad() {
    if (!auth.isLoggedIn()) { auth.goLogin(); return }
    this.loadProfile()
  },

  loadProfile() {
    this.setData({ loading: true })
    Promise.all([
      get('/auth/profile'),
      getDefaultContactProfile()
    ]).then(([profileRes, contactProfile]) => {
      const user = profileRes.data || {}
      const verifiedPhone = contactProfile.phoneVerified ? (contactProfile.phone || '') : ''
      const userRole =
        getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
      const nick = (user.nickname || '').trim()
      this.setData({
        loading: false,
        verifiedPhone,
        phoneVerified: !!contactProfile.phoneVerified,
        avatarUrl: normalizeImageUrl(user.avatarUrl || ''),
        avatarText: nick ? nick.slice(0, 1) : '用',
        avatarColor: userRole === 'enterprise' ? '#3B82F6' : '#F97316',
        form: {
          nickname: user.nickname || '',
          contactName: contactProfile.contactName || '',
          phone: contactProfile.phone || '',
          wechatId: contactProfile.wechatId || '',
          wechatQrImage: normalizeImageUrl(contactProfile.wechatQrImage || '')
        }
      })
      this._originalNickname = user.nickname || ''
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    const nextData = { ['form.' + field]: value }
    if (field === 'phone') {
      const verifiedPhone = this.data.verifiedPhone || ''
      nextData.phoneVerified = !!(verifiedPhone && value.trim() === verifiedPhone)
    }
    if (field === 'nickname' && !this.data.avatarUrl) {
      const t = value.trim()
      nextData.avatarText = t ? t.slice(0, 1) : '用'
    }
    this.setData(nextData)
  },

  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        this.setData({ uploadingAvatar: true })
        upload(tempPath)
          .then((r) => {
            const url = (r.data && r.data.url) || r.data
            return put('/settings/avatar', { avatarUrl: url }).then(() => {
              const normalized = normalizeImageUrl(url || '')
              const app = getApp()
              app.globalData.avatarUrl = normalized
              wx.setStorageSync('avatarUrl', normalized)
              if (app.globalData.userInfo) {
                app.globalData.userInfo.avatarUrl = normalized
              }
              const nick = (this.data.form.nickname || '').trim()
              this.setData({
                uploadingAvatar: false,
                avatarUrl: normalized,
                avatarText: nick ? nick.slice(0, 1) : this.data.avatarText
              })
              wx.showToast({ title: '头像已更新', icon: 'success' })
            })
          })
          .catch(() => {
            this.setData({ uploadingAvatar: false })
            wx.showToast({ title: '头像更新失败，请重试', icon: 'none' })
          })
      }
    })
  },

  onChooseQr() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        this.setData({ uploadingQr: true })
        upload(tempPath).then((result) => {
          const url = normalizeImageUrl((result.data && result.data.url) || result.data || '')
          this.setData({
            uploadingQr: false,
            'form.wechatQrImage': url
          })
        }).catch(() => {
          this.setData({ uploadingQr: false })
        })
      }
    })
  },

  onPreviewQr() {
    const url = this.data.form.wechatQrImage
    if (!url) return
    wx.previewImage({ current: url, urls: [url] })
  },

  onRemoveQr() {
    this.setData({ 'form.wechatQrImage': '' })
  },

  onSave() {
    const { form } = this.data
    if (!form.nickname.trim()) {
      wx.showToast({ title: '请输入名称', icon: 'none' })
      return
    }
    if (!form.contactName.trim()) {
      wx.showToast({ title: '请输入联系人', icon: 'none' })
      return
    }
    if (!form.phone.trim()) {
      wx.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    this.setData({ saving: true })

    const nicknameChanged = form.nickname.trim() !== (this._originalNickname || '')
    const updateContact = put('/contact-profile/default', {
      contactName: form.contactName.trim(),
      phone: form.phone.trim(),
      wechatId: form.wechatId.trim(),
      wechatQrImage: form.wechatQrImage
    })
    const updateNickname = nicknameChanged
      ? put('/settings/profile', { nickname: form.nickname.trim() })
      : Promise.resolve()

    Promise.all([updateContact, updateNickname]).then(() => {
      this._originalNickname = form.nickname.trim()
      const app = getApp()
      if (app.globalData) {
        app.globalData.userInfo = app.globalData.userInfo || {}
        app.globalData.userInfo.nickname = form.nickname.trim()
      }
      const nickT = form.nickname.trim()
      const patch = {
        saving: false,
        verifiedPhone: this.data.phoneVerified ? form.phone.trim() : this.data.verifiedPhone
      }
      if (!this.data.avatarUrl) {
        patch.avatarText = nickT ? nickT.slice(0, 1) : '用'
      }
      this.setData(patch)
      wx.showToast({ title: '已保存', icon: 'success' })
    }).catch(() => {
      this.setData({ saving: false })
    })
  },

  onShow() {
    if (auth.isLoggedIn() && !this.data.loading) {
      this.loadProfile()
    }
  }
})
