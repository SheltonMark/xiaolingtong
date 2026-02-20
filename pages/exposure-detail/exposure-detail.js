Page({
  data: {
    detail: {
      avatarText: '匿'
    },
    images: [],
    comments: [
      { id: 1, name: '张**', time: '2天前', content: '我也被这家坑过，同样的套路，大家注意避坑！' },
      { id: 2, name: '李**', time: '1天前', content: '建议走法律途径，金额超过一万可以报警处理。' },
      { id: 3, name: '王**', time: '12小时前', content: '这种人就应该曝光，支持楼主维权！' }
    ],
    commentText: ''
  },
  onPreviewImage(e) {
    wx.previewImage({ current: this.data.images[e.currentTarget.dataset.index], urls: this.data.images })
  },
  onCommentInput(e) { this.setData({ commentText: e.detail.value }) },
  onSendComment() {
    if (!this.data.commentText.trim()) return
    wx.showToast({ title: '评论已发送', icon: 'success' })
    this.setData({ commentText: '' })
  }
})
