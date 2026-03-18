const { put, upload } = require('../../utils/request')
const { normalizeImageUrl } = require('../../utils/image')

Page({
  data: {
    userRole: 'enterprise',
    nickname: '',
    cacheSize: '0 MB',
    version: 'v1.0.0',
    avatarUrl: '',
    avatarText: '',
    avatarColor: '#3B82F6'
  },

  onShow() {
    const app = getApp()
    const userRole = app.globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    const userInfo = app.globalData.userInfo || {}
    const nickname = userInfo.nickname || ''
    const avatarUrl = normalizeImageUrl(app.globalData.avatarUrl || wx.getStorageSync('avatarUrl') || '')
    this.setData({
      userRole,
      nickname,
      avatarUrl,
      avatarText: nickname ? nickname[0] : '',
      avatarColor: userRole === 'enterprise' ? '#3B82F6' : '#F97316'
    })
  },

  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        upload(tempPath).then(r => {
          const url = (r.data && r.data.url) || r.data
          return put('/settings/avatar', { avatarUrl: url }).then(() => {
            getApp().globalData.avatarUrl = url
            wx.setStorageSync('avatarUrl', url)
            this.setData({ avatarUrl: url })
            wx.showToast({ title: '头像已更新', icon: 'success' })
          })
        }).catch(() => {
          getApp().globalData.avatarUrl = tempPath
          wx.setStorageSync('avatarUrl', tempPath)
          this.setData({ avatarUrl: tempPath })
        })
      }
    })
  },

  onClearCache() {
    wx.showModal({
      title: '提示',
      content: '确定清除缓存？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ cacheSize: '0 MB' })
          wx.showToast({ title: '缓存已清除', icon: 'success' })
        }
      }
    })
  },

  onAgreement() {
    wx.navigateTo({ url: '/pages/agreement/agreement' })
  },

  onPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' })
  },

  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定退出登录？',
      confirmColor: '#F43F5E',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          getApp().globalData.userRole = ''
          getApp().globalData.isLoggedIn = false
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  }
})
