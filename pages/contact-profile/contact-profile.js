const { put, upload } = require('../../utils/request')
const auth = require('../../utils/auth')
const { getDefaultContactProfile } = require('../../utils/contact-profile')
const { normalizeImageUrl } = require('../../utils/image')

Page({
  data: {
    loading: false,
    saving: false,
    uploadingQr: false,
    verifiedPhone: '',
    phoneVerified: false,
    form: {
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
    getDefaultContactProfile().then((profile) => {
      const verifiedPhone = profile.phoneVerified ? (profile.phone || '') : ''
      this.setData({
        loading: false,
        verifiedPhone,
        phoneVerified: !!profile.phoneVerified,
        form: {
          contactName: profile.contactName || '',
          phone: profile.phone || '',
          wechatId: profile.wechatId || '',
          wechatQrImage: normalizeImageUrl(profile.wechatQrImage || '')
        }
      })
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
    this.setData(nextData)
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
    if (!form.contactName.trim()) {
      wx.showToast({ title: '请输入联系人', icon: 'none' })
      return
    }
    if (!form.phone.trim()) {
      wx.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    put('/contact-profile/default', {
      contactName: form.contactName.trim(),
      phone: form.phone.trim(),
      wechatId: form.wechatId.trim(),
      wechatQrImage: form.wechatQrImage
    }).then(() => {
      this.setData({
        saving: false,
        verifiedPhone: this.data.phoneVerified ? form.phone.trim() : this.data.verifiedPhone
      })
      wx.showToast({ title: '已保存', icon: 'success' })
    }).catch(() => {
      this.setData({ saving: false })
    })
  }
})
