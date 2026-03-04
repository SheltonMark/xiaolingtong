const { get, post } = require('../../utils/request')

Page({
  data: {
    isFav: false,
    detail: {},
    images: [],
    comments: [],
    commentText: '',
    keyboardHeight: 0
  },
  onLoad(options) {
    if (options.id) {
      this.loadDetail(options.id)
    }
  },
  loadDetail(id) {
    get('/exposures/' + id).then(res => {
      const d = res.data || {}
      // 格式化发布时间
      const publishTime = d.createdAt ? new Date(d.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-') : ''

      // 发布者信息
      const publisher = d.publisher || {}
      const publisherName = publisher.name || '匿名用户'
      const publisherAvatar = publisher.avatarUrl || ''

      this.setData({
        detail: {
          ...d,
          publishTime,
          publisherName,
          publisherAvatar,
          avatarText: publisherName ? publisherName[0] : '曝',
          viewCount: d.viewCount || 0
        },
        images: d.images || [],
        comments: (d.comments || []).map(c => ({
          id: c.id,
          name: c.user?.nickname || '匿名用户',
          avatarUrl: c.user?.avatarUrl || '',
          avatarText: (c.user?.nickname || '匿')[0],
          content: c.content,
          time: this.formatTime(c.createdAt)
        }))
      })
    }).catch(() => {})
  },
  getCategoryText(category) {
    const map = { 'false_info': '虚假信息', 'fraud': '欺诈行为', 'wage_theft': '欠薪欠款' }
    return map[category] || '曝光'
  },
  formatTime(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now - d
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')
  },
  onPreviewImage(e) {
    wx.previewImage({ current: this.data.images[e.currentTarget.dataset.index], urls: this.data.images })
  },
  onCommentInput(e) { this.setData({ commentText: e.detail.value }) },
  onSendComment() {
    if (!this.data.commentText.trim()) return
    wx.hideKeyboard()
    post('/exposures/' + this.data.detail.id + '/comment', { content: this.data.commentText }).then(res => {
      wx.showToast({ title: '评论已发送', icon: 'success' })
      this.setData({ commentText: '', keyboardHeight: 0 })
      this.loadDetail(this.data.detail.id)
    }).catch(() => {})
  },
  onToggleFav() {
    post('/favorites/toggle', { targetType: 'exposure', targetId: this.data.detail.id }).then(() => {
      this.setData({ isFav: !this.data.isFav })
      wx.showToast({ title: this.data.isFav ? '已收藏' : '已取消', icon: 'success' })
    }).catch(() => {})
  },
  onInputFocus(e) {
    this.setData({ keyboardHeight: e.detail.height || 0 })
  },
  onInputBlur() {
    this.setData({ keyboardHeight: 0 })
  }
})
