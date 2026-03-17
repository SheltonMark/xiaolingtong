const INCOME_TYPES = new Set(['income', 'commission', 'refund'])

const ROLE_META = {
  enterprise: {
    totalIncomeLabel: '累计返佣',
    recentRecordsLabel: '最近记录',
    incomeRecordTitle: '返佣到账',
    incomeTabLabel: '返佣',
    monthIncomeLabel: '本月返佣',
    monthCountLabel: '返佣笔数',
    incomePageTitle: '返佣明细',
    detailPageTitle: '钱包明细'
  },
  worker: {
    totalIncomeLabel: '累计收入',
    recentRecordsLabel: '最近记录',
    incomeRecordTitle: '工资到账',
    incomeTabLabel: '收入',
    monthIncomeLabel: '本月收入',
    monthCountLabel: '收入笔数',
    incomePageTitle: '收入明细',
    detailPageTitle: '钱包明细'
  }
}

function getRoleMeta(userRole = 'enterprise') {
  return ROLE_META[userRole] || ROLE_META.enterprise
}

function toNumber(value) {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num : 0
}

function roundMoney(value) {
  return Math.round(toNumber(value) * 100) / 100
}

function formatMoney(value) {
  return roundMoney(value).toFixed(2)
}

function toDate(raw, fallback) {
  const date = raw instanceof Date ? raw : new Date(raw)
  if (!Number.isNaN(date.getTime())) return date
  return fallback instanceof Date ? fallback : new Date(fallback || Date.now())
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatDateTime(raw) {
  const date = toDate(raw)
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDateKey(raw) {
  const date = toDate(raw)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatDateLabel(dateKey) {
  return dateKey.slice(5).replace('-', '/')
}

function getStatusText(status) {
  if (status === 'pending') return '处理中'
  if (status === 'failed') return '失败'
  return '成功'
}

function getStatusType(status) {
  if (status === 'pending') return 'pending'
  if (status === 'failed') return 'failed'
  return 'success'
}

function isIncomeType(type) {
  return INCOME_TYPES.has(type)
}

function getRecordTitle(item, userRole) {
  const meta = getRoleMeta(userRole)
  if (!isIncomeType(item.type)) return '提现到微信零钱'
  if (item.type === 'commission' || item.refType === 'bean_recharge') return '返佣到账'
  if (item.type === 'refund' || item.refType === 'refund') return '退款到账'
  return meta.incomeRecordTitle
}

function normalizeRecord(item, userRole) {
  if (!item) return null

  const createdAt = toDate(item.createdAt || item.updatedAt || Date.now())
  const isIncome = isIncomeType(item.type)
  const status = item.status || 'success'
  const amountValue = Math.abs(toNumber(item.amount))
  const dateKey = formatDateKey(createdAt)

  return {
    id: String(item.id || `wallet-record-${createdAt.getTime()}-${amountValue}`),
    type: isIncome ? 'income' : 'withdraw',
    rawType: item.type || '',
    refType: item.refType || '',
    title: getRecordTitle(item, userRole),
    detail: item.remark || '',
    status,
    statusText: getStatusText(status),
    statusType: getStatusType(status),
    iconText: isIncome ? '+' : '-',
    amountValue,
    amount: `${isIncome ? '+' : '-'}${formatMoney(amountValue)}`,
    amountDisplay: formatMoney(amountValue),
    createdAt: createdAt.toISOString(),
    dateKey,
    dateLabel: formatDateLabel(dateKey),
    desc: `${formatDateTime(createdAt)} · ${getStatusText(status)}`,
    isSynthetic: Boolean(item.isSynthetic)
  }
}

function extractTransactionList(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.list)) return payload.list
  return []
}

function canUseSyntheticRecord(payload, transactionList) {
  if (!payload || Array.isArray(payload)) return true

  const total = Number(payload.total)
  if (!Number.isFinite(total)) return true

  return transactionList.length >= total
}

function sortRecords(records) {
  return records.slice().sort((a, b) => {
    const timeDiff = toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()
    if (timeDiff !== 0) return timeDiff
    return String(b.id).localeCompare(String(a.id))
  })
}

function createSyntheticIncomeRecord(wallet, transactionList, userRole) {
  const recordedIncome = transactionList
    .filter((item) => isIncomeType(item.type) && (item.status || 'success') === 'success')
    .reduce((sum, item) => sum + toNumber(item.amount), 0)

  const displayIncome = getDisplayIncomeTotal(wallet, transactionList)
  const gap = roundMoney(displayIncome - recordedIncome)

  if (gap <= 0) return null

  return {
    id: `synthetic-income-${toDate(wallet.updatedAt || Date.now()).getTime()}`,
    type: userRole === 'enterprise' ? 'commission' : 'income',
    amount: gap,
    status: 'success',
    refType: 'manual_adjustment',
    createdAt: wallet.updatedAt || wallet.createdAt || new Date().toISOString(),
    isSynthetic: true
  }
}

function getDisplayIncomeTotal(wallet, transactionList) {
  const recordedIncome = transactionList
    .filter((item) => isIncomeType(item.type) && (item.status || 'success') === 'success')
    .reduce((sum, item) => sum + toNumber(item.amount), 0)

  const walletIncome = toNumber(wallet.totalIncome)
  const derivedIncome = toNumber(wallet.balance) + toNumber(wallet.totalWithdraw)

  return Math.max(walletIncome, recordedIncome, derivedIncome)
}

function buildWalletRecordsModel({ wallet = {}, transactions = [], userRole = 'enterprise' }) {
  const transactionList = extractTransactionList(transactions)
  const syntheticRecord = canUseSyntheticRecord(transactions, transactionList)
    ? createSyntheticIncomeRecord(wallet, transactionList, userRole)
    : null
  const rawRecords = syntheticRecord ? transactionList.concat([syntheticRecord]) : transactionList.slice()
  const records = sortRecords(rawRecords.map((item) => normalizeRecord(item, userRole)).filter(Boolean))

  const recordedWithdraw = records
    .filter((item) => item.type === 'withdraw' && item.status !== 'failed')
    .reduce((sum, item) => sum + item.amountValue, 0)

  return {
    records,
    summary: {
      totalIncome: formatMoney(getDisplayIncomeTotal(wallet, transactionList)),
      totalWithdraw: formatMoney(Math.max(toNumber(wallet.totalWithdraw), recordedWithdraw)),
      balance: formatMoney(wallet.balance),
      totalCount: records.length
    }
  }
}

function buildRecordGroups(records) {
  const groupedMap = {}
  records.forEach((record) => {
    if (!groupedMap[record.dateKey]) groupedMap[record.dateKey] = []
    groupedMap[record.dateKey].push(record)
  })

  return Object.keys(groupedMap)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((dateKey) => ({
      date: formatDateLabel(dateKey),
      items: groupedMap[dateKey]
    }))
}

function filterRecordsByMonth(records, year, month) {
  const monthKey = `${year}-${pad(month)}`
  return records.filter((record) => record.dateKey.slice(0, 7) === monthKey)
}

module.exports = {
  buildRecordGroups,
  buildWalletRecordsModel,
  extractTransactionList,
  filterRecordsByMonth,
  formatDateTime,
  getRoleMeta,
  isIncomeType
}
