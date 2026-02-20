Page({
  data: {
    userRole: 'worker',
    swiperCurrent: 0,
    job: {
      id: 'j1',
      title: '电子组装工',
      need: 15,
      salary: '20',
      salaryUnit: '元/小时',
      salaryType: '按小时计费',
      urgent: true,
      location: '东莞长安',
      distance: '3km',
      dateRange: '02-10 至 02-17（共7天）',
      hours: '08:00 - 18:00',
      description: '负责电子元器件的组装、焊接和质检工作，需要细心耐心，有经验者优先。',
      applied: 5,
      total: 15,
      benefits: [
        { label: '包午餐', color: 'green' },
        { label: '有空调', color: 'blue' },
        { label: '长期合作', color: 'amber' }
      ],
      images: [
        'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=375&h=220&fit=crop',
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=375&h=220&fit=crop',
        'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=375&h=220&fit=crop'
      ],
      company: {
        name: '鑫达电子厂',
        avatar: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=80&h=80&fit=crop',
        verified: true,
        creditScore: 92,
        contact: '李主管',
        phone: '139****5678'
      }
    }
  },

  onSwiperChange(e) {
    this.setData({ swiperCurrent: e.detail.current })
  },

  onShow() {
    const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
    this.setData({ userRole })
  },

  onApply() {
    wx.showModal({
      title: '确认报名',
      content: '报名后等待平台分配，开工前一天需确认出勤',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '报名成功', icon: 'success' })
        }
      }
    })
  },

  onGoSettlement() {
    wx.navigateTo({ url: '/pages/settlement/settlement?jobId=' + this.data.job.id })
  },

  onCallPhone() {
    wx.makePhoneCall({ phoneNumber: '13900005678', fail() {} })
  }
})
