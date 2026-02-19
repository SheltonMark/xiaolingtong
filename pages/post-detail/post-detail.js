Page({
  data: {
    swiperCurrent: 0,
    detail: {
      id: 'p1',
      type: 'purchase',
      typeText: '采购需求',
      title: '保温杯3000个采购，304不锈钢材质，500ml容量',
      avatar: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=80&h=80&fit=crop',
      location: '东莞',
      certText: '已认证贸易商',
      industry: '日用百货',
      publishTime: '2026-02-07',
      expireTime: '2026-03-09',
      postCount: 12,
      views: 1287,
      contactViews: 32,
      fields: [
        { label: '物品名称', value: '304不锈钢保温杯' },
        { label: '品类', value: '日用百货' },
        { label: '规格参数', value: '500ml容量，带保温盖，双层真空' },
        { label: '采购数量', value: '3000 个', bold: true },
        { label: '预算范围', value: '¥10 ~ ¥15 / 个', highlight: true },
        { label: '交货周期', value: '30天内' },
        { label: '质量要求', value: '需通过FDA认证，无毒无味，保温效果6小时以上' },
        { label: '地区', value: '广东 · 东莞' }
      ],
      desc: '有现货优先，长期合作，量大从优。需要带保温盖，包装要求简约风格。',
      images: [
        'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=375&h=280&fit=crop',
        'https://images.unsplash.com/photo-1570554520913-ce2192a74574?w=375&h=280&fit=crop',
        'https://images.unsplash.com/photo-1544816155-12df9643f363?w=375&h=280&fit=crop'
      ]
    },
    contactUnlocked: false,
    contactInfo: {
      name: '王经理',
      phone: '138****1234',
      wechat: 'wang_trade_2024'
    }
  },

  onLoad(options) {},

  onSwiperChange(e) {
    this.setData({ swiperCurrent: e.detail.current })
  },

  onUnlockContact() {
    wx.showModal({
      title: '查看联系方式',
      content: '消耗10灵豆查看联系方式，确认？',
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

  onChat() {
    wx.navigateTo({ url: '/pages/chat/chat?id=' + this.data.detail.id })
  },

  onShare() {
    wx.showToast({ title: '分享功能开发中', icon: 'none' })
  },

  onReport() {
    wx.navigateTo({ url: '/pages/report/report?id=' + this.data.detail.id })
  }
})
