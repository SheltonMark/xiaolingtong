const { get, post, upload } = require('../../utils/request')

Page({
  data: {
    selectedSlot: 0,
    linkType: 0,
    form: { startDate: '', endDate: '' },
    slots: [
      { name: '首页Banner广告', key: 'banner', price: 0 },
      { name: '信息流推荐位', key: 'feed', price: 0 }
    ],
    days: 7,
    unitPrice: 0,
    totalPrice: 0,
    adImage: '',
    myPosts: [],
    selectedPost: null,
    externalLink: ''
  },

  onLoad() {
    this._loadPricing()
    this._loadMyPosts()
  },

  _loadPricing() {
    get('/ads/pricing').then(res => {
      const d = res.data || res
      const bannerPrice = d.bannerPrice || 100
      const feedPrice = d.feedPrice || 50
      const slots = [
        { name: '首页Banner广告', key: 'banner', price: bannerPrice },
        { name: '信息流推荐位', key: 'feed', price: feedPrice }
      ]
      const unitPrice = slots[this.data.selectedSlot].price
      this.setData({ slots, unitPrice, totalPrice: unitPrice * this.data.days })
    }).catch(() => {
      const slots = [
        { name: '首页Banner广告', key: 'banner', price: 100 },
        { name: '信息流推荐位', key: 'feed', price: 50 }
      ]
      this.setData({ slots, unitPrice: 100, totalPrice: 100 * this.data.days })
    })
  },

  _loadMyPosts() {
    get('/posts/mine', { page: 1, pageSize: 50 }).then(res => {
      const d = res.data || res
      const list = d.list || d.items || d || []
      this.setData({ myPosts: Array.isArray(list) ? list : [] })
    }).catch(() => {})
  },

  onSlotChange(e) {
    const idx = Number(e.currentTarget.dataset.index)
    const price = this.data.slots[idx].price
    this.setData({ selectedSlot: idx, unitPrice: price, totalPrice: price * this.data.days })
  },

  onLinkChange(e) {
    this.setData({ linkType: Number(e.currentTarget.dataset.index), selectedPost: null, externalLink: '' })
  },

  onSelectPost() {
    const posts = this.data.myPosts
    if (!posts.length) {
      wx.showToast({ title: '暂无已发布的信息', icon: 'none' })
      return
    }
    const names = posts.map(p => p.title || (p.content || '').substring(0, 20) || '信息#' + p.id)
    wx.showActionSheet({
      itemList: names,
      success: (res) => { this.setData({ selectedPost: posts[res.tapIndex] }) }
    })
  },

  onExternalLinkInput(e) {
    this.setData({ externalLink: e.detail.value })
  },

  onStartDateChange(e) {
    this.setData({ 'form.startDate': e.detail.value })
    this._calcDays()
  },
  onEndDateChange(e) {
    this.setData({ 'form.endDate': e.detail.value })
    this._calcDays()
  },
  _calcDays() {
    const { startDate, endDate } = this.data.form
    if (startDate && endDate) {
      const d = Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000) + 1
      const days = d > 0 ? d : 0
      this.setData({ days, totalPrice: days * this.data.unitPrice })
    }
  },

  onUploadAd() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: (res) => {
      const path = res.tempFiles[0].tempFilePath
      upload(path).then(r => this.setData({ adImage: r.data.url || r.data }))
        .catch(() => this.setData({ adImage: path }))
    }})
  },
  onDeleteAd() { this.setData({ adImage: '' }) },

  _buildLink() {
    if (this.data.linkType === 0) {
      const p = this.data.selectedPost
      return p ? `/pages/post-detail/post-detail?id=${p.id}` : ''
    }
    return this.data.externalLink || ''
  },

  onPay() {
    if (!this.data.adImage) {
      return wx.showToast({ title: '请上传广告素材', icon: 'none' })
    }
    if (!this.data.form.startDate || !this.data.form.endDate) {
      return wx.showToast({ title: '请选择投放日期', icon: 'none' })
    }
    if (this.data.linkType === 0 && !this.data.selectedPost) {
      return wx.showToast({ title: '请选择跳转的发布信息', icon: 'none' })
    }
    if (this.data.linkType === 1 && !this.data.externalLink) {
      return wx.showToast({ title: '请输入外部链接地址', icon: 'none' })
    }

    const slot = this.data.slots[this.data.selectedSlot]
    const link = this._buildLink()

    wx.showModal({
      title: '确认支付',
      content: '支付 ¥' + this.data.totalPrice + '，投放' + this.data.days + '天',
      success: (modalRes) => {
        if (!modalRes.confirm) return
        post('/ads/purchase', {
          slot: slot.key,
          title: slot.name,
          imageUrl: this.data.adImage,
          link: link,
          linkType: this.data.linkType === 0 ? 'internal' : 'external',
          durationDays: this.data.days,
          price: this.data.totalPrice
        }).then((res) => {
          const payData = res.data || res
          if (payData.prepay_id || payData.package) {
            wx.requestPayment({
              timeStamp: payData.timeStamp,
              nonceStr: payData.nonceStr,
              package: payData.package,
              signType: payData.signType || 'RSA',
              paySign: payData.paySign,
              success() {
                wx.showToast({ title: '购买成功', icon: 'success' })
                setTimeout(() => wx.navigateBack(), 1500)
              },
              fail() { wx.showToast({ title: '支付取消', icon: 'none' }) }
            })
          }
        }).catch(() => {})
      }
    })
  }
})