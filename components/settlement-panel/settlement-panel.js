Component({
  properties: {
    settlementReady: { type: Boolean, value: false },
    job: { type: Object, value: {} },
    steps: { type: Array, value: [] },
    workers: { type: Array, value: [] },
    fees: { type: Object, value: {} },
    role: { type: String, value: 'enterprise' },
    viewOnly: { type: Boolean, value: false },
    currentWorkerSettlement: { type: Object, value: null }
  },

  methods: {
    onPay() {
      this.triggerEvent('pay')
    },

    onConfirmSettlement() {
      this.triggerEvent('confirmsettlement')
    },

    onRate() {
      this.triggerEvent('rate')
    }
  }
})
