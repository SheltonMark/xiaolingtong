const { get, post } = require('../../utils/request')

Page({
  data: {
    userInfo: {},
    avatarUrl: '',
    nickname: '',
    isMember: false,
    dailyFreeViews: 5,
    selectedIndex: 0,
    plans: [
      { id: 1, name: '月度会员', desc: '适合短期采购需求', price: '99', original: '199', unit: '月', tag: '', tagColor: '', days: 30 },
      { id: 2, name: '季度会员', desc: '平均每月仅¥79', price: '238', original: '597', unit: '季', tag: '推荐', tagColor: '#F97316', days: 90 },
      { id: 3, name: '年度会员', desc: '平均每月仅¥66，最划算', price: '799', original: '2,388', unit: '年', tag: '省¥1400', tagColor: '#F43F5E', days: 365 }
    ]
  },

  onLoad() {
    this._loadUserInfo()
    this._loadConfig()
  },

  _loadUserInfo() {
    const app = getApp()
    const user = app.globalData.userInfo || {}
    const avatarUrl = user.avatarUrl || app.globalData.avatarUrl || ''
    const nickname = user.nickname || user.companyName || ''
    const isMember = !!(user.isMember && user.memberExpireAt && new Date(user.memberExpireAt) > new Date())
    this.setData({
      userInfo: user,
      avatarUrl,
      nickname,
      isMember,
      avatarText: (nickname || '用').substring(0, 1)
    })
  },

  _loadConfig() {
    get('/ads/pricing').then(res => {
      const d = res.data || res
      if (d.dailyFreeViews) {
        this.setData({ dailyFreeViews: d.dailyFreeViews })
      }
    }).catch(() => {})
  },

  onSelect(e) { this.setData({ selectedIndex: Number(e.currentTarget.dataset.index) }) },

  onPay() {
    const plan = this.data.plans[this.data.selectedIndex]
    const price = Number(plan.price.replace(',', ''))
    wx.showModal({
      title: '开通' + plan.name,
      content: '支付 ¥' + plan.price + '/' + plan.unit,
      success: (res) => {
        if (!res.confirm) return
        post('/membership/subscribe', {
          planName: plan.name, price: price, durationDays: plan.days
        }).then((res) => {
          const payData = res.data || res
          if (payData.prepay_id || payData.package) {
            wx.requestPayment({
              timeStamp: payData.timeStamp,
              nonceStr: payData.nonceStr,
              package: payData.package,
              signType: payData.signType || 'RSA',
              paySign: payData.paySign,
              success: () => {
                wx.showToast({ title: '开通成功', icon: 'success' })
                getApp().globalData.isMember = true
                this.setData({ isMember: true })
              },
              fail() { wx.showToast({ title: '支付取消', icon: 'none' }) }
            })
          }
        }).catch(() => {})
      }
    })
  }
})