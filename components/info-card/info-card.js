Component({
  properties: {
    item: { type: Object, value: {} },
    showContact: { type: Boolean, value: true }
  },
  data: {
    displayName: ''
  },
  lifetimes: {
    attached() {
      this.updateDisplayName()
    },
    ready() {
      // 页面显示时也更新一次
      this.updateDisplayName()
    }
  },
  pageLifetimes: {
    show() {
      // 页面显示时更新显示名称
      this.updateDisplayName()
    }
  },
  observers: {
    'item.companyName': function() {
      this.updateDisplayName()
    },
    'item': function() {
      this.updateDisplayName()
    }
  },
  methods: {
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
      this.triggerEvent('tap', { id: this.data.item.id })
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
