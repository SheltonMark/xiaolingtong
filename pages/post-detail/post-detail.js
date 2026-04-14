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
    /** 轮播：先图片后视频，与顶部展示区域一致 */
    mediaSlides: [],
    hasVideoSlide: false,
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
    this._entryPostId = id ? String(id) : ''
    if (id) {
      this.loadDetail(id)
      this.loadFavStatus(id)
    }
  },

  /** 登录成功后回到本帖（scene 扫码同样有 _entryPostId） */
  buildLoginRedirectUrl() {
    const id = (this.data.detail && this.data.detail.id) || this._entryPostId
    if (!id) return ''
    return '/pages/post-detail/post-detail?id=' + encodeURIComponent(String(id))
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
    const fieldSource =
      raw.fields && typeof raw.fields === 'object' && !Array.isArray(raw.fields)
        ? raw.fields
        : {}
    const fields = this.formatDetailFields(raw.type, raw.fields, raw)
    const enterpriseVerified = this.resolveEnterpriseVerified(raw)
    const processModeLabel = this.getProcessModeLabel(raw)
    return {
      ...raw,
      fieldSource,
      images: normalizeImageList(raw.images),
      videos: normalizeImageList(raw.videos),
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

  buildMediaSlides(detail) {
    const images = (detail && detail.images) || []
    const videos = (detail && detail.videos) || []
    const slides = []
    images.forEach((src) => {
      if (src) slides.push({ type: 'image', src })
    })
    videos.forEach((src) => {
      if (src) slides.push({ type: 'video', src })
    })
    return slides
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

      const mediaSlides = this.buildMediaSlides(detail)
      const hasVideoSlide = mediaSlides.some((s) => s.type === 'video')
      this.setData({
        detail,
        mediaSlides,
        hasVideoSlide,
        swiperCurrent: 0,
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
    if (!auth.isLoggedIn()) { auth.goLogin(this.buildLoginRedirectUrl()); return }
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
    if (!auth.isLoggedIn()) { auth.goLogin(this.buildLoginRedirectUrl()); return }
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
    if (!auth.isLoggedIn()) {
      this.setData({ isFav: false })
      return
    }
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
    if (!auth.isLoggedIn()) { auth.goLogin(this.buildLoginRedirectUrl()); return }
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

  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' })
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

  /** 海报用正文：与详情页 desc 一致，并兜底 content（避免异常数据下 desc 为空） */
  _posterSupplementText(detail) {
    if (!detail) return ''
    const fromDesc = this.normalizeText(detail.desc)
    if (fromDesc) return fromDesc
    return this.normalizeText(detail.content)
  },

  /**
   * 海报字段行：与详情 info-list 一致，并保证采购/库存含品类、数量（避免布局预留补充描述后字段被挤掉时不显示）
   */
  _posterFieldList(detail) {
    if (!detail) return []
    const base = (detail.fields || [])
      .map((f) => ({
        label: String(f.label || '').trim(),
        value: String(f.value || '').trim()
      }))
      .filter((f) => f.label || f.value)
    const type = detail.type
    const src = detail.fieldSource || {}
    const extras = []
    if (type === 'purchase' || type === 'stock') {
      const industry = this.normalizeText(detail.industry)
      const qtyRaw = src.quantity
      const qty =
        qtyRaw != null && String(qtyRaw).trim() !== ''
          ? String(qtyRaw).trim() + '个'
          : ''
      if (!base.some((r) => r.label === '品类') && industry) {
        extras.push({ label: '品类', value: industry })
      }
      const qtyLabel = type === 'purchase' ? '采购数量' : '库存数量'
      if (!base.some((r) => r.label === qtyLabel) && qty) {
        extras.push({ label: qtyLabel, value: qty })
      }
    }
    return extras.concat(base)
  },

  /** 按最大行数截断，末行过长时加省略号（…） */
  _sliceLinesWithEllipsis(ctx, text, maxWidth, maxLines) {
    const t = String(text || '').trim()
    if (!t) return []
    const lines = this._wrapText(ctx, t, maxWidth)
    if (lines.length <= maxLines) return lines
    const out = lines.slice(0, maxLines)
    let last = out[maxLines - 1]
    const ell = '\u2026'
    while (last.length > 0 && ctx.measureText(last + ell).width > maxWidth) {
      last = last.slice(0, -1)
    }
    out[maxLines - 1] = (last || '') + ell
    return out
  },

  async onGeneratePoster() {
    const detail = this.data.detail
    if (!detail || !detail.id) return

    wx.showLoading({ title: '生成海报中...', mask: true })

    try {
      const configRes = await get('/config/poster')
      const cfg = configRes.data || configRes || {}
      const postBg = cfg.postBg || ''
      const postQrFallback = cfg.postQrcode || ''

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
      const qrSrc = postQrUrl || postQrFallback

      const images = detail.images || []
      const firstImg = images.length ? images[0] : ''

      const loadTasks = [this._loadImage(postBg)]
      if (firstImg) loadTasks.push(this._loadImage(firstImg))
      if (qrSrc) loadTasks.push(this._loadImage(normalizeImageUrl(qrSrc)))

      const loaded = await Promise.all(loadTasks)
      const bgPath = loaded[0]
      const imgPath = firstImg ? loaded[1] : null
      const qrPath = qrSrc ? loaded[loadTasks.length - 1] : null

      const query = wx.createSelectorQuery()
      const canvas = await new Promise((resolve) => {
        query.select('#posterCanvas')
          .fields({ node: true, size: true })
          .exec((res) => resolve(res[0]))
      })

      const canvasNode = canvas.node
      const ctx = canvasNode.getContext('2d')
      /**
       * 海报画布 W×H = 750×1334（逻辑 px）
       * - 主图：670×670；帖标题在卡片外；字段+补充描述合并单张圆角卡片
       * - 字段：标签常规字重，值加粗；卡片底不超过 QR_Y - QR_MARGIN_ABOVE，避免与码重叠
       */
      const W = 750
      const H = 1334
      const POSTER_TOP_Y = 96
      const QR_SIZE = 140
      const QR_X = W - 180
      const QR_Y = H - 200
      const QR_MARGIN_ABOVE = 56
      const cardRectBottomMax = QR_Y - QR_MARGIN_ABOVE
      const textX = 48
      const textMaxW = W - 96
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

      const fillRoundRect = (x, y, rw, rh, rad, fillStyle) => {
        const rr = Math.min(rad, rw / 2, rh / 2)
        ctx.fillStyle = fillStyle
        ctx.beginPath()
        ctx.moveTo(x + rr, y)
        ctx.lineTo(x + rw - rr, y)
        ctx.arcTo(x + rw, y, x + rw, y + rr, rr)
        ctx.lineTo(x + rw, y + rh - rr)
        ctx.arcTo(x + rw, y + rh, x + rw - rr, y + rh, rr)
        ctx.lineTo(x + rr, y + rh)
        ctx.arcTo(x, y + rh, x, y + rh - rr, rr)
        ctx.lineTo(x, y + rr)
        ctx.arcTo(x, y, x + rr, y, rr)
        ctx.closePath()
        ctx.fill()
      }

      let curY = POSTER_TOP_Y
      if (imgPath) {
        const imgW = 670
        const imgH = imgW
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
        // 图片底与标题区留白（主图与标题勿贴太紧）
        curY += imgH + 88
      }

      const titleText = detail.title || ''

      // 帖标题（卡片外）：略收字号，竖条与卡片左条宽一致
      const titleAccentW = 5
      const titleTextLeft = textX + titleAccentW + 12
      const titleMaxW = textMaxW - (titleTextLeft - textX)
      ctx.font = 'bold 32px sans-serif'
      ctx.fillStyle = '#0F172A'
      const titleLines = this._wrapText(ctx, titleText, titleMaxW)
      const titleSlice = titleLines.slice(0, 2)
      const titleLineH = 46
      if (titleSlice.length) {
        const barTop = curY - 26
        const barH = titleSlice.length * titleLineH + 8
        ctx.fillStyle = '#10B981'
        ctx.fillRect(textX, barTop, titleAccentW, barH)
        ctx.fillStyle = '#0F172A'
        titleSlice.forEach((line, i) => {
          ctx.fillText(line, titleTextLeft, curY + i * titleLineH)
        })
        curY += (titleSlice.length - 1) * titleLineH + 26 + 14
      }

      // —— 单卡片：字段 + 补充描述（先预排版，避免与右下角码重叠）——
      const CARD_PAD = 16
      const CARD_RADIUS = 12
      const STRIPE_W = 5
      const contentX = textX + CARD_PAD + STRIPE_W + 10
      const contentW = textMaxW - CARD_PAD * 2 - STRIPE_W - 10
      const supplementText = this._posterSupplementText(detail)
      /** 排字段时不为「补充描述」预留高度，避免有主图时卡片过矮导致只显示补充说明 */
      const reserveSupForFields = 0
      const labelLineH = 26
      const labelToValGap = 6
      const valLineH = 32
      const fieldSectionGap = 12
      const supTitleH = 24
      const supTitleGap = 8
      const supBodyLineH = 28

      const innerBottomY = cardRectBottomMax - CARD_PAD
      const cardTop = curY + 10
      let simCursor = CARD_PAD + 22
      const fieldBlocks = []
      const fieldsList = this._posterFieldList(detail)
      ctx.font = 'bold 28px sans-serif'

      for (let i = 0; i < fieldsList.length && i < 12; i += 1) {
        const f = fieldsList[i]
        const label = String(f.label || '').trim()
        const val = String(f.value || '').trim()
        if (!label && !val) continue
        const valLinesAll = this._wrapText(ctx, val || '—', contentW)
        let take = Math.min(3, Math.max(1, valLinesAll.length))
        let placed = false
        while (take >= 1) {
          const blockH = labelLineH + labelToValGap + take * valLineH + fieldSectionGap
          if (cardTop + simCursor + blockH <= innerBottomY - reserveSupForFields) {
            fieldBlocks.push({ label, valLines: valLinesAll.slice(0, take) })
            simCursor += blockH
            placed = true
            break
          }
          take -= 1
        }
        if (!placed) break
      }

      if (fieldBlocks.length === 0) {
        simCursor = CARD_PAD + 16
      }

      ctx.font = '26px sans-serif'
      let supLines = supplementText
        ? this._sliceLinesWithEllipsis(ctx, supplementText, contentW, 4)
        : []
      const supExtraBase = 4 + 14 + supTitleH + supTitleGap
      const trimSup = () => {
        while (
          supLines.length > 0 &&
          cardTop + simCursor + supExtraBase + supLines.length * supBodyLineH > innerBottomY
        ) {
          supLines = supLines.slice(0, -1)
        }
      }
      trimSup()
      if (supplementText && supLines.length === 0) {
        supLines = []
      }

      const supH =
        supLines.length > 0 ? supExtraBase + supLines.length * supBodyLineH : 0
      let cardH = simCursor + supH + CARD_PAD
      cardH = Math.min(cardH, cardRectBottomMax - cardTop)
      cardH = Math.max(cardH, CARD_PAD * 2 + 24)

      if (fieldBlocks.length > 0 || supLines.length > 0) {
        fillRoundRect(textX, cardTop, textMaxW, cardH, CARD_RADIUS, '#F1F5F9')
        ctx.fillStyle = '#10B981'
        ctx.beginPath()
        ctx.moveTo(textX + CARD_RADIUS, cardTop)
        ctx.lineTo(textX + STRIPE_W, cardTop)
        ctx.lineTo(textX + STRIPE_W, cardTop + cardH)
        ctx.lineTo(textX + CARD_RADIUS, cardTop + cardH)
        ctx.quadraticCurveTo(textX, cardTop + cardH, textX, cardTop + cardH - CARD_RADIUS)
        ctx.lineTo(textX, cardTop + CARD_RADIUS)
        ctx.quadraticCurveTo(textX, cardTop, textX + CARD_RADIUS, cardTop)
        ctx.closePath()
        ctx.fill()

        let penY =
          fieldBlocks.length > 0 ? cardTop + CARD_PAD + 22 : cardTop + CARD_PAD + 16
        fieldBlocks.forEach((blk) => {
          const lab = blk.label ? `${blk.label}：` : ''
          ctx.font = '26px sans-serif'
          ctx.fillStyle = '#64748B'
          ctx.fillText(lab, contentX, penY)
          penY += labelLineH + labelToValGap
          ctx.font = 'bold 28px sans-serif'
          ctx.fillStyle = '#0F172A'
          blk.valLines.forEach((line) => {
            ctx.fillText(line, contentX, penY)
            penY += valLineH
          })
          penY += fieldSectionGap
        })

        if (supLines.length > 0) {
          penY += 4
          ctx.strokeStyle = '#E2E8F0'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(contentX, penY)
          ctx.lineTo(textX + textMaxW - CARD_PAD, penY)
          ctx.stroke()
          penY += 14
          ctx.font = '26px sans-serif'
          ctx.fillStyle = '#64748B'
          ctx.fillText('补充描述', contentX, penY)
          penY += supTitleH + supTitleGap
          ctx.fillStyle = '#334155'
          supLines.forEach((line) => {
            ctx.fillText(line, contentX, penY)
            penY += supBodyLineH
          })
        }
      }

      if (qrPath) {
        await drawImg(qrPath, QR_X, QR_Y, QR_SIZE, QR_SIZE)
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
