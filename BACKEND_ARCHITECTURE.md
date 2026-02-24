# 小灵通微信小程序 - 后端架构设计

## 1. 技术选型

### 1.1 核心技术栈
- **框架**: NestJS (推荐)
  - 理由: TypeScript原生支持、模块化架构、依赖注入、装饰器语法、内置支持多种功能
- **数据库ORM**: TypeORM
  - 理由: 与NestJS完美集成、支持MySQL、TypeScript支持
- **缓存**: ioredis
- **鉴权**: JWT + Passport
- **验证**: class-validator + class-transformer
- **文档**: Swagger (自动生成API文档)

### 1.2 开发工具
- **语言**: TypeScript
- **包管理**: pnpm
- **代码规范**: ESLint + Prettier
- **Git Hooks**: Husky + lint-staged

---

## 2. 项目目录结构

```
xiaolingtong-backend/
├── src/
│   ├── main.ts                      # 应用入口
│   ├── app.module.ts                # 根模块
│   ├── config/                      # 配置文件
│   │   ├── database.config.ts       # 数据库配置
│   │   ├── redis.config.ts          # Redis配置
│   │   ├── wechat.config.ts         # 微信配置
│   │   └── app.config.ts            # 应用配置
│   │
│   ├── common/                      # 公共模块
│   │   ├── decorators/              # 自定义装饰器
│   │   │   ├── user-type.decorator.ts
│   │   │   ├── auth.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── guards/                  # 守卫
│   │   │   ├── auth.guard.ts        # 认证守卫
│   │   │   ├── roles.guard.ts       # 角色守卫
│   │   │   └── cert.guard.ts        # 认证状态守卫
│   │   ├── interceptors/            # 拦截器
│   │   │   ├── transform.interceptor.ts  # 响应转换
│   │   │   └── logging.interceptor.ts    # 日志记录
│   │   ├── filters/                 # 异常过滤器
│   │   │   └── http-exception.filter.ts
│   │   ├── pipes/                   # 管道
│   │   │   └── validation.pipe.ts
│   │   ├── dto/                     # 公共DTO
│   │   │   ├── pagination.dto.ts
│   │   │   └── response.dto.ts
│   │   ├── enums/                   # 枚举
│   │   │   ├── user-type.enum.ts
│   │   │   ├── cert-status.enum.ts
│   │   │   └── error-code.enum.ts
│   │   └── utils/                   # 工具函数
│   │       ├── crypto.util.ts
│   │       ├── date.util.ts
│   │       └── distance.util.ts
│   │
│   ├── modules/                     # 业务模块
│   │   ├── user/                    # 用户模块
│   │   │   ├── user.module.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── user.entity.ts
│   │   │   │   ├── enterprise-cert.entity.ts
│   │   │   │   └── worker-cert.entity.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       ├── register.dto.ts
│   │   │       ├── enterprise-cert.dto.ts
│   │   │       └── worker-cert.dto.ts
│   │   │
│   │   ├── info/                    # 供需信息模块
│   │   │   ├── info.module.ts
│   │   │   ├── info.controller.ts
│   │   │   ├── info.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── info-post.entity.ts
│   │   │   │   └── contact-view.entity.ts
│   │   │   └── dto/
│   │   │       ├── publish-info.dto.ts
│   │   │       ├── query-info.dto.ts
│   │   │       └── view-contact.dto.ts
│   │   │
│   │   ├── job/                     # 临工用工模块
│   │   │   ├── job.module.ts
│   │   │   ├── job.controller.ts
│   │   │   ├── job.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── job-post.entity.ts
│   │   │   │   ├── job-application.entity.ts
│   │   │   │   ├── job-checkin.entity.ts
│   │   │   │   ├── job-photo.entity.ts
│   │   │   │   ├── job-issue.entity.ts
│   │   │   │   ├── job-settlement.entity.ts
│   │   │   │   └── job-settlement-detail.entity.ts
│   │   │   └── dto/
│   │   │       ├── publish-job.dto.ts
│   │   │       ├── apply-job.dto.ts
│   │   │       ├── checkin.dto.ts
│   │   │       └── settlement.dto.ts
│   │   │
│   │   ├── payment/                 # 支付财务模块
│   │   │   ├── payment.module.ts
│   │   │   ├── payment.controller.ts
│   │   │   ├── payment.service.ts
│   │   │   ├── wechat-pay.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── order.entity.ts
│   │   │   │   ├── wallet.entity.ts
│   │   │   │   ├── wallet-transaction.entity.ts
│   │   │   │   ├── withdrawal.entity.ts
│   │   │   │   └── view-chance.entity.ts
│   │   │   └── dto/
│   │   │       ├── buy-member.dto.ts
│   │   │       ├── buy-view-chance.dto.ts
│   │   │       └── withdraw.dto.ts
│   │   │
│   │   ├── message/                 # 消息通知模块
│   │   │   ├── message.module.ts
│   │   │   ├── message.controller.ts
│   │   │   ├── message.service.ts
│   │   │   ├── wechat-notify.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── message.entity.ts
│   │   │   │   └── wechat-subscription.entity.ts
│   │   │   └── dto/
│   │   │       └── send-message.dto.ts
│   │   │
│   │   ├── admin/                   # 管理后台模块
│   │   │   ├── admin.module.ts
│   │   │   ├── admin.controller.ts
│   │   │   ├── admin.service.ts
│   │   │   ├── entities/
│   │   │   │   └── admin-user.entity.ts
│   │   │   └── dto/
│   │   │       ├── admin-login.dto.ts
│   │   │       ├── audit.dto.ts
│   │   │       └── assign-workers.dto.ts
│   │   │
│   │   ├── config/                  # 系统配置模块
│   │   │   ├── config.module.ts
│   │   │   ├── config.service.ts
│   │   │   └── entities/
│   │   │       ├── system-config.entity.ts
│   │   │       ├── job-type.entity.ts
│   │   │       ├── open-city.entity.ts
│   │   │       ├── keyword-blacklist.entity.ts
│   │   │       └── category.entity.ts
│   │   │
│   │   └── upload/                  # 文件上传模块
│   │       ├── upload.module.ts
│   │       ├── upload.controller.ts
│   │       └── upload.service.ts
│   │
│   ├── shared/                      # 共享服务
│   │   ├── redis/                   # Redis服务
│   │   │   ├── redis.module.ts
│   │   │   └── redis.service.ts
│   │   ├── wechat/                  # 微信服务
│   │   │   ├── wechat.module.ts
│   │   │   ├── wechat-auth.service.ts
│   │   │   ├── wechat-pay.service.ts
│   │   │   └── wechat-notify.service.ts
│   │   ├── oss/                     # 对象存储服务
│   │   │   ├── oss.module.ts
│   │   │   └── oss.service.ts
│   │   └── credit/                  # 信用分服务
│   │       ├── credit.module.ts
│   │       └── credit.service.ts
│   │
│   └── tasks/                       # 定时任务
│       ├── tasks.module.ts
│       ├── attendance-reminder.task.ts
│       ├── member-expire-reminder.task.ts
│       └── view-chance-expire.task.ts
│
├── test/                            # 测试文件
├── .env.development                 # 开发环境变量
├── .env.production                  # 生产环境变量
├── .eslintrc.js                     # ESLint配置
├── .prettierrc                      # Prettier配置
├── tsconfig.json                    # TypeScript配置
├── nest-cli.json                    # NestJS CLI配置
├── package.json
└── README.md
```

---

## 3. 核心设计模式

### 3.1 响应格式统一

```typescript
// common/dto/response.dto.ts
export class ResponseDto<T> {
  code: number;
  message: string;
  data?: T;

  static success<T>(data?: T, message = 'success'): ResponseDto<T> {
    return {
      code: 0,
      message,
      data,
    };
  }

  static error(code: number, message: string): ResponseDto<null> {
    return {
      code,
      message,
      data: null,
    };
  }
}
```

### 3.2 权限控制

```typescript
// common/guards/auth.guard.ts
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // JWT验证逻辑
    return true;
  }
}

// common/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserType[]>('roles', context.getHandler());
    const { user } = context.switchToHttp().getRequest();
    // 检查用户类型
    return requiredRoles.includes(user.userType);
  }
}

// common/guards/cert.guard.ts
@Injectable()
export class CertGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    // 检查认证状态
    return user.certStatus === CertStatus.APPROVED;
  }
}
```

### 3.3 装饰器使用

```typescript
// 使用示例
@Controller('info')
@UseGuards(AuthGuard, RolesGuard)
export class InfoController {

  @Post('publish')
  @Roles(UserType.ENTERPRISE)  // 仅企业用户
  @UseGuards(CertGuard)         // 需要已认证
  async publishInfo(@Body() dto: PublishInfoDto) {
    // 发布信息
  }

  @Post('contact/:id')
  @Roles(UserType.ENTERPRISE)
  async viewContact(@Param('id') id: number, @User() user) {
    // 查看联系方式
  }
}
```

---

## 4. 数据库连接配置

### 4.1 TypeORM配置

```typescript
// config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false, // 生产环境必须为false
  logging: process.env.NODE_ENV === 'development',
  timezone: '+08:00',
  charset: 'utf8mb4',
  extra: {
    connectionLimit: 10,
  },
};
```

### 4.2 Redis配置

```typescript
// config/redis.config.ts
export const redisConfig = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: 'xiaolingtong:',
};
```

---

## 5. 缓存策略

### 5.1 Redis Key设计

```typescript
// 会话缓存
session:{token}                    // TTL: 7天
// 查看机会计数
view_chances:{userId}              // 永久（数据变更时更新）
// 未读消息数
unread_msg:{userId}                // 永久（消息变更时更新）
// 系统配置缓存
config:{configKey}                 // TTL: 1小时
// 工种列表
job_types                          // TTL: 1小时
// 开放城市列表
open_cities                        // TTL: 1小时
// 用户信息缓存
user:{userId}                      // TTL: 30分钟
```

### 5.2 缓存服务

```typescript
// shared/redis/redis.service.ts
@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private redis: Redis) {}

  // 获取查看机会
  async getViewChances(userId: number): Promise<number> {
    const key = `view_chances:${userId}`;
    const cached = await this.redis.get(key);
    if (cached) return parseInt(cached);

    // 从数据库查询并缓存
    const chances = await this.calculateViewChances(userId);
    await this.redis.set(key, chances);
    return chances;
  }

  // 消耗查看机会
  async consumeViewChance(userId: number): Promise<boolean> {
    const key = `view_chances:${userId}`;
    const chances = await this.getViewChances(userId);
    if (chances <= 0) return false;

    await this.redis.decr(key);
    return true;
  }

  // 获取系统配置
  async getConfig(configKey: string): Promise<any> {
    const key = `config:${configKey}`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    // 从数据库查询并缓存
    const config = await this.fetchConfigFromDB(configKey);
    await this.redis.setex(key, 3600, JSON.stringify(config));
    return config;
  }
}
```

---

## 6. 微信支付集成

### 6.1 支付服务

```typescript
// shared/wechat/wechat-pay.service.ts
@Injectable()
export class WechatPayService {

  // 统一下单
  async createOrder(params: {
    userId: number;
    orderNo: string;
    amount: number;
    description: string;
  }) {
    // 调用微信支付API
    const result = await this.wechatPay.transactions.jsapi({
      appid: this.config.appId,
      mchid: this.config.mchId,
      description: params.description,
      out_trade_no: params.orderNo,
      amount: {
        total: Math.round(params.amount * 100), // 转为分
      },
      payer: {
        openid: await this.getUserOpenid(params.userId),
      },
    });

    return this.buildPayParams(result);
  }

  // 企业付款到零钱（工资发放、提现）
  async transferToUser(params: {
    userId: number;
    amount: number;
    description: string;
  }) {
    const openid = await this.getUserOpenid(params.userId);

    const result = await this.wechatPay.transfer({
      appid: this.config.appId,
      out_batch_no: this.generateBatchNo(),
      batch_name: params.description,
      batch_remark: params.description,
      total_amount: Math.round(params.amount * 100),
      total_num: 1,
      transfer_detail_list: [{
        out_detail_no: this.generateDetailNo(),
        transfer_amount: Math.round(params.amount * 100),
        transfer_remark: params.description,
        openid: openid,
      }],
    });

    return result;
  }

  // 支付回调处理
  async handleCallback(body: any, signature: string) {
    // 验证签名
    const verified = this.verifySignature(body, signature);
    if (!verified) throw new Error('Invalid signature');

    // 解密数据
    const data = this.decrypt(body.resource);

    // 处理订单
    await this.processOrder(data);
  }
}
```

---

## 7. 信用分自动计算

### 7.1 信用分服务

```typescript
// shared/credit/credit.service.ts
@Injectable()
export class CreditService {

  // 信用分变动规则
  private readonly RULES = {
    // 临工
    WORKER_COMPLETE_JOB: 2,
    WORKER_ABSENT: -10,
    WORKER_MULTIPLE_ABSENT: -20,
    WORKER_COMPLAINED: -15,
    WORKER_LEAVE_EARLY: -5,
    WORKER_FAKE_RECORD: -20,

    // 工厂
    FACTORY_PAY_ON_TIME: 1,
    FACTORY_PAY_LATE: -5,
    FACTORY_UNPAID: -20,
    FACTORY_COMPLAINED: -10,
    FACTORY_OFFLINE_DEAL: -30,
    FACTORY_COMPLETE_JOB: 2,
  };

  // 更新信用分
  async updateCredit(params: {
    userId: number;
    action: string;
    reason: string;
  }) {
    const change = this.RULES[params.action] || 0;
    if (change === 0) return;

    const user = await this.userRepository.findOne(params.userId);
    const newScore = Math.max(0, Math.min(100, user.creditScore + change));

    await this.userRepository.update(params.userId, {
      creditScore: newScore,
    });

    // 记录信用分变动历史
    await this.creditHistoryRepository.save({
      userId: params.userId,
      change,
      reason: params.reason,
      scoreBefore: user.creditScore,
      scoreAfter: newScore,
    });

    // 发送通知
    await this.messageService.send({
      userId: params.userId,
      title: '信用分变动',
      content: `您的信用分${change > 0 ? '增加' : '减少'}了${Math.abs(change)}分，原因：${params.reason}`,
    });

    // 检查是否需要限制账号
    if (newScore < 60) {
      await this.handleLowCredit(params.userId, newScore);
    }
  }

  // 处理低信用分
  private async handleLowCredit(userId: number, score: number) {
    if (score < 30) {
      // 封号
      await this.userRepository.update(userId, {
        accountStatus: AccountStatus.DISABLED,
      });
    } else if (score < 60) {
      // 限制功能
      await this.userRepository.update(userId, {
        accountStatus: AccountStatus.LIMITED,
      });
    }
  }
}
```

---

## 8. 定时任务

### 8.1 任务配置

```typescript
// tasks/attendance-reminder.task.ts
@Injectable()
export class AttendanceReminderTask {
  @Cron('0 0 8 * * *') // 每天早上8点执行
  async handleCron() {
    // 查询明天需要出勤的临工
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
    const applications = await this.jobApplicationRepository.find({
      where: {
        status: ApplicationStatus.SELECTED,
        workStartDate: tomorrow,
        attendanceConfirmed: false,
      },
    });

    // 发送出勤确认提醒
    for (const app of applications) {
      await this.messageService.send({
        userId: app.workerId,
        title: '出勤确认提醒',
        content: `您明天有工作安排，请确认是否出勤`,
        linkType: 'job_application',
        linkId: app.id,
      });

      await this.wechatNotifyService.send({
        userId: app.workerId,
        templateType: 'attendance_reminder',
        data: {
          jobTitle: app.job.title,
          workDate: tomorrow,
          deadline: '今晚20:00前',
        },
      });
    }
  }
}
```

---

## 9. 日志记录

### 9.1 日志拦截器

```typescript
// common/interceptors/logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const response = context.switchToHttp().getResponse();
        const delay = Date.now() - now;

        this.logger.log({
          method,
          url,
          userId: user?.id,
          statusCode: response.statusCode,
          delay: `${delay}ms`,
          timestamp: new Date().toISOString(),
        });
      }),
      catchError((error) => {
        this.logger.error({
          method,
          url,
          userId: user?.id,
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }),
    );
  }
}
```

---

## 10. 环境变量配置

```bash
# .env.development
NODE_ENV=development
PORT=3000

# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_DATABASE=xiaolingtong

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 微信
WECHAT_APP_ID=your_app_id
WECHAT_APP_SECRET=your_app_secret
WECHAT_MCH_ID=your_mch_id
WECHAT_API_KEY=your_api_key

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# OSS
OSS_ACCESS_KEY_ID=your_access_key
OSS_ACCESS_KEY_SECRET=your_secret_key
OSS_BUCKET=your_bucket
OSS_REGION=oss-cn-guangzhou
```

---

**文档创建时间**: 2026-02-15 24:00
**状态**: Phase 2 进行中
