const { get } = require('../../utils/request')

Page({
  data: {
    content: '',
    loading: true
  },
  onLoad() {
    get('/config/agreements/privacy_policy').then(res => {
      this.setData({
        content: (res.data && res.data.content) || res.content || '',
        loading: false
      })
    }).catch(() => {
      this.setData({ loading: false })
    })
  }
})
