const { get, post } = require('../../utils/request')
const { normalizeImageUrl, normalizeImageList } = require('../../utils/image')
const { calculateDistanceForList, getUserLocation } = require('../../utils/distance')
const auth = require('../../utils/auth')

/** 扫帖子海报小程序码时 scene 为 p=帖子ID */
function parsePostIdFromScene(raw) {
  if (raw == null || raw === '') return ''
  try {
    const decoded = decodeURIComponent(String(raw))
    const pairs = decoded.split('&')
    for (let i = 0; i < pairs.length; i++) {
      const kv = pairs[i].split('=')
      if (kv[0] === 'p' && kv[1]) {
        return String(decodeURIComponent(kv[1])).trim()
      }
    }
  } catch (e) {
    /* ignore */
  }
  return ''
}

const TYPE_TEXT_MAP = {
  purchase: '采购需求',
  stock: '工厂库存',
  process: '代加工'
}

const PROCESS_MODE_LABEL_MAP = {
  seeking: '找代加工',
  offering: '承接加工'
}

Page({
  data: {
    swiperCurrent: 0,
    isFav: false,
    detail: {},
    contactUnlocked: false,
    contactInfo: {},
    isOwner: false,
    isUnlocked: false,
    showBeanShortageModal: false,
    beanShortage: { need: 0, balance: 0 },
    wechatCardVisible: false,
    wechatCard: {
      wechatId: '',
      wechatQrImage: ''
    },
    showPoster: false,
    posterImage: ''
  },

  onLoad(options) {
    let id = options.id
    if (!id && options.scene) {
      id = parsePostIdFromScene(options.scene)
    }
    if (id) {
      this.loadDetail(id)
      this.loadFavStatus(id)
    }
  },

  onShow() {
    // 重新加载收藏状态
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const options = currentPage.options || {}
    let id = options.id
    if (!id && options.scene) {
      id = parsePostIdFromScene(options.scene)
    }
    if (id) {
      this.loadFavStatus(id)
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

  getProcessModeLabel(raw) {
    const direct = this.normalizeText(raw && raw.processModeLabel)
    if (direct) return direct
    const processMode = this.normalizeText(
      (raw && raw.processMode)
      || (raw && raw.fields && raw.fields.processMode)
    ).toLowerCase()
    return PROCESS_MODE_LABEL_MAP[processMode] || ''
  },

  normalizeProcessContent(raw) {
    const content = this.normalizeText(raw && raw.content)
    const modeLabel = this.getProcessModeLabel(raw)
    if (!content || !modeLabel) return content
    const duplicatedPrefix = `承接${modeLabel}`
    return content.startsWith(duplicatedPrefix)
      ? `${modeLabel}${content.slice(duplicatedPrefix.length)}`
      : content
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
      this.pushDetailField(list, '库存数量', source.quantity ? `${source.quantity}个` : '')
      this.pushDetailField(list, '价格', source.price ? `${source.price}元` : '', { highlight: true })
      this.pushDetailField(list, '库存地址', detail.address || detail.location)
    } else if (type === 'process') {
      this.pushDetailField(list, '加工类型', this.getProcessModeLabel(detail) || source.processType || detail.title, { bold: true })
      this.pushDetailField(list, '品类', detail.industry)
      this.pushDetailField(list, '地址', detail.address || detail.location)
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
    const processModeLabel = this.getProcessModeLabel(raw)
    return {
      ...raw,
      images: normalizeImageList(raw.images),
      typeText: TYPE_TEXT_MAP[raw.type] || '供需信息',
      processModeLabel,
      publishTime: this.formatDate(raw.createdAt),
      expireTime: raw.expireAt ? this.formatDate(raw.expireAt) : '长期有效',
      fields,
      desc: raw.type === 'process' ? this.normalizeProcessContent(raw) : this.normalizeText(raw.content),
      avatarUrl: normalizeImageUrl((raw.user && raw.user.avatarUrl) || ''),
      avatarText,
      companyName: companyName || '企业用户',
      certText: enterpriseVerified ? '已认证' : '未认证',
      industry: raw.industry || '未分类',
      postCount: (raw.user && raw.user.postCount) || raw.postCount || '--'
    }
  },

  loadDetail(id) {
    return get('/posts/' + id).then(res => {
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
        wechat: data.contactWechat || '',
        wechatQrImage: data.contactWechatQr || ''
      }

      this.setData({
        detail,
        contactUnlocked,
        contactInfo,
        isOwner,
        isUnlocked,
        wechatCardVisible: false
      })

      if (detail.lat || detail.lng || detail.address || detail.location) {
        getUserLocation()
          .then(userLocation => calculateDistanceForList(userLocation, [detail]))
          .then(listWithDistance => {
            const item = Array.isArray(listWithDistance) ? listWithDistance[0] : null
            if (!item || !item.distanceText) return
            this.setData({
              'detail.distance': item.distance,
              'detail.distanceText': item.distanceText
            })
          })
          .catch(() => {})
      }
    }).catch(() => {})
  },

  onNavigate() {
    const { detail } = this.data
    const lat = Number(detail.lat)
    const lng = Number(detail.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (!lat && !lng)) {
      wx.showToast({ title: '暂无导航坐标', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/navigation/navigation?lat=${lat}&lng=${lng}&name=${encodeURIComponent(detail.title || '目的地')}&address=${encodeURIComponent(detail.address || detail.location || '')}`
    })
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
    if (!auth.isLoggedIn()) { auth.goLogin(); return }
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
        this.loadDetail(postId).then(() => {
          setTimeout(() => this.onShowContact(), 200)
        })
        return
      }

      const cost = data.cost || 0
      const baseCost = data.baseCost || 10
      const isMember = data.isMember || false
      const isFree = data.isFree || false
      const freeRemaining = data.freeRemaining || 0
      const beanBalance = data.beanBalance || 0
      const sufficient = data.sufficient

      var disclaimer = '\n\n免责声明：联系方式由发布者提供，平台不对其真实性负责，请注意交易安全。'

      // 会员免费提示
      if (isMember && isFree) {
        wx.showModal({
          title: '会员免费查看',
          content: `会员专享：今日还有 ${freeRemaining} 次免费查看机会，确认使用？` + disclaimer,
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
          content: `会员专享5折优惠：需要 ${cost} 灵豆（原价 ${baseCost} 灵豆），当前余额 ${beanBalance} 灵豆，确认解锁？` + disclaimer,
          confirmText: '解锁',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) this._doUnlock()
          }
        })
        return
      }

      // 非会员灵豆不足
      if (!sufficient) {
        this.setData({
          showBeanShortageModal: true,
          beanShortage: { need: cost, balance: beanBalance }
        })
        return
      }

      // 非会员确认解锁
      wx.showModal({
        title: '解锁联系方式',
        content: `需要耗费 ${cost} 灵豆进行解锁，当前余额 ${beanBalance} 灵豆，确认解锁？` + disclaimer,
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

  onCloseBeanShortage() {
    this.setData({ showBeanShortageModal: false })
  },

  onBeanShortageAction(e) {
    const action = e.currentTarget.dataset.action
    this.setData({ showBeanShortageModal: false })
    if (action === 'recharge') {
      wx.navigateTo({ url: '/pages/bean-recharge/bean-recharge' })
    } else if (action === 'invite') {
      wx.navigateTo({ url: '/pages/my-invites/my-invites' })
    }
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
      this.loadDetail(this.data.detail.id).then(() => {
        setTimeout(() => this.onShowContact(), 200)
      })
    }).catch((err) => {
      wx.hideLoading()
      wx.showToast({ title: err.message || '解锁失败', icon: 'none' })
    })
  },

  openWechatCard() {
    const contactInfo = this.data.contactInfo || {}
    const detail = this.data.detail || {}
    const wechatId = (contactInfo.wechat || detail.contactWechat || '').trim()
    const wechatQrImage = (contactInfo.wechatQrImage || detail.contactWechatQr || '').trim()
    const phone = (contactInfo.phone || detail.contactPhone || '').trim()

    if (!wechatId && !wechatQrImage) {
      if (phone) {
        wx.showModal({
          title: '提示',
          content: '发布者未留微信，可在「立即联系」中选择拨打电话联系对方',
          showCancel: false,
          confirmText: '知道了'
        })
      } else {
        wx.showToast({ title: '发布者未留微信信息', icon: 'none' })
      }
      return
    }

    this.setData({
      wechatCardVisible: true,
      wechatCard: { wechatId, wechatQrImage }
    })
  },

  onCloseWechatCard() {
    this.setData({ wechatCardVisible: false })
  },

  onShowContact() {
    const contactInfo = this.data.contactInfo || {}
    const detail = this.data.detail || {}
    const wechat = contactInfo.wechat || detail.contactWechat || ''
    const wechatQrImage = contactInfo.wechatQrImage || detail.contactWechatQr || ''
    const phone = contactInfo.phone || detail.contactPhone || ''
    const hasWechat = !!(wechat || wechatQrImage)

    if (!hasWechat && !phone) {
      wx.showToast({ title: '发布者未留联系方式', icon: 'none' })
      return
    }

    if (hasWechat && phone) {
      wx.showActionSheet({
        itemList: ['查看微信', '拨打电话'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.openWechatCard()
          } else if (res.tapIndex === 1) {
            wx.makePhoneCall({ phoneNumber: phone, fail() {} })
          }
        }
      })
      return
    }

    if (hasWechat) {
      this.openWechatCard()
      return
    }

    if (phone) {
      wx.makePhoneCall({ phoneNumber: phone, fail() {} })
    }
  },

  onCopyWechat() {
    const detail = this.data.detail || {}
    const contactInfo = this.data.contactInfo || {}
    const wechat = (contactInfo.wechat || detail.contactWechat || '').trim()
    const phone = (contactInfo.phone || detail.contactPhone || '').trim()
    if (!wechat) {
      if (phone) {
        wx.showModal({
          title: '提示',
          content: '发布者未留微信号，可拨打电话联系对方',
          showCancel: false,
          confirmText: '知道了'
        })
      } else {
        wx.showToast({ title: '暂无微信号', icon: 'none' })
      }
      return
    }
    wx.setClipboardData({ data: wechat })
  },

  onCallPhone() {
    const detail = this.data.detail || {}
    const contactInfo = this.data.contactInfo || {}
    const phone = (contactInfo.phone || detail.contactPhone || '').trim()
    const hasWechat = !!(contactInfo.wechat || detail.contactWechat || '').trim() ||
      !!(contactInfo.wechatQrImage || detail.contactWechatQr || '').trim()
    if (!phone) {
      if (hasWechat) {
        wx.showModal({
          title: '提示',
          content: '发布者未留电话，可查看微信联系对方',
          showCancel: false,
          confirmText: '知道了'
        })
      } else {
        wx.showToast({ title: '暂无手机号', icon: 'none' })
      }
      return
    }
    wx.makePhoneCall({ phoneNumber: phone, fail() {} })
  },

  onChat() {
    if (!auth.isLoggedIn()) { auth.goLogin(); return }
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
    wx.navigateTo({ url: '/pages/report/report?id=' + this.data.detail.id + '&targetType=post' })
  },

  loadFavStatus(id) {
    console.log('[post-detail] loadFavStatus called with id:', id)
    get('/favorites').then(res => {
      const list = res.data.list || res.data || []
      console.log('[post-detail] favorites list:', list)
      console.log('[post-detail] checking for post id:', id)
      const isFav = list.some(item => {
        // 后端返回的是完整对象，id字段就是targetId
        const match = item.targetType === 'post' && String(item.id) === String(id)
        console.log('[post-detail] checking item:', item, 'match:', match)
        return match
      })
      console.log('[post-detail] isFav result:', isFav)
      this.setData({ isFav })
    }).catch(err => {
      console.error('[post-detail] loadFavStatus error:', err)
    })
  },

  onShareAppMessage() {
    const detail = this.data.detail || {}
    const typeText = TYPE_TEXT_MAP[detail.type] || '供需信息'
    var title = detail.title || (detail.content ? String(detail.content).slice(0, 28) : '') || typeText
    var myId = getApp().globalData.userInfo && getApp().globalData.userInfo.id
    if (myId && String(detail.userId) !== String(myId)) {
      if (detail.type === 'stock') {
        title = '库存处理｜' + title + '｜有需要的吗？'
      } else if (detail.type === 'process') {
        title = '代加工服务｜' + title + '｜有需要的吗？'
      } else {
        title = '有人在找' + title + '｜你有货吗？'
      }
    }
    var payload = {
      title: title,
      path: getApp().getSharePath('/pages/post-detail/post-detail?id=' + (detail.id || ''))
    }
    var images = detail.images || []
    if (images.length) payload.imageUrl = images[0]
    return payload
  },

  onShareTimeline() {
    const detail = this.data.detail || {}
    var title = detail.title || (detail.content ? String(detail.content).slice(0, 28) : '') || '供需信息'
    var payload = {
      title: title,
      query: 'id=' + (detail.id || '')
    }
    var images = detail.images || []
    if (images.length) payload.imageUrl = images[0]
    return payload
  },

  onToggleFav() {
    if (!auth.isLoggedIn()) { auth.goLogin(); return }
    const id = this.data.detail.id
    console.log('[post-detail] onToggleFav called with id:', id, 'current isFav:', this.data.isFav)
    post('/favorites/toggle', { targetType: 'post', targetId: id }).then((res) => {
      console.log('[post-detail] toggle response:', res)
      this.setData({ isFav: !this.data.isFav })
      wx.showToast({ title: this.data.isFav ? '已收藏' : '已取消', icon: 'success' })
      setTimeout(() => this.loadFavStatus(id), 500)
    }).catch(err => {
      console.error('[post-detail] toggle error:', err)
    })
  },

  onClosePoster() {
    this.setData({ showPoster: false })
  },

  _loadImage(src) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src,
        success: (res) => resolve(res.path),
        fail: reject
      })
    })
  },

  async _loadImageOrNull(src) {
    if (!src) return null
    try {
      return await this._loadImage(src)
    } catch (e) {
      console.warn('[poster] getImageInfo fail:', src, e && e.errMsg)
      return null
    }
  },

  _wrapText(ctx, text, maxWidth) {
    const lines = []
    let line = ''
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      if (ch === '\n') { lines.push(line); line = ''; continue }
      const test = line + ch
      if (ctx.measureText(test).width > maxWidth) {
        lines.push(line)
        line = ch
      } else {
        line = test
      }
    }
    if (line) lines.push(line)
    return lines
  },

  async onGeneratePoster() {
    const detail = this.data.detail
    if (!detail || !detail.id) return

    wx.showLoading({ title: '生成海报中...', mask: true })

    try {
      const configRes = await get('/config/poster')
      const cfg = configRes.data || configRes || {}
      const postBg = cfg.postBg || ''

      if (!postBg) {
        wx.hideLoading()
        wx.showToast({ title: '海报模板未配置', icon: 'none' })
        return
      }

      let postQrUrl = ''
      try {
        const wxacodeRes = await get(`/posts/${detail.id}/wxacode`)
        const wr = wxacodeRes.data || wxacodeRes || {}
        postQrUrl = wr.wxacodeUrl || ''
      } catch (e) {
        console.warn('[poster] post wxacode:', e && e.message)
      }
      const qrSrc = postQrUrl ? normalizeImageUrl(postQrUrl) : ''

      const images = detail.images || []
      const firstImg = images.length ? images[0] : ''

      const bgPath = await this._loadImageOrNull(normalizeImageUrl(postBg))
      if (!bgPath) {
        wx.hideLoading()
        wx.showToast({ title: '背景图加载失败，请检查网络', icon: 'none' })
        return
      }
      const imgPath = firstImg
        ? await this._loadImageOrNull(normalizeImageUrl(firstImg))
        : null
      const qrPath = qrSrc ? await this._loadImageOrNull(qrSrc) : null

      await new Promise((resolve) => setTimeout(resolve, 50))

      const query = wx.createSelectorQuery()
      const canvas = await new Promise((resolve) => {
        query.select('#posterCanvas')
          .fields({ node: true, size: true })
          .exec((res) => resolve(res[0]))
      })

      if (!canvas || !canvas.node) {
        wx.hideLoading()
        wx.showToast({ title: '画布未就绪，请重试', icon: 'none' })
        return
      }

      const canvasNode = canvas.node
      const ctx = canvasNode.getContext('2d')
      const W = 750
      const H = 1334
      const dpr = 2
      canvasNode.width = W * dpr
      canvasNode.height = H * dpr
      ctx.scale(dpr, dpr)

      const drawImg = (path, x, y, w, h) => {
        return new Promise((resolve) => {
          const img = canvasNode.createImage()
          img.onload = () => { ctx.drawImage(img, x, y, w, h); resolve() }
          img.onerror = () => resolve()
          img.src = path
        })
      }

      await drawImg(bgPath, 0, 0, W, H)

      let curY = 200
      if (imgPath) {
        const imgW = 670
        const imgH = 420
        const imgX = (W - imgW) / 2
        ctx.save()
        const r = 16
        ctx.beginPath()
        ctx.moveTo(imgX + r, curY)
        ctx.lineTo(imgX + imgW - r, curY)
        ctx.arcTo(imgX + imgW, curY, imgX + imgW, curY + r, r)
        ctx.lineTo(imgX + imgW, curY + imgH - r)
        ctx.arcTo(imgX + imgW, curY + imgH, imgX + imgW - r, curY + imgH, r)
        ctx.lineTo(imgX + r, curY + imgH)
        ctx.arcTo(imgX, curY + imgH, imgX, curY + imgH - r, r)
        ctx.lineTo(imgX, curY + r)
        ctx.arcTo(imgX, curY, imgX + r, curY, r)
        ctx.closePath()
        ctx.clip()
        await drawImg(imgPath, imgX, curY, imgW, imgH)
        ctx.restore()
        // 图片与下方文案之间留白，避免贴太紧
        curY += imgH + 56
      }

      const textX = 48
      const textMaxW = W - 96
      const titleText = detail.title || ''

      // 标题区：左侧色条 + 更大字号，层次更清晰
      ctx.font = 'bold 36px sans-serif'
      ctx.fillStyle = '#0F172A'
      const titleLines = this._wrapText(ctx, titleText, textMaxW - 20)
      const titleSlice = titleLines.slice(0, 2)
      const titleLineH = 50
      const titleBlockH = titleSlice.length * titleLineH
      if (titleSlice.length) {
        ctx.fillStyle = '#10B981'
        ctx.fillRect(textX, curY - 32, 6, titleBlockH + 8)
        ctx.fillStyle = '#0F172A'
        titleSlice.forEach((line, i) => {
          ctx.fillText(line, textX + 18, curY + i * titleLineH)
        })
        curY += titleBlockH + 28
      }

      // 字段：浅底卡片 + 左强调条 + 标签/内容分层
      const fields = detail.fields || []
      const fieldPad = 14
      const innerX = textX + fieldPad + 10
      const innerMaxW = textMaxW - fieldPad * 2 - 10

      fields.slice(0, 5).forEach((f) => {
        if (curY > 1010) return
        const label = String(f.label || '').trim()
        const val = String(f.value || '').trim()
        if (!label && !val) return

        const labelText = label ? label + '：' : ''
        ctx.font = '600 30px sans-serif'
        const valLines = this._wrapText(ctx, val || '—', innerMaxW)
        const valShown = valLines.slice(0, 2)
        const labelLineH = 30
        const valLineH = 36
        let blockH = fieldPad * 2 + (labelText ? labelLineH + 8 : 0) + valShown.length * valLineH

        ctx.fillStyle = '#F1F5F9'
        ctx.fillRect(textX, curY, textMaxW, blockH)
        ctx.fillStyle = '#10B981'
        ctx.fillRect(textX, curY, 5, blockH)

        let lineY = curY + fieldPad + 22
        if (labelText) {
          ctx.font = 'bold 24px sans-serif'
          ctx.fillStyle = '#047857'
          ctx.fillText(labelText, innerX, lineY)
          lineY += labelLineH + 8
        }
        ctx.font = '600 30px sans-serif'
        ctx.fillStyle = '#0F172A'
        valShown.forEach((line) => {
          ctx.fillText(line, innerX, lineY)
          lineY += valLineH
        })
        curY += blockH + 14
      })

      if (detail.desc && curY < 980) {
        curY += 12
        ctx.font = 'bold 26px sans-serif'
        ctx.fillStyle = '#475569'
        ctx.fillText('详情说明', textX, curY)
        curY += 40
        ctx.font = '28px sans-serif'
        ctx.fillStyle = '#334155'
        const descLines = this._wrapText(ctx, detail.desc, textMaxW)
        descLines.slice(0, 4).forEach((line) => {
          if (curY > 1085) return
          ctx.fillText(line, textX, curY)
          curY += 36
        })
      }

      if (qrPath) {
        await drawImg(qrPath, W - 180, H - 200, 140, 140)
      }

      const tempPath = await new Promise((resolve, reject) => {
        wx.canvasToTempFilePath({
          canvas: canvasNode,
          width: W * dpr,
          height: H * dpr,
          destWidth: W * dpr,
          destHeight: H * dpr,
          success: (res) => resolve(res.tempFilePath),
          fail: reject
        })
      })

      wx.hideLoading()
      this.setData({ showPoster: true, posterImage: tempPath })
    } catch (err) {
      wx.hideLoading()
      console.error('[poster] error:', err)
      wx.showToast({ title: '海报生成失败', icon: 'none' })
    }
  }
})
