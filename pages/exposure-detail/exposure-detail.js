const { get, post } = require('../../utils/request')
const { normalizeImageUrl, normalizeImageList } = require('../../utils/image')

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr)
    .toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    .replace(/\//g, '-')
}

function formatAmount(value) {
  if (value === undefined || value === null || value === '') {
    return ''
  }

  const amount = Number(value)
  if (Number.isNaN(amount)) {
    return '¥' + String(value)
  }

  return '¥' + amount.toLocaleString()
}

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
      this.loadFavStatus(options.id)
    }
  },

  onShow() {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const options = currentPage.options
    if (options && options.id) {
      this.loadFavStatus(options.id)
    }
  },

  loadDetail(id) {
    get('/exposures/' + id).then((res) => {
      const data = res.data || res || {}
      const publisher = data.publisher || {}
      const publisherName = publisher.name || ''
      const categoryText = data.categoryText || '维权经验'

      this.setData({
        detail: {
          ...data,
          publishTime: formatDate(data.createdAt),
          publisherName,
          publisherAvatar: normalizeImageUrl(publisher.avatarUrl || ''),
          avatarText: (publisherName || categoryText || '维')[0],
          categoryText,
          amountText: formatAmount(data.amount),
          viewCount: data.viewCount || 0
        },
        images: normalizeImageList(data.images),
        comments: (data.comments || []).map((item) => {
          const nickname = (item.user && item.user.nickname) || '用户'
          return {
            ...item,
            name: nickname,
            avatarUrl: normalizeImageUrl((item.user && item.user.avatarUrl) || ''),
            avatarText: nickname[0] || '用',
            time: formatDate(item.createdAt)
          }
        })
      })
    }).catch(() => {})
  },

  onPreviewImage(e) {
    wx.previewImage({
      current: this.data.images[e.currentTarget.dataset.index],
      urls: this.data.images
    })
  },

  loadFavStatus(id) {
    get('/favorites').then((res) => {
      const payload = res.data || res || {}
      const list = Array.isArray(payload) ? payload : (payload.list || [])
      const isFav = list.some((item) => {
        const targetId = item.targetId || item.id
        return item.targetType === 'exposure' && String(targetId) === String(id)
      })
      this.setData({ isFav })
    }).catch(() => {})
  },

  onToggleFav() {
    post('/favorites/toggle', {
      targetType: 'exposure',
      targetId: this.data.detail.id
    }).then(() => {
      const nextIsFav = !this.data.isFav
      this.setData({ isFav: nextIsFav })
      wx.showToast({ title: nextIsFav ? '已收藏' : '已取消', icon: 'success' })
      setTimeout(() => this.loadFavStatus(this.data.detail.id), 300)
    }).catch(() => {})
  },

  onCommentInput(e) {
    this.setData({
      commentText: e.detail.value || ''
    })
  },

  onInputFocus(e) {
    this.setData({
      keyboardHeight: (e.detail && e.detail.height) || 0
    })
  },

  onInputBlur() {
    this.setData({ keyboardHeight: 0 })
  },

  onSendComment() {
    const content = (this.data.commentText || '').trim()
    if (!content) {
      wx.showToast({ title: '请输入评论内容', icon: 'none' })
      return
    }
    if (!this.data.detail.id) {
      return
    }

    post('/exposures/' + this.data.detail.id + '/comment', { content })
      .then(() => {
        wx.showToast({ title: '评论成功', icon: 'success' })
        this.setData({ commentText: '', keyboardHeight: 0 })
        this.loadDetail(this.data.detail.id)
      })
      .catch(() => {})
  },

  onShareAppMessage() {
    return {
      title: (this.data.detail.categoryText || '维权经验') + ' - 小灵通维权吧',
      path: getApp().getSharePath('/pages/exposure-detail/exposure-detail?id=' + this.data.detail.id)
    }
  },

  onShareTimeline() {
    return {
      title: (this.data.detail.categoryText || '维权经验') + ' - 小灵通维权吧',
      query: 'id=' + (this.data.detail.id || '')
    }
  }
})
