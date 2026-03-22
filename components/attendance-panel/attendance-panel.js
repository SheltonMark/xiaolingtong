Component({
  properties: {
    attendance: { type: Object, value: null },
    role: { type: String, value: 'enterprise' },
    viewOnly: { type: Boolean, value: false }
  },

  methods: {
    onConfirm() {
      this.triggerEvent('confirm')
    },

    onDispute() {
      this.triggerEvent('dispute')
    },

    onPreviewPhotos() {
      this.triggerEvent('previewphotos')
    }
  }
})
