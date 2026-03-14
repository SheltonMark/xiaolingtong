const { get, post } = require('../../utils/request')

Page({
  data: {
    job: {},
    applications: [],
    pendingApps: [],
    acceptedApps: [],
    confirmedApps: [],
    rejectedApps: [],
    loading: false,
    // 筛选、排序、搜索相关
    filterType: 'all', // all, supervisor, normal
    sortBy: 'time', // time, credit, completion
    sortOrder: 'desc', // asc, desc
    searchKeyword: '',
    showFilterMenu: false,
    showSortMenu: false
  },

  onLoad(options) {
    if (options.jobId) {
      this.loadJobDetail(options.jobId)
      this.loadApplications(options.jobId)
    }
  },

  onShow() {
    if (this.data.job.id) {
      this.loadApplications(this.data.job.id)
    }
  },

  loadJobDetail(jobId) {
    get('/jobs/' + jobId).then(res => {
      const job = res.data || {}
      const statusMap = {
        recruiting: { text: '招工中', color: 'green' },
        full: { text: '已满员', color: 'amber' },
        working: { text: '进行中', color: 'green' },
        pending_settlement: { text: '待结算', color: 'amber' },
        settled: { text: '已结算', color: 'green' },
        closed: { text: '已关闭', color: 'gray' }
      }
      const statusMeta = statusMap[job.status] || { text: '招工中', color: 'green' }
      this.setData({
        job: {
          ...job,
          statusText: statusMeta.text,
          statusColor: statusMeta.color,
          needCount: job.need || 0,
          appliedCount: job.applied || 0
        }
      })
    }).catch(() => {})
  },

  loadApplications(jobId) {
    this.setData({ loading: true })
    get('/jobs/' + jobId + '/applications').then(res => {
      const data = res.data || {}
      // 后端返回分组数据：{ pending: [], accepted: [], confirmed: [], rejected: [], released: [], cancelled: [], working: [], done: [] }
      const pending = (data.pending || []).map(app => this.formatApplication(app))
      const accepted = (data.accepted || []).map(app => this.formatApplication(app))
      const confirmed = (data.confirmed || []).map(app => this.formatApplication(app))
      const rejected = (data.rejected || []).map(app => this.formatApplication(app))
      const released = (data.released || []).map(app => this.formatApplication(app))
      const cancelled = (data.cancelled || []).map(app => this.formatApplication(app))
      const working = (data.working || []).map(app => this.formatApplication(app))
      const done = (data.done || []).map(app => this.formatApplication(app))

      this.setData({
        applications: [...pending, ...accepted, ...confirmed, ...rejected, ...released, ...cancelled, ...working, ...done],
        pendingApps: pending,
        acceptedApps: accepted,
        confirmedApps: confirmed,
        rejectedApps: rejected,
        releasedApps: released,
        cancelledApps: cancelled,
        workingApps: working,
        doneApps: done,
        loading: false
      })
    }).catch((err) => {
      console.error('Failed to load applications:', err)
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    })
  },

  formatApplication(app) {
    const workerInfo = app.worker || {}
    return {
      id: app.id,
      workerName: workerInfo.nickname || '未知',
      creditScore: workerInfo.creditScore || 0,
      totalOrders: workerInfo.totalOrders || 0,
      completionRate: workerInfo.completionRate || 0,
      averageRating: workerInfo.averageRating || 0,
      isSupervisorCandidate: workerInfo.isSupervisorCandidate || false,
      appliedAt: this.formatDate(app.createdAt),
      status: app.status
    }
  },

  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hours}:${minutes}`
  },

  onAcceptApplication(e) {
    const applicationId = e.currentTarget.dataset.id
    const jobId = e.currentTarget.dataset.jobId

    wx.showModal({
      title: '确认接受',
      content: '确认接受该临工的报名吗？',
      success: (res) => {
        if (res.confirm) {
          this.acceptApplication(jobId, applicationId)
        }
      }
    })
  },

  acceptApplication(jobId, applicationId) {
    post(`/jobs/${jobId}/applications/${applicationId}/accept`, { action: 'accepted' })
      .then(() => {
        wx.showToast({ title: '已接受', icon: 'success' })
        this.loadApplications(jobId)
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '操作失败', icon: 'none' })
      })
  },

  onRejectApplication(e) {
    const applicationId = e.currentTarget.dataset.id
    const jobId = e.currentTarget.dataset.jobId

    wx.showModal({
      title: '确认拒绝',
      content: '确认拒绝该临工的报名吗？',
      success: (res) => {
        if (res.confirm) {
          this.rejectApplication(jobId, applicationId)
        }
      }
    })
  },

  rejectApplication(jobId, applicationId) {
    post(`/jobs/${jobId}/applications/${applicationId}/accept`, { action: 'rejected' })
      .then(() => {
        wx.showToast({ title: '已拒绝', icon: 'success' })
        this.loadApplications(jobId)
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '操作失败', icon: 'none' })
      })
  },

  onViewDetail(e) {
    const applicationId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/applicant-detail/applicant-detail?applicationId=' + applicationId
    })
  },

  // 筛选功能
  onFilterChange(e) {
    const filterType = e.currentTarget.dataset.type
    this.setData({ filterType, showFilterMenu: false })
    this.applyFiltersAndSort()
  },

  toggleFilterMenu() {
    this.setData({ showFilterMenu: !this.data.showFilterMenu })
  },

  // 排序功能
  onSortChange(e) {
    const sortBy = e.currentTarget.dataset.sort
    let sortOrder = this.data.sortOrder

    // 如果点击同一个排序选项，切换升序/降序
    if (this.data.sortBy === sortBy) {
      sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'
    } else {
      sortOrder = 'desc'
    }

    this.setData({ sortBy, sortOrder, showSortMenu: false })
    this.applyFiltersAndSort()
  },

  toggleSortMenu() {
    this.setData({ showSortMenu: !this.data.showSortMenu })
  },

  // 搜索功能
  onSearchInput(e) {
    const searchKeyword = e.detail.value
    this.setData({ searchKeyword })
    this.applyFiltersAndSort()
  },

  clearSearch() {
    this.setData({ searchKeyword: '' })
    this.applyFiltersAndSort()
  },

  // 应用筛选、排序、搜索
  applyFiltersAndSort() {
    const { pendingApps, acceptedApps, confirmedApps, rejectedApps, filterType, sortBy, sortOrder, searchKeyword } = this.data

    // 合并所有应用
    const allApps = [...pendingApps, ...acceptedApps, ...confirmedApps, ...rejectedApps]

    // 应用筛选
    let filtered = allApps.filter(app => {
      if (filterType === 'supervisor') {
        return app.isSupervisorCandidate
      } else if (filterType === 'normal') {
        return !app.isSupervisorCandidate
      }
      return true
    })

    // 应用搜索
    if (searchKeyword) {
      filtered = filtered.filter(app => {
        return app.workerName.toLowerCase().includes(searchKeyword.toLowerCase())
      })
    }

    // 应用排序
    filtered.sort((a, b) => {
      let compareValue = 0

      if (sortBy === 'time') {
        // 按报名时间排序（需要转换时间字符串）
        const timeA = new Date(a.appliedAt).getTime()
        const timeB = new Date(b.appliedAt).getTime()
        compareValue = timeA - timeB
      } else if (sortBy === 'credit') {
        // 按信用分排序
        compareValue = a.creditScore - b.creditScore
      } else if (sortBy === 'completion') {
        // 按完成度排序
        compareValue = a.completionRate - b.completionRate
      }

      return sortOrder === 'desc' ? -compareValue : compareValue
    })

    // 按状态重新分组
    const grouped = {
      pending: [],
      accepted: [],
      confirmed: [],
      rejected: []
    }

    filtered.forEach(app => {
      if (app.status === 'pending') {
        grouped.pending.push(app)
      } else if (app.status === 'accepted') {
        grouped.accepted.push(app)
      } else if (app.status === 'confirmed') {
        grouped.confirmed.push(app)
      } else if (app.status === 'rejected') {
        grouped.rejected.push(app)
      }
    })

    this.setData({
      pendingApps: grouped.pending,
      acceptedApps: grouped.accepted,
      confirmedApps: grouped.confirmed,
      rejectedApps: grouped.rejected
    })
  }
})
