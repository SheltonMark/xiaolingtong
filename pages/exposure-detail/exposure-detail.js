const { get, post } = require('../../utils/request')
const { normalizeImageUrl, normalizeImageList } = require('../../utils/image')

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
    // 重新加载收藏状态
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const options = currentPage.options
    if (options && options.id) {
      this.loadFavStatus(options.id)
    }
  },

  loadDetail(id) {
    get('/exposures/' + id).then(res => {
      const d = res.data || {}
      // 格式化发布时间
      const publishTime = d.createdAt ? new Date(d.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-') : ''

      // 发布者信息
      const publisher = d.publisher || {}
      const publisherName = publisher.name || ''
      const publisherAvatar = normalizeImageUrl(publisher.avatarUrl || '')

      this.setData({
        detail: {
          ...d,
          publishTime,
          publisherName,
          publisherAvatar,
          avatarText: publisherName ? publisherName[0] : '曝',
          viewCount: d.viewCount || 0
        },
        images: normalizeImageList(d.images),
        comments: (d.comments || []).map(c => ({
          id: c.id,
          name: c.user?.nickname || '',
          avatarUrl: normalizeImageUrl(c.user?.avatarUrl || ''),
          avatarText: (c.user?.nickname || '评')[0],
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

  loadFavStatus(id) {
    console.log('[exposure-detail] loadFavStatus called with id:', id)
    get('/favorites').then(res => {
      const list = res.data.list || res.data || []
      console.log('[exposure-detail] favorites list:', list)
      const isFav = list.some(item => {
        // 后端返回的是完整对象，id字段就是targetId
        const match = item.targetType === 'exposure' && String(item.id) === String(id)
        console.log('[exposure-detail] checking item:', item, 'match:', match)
        return match
      })
      console.log('[exposure-detail] isFav result:', isFav)
      this.setData({ isFav })
    }).catch(err => {
      console.error('[exposure-detail] loadFavStatus error:', err)
    })
  },

  onToggleFav() {
    console.log('[exposure-detail] onToggleFav called with id:', this.data.detail.id, 'current isFav:', this.data.isFav)
    post('/favorites/toggle', { targetType: 'exposure', targetId: this.data.detail.id }).then((res) => {
      console.log('[exposure-detail] toggle response:', res)
      this.setData({ isFav: !this.data.isFav })
      wx.showToast({ title: this.data.isFav ? '已收藏' : '已取消', icon: 'success' })
      // 重新加载收藏状态以确保同步
      setTimeout(() => this.loadFavStatus(this.data.detail.id), 500)
    }).catch(err => {
      console.error('[exposure-detail] toggle error:', err)
    })
  },
  onInputFocus(e) {
    this.setData({ keyboardHeight: e.detail.height || 0 })
  },
  onInputBlur() {
    this.setData({ keyboardHeight: 0 })
  }
})
