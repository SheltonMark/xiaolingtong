Component({
  properties: {
    item: { type: Object, value: {} },
    showContact: { type: Boolean, value: true }
  },
  methods: {
    onTapCard() {
      this.triggerEvent('tap', { id: this.data.item.id })
    },
    onTapWechat() {
      this.triggerEvent('wechat', { id: this.data.item.id })
    },
    onTapPhone() {
      this.triggerEvent('phone', { id: this.data.item.id })
    },
    onTapShare() {
      this.triggerEvent('share', { id: this.data.item.id })
    },
    onTapReport() {
      this.triggerEvent('report', { id: this.data.item.id })
    }
  }
})
