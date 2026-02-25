const config = require('./config')
const auth = require('./auth')

function request(url, options = {}) {
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
      success(res) {
        const data = res.data
        // 401 未登录/过期
        if (res.statusCode === 401 || data.code === 401) {
          auth.goLogin()
          reject(new Error(data.message || '请先登录'))
          return
        }
        // 业务错误
        if (data.code && data.code !== 200 && data.code !== 0) {
          wx.showToast({ title: data.message || '请求失败', icon: 'none' })
          reject(new Error(data.message || '请求失败'))
          return
        }
        resolve(data)
      },
      fail(err) {
        wx.showToast({ title: '网络异常，请重试', icon: 'none' })
        reject(err)
      }
    })
  })
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
      success(res) {
        const data = JSON.parse(res.data)
        resolve(data)
      },
      fail(err) {
        wx.showToast({ title: '上传失败', icon: 'none' })
        reject(err)
      }
    })
  })
}

module.exports = { request, get, post, put, del, upload }
