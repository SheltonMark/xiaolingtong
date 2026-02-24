# 小灵通微信小程序 - 前端架构设计

## 1. 技术选型

### 1.1 核心技术
- **框架**: 微信原生小程序
- **UI组件库**: Vant Weapp
- **状态管理**: MobX (mobx-miniprogram + mobx-miniprogram-bindings)
- **网络请求**: 封装wx.request
- **工具库**: Day.js (日期处理)

### 1.2 开发工具
- **IDE**: 微信开发者工具
- **代码规范**: ESLint + Prettier
- **版本控制**: Git

---

## 2. 项目目录结构

```
xiaolingtong-miniprogram/
├── pages/                           # 页面目录
│   ├── index/                       # 首页
│   │   ├── index.js
│   │   ├── index.json
│   │   ├── index.wxml
│   │   └── index.wxss
│   │
│   ├── auth/                        # 认证相关
│   │   ├── login/                   # 登录页
│   │   ├── select-type/             # 选择用户类型
│   │   ├── enterprise-cert/         # 企业认证
│   │   └── worker-cert/             # 临工认证
│   │
│   ├── enterprise/                  # 企业用户页面
│   │   ├── home/                    # 企业首页
│   │   ├── info/                    # 供需信息
│   │   │   ├── list/                # 信息列表
│   │   │   ├── detail/              # 信息详情
│   │   │   ├── publish/             # 发布信息
│   │   │   └── my-posts/            # 我的发布
│   │   ├── job/                     # 用工管理
│   │   │   ├── publish/             # 发布用工需求
│   │   │   ├── my-jobs/             # 我的用工
│   │   │   └── job-detail/          # 用工详情
│   │   ├── member/                  # 会员中心
│   │   │   ├── index/               # 会员中心首页
│   │   │   └── buy/                 # 购买会员
│   │   └── profile/                 # 我的
│   │       ├── index/               # 个人中心
│   │       ├── view-chances/        # 查看机会
│   │       └── settings/            # 设置
│   │
│   ├── worker/                      # 临工用户页面
│   │   ├── home/                    # 临工首页
│   │   ├── job/                     # 用工相关
│   │   │   ├── list/                # 用工列表
│   │   │   ├── detail/              # 用工详情
│   │   │   ├── my-applications/     # 我的报名
│   │   │   └── working/             # 进行中的工作
│   │   ├── supervisor/              # 临时管理员
│   │   │   ├── checkin/             # 签到管理
│   │   │   ├── record/              # 工时/计件记录
│   │   │   ├── photos/              # 现场照片
│   │   │   └── report/              # 异常上报
│   │   ├── wallet/                  # 钱包
│   │   │   ├── index/               # 钱包首页
│   │   │   ├── withdraw/            # 提现
│   │   │   ├── income/              # 收入明细
│   │   │   └── withdraw-records/    # 提现记录
│   │   └── profile/                 # 我的
│   │       ├── index/               # 个人中心
│   │       ├── credit/              # 信用分
│   │       └── settings/            # 设置
│   │
│   ├── common/                      # 公共页面
│   │   ├── messages/                # 消息中心
│   │   ├── blacklist/               # 诚信曝光
│   │   └── webview/                 # WebView容器
│   │
│   └── payment/                     # 支付相关
│       ├── pay/                     # 支付页面
│       └── result/                  # 支付结果
│
├── components/                      # 组件目录
│   ├── info-card/                   # 信息卡片
│   ├── job-card/                    # 用工卡片
│   ├── user-header/                 # 用户头部
│   ├── cert-status/                 # 认证状态
│   ├── credit-badge/                # 信用分徽章
│   ├── empty-state/                 # 空状态
│   ├── loading/                     # 加载中
│   └── image-uploader/              # 图片上传
│
├── store/                           # 状态管理
│   ├── user.js                      # 用户状态
│   ├── config.js                    # 系统配置
│   └── message.js                   # 消息状态
│
├── utils/                           # 工具函数
│   ├── request.js                   # 网络请求封装
│   ├── auth.js                      # 认证相关
│   ├── storage.js                   # 本地存储
│   ├── validator.js                 # 表单验证
│   ├── format.js                    # 格式化工具
│   ├── location.js                  # 地理位置
│   └── wechat.js                    # 微信API封装
│
├── config/                          # 配置文件
│   ├── api.js                       # API配置
│   ├── constants.js                 # 常量定义
│   └── routes.js                    # 路由配置
│
├── styles/                          # 全局样式
│   ├── variables.wxss               # 变量定义
│   ├── common.wxss                  # 公共样式
│   └── theme.wxss                   # 主题样式
│
├── app.js                           # 小程序入口
├── app.json                         # 小程序配置
├── app.wxss                         # 全局样式
├── sitemap.json                     # 站点地图
├── project.config.json              # 项目配置
└── README.md
```

---

## 3. 核心功能设计

### 3.1 用户状态管理

```javascript
// store/user.js
import { observable, action } from 'mobx-miniprogram';

export const userStore = observable({
  // 用户信息
  userInfo: null,
  token: null,
  userType: null, // 'enterprise' | 'worker'
  certStatus: null,
  creditScore: 0,

  // 企业用户特有
  memberType: 'normal',
  memberExpireTime: null,
  viewChances: 0,

  // 临工用户特有
  balance: 0,
  totalIncome: 0,

  // 是否已登录
  get isLoggedIn() {
    return !!this.token;
  },

  // 是否已认证
  get isCertified() {
    return this.certStatus === 'approved';
  },

  // 是否是会员
  get isMember() {
    if (!this.memberExpireTime) return false;
    return new Date(this.memberExpireTime) > new Date();
  },

  // 设置用户信息
  setUserInfo: action(function(userInfo) {
    this.userInfo = userInfo;
    this.userType = userInfo.userType;
    this.certStatus = userInfo.certStatus;
    this.creditScore = userInfo.creditScore;

    if (userInfo.userType === 'enterprise') {
      this.memberType = userInfo.memberType;
      this.memberExpireTime = userInfo.memberExpireTime;
      this.viewChances = userInfo.viewChances;
    } else {
      this.balance = userInfo.balance;
      this.totalIncome = userInfo.totalIncome;
    }
  }),

  // 设置Token
  setToken: action(function(token) {
    this.token = token;
    wx.setStorageSync('token', token);
  }),

  // 清除用户信息
  clearUserInfo: action(function() {
    this.userInfo = null;
    this.token = null;
    this.userType = null;
    wx.removeStorageSync('token');
  }),

  // 更新查看机会
  updateViewChances: action(function(chances) {
    this.viewChances = chances;
  }),

  // 更新余额
  updateBalance: action(function(balance) {
    this.balance = balance;
  }),
});
```

### 3.2 网络请求封装

```javascript
// utils/request.js
import { userStore } from '../store/user';

const BASE_URL = 'https://api.example.com/api/v1';

class Request {
  request(options) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: BASE_URL + options.url,
        method: options.method || 'GET',
        data: options.data || {},
        header: {
          'Content-Type': 'application/json',
          'Authorization': userStore.token ? `Bearer ${userStore.token}` : '',
          ...options.header,
        },
        success: (res) => {
          if (res.statusCode === 200) {
            if (res.data.code === 0) {
              resolve(res.data.data);
            } else {
              this.handleError(res.data);
              reject(res.data);
            }
          } else if (res.statusCode === 401) {
            this.handleUnauthorized();
            reject(res.data);
          } else {
            this.handleError(res.data);
            reject(res.data);
          }
        },
        fail: (err) => {
          wx.showToast({
            title: '网络请求失败',
            icon: 'none',
          });
          reject(err);
        },
      });
    });
  }

  get(url, data) {
    return this.request({ url, method: 'GET', data });
  }

  post(url, data) {
    return this.request({ url, method: 'POST', data });
  }

  put(url, data) {
    return this.request({ url, method: 'PUT', data });
  }

  delete(url, data) {
    return this.request({ url, method: 'DELETE', data });
  }

  handleError(data) {
    wx.showToast({
      title: data.message || '操作失败',
      icon: 'none',
    });
  }

  handleUnauthorized() {
    userStore.clearUserInfo();
    wx.reLaunch({
      url: '/pages/auth/login/login',
    });
  }
}

export default new Request();
```

### 3.3 路由守卫

```javascript
// utils/auth.js
import { userStore } from '../store/user';

// 检查登录状态
export function checkLogin() {
  if (!userStore.isLoggedIn) {
    wx.showModal({
      title: '提示',
      content: '请先登录',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/auth/login/login',
          });
        }
      },
    });
    return false;
  }
  return true;
}

// 检查认证状态
export function checkCertified() {
  if (!checkLogin()) return false;

  if (!userStore.isCertified) {
    wx.showModal({
      title: '提示',
      content: '请先完成认证',
      success: (res) => {
        if (res.confirm) {
          const certPage = userStore.userType === 'enterprise'
            ? '/pages/auth/enterprise-cert/enterprise-cert'
            : '/pages/auth/worker-cert/worker-cert';
          wx.navigateTo({ url: certPage });
        }
      },
    });
    return false;
  }
  return true;
}

// 检查用户类型
export function checkUserType(requiredType) {
  if (!checkLogin()) return false;

  if (userStore.userType !== requiredType) {
    wx.showToast({
      title: '无权限访问',
      icon: 'none',
    });
    return false;
  }
  return true;
}

// 检查查看机会
export function checkViewChances() {
  if (userStore.isMember) return true;

  if (userStore.viewChances <= 0) {
    wx.showModal({
      title: '查看机会不足',
      content: '您的查看机会已用完，是否购买？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/enterprise/profile/view-chances/view-chances',
          });
        }
      },
    });
    return false;
  }
  return true;
}
```

### 3.4 微信登录

```javascript
// pages/auth/login/login.js
import request from '../../../utils/request';
import { userStore } from '../../../store/user';

Page({
  data: {
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
  },

  onLoad() {
    // 检查是否已登录
    const token = wx.getStorageSync('token');
    if (token) {
      this.checkLoginStatus(token);
    }
  },

  // 微信登录
  async handleLogin() {
    try {
      // 1. 获取code
      const { code } = await wx.login();

      // 2. 调用后端登录接口
      const res = await request.post('/user/login', { code });

      // 3. 保存token
      userStore.setToken(res.token);

      // 4. 判断是否是新用户
      if (res.isNewUser) {
        // 新用户，跳转到选择用户类型页面
        wx.redirectTo({
          url: '/pages/auth/select-type/select-type',
        });
      } else {
        // 老用户，获取用户信息
        await this.getUserInfo();

        // 跳转到首页
        this.navigateToHome();
      }
    } catch (err) {
      console.error('登录失败', err);
    }
  },

  // 获取用户信息
  async getUserInfo() {
    try {
      const userInfo = await request.get('/user/profile');
      userStore.setUserInfo(userInfo);
    } catch (err) {
      console.error('获取用户信息失败', err);
    }
  },

  // 跳转到首页
  navigateToHome() {
    const homePage = userStore.userType === 'enterprise'
      ? '/pages/enterprise/home/home'
      : '/pages/worker/home/home';

    wx.reLaunch({ url: homePage });
  },

  // 检查登录状态
  async checkLoginStatus(token) {
    userStore.setToken(token);
    try {
      await this.getUserInfo();
      this.navigateToHome();
    } catch (err) {
      // Token失效，清除本地存储
      userStore.clearUserInfo();
    }
  },
});
```

### 3.5 图片上传

```javascript
// components/image-uploader/image-uploader.js
import request from '../../utils/request';

Component({
  properties: {
    maxCount: {
      type: Number,
      value: 9,
    },
    images: {
      type: Array,
      value: [],
    },
  },

  methods: {
    // 选择图片
    async chooseImage() {
      try {
        const { tempFilePaths } = await wx.chooseImage({
          count: this.properties.maxCount - this.properties.images.length,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
        });

        // 上传图片
        wx.showLoading({ title: '上传中...' });
        const uploadPromises = tempFilePaths.map(path => this.uploadImage(path));
        const urls = await Promise.all(uploadPromises);
        wx.hideLoading();

        // 更新图片列表
        const newImages = [...this.properties.images, ...urls];
        this.triggerEvent('change', newImages);
      } catch (err) {
        console.error('选择图片失败', err);
      }
    },

    // 上传单张图片
    uploadImage(filePath) {
      return new Promise((resolve, reject) => {
        wx.uploadFile({
          url: 'https://api.example.com/api/v1/common/upload',
          filePath,
          name: 'file',
          header: {
            'Authorization': `Bearer ${wx.getStorageSync('token')}`,
          },
          success: (res) => {
            const data = JSON.parse(res.data);
            if (data.code === 0) {
              resolve(data.data.url);
            } else {
              reject(data.message);
            }
          },
          fail: reject,
        });
      });
    },

    // 预览图片
    previewImage(e) {
      const { index } = e.currentTarget.dataset;
      wx.previewImage({
        current: this.properties.images[index],
        urls: this.properties.images,
      });
    },

    // 删除图片
    deleteImage(e) {
      const { index } = e.currentTarget.dataset;
      const newImages = this.properties.images.filter((_, i) => i !== index);
      this.triggerEvent('change', newImages);
    },
  },
});
```

---

## 4. 页面设计规范

### 4.1 企业用户首页

```xml
<!-- pages/enterprise/home/home.wxml -->
<view class="container">
  <!-- 用户头部 -->
  <user-header userInfo="{{userInfo}}" />

  <!-- 认证状态提示 -->
  <view class="cert-tip" wx:if="{{certStatus !== 'approved'}}">
    <text>请先完成企业认证</text>
    <button bindtap="goCert">去认证</button>
  </view>

  <!-- 导航菜单 -->
  <view class="nav-grid">
    <view class="nav-item" bindtap="goPage" data-url="/pages/enterprise/info/list/list?type=purchase">
      <image src="/images/icon-purchase.png" />
      <text>采购需求</text>
    </view>
    <view class="nav-item" bindtap="goPage" data-url="/pages/enterprise/info/list/list?type=inventory">
      <image src="/images/icon-inventory.png" />
      <text>工厂库存</text>
    </view>
    <view class="nav-item" bindtap="goPage" data-url="/pages/enterprise/info/list/list?type=processing">
      <image src="/images/icon-processing.png" />
      <text>代加工服务</text>
    </view>
    <view class="nav-item" bindtap="goPage" data-url="/pages/enterprise/job/my-jobs/my-jobs">
      <image src="/images/icon-job.png" />
      <text>用工管理</text>
    </view>
  </view>

  <!-- 推荐信息 -->
  <view class="recommend-section">
    <view class="section-title">推荐信息</view>
    <info-card
      wx:for="{{recommendList}}"
      wx:key="id"
      info="{{item}}"
      bindtap="goDetail"
      data-id="{{item.id}}"
    />
  </view>
</view>
```

### 4.2 临工用户首页

```xml
<!-- pages/worker/home/home.wxml -->
<view class="container">
  <!-- 用户头部 -->
  <view class="user-header">
    <view class="user-info">
      <image class="avatar" src="{{userInfo.avatar}}" />
      <view class="info">
        <text class="name">{{userInfo.realName}}</text>
        <view class="credit">
          <text>信用分：</text>
          <credit-badge score="{{userInfo.creditScore}}" />
        </view>
      </view>
    </view>
    <view class="wallet" bindtap="goWallet">
      <text class="balance">¥{{balance}}</text>
      <text class="label">钱包余额</text>
    </view>
  </view>

  <!-- 认证状态提示 -->
  <view class="cert-tip" wx:if="{{certStatus !== 'approved'}}">
    <text>请先完成实名认证</text>
    <button bindtap="goCert">去认证</button>
  </view>

  <!-- 筛选条件 -->
  <view class="filter-bar">
    <picker mode="selector" range="{{jobTypes}}" range-key="name" bindchange="onJobTypeChange">
      <view class="filter-item">
        <text>{{selectedJobType || '工种'}}</text>
        <image src="/images/icon-arrow-down.png" />
      </view>
    </picker>
    <picker mode="region" bindchange="onCityChange">
      <view class="filter-item">
        <text>{{selectedCity || '地区'}}</text>
        <image src="/images/icon-arrow-down.png" />
      </view>
    </picker>
    <view class="filter-item" bindtap="toggleSort">
      <text>{{sortType === 'distance' ? '距离' : '时间'}}</text>
      <image src="/images/icon-sort.png" />
    </view>
  </view>

  <!-- 用工列表 -->
  <view class="job-list">
    <job-card
      wx:for="{{jobList}}"
      wx:key="id"
      job="{{item}}"
      bindtap="goJobDetail"
      data-id="{{item.id}}"
    />
  </view>

  <!-- 加载更多 -->
  <view class="load-more" wx:if="{{hasMore}}">
    <text>加载更多...</text>
  </view>
</view>
```

---

## 5. 组件设计

### 5.1 信息卡片组件

```xml
<!-- components/info-card/info-card.wxml -->
<view class="info-card" bindtap="handleTap">
  <!-- 置顶标识 -->
  <view class="top-badge" wx:if="{{info.isTop}}">置顶</view>

  <!-- 图片 -->
  <image class="cover" src="{{info.images[0]}}" mode="aspectFill" />

  <!-- 内容 -->
  <view class="content">
    <view class="title">{{info.title}}</view>
    <view class="meta">
      <text class="category">{{info.category}}</text>
      <text class="price" wx:if="{{info.price}}">¥{{info.price}}</text>
    </view>
    <view class="footer">
      <text class="location">{{info.city}}</text>
      <text class="time">{{info.createdAt}}</text>
    </view>
  </view>
</view>
```

### 5.2 用工卡片组件

```xml
<!-- components/job-card/job-card.wxml -->
<view class="job-card" bindtap="handleTap">
  <view class="header">
    <text class="job-type">{{job.jobTypeName}}</text>
    <text class="price">¥{{job.workerPrice}}/{{job.settlementType === 'hourly' ? '小时' : '件'}}</text>
  </view>

  <view class="title">{{job.title}}</view>

  <view class="info-row">
    <view class="info-item">
      <image src="/images/icon-people.png" />
      <text>需要{{job.requiredCount}}人 | 已报名{{job.appliedCount}}人</text>
    </view>
  </view>

  <view class="info-row">
    <view class="info-item">
      <image src="/images/icon-calendar.png" />
      <text>{{job.workStartDate}} - {{job.workEndDate}}</text>
    </view>
  </view>

  <view class="footer">
    <view class="location">
      <image src="/images/icon-location.png" />
      <text>{{job.distance}}km | {{job.city}} {{job.district}}</text>
    </view>
    <view class="credit">
      <text>工厂信用：</text>
      <credit-badge score="{{job.factoryCreditScore}}" size="small" />
    </view>
  </view>
</view>
```

---

## 6. 样式规范

### 6.1 变量定义

```css
/* styles/variables.wxss */
/* 颜色 */
--primary-color: #1989fa;
--success-color: #07c160;
--warning-color: #ff976a;
--danger-color: #ee0a24;
--text-color: #323233;
--text-color-secondary: #969799;
--border-color: #ebedf0;
--background-color: #f7f8fa;

/* 字体大小 */
--font-size-xs: 20rpx;
--font-size-sm: 24rpx;
--font-size-md: 28rpx;
--font-size-lg: 32rpx;
--font-size-xl: 36rpx;

/* 间距 */
--padding-xs: 16rpx;
--padding-sm: 24rpx;
--padding-md: 32rpx;
--padding-lg: 48rpx;

/* 圆角 */
--border-radius-sm: 8rpx;
--border-radius-md: 16rpx;
--border-radius-lg: 24rpx;
```

### 6.2 公共样式

```css
/* styles/common.wxss */
.container {
  min-height: 100vh;
  background-color: var(--background-color);
}

.page-padding {
  padding: var(--padding-md);
}

.card {
  background: #fff;
  border-radius: var(--border-radius-md);
  padding: var(--padding-md);
  margin-bottom: var(--padding-sm);
}

.btn-primary {
  background-color: var(--primary-color);
  color: #fff;
  border-radius: var(--border-radius-md);
}

.text-primary {
  color: var(--primary-color);
}

.text-secondary {
  color: var(--text-color-secondary);
}

.flex-row {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

---

## 7. 性能优化

### 7.1 图片优化
- 使用webp格式
- 图片懒加载
- 压缩图片质量

### 7.2 列表优化
- 使用虚拟列表
- 分页加载
- 防抖节流

### 7.3 缓存策略
- 缓存系统配置
- 缓存用户信息
- 缓存常用数据

---

**文档创建时间**: 2026-02-16 00:10
**状态**: Phase 2 进行中
