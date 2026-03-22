Page({
  data: {
    targetLocation: null,
    userLocation: null,
    targetName: '',
    targetAddress: '',
    markers: [],
    polyline: [],
    locationUnavailable: false
  },

  onLoad(options) {
    if (options.lat && options.lng) {
      const targetLat = parseFloat(options.lat)
      const targetLng = parseFloat(options.lng)
      if (Number.isFinite(targetLat) && Number.isFinite(targetLng) && (targetLat || targetLng)) {
        this.setData({
          targetLocation: {
            latitude: targetLat,
            longitude: targetLng
          },
          targetName: decodeURIComponent(options.name || '目标位置'),
          targetAddress: decodeURIComponent(options.address || '')
        }, () => {
          this.updateMarkers()
        })
      }
    }

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
          },
          locationUnavailable: false
        }, () => {
          this.updateMarkers()
        })
      },
      fail: () => {
        this.setData({ locationUnavailable: true }, () => {
          this.updateMarkers()
        })
      }
    })
  },

  updateMarkers() {
    const { userLocation, targetLocation, targetName } = this.data
    if (!targetLocation) return

    const markers = [
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
    let polyline = []

    if (userLocation) {
      markers.unshift({
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
      })
      polyline = [{
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
    }

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
