const config = require('./config')

function normalizeImageUrl(rawUrl) {
  if (rawUrl === undefined || rawUrl === null) return ''
  let url = String(rawUrl).trim()
  if (!url) return ''

  if (url.startsWith('//')) {
    url = 'https:' + url
  } else if (url.startsWith('/')) {
    const base = String(config.baseUrl || '').replace(/\/+$/, '')
    if (base) {
      url = base + url
    }
  }

  // WeChat image loading is stricter on insecure protocol.
  // Keep localhost/IP links untouched for local dev environments.
  if (url.startsWith('http://')) {
    const host = url.slice(7).split('/')[0]
    const isIpHost = /^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?$/.test(host)
    const isLocalHost = host.startsWith('localhost')
    if (!isIpHost && !isLocalHost) {
      url = 'https://' + url.slice(7)
    }
  }

  return url
}

function normalizeImageList(input) {
  if (Array.isArray(input)) {
    return input.map(normalizeImageUrl).filter(Boolean)
  }

  if (input === undefined || input === null) return []
  const text = String(input).trim()
  if (!text) return []

  if (text.startsWith('[') && text.endsWith(']')) {
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeImageUrl).filter(Boolean)
      }
    } catch (error) {}
  }

  if (text.includes(',')) {
    return text.split(',').map(normalizeImageUrl).filter(Boolean)
  }

  return [normalizeImageUrl(text)].filter(Boolean)
}

function extractUploadUrl(payload) {
  if (!payload) return ''

  const direct = normalizeImageUrl(
    payload.url || payload.fileUrl || payload.location || payload.path || ''
  )
  if (direct) return direct

  const nested = payload.data
  if (!nested) return ''
  if (typeof nested === 'string') return normalizeImageUrl(nested)

  return normalizeImageUrl(
    nested.url || nested.fileUrl || nested.location || nested.path || ''
  )
}

module.exports = {
  normalizeImageUrl,
  normalizeImageList,
  extractUploadUrl
}
