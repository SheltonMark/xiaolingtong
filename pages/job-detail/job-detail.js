Page({
  data: {
    job: {
      id: 'j1',
      title: '电子组装工',
      need: 15,
      salary: '20',
      salaryUnit: '元/小时',
      salaryType: '计时',
      urgent: true,
      location: '东莞长安',
      distance: '3km',
      dateRange: '02-10 至 02-17',
      hours: '08:00-18:00',
      description: '负责电子产品组装，需要细心耐心，有经验者优先。工厂提供工具和材料，按时计薪。',
      applied: 5,
      total: 15,
      tags: ['包午餐', '有空调', '长期合作'],
      company: {
        name: '鑫达电子厂',
        verified: true,
        creditScore: 92,
        contact: '李主管',
        phone: '138****5678'
      }
    }
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

  onCallPhone() {
    wx.makePhoneCall({ phoneNumber: '13800005678', fail() {} })
  },

  onShare() {
    wx.showToast({ title: '分享功能开发中', icon: 'none' })
  }
})
