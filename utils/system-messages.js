const { extractTransactionList } = require('./wallet-records')

const WORKER_SYSTEM_READ_KEY_PREFIX = 'worker_system_read_at_'

function toNumber(value) {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num : 0
}

function formatMoney(value) {
  return Math.abs(toNumber(value)).toFixed(2)
}

function toTime(value) {
  if (!value) return 0
  const date = value instanceof Date ? value : new Date(value)
  const time = date.getTime()
  return Number.isFinite(time) ? time : 0
}

function getStorageApi() {
  if (typeof wx === 'undefined') return null
  if (!wx || typeof wx.getStorageSync !== 'function' || typeof wx.setStorageSync !== 'function') return null
  return wx
}

function getWorkerReadStorageKey(userId) {
  return `${WORKER_SYSTEM_READ_KEY_PREFIX}${Number(userId || 0)}`
}

function getWorkerSystemReadAt(userId) {
  const storage = getStorageApi()
  if (!storage) return 0
  const value = storage.getStorageSync(getWorkerReadStorageKey(userId))
  return toTime(value)
}

function setWorkerSystemReadAt(userId, value) {
  const storage = getStorageApi()
  if (!storage) return
  storage.setStorageSync(getWorkerReadStorageKey(userId), new Date(toTime(value)).toISOString())
}

function buildWalletMessageTitle(item) {
  if (!item) return '系统通知'
  if (item.type === 'withdraw') {
    if (item.status === 'failed') return '提现失败'
    if (item.status === 'success') return '提现成功'
    return '提现处理中'
  }
  if (item.type === 'refund' || item.refType === 'refund') return '退款到账'
  return '工资到账'
}

function buildWalletMessageDesc(item) {
  const amount = formatMoney(item.amount)
  if (item.type === 'withdraw') {
    if (item.status === 'failed') {
      return item.remark || `提现 ¥${amount} 失败，请稍后重试`
    }
    if (item.status === 'success') {
      return item.remark || `提现 ¥${amount} 已到账微信零钱`
    }
    return item.remark || `提现 ¥${amount} 已提交，等待到账`
  }
  if (item.type === 'refund' || item.refType === 'refund') {
    return item.remark || `退款 ¥${amount} 已到账`
  }
  return item.remark || `工资 ¥${amount} 已到账`
}

function buildWalletMessageLink(item) {
  if (!item) return '/pages/withdraw-history/withdraw-history?tab=all'
  return item.type === 'withdraw'
    ? '/pages/withdraw-history/withdraw-history?tab=withdraw'
    : '/pages/withdraw-history/withdraw-history?tab=income'
}

function buildWalletMessageType(item) {
  if (!item) return 'system'
  return item.type === 'withdraw' ? 'withdraw' : 'income'
}

function isDuplicateWorkerNotification(item) {
  if (!item) return false
  return item.title === '工资到账'
}

function mapNotification(item) {
  return {
    ...item,
    sourceType: 'notification',
    unread: Number(item.isRead || 0) === 0,
    createdAt: item.createdAt || '',
  }
}

function mapWorkerWalletMessage(item, readAt) {
  const createdAt = item.createdAt || ''
  const createdAtTime = toTime(createdAt)
  return {
    id: `wallet-${item.id}`,
    sourceType: 'wallet',
    type: buildWalletMessageType(item),
    title: buildWalletMessageTitle(item),
    content: buildWalletMessageDesc(item),
    desc: buildWalletMessageDesc(item),
    link: buildWalletMessageLink(item),
    unread: createdAtTime > readAt,
    createdAt,
    rawData: item,
  }
}

function sortByCreatedAtDesc(list) {
  return (Array.isArray(list) ? list : []).slice().sort((a, b) => {
    const diff = toTime(b.createdAt) - toTime(a.createdAt)
    if (diff !== 0) return diff
    return String(b.id || '').localeCompare(String(a.id || ''))
  })
}

function buildWorkerSystemMessages({ notifications = [], transactions = [], userId = 0 } = {}) {
  const readAt = getWorkerSystemReadAt(userId)
  const walletMessages = extractTransactionList(transactions)
    .map((item) => mapWorkerWalletMessage(item, readAt))
  const notificationMessages = (Array.isArray(notifications) ? notifications : [])
    .filter((item) => !isDuplicateWorkerNotification(item))
    .map((item) => mapNotification(item))
  return sortByCreatedAtDesc(walletMessages.concat(notificationMessages))
}

function buildRoleSystemMessages({
  userRole = 'enterprise',
  notifications = [],
  transactions = [],
  userId = 0,
} = {}) {
  if (userRole === 'worker') {
    return buildWorkerSystemMessages({ notifications, transactions, userId })
  }
  return sortByCreatedAtDesc((Array.isArray(notifications) ? notifications : []).map((item) => mapNotification(item)))
}

function countSystemUnread({
  userRole = 'enterprise',
  notifications = [],
  transactions = [],
  userId = 0,
} = {}) {
  return buildRoleSystemMessages({ userRole, notifications, transactions, userId })
    .filter((item) => item.unread)
    .length
}

function markWorkerSystemMessageRead(userId, item) {
  if (!item || item.sourceType !== 'wallet') return
  const currentReadAt = getWorkerSystemReadAt(userId)
  const nextReadAt = Math.max(currentReadAt, toTime(item.createdAt))
  if (!nextReadAt) return
  setWorkerSystemReadAt(userId, nextReadAt)
}

function markWorkerSystemMessagesReadAll(userId, messages = []) {
  const latestWalletMessage = (Array.isArray(messages) ? messages : [])
    .filter((item) => item.sourceType === 'wallet')
    .sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt))[0]
  if (!latestWalletMessage) return
  markWorkerSystemMessageRead(userId, latestWalletMessage)
}

module.exports = {
  buildRoleSystemMessages,
  buildWorkerSystemMessages,
  countSystemUnread,
  getWorkerSystemReadAt,
  markWorkerSystemMessageRead,
  markWorkerSystemMessagesReadAll,
}
