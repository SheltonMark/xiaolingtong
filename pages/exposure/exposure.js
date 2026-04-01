const { post, upload } = require('../../utils/request')
const auth = require('../../utils/auth')
const {
  DEFAULT_EXPOSURE_CATEGORIES,
  getExposureSettings
} = require('../../utils/exposure-settings')

function getInitialCategory() {
  return DEFAULT_EXPOSURE_CATEGORIES[0].key
}

Page({
  data: {
    categories: DEFAULT_EXPOSURE_CATEGORIES,
    form: {
      category: getInitialCategory(),
      amount: '',
      description: ''
    },
    images: [],
    isUploading: false,
    submitting: false,
    agreed: true
  },

  onLoad() {
    if (!auth.isLoggedIn()) {
      auth.goLogin()
      return
    }
    this.loadCategories()
  },

  loadCategories() {
    getExposureSettings().then(({ categories }) => {
      const currentCategory = this.data.form.category
      const nextCategory = categories.some((item) => item.key === currentCategory)
        ? currentCategory
        : ((categories[0] && categories[0].key) || getInitialCategory())

      this.setData({
        categories,
        'form.category': nextCategory
      })
    })
  },

  onInput(e) {
    this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value })
  },

  onSelectCategory(e) {
    this.setData({ 'form.category': e.currentTarget.dataset.key })
  },

  onToggleAgree() {
    this.setData({ agreed: !this.data.agreed })
  },

  onChooseImage() {
    if (this.data.images.length >= 9) {
      wx.showToast({ title: '最多上传9张图片', icon: 'none' })
      return
    }

    wx.chooseMedia({
      count: 9 - this.data.images.length,
      mediaType: ['image'],
      success: (res) => {
        const newImages = res.tempFiles.map((file) => file.tempFilePath)
        const uploads = newImages.map((path) => upload(path))
        this.setData({ isUploading: true })

        Promise.allSettled(uploads).then((results) => {
          const urls = results
            .filter((item) => item.status === 'fulfilled')
            .map((item) => (item.value.data && item.value.data.url) || item.value.data || '')
            .filter(Boolean)

          const failCount = results.length - urls.length
          if (urls.length) {
            this.setData({ images: this.data.images.concat(urls) })
          }
          if (failCount > 0) {
            wx.showToast({ title: `有${failCount}张图片上传失败，请重试`, icon: 'none' })
          }
        }).finally(() => {
          this.setData({ isUploading: false })
        })
      }
    })
  },

  onDeleteImage(e) {
    this.setData({
      images: this.data.images.filter((_, index) => index !== e.currentTarget.dataset.index)
    })
  },

  onSubmit() {
    if (!auth.isLoggedIn()) {
      auth.goLogin()
      return
    }
    if (this.data.submitting) {
      return
    }
    if (this.data.isUploading) {
      wx.showToast({ title: '图片上传中，请稍后提交', icon: 'none' })
      return
    }

    const { form, agreed, images } = this.data
    const description = (form.description || '').trim()

    if (!form.category) {
      wx.showToast({ title: '请选择经历类型', icon: 'none' })
      return
    }
    if (!description) {
      wx.showToast({ title: '请填写维权经历', icon: 'none' })
      return
    }
    if (description.length < 10) {
      wx.showToast({ title: '请补充更完整的经历描述', icon: 'none' })
      return
    }
    if (!agreed) {
      wx.showToast({ title: '请先确认分享说明', icon: 'none' })
      return
    }

    wx.showLoading({ title: '提交中...' })
    this.setData({ submitting: true })

    post('/exposures', {
      category: form.category,
      amount: form.amount,
      description,
      images
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1200)
    }).catch(() => {
      wx.hideLoading()
    }).finally(() => {
      this.setData({ submitting: false })
    })
  }
})
