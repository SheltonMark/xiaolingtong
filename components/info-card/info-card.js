const { normalizeImageUrl } = require('../../utils/image')

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
    extraImageCount: 0,
    /** 无配图时展示的首条视频地址 */
    cardVideoUrl: ''
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
      const item = this.data.item || {}
      const images = item.images || []
      const max = this.data.maxImages
      let cardImages = []
      let extraImageCount = 0
      if (Array.isArray(images) && images.length > 0) {
        cardImages = images.slice(0, max)
        extraImageCount = Math.max(0, images.length - max)
      }
      const videosRaw = item.videos || []
      const videos = Array.isArray(videosRaw)
        ? videosRaw.map((v) => normalizeImageUrl(String(v || '').trim())).filter(Boolean)
        : []
      const cardVideoUrl = cardImages.length === 0 && videos.length > 0 ? videos[0] : ''
      this.setData({ cardImages, extraImageCount, cardVideoUrl })
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
    onTapContact() {
      this.triggerEvent('contact', { id: this.data.item.id })
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
    },

    /** 阻止点击视频区域冒泡到卡片跳转 */
    onVideoAreaCatch() {}
  }
})
