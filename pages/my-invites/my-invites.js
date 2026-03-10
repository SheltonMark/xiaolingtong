const { get } = require('../../utils/request')

Page({
  data: {
    inviteCode: '',
    totalInvites: 0,
    list: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false
  },

  onLoad() {
    this.loadCode()
    this.loadStats()
    this.loadList()
  },

  loadCode() {
    get('/invite/code').then(res => {
      this.setData({ inviteCode: res.data.inviteCode || '' })
    }).catch(() => {})
  },

  loadStats() {
    get('/invite/stats').then(res => {
      this.setData({ totalInvites: res.data.totalInvites || 0 })
    }).catch(() => {})
  },

  loadList() {
    if (this.data.loading || !this.data.hasMore) return
    this.setData({ loading: true })
    const { page, pageSize } = this.data
    get('/invite/records?page=' + page + '&pageSize=' + pageSize).then(res => {
      const d = res.data
      const newList = this.data.list.concat((d.list || []).map(item => ({
        ...item,
        initial: (item.nickname || '用').charAt(0)
      })))
      this.setData({
        list: newList,
        loading: false,
        hasMore: newList.length < (d.total || 0),
        page: page + 1
      })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  onReachBottom() {
    this.loadList()
  },

  onCopyCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    })
  },

  onShareAppMessage() {
    return {
      title: '我在用小灵通，快来一起找活接单！',
      path: getApp().getSharePath('/pages/index/index')
    }
  }
})
