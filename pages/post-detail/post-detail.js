const { get, post } = require('../../utils/request')

const TYPE_TEXT_MAP = {
  purchase: '采购需求',
  stock: '工厂库存',
  process: '代加工'
}

Page({
  data: {
    swiperCurrent: 0,
    isFav: false,
    detail: {},
    contactUnlocked: false,
    contactInfo: {}
  },

  onLoad(options) {
    if (options.id) {
      this.loadDetail(options.id)
    }
  },

  normalizeText(value) {
    if (value === undefined || value === null) return ''
    return String(value).trim()
  },

  formatDate(value) {
    const text = this.normalizeText(value)
    if (!text) return '--'
    return text.slice(0, 10)
  },

  maskCompanyName(name) {
    const trimmed = this.normalizeText(name)
    if (!trimmed) return ''
    if (trimmed.includes('公司')) return trimmed[0] + 'xx公司'
    return trimmed[0] + 'xx'
  },

  hasViewPermission() {
    const app = getApp()
    return !!(app.globalData.isMember || app.globalData.beanBalance > 0)
  },

  getDisplayCompanyName(rawName) {
    const name = this.normalizeText(rawName) || '企业用户'
    if (this.hasViewPermission()) return name
    return this.maskCompanyName(name)
  },

  pushDetailField(list, label, value, options = {}) {
    const text = this.normalizeText(value)
    if (!text) return
    list.push({
      label,
      value: text,
      highlight: !!options.highlight,
      bold: !!options.bold
    })
  },

  formatDetailFields(type, fields, detail) {
    const source = fields && typeof fields === 'object' && !Array.isArray(fields) ? fields : {}
    const list = []
    const budgetText = source.priceMin && source.priceMax
      ? `${source.priceMin}-${source.priceMax}元`
      : (source.priceMin ? `${source.priceMin}元起` : (source.priceMax ? `${source.priceMax}元以内` : ''))

    if (type === 'purchase') {
      this.pushDetailField(list, '物品名称', source.productName || detail.title, { bold: true })
      this.pushDetailField(list, '品类', detail.industry)
      this.pushDetailField(list, '规格参数', source.spec)
      this.pushDetailField(list, '采购数量', source.quantity ? `${source.quantity}个` : '')
      this.pushDetailField(list, '交货周期', source.deliveryDays)
      this.pushDetailField(list, '预算范围', budgetText, { highlight: true })
      this.pushDetailField(list, '质量要求', source.quality)
    } else if (type === 'stock') {
      this.pushDetailField(list, '物品名称', source.productName || detail.title, { bold: true })
      this.pushDetailField(list, '品类', detail.industry)
      this.pushDetailField(list, '规格参数', source.spec)
      this.pushDetailField(list, '库存数量', source.quantity ? `${source.quantity}个` : '')
      this.pushDetailField(list, '单价', source.price ? `${source.price}元` : '', { highlight: true })
      this.pushDetailField(list, '最小起订量', source.minOrder ? `${source.minOrder}个` : '')
    } else if (type === 'process') {
      this.pushDetailField(list, '加工类型', source.processType || detail.title, { bold: true })
      this.pushDetailField(list, '工艺说明', source.processDesc)
      this.pushDetailField(list, '产能', source.capacity ? `${source.capacity}件/天` : '')
      this.pushDetailField(list, '加工单价', source.price ? `${source.price}元/件` : '', { highlight: true })
      this.pushDetailField(list, '最小起订量', source.minOrder ? `${source.minOrder}个` : '')
      this.pushDetailField(list, '交货周期', source.deliveryDays)
    }

    if (!list.length) {
      Object.keys(source).forEach((key) => {
        this.pushDetailField(list, key, source[key])
      })
    }
    if (!list.length) {
      this.pushDetailField(list, '信息内容', detail.content)
    }
    return list
  },

  formatDetail(raw) {
    const companyNameRaw = raw.companyName || ''
    const companyName = this.getDisplayCompanyName(companyNameRaw)
    const hasCompanyName = !!this.normalizeText(companyNameRaw)
    const avatarText = hasCompanyName ? this.normalizeText(companyNameRaw).slice(0, 1) : '企'
    const fields = this.formatDetailFields(raw.type, raw.fields, raw)
    return {
      ...raw,
      images: Array.isArray(raw.images) ? raw.images : [],
      typeText: TYPE_TEXT_MAP[raw.type] || '供需信息',
      publishTime: this.formatDate(raw.createdAt),
      expireTime: raw.expireAt ? this.formatDate(raw.expireAt) : '长期有效',
      fields,
      desc: this.normalizeText(raw.content),
      avatarUrl: (raw.user && raw.user.avatarUrl) || '',
      avatarText,
      companyName: companyName || '企业用户',
      certText: raw.enterpriseVerified ? '已认证' : '未认证',
      industry: raw.industry || '未分类',
      postCount: (raw.user && raw.user.postCount) || raw.postCount || '--'
    }
  },

  loadDetail(id) {
    get('/posts/' + id).then(res => {
      const data = res.data || {}
      const detail = this.formatDetail(data)

      // 检查是否已解锁（根据是否有联系方式信息判断）
      const contactUnlocked = !!(data.contactPhone || data.contactWechat || data.contactName)
      const contactInfo = contactUnlocked ? {
        name: data.contactName || '',
        phone: data.contactPhone || '',
        wechat: data.contactWechat || ''
      } : {}

      this.setData({ detail, contactUnlocked, contactInfo })
    }).catch(() => {})
  },

  onSwiperChange(e) {
    this.setData({ swiperCurrent: e.detail.current })
  },

  onPreviewImage(e) {
    const urls = e.currentTarget.dataset.urls || this.data.detail.images || []
    if (!urls.length) return
    wx.previewImage({
      current: e.currentTarget.dataset.current || urls[0],
      urls
    })
  },

  onUnlockContact() {
    wx.showModal({
      title: '查看联系方式',
      content: '消耗10灵豆查看联系方式，确认？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '解锁中...' })
          post('/posts/' + this.data.detail.id + '/unlock').then((response) => {
            wx.hideLoading()
            // 检查是否成功扣费
            if (response.data && response.data.success === false) {
              wx.showToast({ title: response.data.message || '灵豆不足', icon: 'none' })
              return
            }
            wx.showToast({ title: '解锁成功，已扣10灵豆', icon: 'success' })
            // 更新全局灵豆余额
            const app = getApp()
            if (app.globalData.beanBalance !== undefined) {
              app.globalData.beanBalance -= 10
            }
            // 重新加载详情以获取联系方式
            this.loadDetail(this.data.detail.id)
          }).catch((err) => {
            wx.hideLoading()
            wx.showToast({ title: err.message || '解锁失败', icon: 'none' })
          })
        }
      }
    })
  },

  onCopyWechat() {
    const wechat = (this.data.contactInfo && this.data.contactInfo.wechat) || this.data.detail.contactWechat
    if (!wechat) {
      wx.showToast({ title: '暂无微信号', icon: 'none' })
      return
    }
    wx.setClipboardData({ data: wechat })
  },

  onCallPhone() {
    const phone = (this.data.contactInfo && this.data.contactInfo.phone) || this.data.detail.contactPhone
    if (!phone) {
      wx.showToast({ title: '暂无手机号', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: phone, fail() {} })
  },

  onChat() {
    const detail = this.data.detail || {}
    const targetUserId = detail.userId || (detail.user && detail.user.id)
    if (!targetUserId) {
      wx.showToast({ title: '发布者信息缺失', icon: 'none' })
      return
    }
    post('/conversations/with-user/' + targetUserId).then(res => {
      const conversationId = res.data && res.data.id
      if (!conversationId) {
        wx.showToast({ title: '会话创建失败', icon: 'none' })
        return
      }
      wx.navigateTo({ url: '/pages/chat/chat?id=' + conversationId })
    }).catch(() => {})
  },

  onShare() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] })
  },

  onReport() {
    wx.navigateTo({ url: '/pages/report/report?id=' + this.data.detail.id })
  },
  onToggleFav() {
    const id = this.data.detail.id
    post('/favorites/toggle', { targetType: 'post', targetId: id }).then(() => {
      this.setData({ isFav: !this.data.isFav })
      wx.showToast({ title: this.data.isFav ? '已收藏' : '已取消', icon: 'success' })
    }).catch(() => {})
  }
})
