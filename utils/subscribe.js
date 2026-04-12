/**
 * 请求订阅消息授权
 * 模板 ID 后续在微信后台申请后配置
 * 调用时机：进入消息页、报名成功后等
 */
const TEMPLATE_IDS = []

function requestSubscribe(templateIds) {
  const tmplIds = templateIds || TEMPLATE_IDS
  if (!tmplIds.length) return Promise.resolve()

  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds: tmplIds,
      success: (res) => {
        console.log('[subscribe] requestSubscribeMessage result:', res)
        resolve(res)
      },
      fail: (err) => {
        console.warn('[subscribe] requestSubscribeMessage fail:', err)
        resolve(null)
      }
    })
  })
}

function setTemplateIds(ids) {
  TEMPLATE_IDS.length = 0
  if (Array.isArray(ids)) {
    ids.forEach(id => { if (id) TEMPLATE_IDS.push(id) })
  }
}

module.exports = { requestSubscribe, setTemplateIds, TEMPLATE_IDS }
