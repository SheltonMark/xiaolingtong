const { put, upload } = require('../../utils/request')
const auth = require('../../utils/auth')

Page({
  data: {
    userRole: 'enterprise',
    nickname: '',
    phone: '',
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
    const avatarUrl = app.globalData.avatarUrl || wx.getStorageSync('avatarUrl') || ''
    this.setData({
      userRole,
      nickname,
      phone: userInfo.phone || '',
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
          const url = r.data.url || r.data
          return put('/settings/avatar', { avatarUrl: url }).then(() => {
            getApp().globalData.avatarUrl = url
            wx.setStorageSync('avatarUrl', url)
            this.setData({ avatarUrl: url })
            wx.showToast({ title: '头像已更新', icon: 'success' })
          })
        }).catch(() => {
          // fallback 本地
          getApp().globalData.avatarUrl = tempPath
          wx.setStorageSync('avatarUrl', tempPath)
          this.setData({ avatarUrl: tempPath })
        })
      }
    })
  },

  onPhoneTap() {
    const { phone } = this.data
    if (!phone) {
      wx.showToast({ title: '暂无手机号', icon: 'none' })
      return
    }
    wx.showActionSheet({
      itemList: ['复制手机号', '修改手机号'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 复制手机号
          wx.setClipboardData({ data: phone })
          wx.showToast({ title: '已复制', icon: 'success' })
        } else if (res.tapIndex === 1) {
          // 修改手机号
          wx.navigateTo({ url: '/pages/settings/settings' })
        }
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
