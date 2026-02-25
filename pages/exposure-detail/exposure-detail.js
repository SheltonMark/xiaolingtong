const { get, post } = require('../../utils/request')

Page({
  data: {
    isFav: false,
    detail: {},
    images: [],
    comments: [],
    commentText: ''
  },
  onLoad(options) {
    if (options.id) {
      this.loadDetail(options.id)
    }
  },
  loadDetail(id) {
    get('/exposures/' + id).then(res => {
      const d = res.data || {}
      this.setData({
        detail: d,
        images: d.images || [],
        comments: d.comments || []
      })
    }).catch(() => {})
  },
  onPreviewImage(e) {
    wx.previewImage({ current: this.data.images[e.currentTarget.dataset.index], urls: this.data.images })
  },
  onCommentInput(e) { this.setData({ commentText: e.detail.value }) },
  onSendComment() {
    if (!this.data.commentText.trim()) return
    post('/exposures/' + this.data.detail.id + '/comment', { content: this.data.commentText }).then(res => {
      wx.showToast({ title: '评论已发送', icon: 'success' })
      this.setData({ commentText: '' })
      this.loadDetail(this.data.detail.id)
    }).catch(() => {})
  },
  onToggleFav() {
    post('/favorites/toggle', { targetType: 'exposure', targetId: this.data.detail.id }).then(() => {
      this.setData({ isFav: !this.data.isFav })
      wx.showToast({ title: this.data.isFav ? '已收藏' : '已取消', icon: 'success' })
    }).catch(() => {})
  }
})
