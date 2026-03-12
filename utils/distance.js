// 距离计算工具
const QQMapWX = require('../libs/qqmap-wx-jssdk1.2/qqmap-wx-jssdk.min.js')

const qqmapsdk = new QQMapWX({
  key: 'NOWBZ-YXCL7-PMLX2-PJSVO-C52S2-CBFVW'
})

/**
 * 格式化距离显示
 * @param {number} distance - 距离（米）
 * @returns {string} 格式化后的距离字符串
 */
function formatDistance(distance) {
  if (!distance && distance !== 0) return ''
  if (distance < 1000) {
    return `${Math.round(distance)}米`
  }
  return `${(distance / 1000).toFixed(1)}km`
}

/**
 * 计算两点之间的直线距离
 * @param {Object} from - 起点 {latitude, longitude}
 * @param {Object} to - 终点 {latitude, longitude}
 * @returns {Promise<number>} 距离（米）
 */
function calculateDistance(from, to) {
  return new Promise((resolve, reject) => {
    if (!from || !from.latitude || !from.longitude) {
      reject(new Error('起点坐标无效'))
      return
    }
    if (!to || !to.latitude || !to.longitude) {
      reject(new Error('终点坐标无效'))
      return
    }

    qqmapsdk.calculateDistance({
      mode: 'straight', // 直线距离
      from: {
        latitude: from.latitude,
        longitude: from.longitude
      },
      to: [{
        latitude: to.latitude,
        longitude: to.longitude
      }],
      success: (res) => {
        if (res.result && res.result.elements && res.result.elements[0]) {
          resolve(res.result.elements[0].distance)
        } else {
          reject(new Error('距离计算失败'))
        }
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}

/**
 * 批量计算距离（为列表中的每个项目添加距离信息）
 * @param {Object} userLocation - 用户位置 {latitude, longitude}
 * @param {Array} list - 招工列表（使用lat和lng字段）
 * @returns {Promise<Array>} 添加了distance和distanceText字段的列表
 */
function calculateDistanceForList(userLocation, list) {
  if (!userLocation || !list || list.length === 0) {
    return Promise.resolve(list)
  }

  const promises = list.map(item => {
    // 后端使用 lat 和 lng 字段
    if (!item.lat || !item.lng) {
      return Promise.resolve({ ...item, distance: null, distanceText: '' })
    }

    return calculateDistance(userLocation, {
      latitude: item.lat,
      longitude: item.lng
    })
      .then(distance => ({
        ...item,
        distance,
        distanceText: formatDistance(distance)
      }))
      .catch(() => ({
        ...item,
        distance: null,
        distanceText: ''
      }))
  })

  return Promise.all(promises)
}

/**
 * 获取用户当前位置
 * @returns {Promise<Object>} {latitude, longitude}
 */
function getUserLocation() {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02', // 腾讯地图使用的坐标系
      success: (res) => {
        resolve({
          latitude: res.latitude,
          longitude: res.longitude
        })
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}

/**
 * 根据距离筛选条件过滤列表
 * @param {Array} list - 招工列表（需要包含distance字段）
 * @param {string} filterDistance - 筛选条件：'1km内', '3km内', '5km内', '10km内', '10km以上'
 * @returns {Array} 过滤后的列表
 */
function filterByDistance(list, filterDistance) {
  if (!filterDistance || filterDistance === '全部') {
    return list
  }

  const distanceMap = {
    '1km内': { max: 1000 },
    '3km内': { max: 3000 },
    '5km内': { max: 5000 },
    '10km内': { max: 10000 },
    '10km以上': { min: 10000 }
  }

  const range = distanceMap[filterDistance]
  if (!range) return list

  return list.filter(item => {
    if (item.distance === null) return false
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
