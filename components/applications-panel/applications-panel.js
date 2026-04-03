Component({
  properties: {
    manageJob: { type: Object, value: {} },
    manageSummary: { type: Object, value: {} },
    applicantTabs: { type: Array, value: [] },
    applicantFilter: { type: String, value: 'all' },
    filteredApplicants: { type: Array, value: [] }
  },

  methods: {
    onFilterChange(e) {
      this.triggerEvent('filterchange', { key: e.currentTarget.dataset.key })
    },

    onAccept(e) {
      this.triggerEvent('accept', { id: e.currentTarget.dataset.id })
    },

    onReject(e) {
      this.triggerEvent('reject', { id: e.currentTarget.dataset.id })
    },

    onEarlyFinish(e) {
      this.triggerEvent('earlyfinish', { id: e.currentTarget.dataset.id })
    }
  }
})
