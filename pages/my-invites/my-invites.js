const { get, extractWxacodeUrl } = require('../../utils/request')
const { normalizeImageUrl } = require('../../utils/image')

Page({
  data: {
    inviteCode: '',
    totalInvites: 0,
    list: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    showPoster: false,
    posterImage: ''
  },

  onLoad() {
    this.loadCode()
    this.loadStats()
    this.loadList()
  },

  loadCode() {
    get('/invite/code').then(res => {
      this.setData({ inviteCode: res.data.inviteCode || '' })
    }).catch(() => {})
  },

  loadStats() {
    get('/invite/stats').then(res => {
      this.setData({ totalInvites: res.data.totalInvites || 0 })
    }).catch(() => {})
  },

  loadList() {
    if (this.data.loading || !this.data.hasMore) return
    this.setData({ loading: true })
    const { page, pageSize } = this.data
    get('/invite/records?page=' + page + '&pageSize=' + pageSize).then(res => {
      const d = res.data
      const newList = this.data.list.concat((d.list || []).map(item => ({
        ...item,
        initial: (item.nickname || '用').charAt(0)
      })))
      this.setData({
        list: newList,
        loading: false,
        hasMore: newList.length < (d.total || 0),
        page: page + 1
      })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  onReachBottom() {
    this.loadList()
  },

  onCopyCode() {
    const code = this.data.inviteCode
    if (!code) return wx.showToast({ title: '邀请码生成中', icon: 'none' })
    wx.setClipboardData({
      data: code,
      success: () => wx.showToast({ title: '邀请码已复制', icon: 'success' })
    })
  },

  onInviteFriend() {
    if (!this.data.inviteCode) {
      wx.showToast({ title: '邀请码生成中', icon: 'none' })
      return
    }
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

  /** 单张图加载失败不抛错，避免「接口已返回小程序码 URL 但下载域名未配置」导致整张海报失败 */
  async _loadImageOrNull(src) {
    if (!src) return null
    try {
      return await this._loadImage(src)
    } catch (e) {
      console.warn('[invite-poster] getImageInfo fail:', src, e && e.errMsg)
      return null
    }
  },

  async onGenerateInvitePoster() {
    wx.showLoading({ title: '生成海报中...', mask: true })
    try {
      // 与帖子详情页 onGeneratePoster 一致：先拉海报配置，再处理图片与画布
      const configRes = await get('/config/poster')
      const cfg = configRes.data || configRes || {}
      const inviteBg = cfg.inviteBg || ''

      if (!inviteBg) {
        wx.hideLoading()
        wx.showToast({ title: '海报模板未配置', icon: 'none' })
        return
      }

      let wxacodeUrl = ''
      try {
        const wxacodeRes = await get('/invite/wxacode')
        wxacodeUrl = extractWxacodeUrl(wxacodeRes)
      } catch (e) {
        console.warn('[invite-poster] wxacode skip:', e && e.message)
      }

      const bgSrc = normalizeImageUrl(inviteBg)
      const qrSrc = wxacodeUrl ? normalizeImageUrl(wxacodeUrl) : ''

      const bgPath = await this._loadImageOrNull(bgSrc)
      if (!bgPath) {
        wx.hideLoading()
        wx.showToast({ title: '背景图加载失败，请检查网络', icon: 'none' })
        return
      }

      const qrPath = qrSrc ? await this._loadImageOrNull(qrSrc) : null
      if (qrSrc && !qrPath) {
        console.warn('[invite-poster] 小程序码图未加载（合法域名/或资源 404），仅输出背景与邀请码文字', qrSrc)
      }

      await new Promise((resolve) => setTimeout(resolve, 50))

      const canvas = await new Promise((resolve) => {
        this.createSelectorQuery()
          .select('#invitePosterCanvas')
          .fields({ node: true, size: true })
          .exec((res) => resolve(res && res[0]))
      })

      if (!canvas || !canvas.node) {
        wx.hideLoading()
        wx.showToast({ title: '画布未就绪，请重试', icon: 'none' })
        return
      }

      const canvasNode = canvas.node
      const ctx = canvasNode.getContext('2d')
      /**
       * 邀请海报画布：750×1334（与帖子海报一致）
       * - 背景：全幅
       * - 小程序码：180×180，左上 (530, 1074) 即 (W-220, H-260)
       * - 「我的邀请码：…」：左侧 x=40，垂直与二维码中线对齐（textBaseline middle）
       * - 「扫描二维码…」：水平居中 x=375，基线约 y=1290（qr 底 +36）
       */
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

      // 与右下角小程序码同一套坐标，便于邀请码文字与二维码垂直居中对齐（同一水平中线）
      const qrW = 180
      const qrH = 180
      const qrX = W - 220
      const qrY = H - 260
      const qrCenterY = qrY + qrH / 2

      const code = this.data.inviteCode || ''
      if (code) {
        const padX = 40
        ctx.font = 'bold 32px sans-serif'
        ctx.fillStyle = '#1E293B'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText('我的邀请码：' + code, padX, qrCenterY)

        ctx.font = '22px sans-serif'
        ctx.fillStyle = '#64748B'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText('扫描二维码，一起来赚灵豆！', W / 2, qrY + qrH + 36)
        ctx.textAlign = 'left'
      }

      if (qrPath) {
        await drawImg(qrPath, qrX, qrY, qrW, qrH)
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
      const msg = (err && err.errMsg) || (err && err.message) || ''
      console.error('[invite-poster] error:', err)
      wx.showToast({
        title: msg.indexOf('canvas') !== -1 ? '导出图片失败，请重试' : '海报生成失败',
        icon: 'none'
      })
    }
  },

  onShareAppMessage() {
    const code = this.data.inviteCode
    return {
      title: '我在用小灵通，快来一起找活接单！',
      path: '/pages/index/index?inviteCode=' + (code || '')
    }
  }
})
