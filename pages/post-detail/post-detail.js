Page({
  data: {
    detail: {
      id: 'p1',
      type: 'purchase',
      title: '304不锈钢保温杯采购',
      avatarText: '日',
      avatarBg: '#DBEAFE',
      avatarColor: '#3B82F6',
      location: '东莞',
      certText: '已认证贸易商',
      industry: '日用百货',
      publishTime: '2026-02-07',
      expireTime: '2026-03-07',
      fields: [
        { label: '产品名称', value: '304不锈钢保温杯' },
        { label: '品类', value: '日用百货' },
        { label: '规格参数', value: '500ml，带保温盖，双层真空' },
        { label: '采购数量', value: '3000个' },
        { label: '预算范围', value: '¥10~15/个' },
        { label: '交货周期', value: '30天内' },
        { label: '质量要求', value: '有现货优先，长期合作，量大从优' }
      ],
      images: []
    },
    contactUnlocked: false,
    contactInfo: {
      name: '张经理',
      phone: '138****1234',
      wechat: 'zhangsan_trade'
    }
  },

  onLoad(options) {
    // 实际项目中根据 options.id 请求详情
  },

  onUnlockContact() {
    wx.showModal({
      title: '查看联系方式',
      content: '消耗1次查看机会，确认查看？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ contactUnlocked: true })
          wx.showToast({ title: '解锁成功', icon: 'success' })
        }
      }
    })
  },

  onCopyWechat() {
    wx.setClipboardData({ data: this.data.contactInfo.wechat })
  },

  onCallPhone() {
    wx.makePhoneCall({ phoneNumber: '13800001234', fail() {} })
  },

  onReport() {
    wx.navigateTo({ url: '/pages/report/report?id=' + this.data.detail.id })
  },

  onShare() {
    wx.showToast({ title: '分享功能开发中', icon: 'none' })
  }
})
