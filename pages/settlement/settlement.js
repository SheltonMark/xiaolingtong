function resolveRole(role) {
  if (role === 'worker' || role === 'manager') return role
  return 'enterprise'
}

Page({
  data: {
    pageTitle: '工作结算',
    redirecting: true,
    targetUrl: ''
  },

  onLoad(options) {
    const jobId = options.jobId || ''
    const storedRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    const role = resolveRole(options.role || storedRole)
    const viewOnly = options.viewOnly === '1' || role === 'worker'
    const targetUrl = jobId
      ? `/pages/job-process/job-process?jobId=${jobId}&tab=${options.tab || 'settlement'}&role=${role}&viewOnly=${viewOnly ? 1 : 0}`
      : ''

    this.setData({ targetUrl })

    if (!jobId) {
      this.setData({ redirecting: false })
      return
    }

    this.redirectToWorkflow(targetUrl)
  },

  redirectToWorkflow(url) {
    wx.redirectTo({
      url,
      fail: () => {
        wx.navigateTo({
          url,
          fail: () => {
            wx.reLaunch({
              url,
              fail: () => {
                this.setData({ redirecting: false })
              }
            })
          }
        })
      }
    })
  },

  onOpenWorkflow() {
    if (!this.data.targetUrl) return
    wx.navigateTo({ url: this.data.targetUrl })
  },

  onBackMine() {
    wx.switchTab({ url: '/pages/mine/mine' })
  }
})
