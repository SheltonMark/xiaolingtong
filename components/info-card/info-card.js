Component({
  properties: {
    item: { type: Object, value: {} },
    showContact: { type: Boolean, value: true },
    showDistance: { type: Boolean, value: false },
    maxImages: { type: Number, value: 2 }
  },
  data: {
    displayName: '',
    cardImages: [],
    extraImageCount: 0
  },
  lifetimes: {
    attached() {
      this.updateDisplayName()
      this.updateCardImages()
    },
    ready() {
      this.updateDisplayName()
    }
  },
  pageLifetimes: {
    show() {
      this.updateDisplayName()
    }
  },
  observers: {
    'item.companyName': function() {
      this.updateDisplayName()
    },
    'item': function() {
      this.updateDisplayName()
      this.updateCardImages()
    }
  },
  methods: {
    updateCardImages() {
      const images = this.data.item.images || []
      const max = this.data.maxImages
      if (!Array.isArray(images) || images.length === 0) {
        this.setData({ cardImages: [], extraImageCount: 0 })
        return
      }
      const cardImages = images.slice(0, max)
      const extraImageCount = Math.max(0, images.length - max)
      this.setData({ cardImages, extraImageCount })
    },

    maskCompanyName(name) {
      const trimmed = String(name || '').trim()
      if (!trimmed) return ''
      if (trimmed.includes('公司')) return trimmed[0] + 'xx公司'
      return trimmed[0] + 'xx'
    },

    updateDisplayName() {
      const app = getApp()
      const name = this.data.item.companyName || ''
      if (!name) { this.setData({ displayName: '' }); return }
      const isMember = app.globalData.isMember
      const hasBeans = app.globalData.beanBalance > 0
      if (isMember || hasBeans) {
        this.setData({ displayName: name })
      } else {
        this.setData({ displayName: this.maskCompanyName(name) })
      }
    },
    onTapCard() {
      // 勿用事件名 tap：与原生 tap 冲突，父级 bind:tap 会先收到无 detail.id 的冒泡，导致 id=undefined
      this.triggerEvent('cardtap', { id: this.data.item.id })
    },
    onTapWechat() {
      this.triggerEvent('wechat', { id: this.data.item.id })
    },
    onTapPhone() {
      this.triggerEvent('phone', { id: this.data.item.id })
    },
    onTapChat() {
      this.triggerEvent('chat', { id: this.data.item.id })
    },
    onTapShare() {
      this.triggerEvent('share', { id: this.data.item.id })
    },
    onTapReport() {
      this.triggerEvent('report', { id: this.data.item.id })
    },
    onPreviewImage(e) {
      wx.previewImage({ current: e.currentTarget.dataset.current, urls: e.currentTarget.dataset.urls })
    }
  }
})
