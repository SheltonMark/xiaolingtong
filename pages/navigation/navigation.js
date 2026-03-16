Page({
  data: {
    targetLocation: null,
    userLocation: null,
    targetName: '',
    targetAddress: '',
    markers: [],
    polyline: []
  },

  onLoad(options) {
    // 获取目标位置信息
    if (options.lat && options.lng) {
      const targetLat = parseFloat(options.lat)
      const targetLng = parseFloat(options.lng)

      this.setData({
        targetLocation: {
          latitude: targetLat,
          longitude: targetLng
        },
        targetName: decodeURIComponent(options.name || '目标位置'),
        targetAddress: decodeURIComponent(options.address || '')
      })
    }

    // 获取用户当前位置
    this.getUserLocation()
  },

  getUserLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          userLocation: {
            latitude: res.latitude,
            longitude: res.longitude
          }
        }, () => {
          this.updateMarkers()
        })
      },
      fail: (err) => {
        console.error('获取位置失败', err)
        wx.showToast({
          title: '获取位置失败',
          icon: 'none'
        })
      }
    })
  },

  updateMarkers() {
    const { userLocation, targetLocation, targetName } = this.data
    if (!userLocation || !targetLocation) return

    const markers = [
      {
        id: 1,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        callout: {
          content: '我的位置',
          color: '#fff',
          fontSize: 13,
          borderRadius: 8,
          bgColor: '#10B981',
          padding: 8,
          display: 'ALWAYS'
        }
      },
      {
        id: 2,
        latitude: targetLocation.latitude,
        longitude: targetLocation.longitude,
        callout: {
          content: targetName,
          color: '#fff',
          fontSize: 13,
          borderRadius: 8,
          bgColor: '#F97316',
          padding: 8,
          display: 'ALWAYS'
        }
      }
    ]

    // 绘制路线
    const polyline = [{
      points: [
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        },
        {
          latitude: targetLocation.latitude,
          longitude: targetLocation.longitude
        }
      ],
      color: '#3B82F6',
      width: 4,
      dottedLine: false,
      arrowLine: true
    }]

    this.setData({ markers, polyline })
  },

  onNavigate() {
    const { targetLocation, targetName, targetAddress } = this.data
    if (!targetLocation) {
      wx.showToast({ title: '目标位置信息缺失', icon: 'none' })
      return
    }

    wx.openLocation({
      latitude: targetLocation.latitude,
      longitude: targetLocation.longitude,
      name: targetName,
      address: targetAddress,
      scale: 15
    })
  }
})
