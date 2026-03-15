// Distance helpers for worker list and job detail.
const QQMapWX = require('../libs/qqmap-wx-jssdk1.2/qqmap-wx-jssdk.min.js')

const qqmapsdk = new QQMapWX({
  key: 'NOWBZ-YXCL7-PMLX2-PJSVO-C52S2-CBFVW'
})

const geocodeCache = Object.create(null)
const DISTANCE_DEBUG = false
const FORCE_FIXED_LOCATION = false
const FIXED_USER_LOCATION = { latitude: 30.179079, longitude: 120.154664 }
const ZERO_POINT_EPSILON = 1e-7
const ENABLE_DEV_DISTANCE_FALLBACK = true
const USE_MOCK_LOCATION_KEY = 'useMockLocation'

function debugLog(message, payload) {
  if (!DISTANCE_DEBUG) return
  if (payload !== undefined) {
    console.log(`[distance-debug][utils] ${message}`, payload)
    return
  }
  console.log(`[distance-debug][utils] ${message}`)
}

function parseCoordinate(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function isZeroPoint(latitude, longitude) {
  return Math.abs(latitude) < ZERO_POINT_EPSILON && Math.abs(longitude) < ZERO_POINT_EPSILON
}

function normalizePoint(point, options) {
  const opts = options || {}
  if (!point || typeof point !== 'object') return null
  const latitude = parseCoordinate(point.latitude !== undefined ? point.latitude : point.lat)
  const longitude = parseCoordinate(point.longitude !== undefined ? point.longitude : point.lng)
  if (latitude === null || longitude === null) return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  if (opts.allowZero !== true && isZeroPoint(latitude, longitude)) return null
  return { latitude, longitude }
}

function formatDistance(distance) {
  const value = Number(distance)
  if (!Number.isFinite(value)) return ''
  if (value < 1000) {
    return `${Math.round(value)}m`
  }
  return `${(value / 1000).toFixed(1)}km`
}

function toRadians(degree) {
  return degree * Math.PI / 180
}

function getMiniProgramEnvVersion() {
  try {
    if (!wx.getAccountInfoSync) return ''
    const accountInfo = wx.getAccountInfoSync()
    return (accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.envVersion) || ''
  } catch (e) {
    return ''
  }
}

function isDevelopmentLikeEnv() {
  const envVersion = getMiniProgramEnvVersion()
  return !!envVersion && envVersion !== 'release'
}

function hashString(text) {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function getDevFallbackDistanceByAddress(address) {
  if (!ENABLE_DEV_DISTANCE_FALLBACK) return null
  if (!FORCE_FIXED_LOCATION && !isDevelopmentLikeEnv()) return null

  const normalizedAddress = (address || '').trim()
  if (!normalizedAddress) return null

  // 300m ~ 12.3km，满足调试距离筛选与排版
  const distance = 300 + (hashString(normalizedAddress) % 12000)
  return Number.isFinite(distance) ? distance : null
}

/**
 * 计算两点球面直线距离（米）
 */
function calculateDistance(from, to) {
  return new Promise((resolve, reject) => {
    const fromPoint = normalizePoint(from, { allowZero: true })
    const toPoint = normalizePoint(to, { allowZero: false })

    if (!fromPoint) {
      debugLog('invalid from point', { from })
      reject(new Error('起点坐标无效'))
      return
    }
    if (!toPoint) {
      debugLog('invalid to point', { to })
      reject(new Error('终点坐标无效'))
      return
    }

    const lat1 = toRadians(fromPoint.latitude)
    const lat2 = toRadians(toPoint.latitude)
    const deltaLat = lat2 - lat1
    const deltaLng = toRadians(toPoint.longitude - fromPoint.longitude)

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = Math.round(6371000 * c)

    if (!Number.isFinite(distance)) {
      reject(new Error('距离计算失败'))
      return
    }

    debugLog('calculateDistance result', { fromPoint, toPoint, distance })
    resolve(distance)
  })
}

function geocodeByAddress(address) {
  return new Promise((resolve) => {
    const normalizedAddress = (address || '').trim()
    if (!normalizedAddress) {
      debugLog('geocode skipped: empty address')
      resolve(null)
      return
    }

    const memoryCached = geocodeCache[normalizedAddress]
    if (memoryCached) {
      const normalizedCached = normalizePoint(memoryCached, { allowZero: false })
      if (normalizedCached) {
        debugLog('geocode cache hit', {
          address: normalizedAddress,
          latitude: normalizedCached.latitude,
          longitude: normalizedCached.longitude
        })
        resolve(normalizedCached)
        return
      }
      delete geocodeCache[normalizedAddress]
      debugLog('geocode cache invalid, cleared', { address: normalizedAddress, memoryCached })
    }

    const storageKey = `geo:${normalizedAddress}`
    try {
      const cached = wx.getStorageSync(storageKey)
      const normalizedCached = normalizePoint(cached, { allowZero: false })
      if (normalizedCached) {
        geocodeCache[normalizedAddress] = normalizedCached
        debugLog('geocode storage hit', {
          address: normalizedAddress,
          latitude: normalizedCached.latitude,
          longitude: normalizedCached.longitude
        })
        resolve(normalizedCached)
        return
      }
      if (cached) {
        wx.removeStorageSync(storageKey)
        debugLog('geocode storage invalid, removed', { address: normalizedAddress, cached })
      }
    } catch (e) {}

    qqmapsdk.geocoder({
      address: normalizedAddress,
      success: (res) => {
        const geocodeLocation = res && res.result && res.result.location
        const location = normalizePoint(geocodeLocation, { allowZero: false })
        if (!location) {
          debugLog('geocode success but invalid location', { address: normalizedAddress, geocodeLocation, res })
          resolve(null)
          return
        }

        geocodeCache[normalizedAddress] = location
        try {
          wx.setStorageSync(storageKey, location)
        } catch (e) {}
        debugLog('geocode success', {
          address: normalizedAddress,
          latitude: location.latitude,
          longitude: location.longitude
        })
        resolve(location)
      },
      fail: (error) => {
        debugLog('geocode failed', {
          address: normalizedAddress,
          errMsg: error && (error.errMsg || error.message || ''),
          status: error && (error.status || error.code || ''),
          error
        })
        resolve(null)
      }
    })
  })
}

function resolveItemLocation(item) {
  const directLocation = normalizePoint({
    latitude: item && (item.lat !== undefined ? item.lat : item.latitude),
    longitude: item && (item.lng !== undefined ? item.lng : item.longitude)
  }, { allowZero: false })

  if (directLocation) {
    return Promise.resolve(directLocation)
  }

  debugLog('item missing/invalid lat,lng; fallback to geocode', {
    id: item && item.id,
    lat: item && (item.lat !== undefined ? item.lat : item.latitude),
    lng: item && (item.lng !== undefined ? item.lng : item.longitude),
    location: item && (item.location || item.address || '')
  })
  return geocodeByAddress(item && (item.location || item.address || ''))
}

function calculateDistanceForList(userLocation, list) {
  const normalizedUserLocation = normalizePoint(userLocation, { allowZero: true })
  if (!normalizedUserLocation || !list || list.length === 0) {
    debugLog('calculateDistanceForList skipped', {
      hasUserLocation: !!normalizedUserLocation,
      listLength: list ? list.length : 0
    })
    return Promise.resolve(list)
  }

  debugLog('calculateDistanceForList start', {
    listLength: list.length,
    userLocation: normalizedUserLocation
  })

  const promises = list.map(item => {
    return resolveItemLocation(item).then(targetLocation => {
      const itemAddress = item && (item.location || item.address || '')
      if (!targetLocation) {
        const fallbackDistance = getDevFallbackDistanceByAddress(itemAddress)
        if (Number.isFinite(fallbackDistance)) {
          debugLog('using dev fallback distance (no geocode location)', {
            id: item && item.id,
            address: itemAddress,
            fallbackDistance
          })
          return {
            ...item,
            distance: fallbackDistance,
            distanceText: formatDistance(fallbackDistance)
          }
        }
        return { ...item, distance: null, distanceText: '' }
      }

      return calculateDistance(normalizedUserLocation, targetLocation)
        .then(distance => {
          const normalizedDistance = Number(distance)
          if (!Number.isFinite(normalizedDistance)) {
            return { ...item, distance: null, distanceText: '' }
          }
          return {
            ...item,
            distance: normalizedDistance,
            distanceText: formatDistance(normalizedDistance)
          }
        })
        .catch((error) => {
          debugLog('calculateDistance failed for item', {
            id: item && item.id,
            targetLocation,
            error
          })
          const fallbackDistance = getDevFallbackDistanceByAddress(itemAddress)
          if (Number.isFinite(fallbackDistance)) {
            debugLog('using dev fallback distance (calculateDistance failed)', {
              id: item && item.id,
              address: itemAddress,
              fallbackDistance
            })
            return {
              ...item,
              distance: fallbackDistance,
              distanceText: formatDistance(fallbackDistance)
            }
          }
          return {
            ...item,
            distance: null,
            distanceText: ''
          }
        })
    })
  })

  return Promise.all(promises).then(result => {
    const withDistance = result.filter(item => !!item.distanceText).length
    debugLog('calculateDistanceForList done', {
      total: result.length,
      withDistance
    })
    return result
  })
}

function getDevMockLocation() {
  try {
    if (!isDevelopmentLikeEnv()) return null

    const raw = wx.getStorageSync('mockLocation')
    if (!raw) return null

    const mock = typeof raw === 'string' ? JSON.parse(raw) : raw
    return normalizePoint(mock, { allowZero: false })
  } catch (e) {
    return null
  }
}

function shouldUseMockLocation() {
  try {
    return wx.getStorageSync(USE_MOCK_LOCATION_KEY) === true
  } catch (e) {
    return false
  }
}

function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (FORCE_FIXED_LOCATION) {
      debugLog('using fixed user location', FIXED_USER_LOCATION)
      resolve(FIXED_USER_LOCATION)
      return
    }

    const mockLocation = shouldUseMockLocation() ? getDevMockLocation() : null
    if (mockLocation) {
      debugLog('using dev mock location', mockLocation)
      resolve(mockLocation)
      return
    }

    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const location = normalizePoint(res, { allowZero: false })
        if (!location) {
          reject(new Error('用户位置无效'))
          return
        }
        resolve(location)
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}

function filterByDistance(list, filterDistance) {
  if (!filterDistance || filterDistance === '全部') {
    return list
  }

  const rangeByIndex = {
    1: { max: 1000 },
    2: { max: 3000 },
    3: { max: 5000 },
    4: { max: 10000 },
    5: { min: 10000 }
  }
  const rangeByLabel = {
    '1km内': { max: 1000 },
    '3km内': { max: 3000 },
    '5km内': { max: 5000 },
    '10km内': { max: 10000 },
    '10km以上': { min: 10000 }
  }

  let range = null
  if (typeof filterDistance === 'number') {
    range = rangeByIndex[filterDistance]
  } else {
    range = rangeByLabel[filterDistance]
  }
  if (!range) return list

  const validDistanceItems = list.filter(item => Number.isFinite(item.distance))
  if (validDistanceItems.length === 0) {
    return list
  }

  return validDistanceItems.filter(item => {
    if (range.max !== undefined) {
      return item.distance <= range.max
    }
    if (range.min !== undefined) {
      return item.distance > range.min
    }
    return true
  })
}

module.exports = {
  formatDistance,
  calculateDistance,
  calculateDistanceForList,
  getUserLocation,
  filterByDistance
}
