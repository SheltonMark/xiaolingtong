const { get } = require('./request')

const DEFAULT_EXPOSURE_CATEGORIES = [
  { key: 'false_info', label: '维权经历', avatarText: '维' },
  { key: 'fraud', label: '协商过程', avatarText: '协' },
  { key: 'wage_theft', label: '结果反馈', avatarText: '结' }
]

let cachedCategories = null

function cloneCategories(categories) {
  return categories.map((item) => ({ ...item }))
}

function normalizeExposureSettings(payload) {
  const data = payload && payload.data ? payload.data : (payload || {})
  const categories = Array.isArray(data.categories) ? data.categories : []

  if (!categories.length) {
    return { categories: cloneCategories(DEFAULT_EXPOSURE_CATEGORIES) }
  }

  return {
    categories: categories.map((item, index) => {
      const fallback = DEFAULT_EXPOSURE_CATEGORIES[index] || DEFAULT_EXPOSURE_CATEGORIES[0]
      const key = String((item && item.key) || fallback.key).trim() || fallback.key
      const label = String((item && item.label) || fallback.label).trim() || fallback.label
      return {
        key,
        label,
        avatarText: label[0] || fallback.avatarText
      }
    })
  }
}

function getExposureSettings(options = {}) {
  if (cachedCategories && !options.forceRefresh) {
    return Promise.resolve({ categories: cloneCategories(cachedCategories) })
  }

  return get('/exposures/settings')
    .then((res) => {
      const normalized = normalizeExposureSettings(res)
      cachedCategories = cloneCategories(normalized.categories)
      return normalized
    })
    .catch(() => ({ categories: cloneCategories(DEFAULT_EXPOSURE_CATEGORIES) }))
}

module.exports = {
  DEFAULT_EXPOSURE_CATEGORIES,
  getExposureSettings,
  normalizeExposureSettings
}
