const { get, post } = require('../../utils/request')
const { normalizeImageUrl, normalizeImageList } = require('../../utils/image')

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
    contactInfo: {},
    isOwner: false,
    isUnlocked: false
  },

  onLoad(options) {
    if (options.id) {
      this.loadDetail(options.id)
      this.loadFavStatus(options.id)
    }
  },

  onShow() {
    // 重新加载收藏状态
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const options = currentPage.options
    if (options && options.id) {
      this.loadFavStatus(options.id)
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

  parseBool(value) {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value === 1
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      return normalized === 'true' || normalized === '1' || normalized === 'yes'
    }
    return false
  },

  resolveEnterpriseVerified(raw) {
    const certStatus = this.normalizeText(
      raw.certStatus
      || (raw.publisher && raw.publisher.certStatus)
      || (raw.user && raw.user.certStatus)
    ).toLowerCase()
    if (certStatus) return certStatus === 'approved'

    if (raw.enterpriseVerified !== undefined) return this.parseBool(raw.enterpriseVerified)
    if (raw.verified !== undefined) return this.parseBool(raw.verified)
    if (raw.isVerified !== undefined) return this.parseBool(raw.isVerified)
    if (raw.publisherVerified !== undefined) return this.parseBool(raw.publisherVerified)
    return false
  },

  getCurrentUserId() {
    const app = getApp()
    const storageUser = wx.getStorageSync('userInfo') || {}
    const currentUserId = app.globalData.userId
      || (app.globalData.userInfo && app.globalData.userInfo.id)
      || storageUser.id
      || wx.getStorageSync('userId')
      || 0
    return Number(currentUserId) || 0
  },

  getOwnerUserId(source) {
    if (!source) return 0
    return Number(source.userId || (source.user && source.user.id) || 0)
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
    const enterpriseVerified = this.resolveEnterpriseVerified(raw)
    return {
      ...raw,
      images: normalizeImageList(raw.images),
      typeText: TYPE_TEXT_MAP[raw.type] || '供需信息',
      publishTime: this.formatDate(raw.createdAt),
      expireTime: raw.expireAt ? this.formatDate(raw.expireAt) : '长期有效',
      fields,
      desc: this.normalizeText(raw.content),
      avatarUrl: normalizeImageUrl((raw.user && raw.user.avatarUrl) || ''),
      avatarText,
      companyName: companyName || '企业用户',
      certText: enterpriseVerified ? '已认证' : '未认证',
      industry: raw.industry || '未分类',
      postCount: (raw.user && raw.user.postCount) || raw.postCount || '--'
    }
  },

  loadDetail(id) {
    get('/posts/' + id).then(res => {
      const data = res.data || {}
      const detail = this.formatDetail(data)

      const currentUserId = this.getCurrentUserId()
      const ownerUserId = this.getOwnerUserId(data)
      const isOwner = !!(currentUserId && ownerUserId && currentUserId === ownerUserId)
      const contactUnlocked = !!data.contactUnlocked
      const isUnlocked = isOwner || contactUnlocked
      const contactInfo = {
        name: data.contactName || '',
        phone: data.contactPhone || '',
        wechat: data.contactWechat || ''
      }

      this.setData({ detail, contactUnlocked, contactInfo, isOwner, isUnlocked })
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

  onContactAction() {
    if (this.data.isOwner) {
      wx.showToast({ title: '无需获取自己的联系方式', icon: 'none' })
      return
    }

    if (this.data.isUnlocked) {
      this.onShowContact()
      return
    }

    this.onUnlockContact()
  },

  onUnlockContact() {
    const postId = this.data.detail.id
    if (!postId) {
      wx.showToast({ title: '信息不存在', icon: 'none' })
      return
    }

    if (this.data.isOwner) {
      wx.showToast({ title: '无需获取自己的联系方式', icon: 'none' })
      return
    }

    if (this.data.isUnlocked) {
      this.onShowContact()
      return
    }

    // 先获取解锁成本预览
    wx.showLoading({ title: '加载中...' })
    get('/posts/' + postId + '/unlock-preview').then((response) => {
      wx.hideLoading()
      const data = response.data || response

      // 如果已经解锁过了
      if (data.alreadyUnlocked) {
        wx.showToast({ title: '已解锁，无需重复解锁', icon: 'none' })
        this.loadDetail(postId) // 刷新数据
        return
      }

      const cost = data.cost || 0
      const baseCost = data.baseCost || 10
      const isMember = data.isMember || false
      const isFree = data.isFree || false
      const freeRemaining = data.freeRemaining || 0
      const beanBalance = data.beanBalance || 0
      const sufficient = data.sufficient

      // 会员免费提示
      if (isMember && isFree) {
        wx.showModal({
          title: '会员免费查看',
          content: `会员专享：今日还有 ${freeRemaining} 次免费查看机会，确认使用？`,
          confirmText: '确认',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) this._doUnlock()
          }
        })
        return
      }

      // 会员折扣提示
      if (isMember && !isFree) {
        wx.showModal({
          title: '会员折扣',
          content: `会员专享5折优惠：需要 ${cost} 灵豆（原价 ${baseCost} 灵豆），当前余额 ${beanBalance} 灵豆，确认解锁？`,
          confirmText: '解锁',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) this._doUnlock()
          }
        })
        return
      }

      // 非会员检查灵豆
      if (!sufficient) {
        wx.showModal({
          title: '灵豆不足',
          content: `当前灵豆余额为 ${beanBalance}，需要 ${cost} 灵豆才能解锁联系方式。`,
          confirmText: '去充值',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({ url: '/pages/bean-recharge/bean-recharge' })
            }
          }
        })
        return
      }

      // 非会员确认解锁
      wx.showModal({
        title: '解锁联系方式',
        content: `需要耗费 ${cost} 灵豆进行解锁，当前余额 ${beanBalance} 灵豆，确认解锁？`,
        confirmText: '解锁',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) this._doUnlock()
        }
      })
    }).catch((err) => {
      wx.hideLoading()
      wx.showToast({ title: err.message || '获取解锁信息失败', icon: 'none' })
    })
  },

  _doUnlock() {
    const app = getApp()
    wx.showLoading({ title: '解锁中...' })
    post('/posts/' + this.data.detail.id + '/unlock').then((response) => {
      wx.hideLoading()
      const data = response.data || response
      if (data.success === false) {
        wx.showToast({ title: data.message || '解锁失败', icon: 'none' })
        return
      }
      // 更新灵豆余额
      if (data.beanBalance !== undefined) {
        app.globalData.beanBalance = data.beanBalance
      }
      const cost = data.cost || 0
      const msg = cost === 0 ? '免费解锁成功' : `解锁成功，已扣 ${cost} 灵豆`
      wx.showToast({ title: msg, icon: 'success' })
      this.loadDetail(this.data.detail.id)
    }).catch((err) => {
      wx.hideLoading()
      wx.showToast({ title: err.message || '解锁失败', icon: 'none' })
    })
  },

  onShowContact() {
    const contactInfo = this.data.contactInfo || {}
    const wechat = contactInfo.wechat || ''
    const phone = contactInfo.phone || ''

    if (!wechat && !phone) {
      wx.showToast({ title: '发布者未留联系方式', icon: 'none' })
      return
    }

    // 如果两者都有，让用户选择
    if (wechat && phone) {
      wx.showActionSheet({
        itemList: ['查看微信号', '拨打电话'],
        success: (res) => {
          if (res.tapIndex === 0) {
            // 查看微信号
            wx.showModal({
              title: '微信号',
              content: wechat,
              showCancel: true,
              cancelText: '关闭',
              confirmText: '复制',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.setClipboardData({ data: wechat })
                }
              }
            })
          } else if (res.tapIndex === 1) {
            // 拨打电话
            wx.makePhoneCall({ phoneNumber: phone, fail() {} })
          }
        }
      })
      return
    }

    // 只有微信
    if (wechat) {
      wx.showModal({
        title: '微信号',
        content: wechat,
        showCancel: true,
        cancelText: '关闭',
        confirmText: '复制',
        success: (res) => {
          if (res.confirm) {
            wx.setClipboardData({ data: wechat })
          }
        }
      })
      return
    }

    // 只有电话
    if (phone) {
      wx.makePhoneCall({ phoneNumber: phone, fail() {} })
    }
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
    const currentUserId = this.getCurrentUserId()
    const targetUserId = this.getOwnerUserId(detail)

    if (this.data.isOwner || (currentUserId && targetUserId && currentUserId === targetUserId)) {
      wx.showToast({ title: '不能和自己对话', icon: 'none' })
      return
    }

    if (!this.data.isUnlocked) {
      wx.showModal({
        title: '提示',
        content: '需要先解锁联系方式才能在线聊天',
        confirmText: '去解锁',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) this.onUnlockContact()
        }
      })
      return
    }

    if (!targetUserId) {
      wx.showToast({ title: '发布者信息缺失', icon: 'none' })
      return
    }
    const postId = Number(detail.id) || 0
    post('/conversations/with-user/' + targetUserId, { postId }).then(res => {
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

  loadFavStatus(id) {
    get('/favorites').then(res => {
      const list = res.data.list || res.data || []
      const isFav = list.some(item => item.targetType === 'post' && String(item.targetId) === String(id))
      this.setData({ isFav })
    }).catch(() => {})
  },

  onToggleFav() {
    const id = this.data.detail.id
    post('/favorites/toggle', { targetType: 'post', targetId: id }).then(() => {
      this.setData({ isFav: !this.data.isFav })
      wx.showToast({ title: this.data.isFav ? '已收藏' : '已取消', icon: 'success' })
    }).catch(() => {})
  }
})
