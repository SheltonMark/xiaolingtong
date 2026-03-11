const { get, post } = require('../../utils/request')

const PLAN_META_MAP = {
  monthly: { desc: '适合短期采购需求', original: '199', tag: '', tagColor: '' },
  quarterly: { desc: '平均每月更划算', original: '597', tag: '推荐', tagColor: '#F97316' },
  yearly: { desc: '平均每月最低，最划算', original: '2,388', tag: '省更多', tagColor: '#F43F5E' }
}

Page({
  data: {
    userInfo: {},
    avatarUrl: '',
    nickname: '',
    isMember: false,
    dailyFreeViews: 5,
    selectedIndex: 0,
    plans: [
      { id: 1, key: 'monthly', name: '月度会员', desc: '适合短期采购需求', price: '99', original: '199', unit: '月', tag: '', tagColor: '', days: 30 },
      { id: 2, key: 'quarterly', name: '季度会员', desc: '平均每月更划算', price: '238', original: '597', unit: '季', tag: '推荐', tagColor: '#F97316', days: 90 },
      { id: 3, key: 'yearly', name: '年度会员', desc: '平均每月最低，最划算', price: '799', original: '2,388', unit: '年', tag: '省更多', tagColor: '#F43F5E', days: 365 }
    ]
  },

  onLoad() {
    this._loadUserInfo()
    this._loadPlans()
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
      avatarText: (nickname || '用户').substring(0, 1)
    })
  },

  _formatPrice(value) {
    const n = Number(value || 0)
    if (!Number.isFinite(n)) return '0'
    return Number.isInteger(n) ? String(n) : n.toFixed(2)
  },

  _buildPlanCards(list) {
    return (Array.isArray(list) ? list : []).map((plan, index) => {
      const key = plan.key || ''
      const meta = PLAN_META_MAP[key] || {}
      return {
        id: index + 1,
        key,
        name: plan.name || '会员套餐',
        desc: meta.desc || '',
        price: this._formatPrice(plan.price),
        original: meta.original || '',
        unit: plan.unit || '',
        tag: meta.tag || '',
        tagColor: meta.tagColor || '',
        days: Number(plan.durationDays || 0)
      }
    })
  },

  _loadPlans() {
    get('/membership/plans').then(res => {
      const d = res.data || res
      const cards = this._buildPlanCards(d.list || [])
      const selectedIndex = cards.length
        ? Math.min(this.data.selectedIndex, cards.length - 1)
        : 0
      this.setData({
        plans: cards.length ? cards : this.data.plans,
        selectedIndex,
        dailyFreeViews: Number(d.dailyFreeViews || this.data.dailyFreeViews)
      })
    }).catch(() => {})
  },

  onSelect(e) {
    this.setData({ selectedIndex: Number(e.currentTarget.dataset.index) })
  },

  onPay() {
    const plan = this.data.plans[this.data.selectedIndex]
    if (!plan || !plan.key) {
      wx.showToast({ title: '套餐信息加载中', icon: 'none' })
      return
    }
    wx.showModal({
      title: '开通' + plan.name,
      content: '支付 ¥' + plan.price + '/' + plan.unit,
      success: (res) => {
        if (!res.confirm) return
        post('/membership/subscribe', { planKey: plan.key }).then((res) => {
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
              fail() {
                wx.showToast({ title: '支付取消', icon: 'none' })
              }
            })
          }
        }).catch(() => {})
      }
    })
  },

  onViewMembershipAgreement() {
    wx.navigateTo({ url: '/pages/member-agreement/member-agreement' })
  }
})
