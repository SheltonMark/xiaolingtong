const config = require('./config')
const auth = require('./auth')
const { extractUploadUrl } = require('./image')

const TIMEOUT = 10000         // 普通请求超时 10s
const UPLOAD_TIMEOUT = 30000  // 上传超时 30s
const VIDEO_UPLOAD_TIMEOUT = 120000  // 视频上传超时 120s

// 将 wx.request fail 的 errMsg 转成用户可读提示
function getNetErrTitle(errMsg) {
  const msg = String(errMsg || '')
  if (msg.includes('timeout'))               return '请求超时，请检查网络'
  if (msg.includes('url not in domain list')) return '服务配置异常，请联系客服'
  if (msg.includes('abort'))                 return '请求已取消'
  return '网络未连接，请检查网络设置'
}

// 核心请求（带重试）
// GET 最多重试 2 次；POST/PUT/DELETE 不重试（避免重复提交）
function _doRequest(url, options, retriesLeft) {
  return new Promise((resolve, reject) => {
    const token = auth.getToken()
    const header = {
      'Content-Type': 'application/json',
      ...(options.header || {})
    }
    if (token) {
      header['Authorization'] = 'Bearer ' + token
    }

    wx.request({
      url: config.baseUrl + config.apiPrefix + url,
      method: options.method || 'GET',
      data: options.data || {},
      header,
      timeout: TIMEOUT,
      success(res) {
        const data = res.data

        // 5xx 服务器错误 → 重试一次后提示
        if (res.statusCode >= 500) {
          if (retriesLeft > 0) {
            _doRequest(url, options, retriesLeft - 1).then(resolve).catch(reject)
            return
          }
          wx.showToast({ title: '服务器异常，请稍后重试', icon: 'none', duration: 2500 })
          reject(new Error('服务器异常 ' + res.statusCode))
          return
        }

        // 401 未登录或 token 过期
        if (res.statusCode === 401 || data?.code === 401) {
          auth.goLogin()
          reject(new Error(data?.message || '登录已过期，请重新登录'))
          return
        }

        // 其他 4xx 客户端错误
        if (res.statusCode >= 400) {
          const msg = data?.message || `请求失败(${res.statusCode})`
          wx.showToast({ title: msg, icon: 'none', duration: 2500 })
          reject(new Error(msg))
          return
        }

        // 业务错误（后端 code 不为 200/0）
        if (data?.code && data.code !== 200 && data.code !== 0) {
          wx.showToast({ title: data.message || '请求失败', icon: 'none', duration: 2500 })
          reject(new Error(data.message || '请求失败'))
          return
        }

        resolve(data)
      },
      fail(err) {
        const errMsg = err.errMsg || ''
        // 非主动取消时重试
        if (retriesLeft > 0 && !errMsg.includes('abort')) {
          _doRequest(url, options, retriesLeft - 1).then(resolve).catch(reject)
          return
        }
        wx.showToast({ title: getNetErrTitle(errMsg), icon: 'none', duration: 2500 })
        reject(err)
      }
    })
  })
}

function request(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const retries = method === 'GET' ? 2 : 0
  return _doRequest(url, options, retries)
}

function get(url, data) {
  return request(url, { method: 'GET', data })
}

function post(url, data) {
  return request(url, { method: 'POST', data })
}

function put(url, data) {
  return request(url, { method: 'PUT', data })
}

function del(url, data) {
  return request(url, { method: 'DELETE', data })
}

// 上传文件
function upload(filePath) {
  return new Promise((resolve, reject) => {
    const token = auth.getToken()
    wx.uploadFile({
      url: config.baseUrl + config.apiPrefix + '/upload',
      filePath,
      name: 'file',
      header: token ? { 'Authorization': 'Bearer ' + token } : {},
      timeout: UPLOAD_TIMEOUT,
      success(res) {
        // 401
        if (res.statusCode === 401) {
          auth.goLogin()
          reject(new Error('登录已过期，请重新登录'))
          return
        }
        // HTTP 错误
        if (res.statusCode >= 400) {
          wx.showToast({ title: `上传失败(${res.statusCode})`, icon: 'none' })
          reject(new Error('上传失败：' + res.statusCode))
          return
        }
        // 解析响应
        let data
        try {
          data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
        } catch (e) {
          wx.showToast({ title: '上传响应异常', icon: 'none' })
          reject(new Error('上传响应解析失败'))
          return
        }
        // 业务错误
        if (data?.code && data.code !== 200 && data.code !== 0) {
          wx.showToast({ title: data.message || '上传失败', icon: 'none' })
          reject(new Error(data.message || '上传失败'))
          return
        }

        // 统一成包含 data 字段的结构，兼容不同后端返回形态：
        // 1) { code, data: { url } }
        // 2) { url, ... }
        // 3) "https://..."
        let normalized
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          if (Object.prototype.hasOwnProperty.call(data, 'data')) {
            normalized = data
          } else {
            normalized = { ...data, data }
          }
        } else {
          normalized = { data }
        }

        const uploadUrl = extractUploadUrl(normalized)
        if (uploadUrl) {
          if (normalized && typeof normalized.data === 'object' && normalized.data) {
            normalized = { ...normalized, data: { ...normalized.data, url: uploadUrl } }
          } else {
            normalized = { ...normalized, data: uploadUrl, url: uploadUrl }
          }
        }

        resolve(normalized)
      },
      fail(err) {
        wx.showToast({ title: getNetErrTitle(err.errMsg), icon: 'none' })
        reject(err)
      }
    })
  })
}

function uploadVideo(filePath) {
  return new Promise((resolve, reject) => {
    const token = auth.getToken()
    wx.uploadFile({
      url: config.baseUrl + config.apiPrefix + '/upload/video',
      filePath,
      name: 'file',
      header: token ? { 'Authorization': 'Bearer ' + token } : {},
      timeout: VIDEO_UPLOAD_TIMEOUT,
      success(res) {
        if (res.statusCode === 401) {
          auth.goLogin()
          reject(new Error('登录已过期，请重新登录'))
          return
        }
        if (res.statusCode >= 400) {
          wx.showToast({ title: `上传失败(${res.statusCode})`, icon: 'none' })
          reject(new Error('上传失败：' + res.statusCode))
          return
        }
        let data
        try {
          data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
        } catch (e) {
          wx.showToast({ title: '上传响应异常', icon: 'none' })
          reject(new Error('上传响应解析失败'))
          return
        }
        if (data?.code && data.code !== 200 && data.code !== 0) {
          wx.showToast({ title: data.message || '上传失败', icon: 'none' })
          reject(new Error(data.message || '上传失败'))
          return
        }

        let normalized
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          if (Object.prototype.hasOwnProperty.call(data, 'data')) {
            normalized = data
          } else {
            normalized = { ...data, data }
          }
        } else {
          normalized = { data }
        }

        const uploadUrl = extractUploadUrl(normalized)
        if (uploadUrl) {
          if (normalized && typeof normalized.data === 'object' && normalized.data) {
            normalized = { ...normalized, data: { ...normalized.data, url: uploadUrl } }
          } else {
            normalized = { ...normalized, data: uploadUrl, url: uploadUrl }
          }
        }

        resolve(normalized)
      },
      fail(err) {
        wx.showToast({ title: getNetErrTitle(err.errMsg), icon: 'none' })
        reject(err)
      }
    })
  })
}

module.exports = { request, get, post, put, del, upload, uploadVideo }
