# 编码规范

## 通用规范

### 命名规范
- **文件名**: 小写字母 + 连字符 (kebab-case)
  - ✅ `user-service.ts`
  - ❌ `UserService.ts`

- **类名**: 大驼峰 (PascalCase)
  - ✅ `UserService`
  - ❌ `userService`

- **变量/函数**: 小驼峰 (camelCase)
  - ✅ `getUserInfo`
  - ❌ `get_user_info`

- **常量**: 全大写 + 下划线
  - ✅ `MAX_RETRY_COUNT`
  - ❌ `maxRetryCount`

### 注释规范
```typescript
/**
 * 获取用户信息
 * @param userId 用户ID
 * @returns 用户信息对象
 */
async getUserInfo(userId: number): Promise<User> {
  // 实现逻辑
}
```

---

## 前端规范（微信小程序）

### 目录结构
```
pages/
  user/
    profile/
      index.js
      index.json
      index.wxml
      index.wxss
components/
  button/
    index.js
    index.json
    index.wxml
    index.wxss
utils/
  request.js
  auth.js
services/
  user.service.js
stores/
  user.store.js
```

### 页面结构
```javascript
// pages/user/profile/index.js
Page({
  data: {
    userInfo: null
  },

  onLoad(options) {
    this.loadUserInfo()
  },

  async loadUserInfo() {
    try {
      const res = await userService.getUserInfo()
      this.setData({ userInfo: res.data })
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  }
})
```

### 组件规范
```javascript
// components/button/index.js
Component({
  properties: {
    type: {
      type: String,
      value: 'primary'
    },
    disabled: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    handleTap() {
      if (this.data.disabled) return
      this.triggerEvent('tap')
    }
  }
})
```

### WXML规范
```xml
<!-- 使用数据绑定 -->
<view class="user-info">
  <image src="{{userInfo.avatar}}" />
  <text>{{userInfo.nickname}}</text>
</view>

<!-- 使用条件渲染 -->
<view wx:if="{{isLoading}}">加载中...</view>
<view wx:else>{{content}}</view>

<!-- 使用列表渲染 -->
<view wx:for="{{list}}" wx:key="id">
  {{item.name}}
</view>
```

### WXSS规范
```css
/* 使用rpx单位 */
.container {
  padding: 20rpx;
  font-size: 28rpx;
}

/* 使用BEM命名 */
.user-card {}
.user-card__avatar {}
.user-card__name {}
.user-card--active {}
```

---

## 后端规范（NestJS）

### 目录结构
```
src/
  modules/
    users/
      users.controller.ts
      users.service.ts
      users.module.ts
      dto/
        create-user.dto.ts
      entities/
        user.entity.ts
  common/
    filters/
    guards/
    interceptors/
    decorators/
```

### Controller规范
```typescript
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: User) {
    return this.usersService.findById(user.id)
  }

  @Put('type')
  async updateType(
    @CurrentUser() user: User,
    @Body() dto: UpdateTypeDto
  ) {
    return this.usersService.updateType(user.id, dto.user_type)
  }
}
```

### Service规范
```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService
  ) {}

  async findById(id: number): Promise<User> {
    // 先查缓存
    const cached = await this.redisService.get(`user:${id}`)
    if (cached) return JSON.parse(cached)

    // 查数据库
    const user = await this.userRepository.findOne({ where: { id } })
    if (!user) throw new NotFoundException('用户不存在')

    // 写缓存
    await this.redisService.set(`user:${id}`, JSON.stringify(user), 3600)

    return user
  }
}
```

### DTO规范
```typescript
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  nickname: string

  @IsEnum(['enterprise', 'worker'])
  @IsOptional()
  user_type?: string
}
```

### Entity规范
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  openid: string

  @Column()
  nickname: string

  @Column({ nullable: true })
  user_type: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
```

---

## 数据库规范

### 表命名
- 小写字母 + 下划线
- 复数形式
- ✅ `users`, `job_posts`
- ❌ `User`, `JobPost`

### 字段命名
- 小写字母 + 下划线
- ✅ `user_type`, `created_at`
- ❌ `userType`, `createdAt`

### 索引命名
- `idx_表名_字段名`
- ✅ `idx_users_openid`

### 外键命名
- `fk_表名_字段名`
- ✅ `fk_job_posts_user_id`

---

## Git规范

### 分支命名
- `feature/功能名` - 新功能
- `bugfix/bug描述` - Bug修复
- `hotfix/紧急修复` - 紧急修复
- `refactor/重构内容` - 重构

### Commit规范
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type类型**:
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

**示例**:
```
feat(user): 添加企业认证功能

- 添加企业认证表单
- 添加图片上传功能
- 添加OCR识别

Closes #123
```

---

## 代码审查清单

### 功能性
- [ ] 功能实现正确
- [ ] 边界条件处理
- [ ] 错误处理完整
- [ ] 日志记录充分

### 代码质量
- [ ] 命名清晰易懂
- [ ] 逻辑简洁明了
- [ ] 无重复代码
- [ ] 注释充分

### 性能
- [ ] 无性能瓶颈
- [ ] 数据库查询优化
- [ ] 缓存使用合理

### 安全
- [ ] 输入验证
- [ ] 权限检查
- [ ] 敏感信息加密
- [ ] SQL注入防护

---

**最后更新**: 2026-02-16
