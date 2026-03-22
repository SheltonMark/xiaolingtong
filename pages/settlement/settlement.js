const { get } = require('../../utils/request')
const auth = require('../../utils/auth')

function resolveRole(role) {
  if (role === 'worker' || role === 'manager') return role
  return 'enterprise'
}

function buildWorkflowUrl(jobId, role, tab, viewOnly) {
  return `/pages/job-process/job-process?jobId=${jobId}&tab=${tab}&role=${role}&viewOnly=${viewOnly ? 1 : 0}`
}

function formatDateRange(item) {
  if (item.dateRange) return item.dateRange
  if (item.dateStart && item.dateEnd) return `${item.dateStart} ~ ${item.dateEnd}`
  return item.dateStart || item.dateEnd || ''
}

function toTimestamp(value) {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function getEnterpriseMeta(item) {
  if (item.timeState === 'settlement' || item.status === 'pending_settlement') {
    return {
      badgeText: '待结算',
      badgeTone: 'amber',
      hint: item.timeHint || '考勤已确认，可直接进入结算明细处理支付。',
      actionText: '去结算',
      targetTab: 'settlement',
      priority: 0,
      isPending: true
    }
  }

  if (item.timeState === 'end_overdue') {
    return {
      badgeText: '待考勤',
      badgeTone: 'blue',
      hint: item.timeHint || '已过完工时间，先确认考勤再进入结算。',
      actionText: '先核考勤',
      targetTab: 'attendance',
      priority: 1,
      isPending: true
    }
  }

  if (item.status === 'settled') {
    return {
      badgeText: '已结算',
      badgeTone: 'green',
      hint: '可查看结算结果和当前支付状态。',
      actionText: '查看结算',
      targetTab: 'settlement',
      priority: 2,
      isPending: false
    }
  }

  if (item.status === 'closed') {
    return {
      badgeText: '已关闭',
      badgeTone: 'slate',
      hint: '工单已关闭，可回看历史流程和结算记录。',
      actionText: '查看记录',
      targetTab: 'settlement',
      priority: 3,
      isPending: false
    }
  }

  return {
    badgeText: '进行中',
    badgeTone: 'sky',
    hint: item.timeHint || '当前工单尚未进入结算，可先查看流程进度。',
    actionText: '查看流程',
    targetTab: 'applications',
    priority: 4,
    isPending: false
  }
}

function mapEnterpriseRecord(item) {
  const meta = getEnterpriseMeta(item)
  const subtitle = [item.companyName || '', formatDateRange(item), item.location || '']
    .filter(Boolean)
    .join(' · ')

  return {
    id: item.id,
    sortTime: toTimestamp(item.updatedAt || item.createdAt || item.dateEnd || item.dateStart),
    title: item.title || '未命名工单',
    subtitle,
    badgeText: meta.badgeText,
    badgeTone: meta.badgeTone,
    hint: meta.hint,
    actionText: meta.actionText,
    targetUrl: buildWorkflowUrl(item.id, 'enterprise', meta.targetTab, false),
    isPending: meta.isPending,
    priority: meta.priority
  }
}

function getWorkerMeta(item, role) {
  const viewOnly = role === 'worker'

  if (item.stage === 'settlement') {
    return {
      badgeText: '待结算',
      badgeTone: 'amber',
      hint: '可查看工资明细，并跟进当前结算状态。',
      actionText: '去结算',
      targetUrl: buildWorkflowUrl(item.id, role, 'settlement', viewOnly),
      priority: 0,
      isPending: true
    }
  }

  if (item.stage === 'done') {
    return {
      badgeText: '已完成',
      badgeTone: 'green',
      hint: '订单已完成，可查看历史结算结果。',
      actionText: '查看结算',
      targetUrl: buildWorkflowUrl(item.id, role, 'settlement', viewOnly),
      priority: 1,
      isPending: false
    }
  }

  if (item.stage === 'checkin') {
    return {
      badgeText: '待签到',
      badgeTone: 'blue',
      hint: role === 'manager' ? '先处理签到和考勤，再继续进入结算。' : '先完成签到，后续结算会同步到这里。',
      actionText: role === 'manager' ? '去考勤' : '去签到',
      targetUrl: role === 'manager'
        ? buildWorkflowUrl(item.id, role, 'attendance', false)
        : `/pages/checkin/checkin?orderId=${item.id}&mode=${item.mode || 'hourly'}`,
      priority: 3,
      isPending: false
    }
  }

  return {
    badgeText: '进行中',
    badgeTone: 'sky',
    hint: role === 'manager' ? '先查看考勤汇总，结算完成后会回到这里。' : '当前订单仍在进行中，可先查看用工进度。',
    actionText: role === 'manager' ? '看考勤' : '查看进度',
    targetUrl: role === 'manager'
      ? buildWorkflowUrl(item.id, role, 'attendance', false)
      : `/pages/work-session/work-session?orderId=${item.id}&mode=${item.mode || 'hourly'}`,
    priority: 2,
    isPending: false
  }
}

function mapWorkerRecord(item, role) {
  const meta = getWorkerMeta(item, role)
  const subtitle = [item.jobType || item.title || '', item.dateRange || '', item.salary || '']
    .filter(Boolean)
    .join(' · ')

  return {
    id: item.id,
    sortTime: toTimestamp(item.updatedAt || item.dateEnd || item.dateStart),
    title: item.company || '未命名工单',
    subtitle,
    badgeText: meta.badgeText,
    badgeTone: meta.badgeTone,
    hint: meta.hint,
    actionText: meta.actionText,
    targetUrl: meta.targetUrl,
    isPending: meta.isPending,
    priority: meta.priority
  }
}

function sortRecords(a, b) {
  if (a.priority !== b.priority) return a.priority - b.priority
  return b.sortTime - a.sortTime
}

function buildSummary(role, records) {
  const pendingCount = records.filter(item => item.isPending).length

  if (role === 'enterprise') {
    return {
      title: '工资结算入口',
      headline: pendingCount > 0 ? `${pendingCount} 个工单待处理` : '统一查看结算相关工单',
      text: '可从这里直接进入结算、考勤或完整用工流程，兼容原来的单页入口。'
    }
  }

  if (role === 'manager') {
    return {
      title: '结算与考勤入口',
      headline: pendingCount > 0 ? `${pendingCount} 个工单待跟进` : '统一查看负责工单',
      text: '签到、考勤和结算进度会汇总在这里，便于从旧入口继续处理。'
    }
  }

  return {
    title: '我的结算入口',
    headline: pendingCount > 0 ? `${pendingCount} 条记录待查看` : '统一查看工资结算记录',
    text: '可在这里继续进入签到、进度和结算结果，兼容原来的工资结算入口。'
  }
}

function getEmptyState(role) {
  if (role === 'enterprise') {
    return {
      emptyTitle: '暂无可查看工单',
      emptySubText: '发布或管理工单后，这里会聚合待结算、已结算和待核考勤记录。',
      primaryListLabel: '查看我的发布',
      primaryListUrl: '/pages/my-posts/my-posts'
    }
  }

  if (role === 'manager') {
    return {
      emptyTitle: '暂无可处理工单',
      emptySubText: '开始管理工单后，这里会展示签到、考勤和结算相关记录。',
      primaryListLabel: '查看用工记录',
      primaryListUrl: '/pages/work-record/work-record'
    }
  }

  return {
    emptyTitle: '暂无结算记录',
    emptySubText: '参与工单后，这里会展示待结算、已完成和进行中的记录。',
    primaryListLabel: '查看用工记录',
    primaryListUrl: '/pages/work-record/work-record'
  }
}

Page({
  data: {
    pageTitle: '工作结算',
    redirecting: true,
    hubMode: false,
    loading: false,
    notLoggedIn: false,
    role: 'enterprise',
    targetUrl: '',
    records: [],
    summaryTitle: '工资结算入口',
    summaryHeadline: '统一查看结算相关工单',
    summaryText: '',
    emptyTitle: '暂无记录',
    emptySubText: '',
    primaryListLabel: '返回我的发布',
    primaryListUrl: '/pages/my-posts/my-posts'
  },

  onLoad(options) {
    const jobId = options.jobId || ''
    const storedRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    const role = resolveRole(options.role || storedRole)
    const viewOnly = options.viewOnly === '1' || role === 'worker'
    const targetUrl = jobId
      ? buildWorkflowUrl(jobId, role, options.tab || 'settlement', viewOnly)
      : ''
    const emptyState = getEmptyState(role)

    this.setData({
      role,
      targetUrl,
      emptyTitle: emptyState.emptyTitle,
      emptySubText: emptyState.emptySubText,
      primaryListLabel: emptyState.primaryListLabel,
      primaryListUrl: emptyState.primaryListUrl
    })

    if (jobId) {
      this.redirectToWorkflow(targetUrl)
      return
    }

    const summary = buildSummary(role, [])
    this.setData({
      redirecting: false,
      hubMode: true,
      notLoggedIn: !auth.isLoggedIn(),
      summaryTitle: summary.title,
      summaryHeadline: summary.headline,
      summaryText: summary.text
    })
  },

  onShow() {
    if (!this.data.hubMode) return

    const notLoggedIn = !auth.isLoggedIn()
    if (notLoggedIn !== this.data.notLoggedIn) {
      this.setData({ notLoggedIn })
    }
    if (notLoggedIn) return

    this.loadHubRecords()
  },

  onPullDownRefresh() {
    if (!this.data.hubMode || this.data.notLoggedIn) {
      wx.stopPullDownRefresh()
      return
    }

    this.loadHubRecords().then(() => {
      wx.stopPullDownRefresh()
    }).catch(() => {
      wx.stopPullDownRefresh()
    })
  },

  loadHubRecords() {
    const role = this.data.role
    const emptyState = getEmptyState(role)

    this.setData({
      loading: true,
      records: [],
      emptyTitle: emptyState.emptyTitle,
      emptySubText: emptyState.emptySubText
    })

    const loader = role === 'enterprise'
      ? get('/jobs/mine').then(res => {
        const list = res.data.list || res.data || []
        return list.map(item => mapEnterpriseRecord(item)).sort(sortRecords)
      })
      : get('/work/orders').then(res => {
        const list = res.data || res || []
        return list.map(item => mapWorkerRecord(item, role)).sort(sortRecords)
      })

    return loader.then(records => {
      const summary = buildSummary(role, records)
      this.setData({
        loading: false,
        records,
        summaryTitle: summary.title,
        summaryHeadline: summary.headline,
        summaryText: summary.text
      })
    }).catch(() => {
      this.setData({
        loading: false,
        records: [],
        emptyTitle: '加载失败',
        emptySubText: '暂时无法获取结算入口数据，请稍后重试或从具体工单进入。'
      })
    })
  },

  redirectToWorkflow(url) {
    wx.redirectTo({
      url,
      fail: () => {
        wx.navigateTo({
          url,
          fail: () => {
            wx.reLaunch({
              url,
              fail: () => {
                this.setData({ redirecting: false })
              }
            })
          }
        })
      }
    })
  },

  onOpenRecord(e) {
    const { url } = e.currentTarget.dataset
    if (!url) return
    wx.navigateTo({ url })
  },

  onOpenPrimaryList() {
    if (!this.data.primaryListUrl) return
    wx.navigateTo({ url: this.data.primaryListUrl })
  },

  onGoLogin() {
    auth.goLogin()
  },

  onOpenWorkflow() {
    if (!this.data.targetUrl) return
    wx.navigateTo({ url: this.data.targetUrl })
  },

  onBackMine() {
    wx.switchTab({ url: '/pages/mine/mine' })
  }
})
