const { get, post } = require('../../utils/request')
const { normalizeImageList } = require('../../utils/image')
const { calculateDistanceForList, getUserLocation } = require('../../utils/distance')
const auth = require('../../utils/auth')

function normalizeBenefits(value) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (!item) return null
      if (typeof item === 'string') return { label: item, color: 'green' }
      if (item.label) return Object.assign({}, item, { color: item.color || 'green' })
      return null
    }).filter(Boolean)
  }
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return []
    try {
      return normalizeBenefits(JSON.parse(text))
    } catch (err) {
      return text.split(/[,\n，|]/).map((item) => item.trim()).filter(Boolean).map((label) => ({ label, color: 'green' }))
    }
  }
  return []
}

function hasBenefitValue(value) {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'string') return !!value.trim()
  return !!value
}

function pickBenefitValue(primary, fallback) {
  return hasBenefitValue(primary) ? primary : fallback
}

Page({
  data: {
    userRole: 'worker',
    swiperCurrent: 0,
    isFav: false,
    job: {},
    wechatCardVisible: false,
    wechatCard: {
      wechatId: '',
      wechatQrImage: ''
    }
  },

  onLoad(options) {
    if (options.id) {
      this.loadJob(options.id)
    }
  },

  loadJob(id) {
    get('/jobs/' + id).then(res => {
      const job = res.data || {}
      const jobData = {
        ...job,
        images: normalizeImageList(job.images),
        benefits: normalizeBenefits(pickBenefitValue(job.benefits, job.tags))
      }
      this.setData({ job: jobData, wechatCardVisible: false })

      // 计算距离：优先使用 lat/lng，缺失时自动使用地址地理编码
      getUserLocation()
        .then(userLocation => calculateDistanceForList(userLocation, [jobData]))
        .then((listWithDistance) => {
          const jobWithDistance = Array.isArray(listWithDistance) ? listWithDistance[0] : null
          if (!jobWithDistance || !jobWithDistance.distanceText) return
          this.setData({
            'job.distance': jobWithDistance.distance,
            'job.distanceText': jobWithDistance.distanceText
          })
        })
        .catch(() => {
          // 定位失败或距离不可用时，不阻断详情页展示
        })

      // 加载收藏状态
      this.loadFavStatus(id)
    }).catch(() => {})
  },

  loadFavStatus(id) {
    get('/favorites').then(res => {
      const list = res.data.list || res.data || []
      const isFav = list.some(item => {
        // 后端返回的是完整对象，id字段就是targetId
        return item.targetType === 'job' && String(item.id) === String(id)
      })
      this.setData({ isFav })
    }).catch(() => {})
  },

  onSwiperChange(e) {
    this.setData({ swiperCurrent: e.detail.current })
  },

  onShow() {
    const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    this.setData({ userRole })
    // 重新加载收藏状态
    if (this.data.job.id) {
      this.loadFavStatus(this.data.job.id)
    }
  },

  onApply() {
    if (!auth.isLoggedIn()) { auth.goLogin(); return }
    wx.showModal({
      title: '确认报名',
      content: '报名后等待平台分配，开工前一天需确认出勤',
      success: (res) => {
        if (res.confirm) {
          post('/jobs/' + this.data.job.id + '/apply').then(() => {
            wx.showToast({ title: '报名成功', icon: 'success' })
          }).catch(() => {})
        }
      }
    })
  },

  onGoSettlement() {
    wx.navigateTo({ url: '/pages/job-process/job-process?jobId=' + this.data.job.id + '&tab=settlement' })
  },

  onNavigate() {
    const { job } = this.data
    const lat = Number(job.lat)
    const lng = Number(job.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (!lat && !lng)) {
      wx.showToast({ title: '岗位暂未配置导航坐标', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/navigation/navigation?lat=${lat}&lng=${lng}&name=${encodeURIComponent(job.title || '工作地点')}&address=${encodeURIComponent(job.location || '')}`
    })
  },

  onCallPhone() {
    const phoneNumber = this.data.job?.company?.phone || ''
    if (!phoneNumber) {
      wx.showToast({ title: '暂无联系电话', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber, fail() {} })
  },

  openWechatCard() {
    const company = (this.data.job && this.data.job.company) || {}
    const wechatId = company.wechat || ''
    const wechatQrImage = company.wechatQrImage || ''
    if (!wechatId && !wechatQrImage) {
      wx.showToast({ title: '暂无微信信息', icon: 'none' })
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

  onWechat() {
    this.openWechatCard()
  },

  onToggleFav() {
    if (!auth.isLoggedIn()) { auth.goLogin(); return }
    const id = this.data.job.id
    post('/favorites/toggle', { targetType: 'job', targetId: id }).then(() => {
      this.setData({ isFav: !this.data.isFav })
      wx.showToast({ title: this.data.isFav ? '已收藏' : '已取消', icon: 'success' })
      // 重新加载收藏状态以确保同步
      setTimeout(() => this.loadFavStatus(id), 500)
    }).catch(() => {})
  },

  onShareJob() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] })
  },
  onShareAppMessage() {
    const job = this.data.job || {}
    const myId = getApp().globalData.userInfo && getApp().globalData.userInfo.id
    const isOwner = myId && String(job.userId || job.enterpriseId) === String(myId)
    var title = job.title || '招工信息'
    if (!isOwner) {
      title = '朋友在招' + title + '｜能去吗？'
    }
    return {
      title: title,
      path: getApp().getSharePath('/pages/job-detail/job-detail?id=' + (job.id || ''))
    }
  }
})
