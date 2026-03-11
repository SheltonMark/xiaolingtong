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
    myPostNames: [],
    selectedPostIndex: 0,
    selectedPost: null,
    externalLink: '',
    isMember: false,
    actualPrice: 0
  },

  onLoad() {
    this._loadPricing()
    this._loadMyPosts()
    const app = getApp()
    const user = app.globalData.userInfo || {}
    const isMember = !!(user.isMember && user.memberExpireAt && new Date(user.memberExpireAt) > new Date())
    this.setData({ isMember })
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
      const totalPrice = unitPrice * this.data.days
      const actualPrice = this.data.isMember ? Math.round(totalPrice * 0.9 * 100) / 100 : totalPrice
      this.setData({ slots, unitPrice, totalPrice, actualPrice })
    }).catch(() => {
      const slots = [
        { name: '首页Banner广告', key: 'banner', price: 100 },
        { name: '信息流推荐位', key: 'feed', price: 50 }
      ]
      const totalPrice = 100 * this.data.days
      const actualPrice = this.data.isMember ? Math.round(totalPrice * 0.9 * 100) / 100 : totalPrice
      this.setData({ slots, unitPrice: 100, totalPrice, actualPrice })
    })
  },

  _loadMyPosts() {
    get('/posts/mine', { page: 1, pageSize: 50 }).then(res => {
      const d = res.data || res
      const list = d.list || d.items || d || []
      const myPosts = Array.isArray(list) ? list : []
      const myPostNames = myPosts.map(p => p.title || (p.content || '').substring(0, 20) || '信息#' + p.id)
      this.setData({ myPosts, myPostNames })
    }).catch(() => {})
  },

  onSlotChange(e) {
    const idx = Number(e.currentTarget.dataset.index)
    const price = this.data.slots[idx].price
    const totalPrice = price * this.data.days
    const actualPrice = this.data.isMember ? Math.round(totalPrice * 0.9 * 100) / 100 : totalPrice
    this.setData({ selectedSlot: idx, unitPrice: price, totalPrice, actualPrice })
  },

  onLinkChange(e) {
    this.setData({ linkType: Number(e.currentTarget.dataset.index), selectedPost: null, externalLink: '' })
  },

  onSelectPost(e) {
    const idx = e.detail.value
    const post = this.data.myPosts[idx]
    this.setData({ selectedPostIndex: idx, selectedPost: post || null })
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
      const totalPrice = days * this.data.unitPrice
      const actualPrice = this.data.isMember ? Math.round(totalPrice * 0.9 * 100) / 100 : totalPrice
      this.setData({ days, totalPrice, actualPrice })
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