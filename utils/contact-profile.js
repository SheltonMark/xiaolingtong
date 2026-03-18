const { get } = require('./request')

function normalizeContactProfile(payload) {
  const data = payload && payload.data ? payload.data : (payload || {})
  return {
    contactName: data.contactName || '',
    phone: data.phone || '',
    phoneVerified: !!data.phoneVerified,
    wechatId: data.wechatId || '',
    wechatQrImage: data.wechatQrImage || ''
  }
}

function getDefaultContactProfile() {
  return get('/contact-profile/default').then(normalizeContactProfile)
}

module.exports = {
  normalizeContactProfile,
  getDefaultContactProfile
}
