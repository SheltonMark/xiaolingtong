# Phase 3 实现计划 - 评价系统、纠纷处理、数据分析

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现评价系统、纠纷处理和数据分析功能，完善招工平台的用户体验和数据洞察。

**Architecture:** 采用分层架构，后端实现业务逻辑（评价管理、纠纷处理、数据统计），前端实现UI展示（评价列表、纠纷管理、数据报表）。使用 NestJS + TypeORM 处理数据，Redis 缓存统计数据。

**Tech Stack:** NestJS + TypeORM + Jest + Supertest + Redis

---

## Phase 3 概述

**时间**: 2 周
**任务数**: 8 个
**测试数**: 50+ 个
**预期覆盖率**: > 90%

### 任务分解

| Task | 名称 | 优先级 | 工期 |
|------|------|--------|------|
| 20 | 评价系统 - 数据模型 | 高 | 2 天 |
| 21 | 评价系统 - API 端点 | 高 | 2 天 |
| 22 | 纠纷处理 - 数据模型 | 中 | 2 天 |
| 23 | 纠纷处理 - API 端点 | 中 | 2 天 |
| 24 | 数据分析 - 统计服务 | 中 | 2 天 |
| 25 | 数据分析 - API 端点 | 中 | 2 天 |
| 26 | Phase 3 集成测试 | 中 | 2 天 |
| 27 | Phase 3 验证和文档 | 低 | 1 天 |

---

## Task 20: 评价系统 - 数据模型

**Files:**
- Create: `server/src/entities/rating.entity.ts`
- Create: `server/src/modules/rating/rating.service.ts`
- Create: `server/src/modules/rating/rating.spec.ts`
- Modify: `server/src/modules/rating/rating.module.ts`

**Step 1: 创建 Rating 实体**

```typescript
// server/src/entities/rating.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Job } from './job.entity';
import { User } from './user.entity';

@Entity('ratings')
export class Rating {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  jobId: number;

  @Column()
  raterId: number; // 评价者 ID

  @Column()
  ratedId: number; // 被评价者 ID

  @Column({ type: 'varchar', length: 50 })
  raterRole: 'worker' | 'enterprise'; // 评价者角色

  @Column({ type: 'int', default: 5 })
  score: number; // 评分 1-5

  @Column({ type: 'text', nullable: true })
  comment: string; // 评价内容

  @Column({ type: 'json', nullable: true })
  tags: string[]; // 标签（如：守时、专业、友好）

  @Column({ type: 'boolean', default: false })
  isAnonymous: boolean; // 是否匿名

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: 'pending' | 'approved' | 'rejected'; // 审核状态

  @ManyToOne(() => Job)
  job: Job;

  @ManyToOne(() => User)
  rater: User;

  @ManyToOne(() => User)
  rated: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**Step 2: 编写评价系统测试**

```typescript
// server/src/modules/rating/rating.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RatingService } from './rating.service';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';
import { Rating } from '../../entities/rating.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('RatingService', () => {
  let service: RatingService;
  let jobRepository: any;
  let userRepository: any;
  let ratingRepository: any;

  beforeEach(async () => {
    jobRepository = { findOne: jest.fn() };
    userRepository = { findOne: jest.fn(), save: jest.fn() };
    ratingRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingService,
        { provide: getRepositoryToken(Job), useValue: jobRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Rating), useValue: ratingRepository },
      ],
    }).compile();

    service = module.get<RatingService>(RatingService);
  });

  describe('createRating', () => {
    it('should create rating successfully', async () => {
      const jobId = 1;
      const raterId = 2;
      const ratedId = 3;
      const score = 5;
      const comment = 'Great work!';

      const mockJob = { id: jobId };
      const mockRater = { id: raterId };
      const mockRated = { id: ratedId, averageRating: 4.5, ratingCount: 10 };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValueOnce(mockRater);
      userRepository.findOne.mockResolvedValueOnce(mockRated);
      ratingRepository.create.mockReturnValue({
        jobId,
        raterId,
        ratedId,
        score,
        comment,
        status: 'pending',
      });
      ratingRepository.save.mockResolvedValue({
        id: 1,
        jobId,
        raterId,
        ratedId,
        score,
        comment,
        status: 'pending',
      });

      const result = await service.createRating(jobId, raterId, ratedId, 'worker', score, comment);

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
    });

    it('should reject if score out of range', async () => {
      await expect(service.createRating(1, 2, 3, 'worker', 6, 'comment')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject if job not found', async () => {
      jobRepository.findOne.mockResolvedValue(null);

      await expect(service.createRating(1, 2, 3, 'worker', 5, 'comment')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getRatings', () => {
    it('should get ratings for user', async () => {
      const userId = 1;
      const mockRatings = [
        { id: 1, ratedId: userId, score: 5, comment: 'Good' },
        { id: 2, ratedId: userId, score: 4, comment: 'OK' },
      ];

      ratingRepository.findAndCount.mockResolvedValue([mockRatings, 2]);

      const result = await service.getRatings(userId);

      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('approveRating', () => {
    it('should approve rating and update user average', async () => {
      const mockRating = { id: 1, ratedId: 2, score: 5, status: 'pending' };
      const mockUser = { id: 2, averageRating: 4.5, ratingCount: 10 };

      ratingRepository.findOne.mockResolvedValue(mockRating);
      userRepository.findOne.mockResolvedValue(mockUser);
      ratingRepository.save.mockResolvedValue({ ...mockRating, status: 'approved' });

      const result = await service.approveRating(1);

      expect(result.status).toBe('approved');
    });
  });
});
```

**Step 3: 实现评价服务**

```typescript
// server/src/modules/rating/rating.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from '../../entities/rating.entity';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class RatingService {
  constructor(
    @InjectRepository(Rating) private ratingRepo: Repository<Rating>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async createRating(
    jobId: number,
    raterId: number,
    ratedId: number,
    raterRole: 'worker' | 'enterprise',
    score: number,
    comment?: string,
    tags?: string[],
  ) {
    if (score < 1 || score > 5) {
      throw new BadRequestException('Score must be between 1 and 5');
    }

    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const rater = await this.userRepo.findOne({ where: { id: raterId } });
    if (!rater) {
      throw new NotFoundException('Rater not found');
    }

    const rated = await this.userRepo.findOne({ where: { id: ratedId } });
    if (!rated) {
      throw new NotFoundException('Rated user not found');
    }

    const rating = this.ratingRepo.create({
      jobId,
      raterId,
      ratedId,
      raterRole,
      score,
      comment,
      tags,
      status: 'pending',
    });

    return this.ratingRepo.save(rating);
  }

  async getRatings(userId: number, page = 1, pageSize = 20) {
    const [list, total] = await this.ratingRepo.findAndCount({
      where: { ratedId: userId, status: 'approved' },
      relations: ['rater'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { list, total, page, pageSize };
  }

  async approveRating(ratingId: number) {
    const rating = await this.ratingRepo.findOne({ where: { id: ratingId } });
    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    rating.status = 'approved';
    await this.ratingRepo.save(rating);

    // 更新用户平均评分
    const ratings = await this.ratingRepo.find({
      where: { ratedId: rating.ratedId, status: 'approved' },
    });

    const averageScore = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
    const user = await this.userRepo.findOne({ where: { id: rating.ratedId } });
    user.averageRating = Math.round(averageScore * 10) / 10;
    user.ratingCount = ratings.length;
    await this.userRepo.save(user);

    return rating;
  }

  async rejectRating(ratingId: number) {
    const rating = await this.ratingRepo.findOne({ where: { id: ratingId } });
    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    rating.status = 'rejected';
    return this.ratingRepo.save(rating);
  }
}
```

**Step 4: 运行测试**

```bash
cd server
npm test -- rating.spec.ts
# Expected: PASS (所有测试通过)
```

**Step 5: 提交**

```bash
git add server/src/entities/rating.entity.ts server/src/modules/rating/rating.service.ts server/src/modules/rating/rating.spec.ts
git commit -m "feat: 实现评价系统数据模型和服务"
```

---

## Task 21: 评价系统 - API 端点

**Files:**
- Create: `server/src/modules/rating/rating.controller.ts`
- Create: `server/src/modules/rating/rating.controller.spec.ts`

**Step 1: 编写 API 端点测试**

```typescript
// server/src/modules/rating/rating.controller.spec.ts
describe('POST /ratings', () => {
  it('should create rating successfully', async () => {
    const response = await request(app.getHttpServer())
      .post('/ratings')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        jobId: 1,
        ratedId: 2,
        score: 5,
        comment: 'Great work!',
        tags: ['professional', 'punctual'],
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.status).toBe('pending');
  });

  it('should return 400 when score invalid', async () => {
    await request(app.getHttpServer())
      .post('/ratings')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ jobId: 1, ratedId: 2, score: 6 })
      .expect(400);
  });
});

describe('GET /users/:userId/ratings', () => {
  it('should get user ratings', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/1/ratings')
      .expect(200);

    expect(Array.isArray(response.body.list)).toBe(true);
  });
});

describe('POST /ratings/:id/approve', () => {
  it('should approve rating', async () => {
    const response = await request(app.getHttpServer())
      .post('/ratings/1/approve')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.status).toBe('approved');
  });
});
```

**Step 2: 实现 API 端点**

```typescript
// server/src/modules/rating/rating.controller.ts
import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { RatingService } from './rating.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('ratings')
export class RatingController {
  constructor(private ratingService: RatingService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createRating(@Body() dto: any, @Req() req: any) {
    return this.ratingService.createRating(
      dto.jobId,
      req.user.id,
      dto.ratedId,
      req.user.role,
      dto.score,
      dto.comment,
      dto.tags,
    );
  }

  @Get('users/:userId')
  async getUserRatings(@Param('userId') userId: number, @Body() query: any) {
    return this.ratingService.getRatings(userId, query.page, query.pageSize);
  }

  @Post(':id/approve')
  @UseGuards(AuthGuard('jwt'))
  async approveRating(@Param('id') id: number) {
    return this.ratingService.approveRating(id);
  }

  @Post(':id/reject')
  @UseGuards(AuthGuard('jwt'))
  async rejectRating(@Param('id') id: number) {
    return this.ratingService.rejectRating(id);
  }
}
```

**Step 3: 运行测试**

```bash
npm test -- rating.controller.spec.ts
# Expected: PASS
```

**Step 4: 提交**

```bash
git add server/src/modules/rating/rating.controller.ts server/src/modules/rating/rating.controller.spec.ts
git commit -m "feat: 添加评价系统 API 端点"
```

---

## Task 22: 纠纷处理 - 数据模型

**Files:**
- Create: `server/src/entities/dispute.entity.ts`
- Create: `server/src/modules/dispute/dispute.service.ts`
- Create: `server/src/modules/dispute/dispute.spec.ts`

**Step 1: 创建 Dispute 实体**

```typescript
// server/src/entities/dispute.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Job } from './job.entity';
import { User } from './user.entity';

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  jobId: number;

  @Column()
  complainantId: number; // 投诉人 ID

  @Column()
  respondentId: number; // 被投诉人 ID

  @Column({ type: 'varchar', length: 50 })
  type: 'payment' | 'quality' | 'behavior' | 'other'; // 纠纷类型

  @Column({ type: 'text' })
  description: string; // 纠纷描述

  @Column({ type: 'json', nullable: true })
  evidence: string[]; // 证据（图片/文件 URL）

  @Column({ type: 'varchar', length: 50, default: 'open' })
  status: 'open' | 'in_progress' | 'resolved' | 'closed'; // 状态

  @Column({ type: 'varchar', length: 50, nullable: true })
  resolution: 'complainant_win' | 'respondent_win' | 'settlement'; // 解决方案

  @Column({ type: 'text', nullable: true })
  resolutionNotes: string; // 解决备注

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  compensationAmount: number; // 赔偿金额

  @ManyToOne(() => Job)
  job: Job;

  @ManyToOne(() => User)
  complainant: User;

  @ManyToOne(() => User)
  respondent: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**Step 2: 编写纠纷处理测试**

```typescript
// server/src/modules/dispute/dispute.spec.ts
describe('DisputeService', () => {
  let service: DisputeService;
  let disputeRepository: any;

  beforeEach(async () => {
    disputeRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputeService,
        { provide: getRepositoryToken(Dispute), useValue: disputeRepository },
      ],
    }).compile();

    service = module.get<DisputeService>(DisputeService);
  });

  describe('createDispute', () => {
    it('should create dispute successfully', async () => {
      const mockDispute = {
        id: 1,
        jobId: 1,
        complainantId: 2,
        respondentId: 3,
        type: 'payment',
        description: 'Payment not received',
        status: 'open',
      };

      disputeRepository.create.mockReturnValue(mockDispute);
      disputeRepository.save.mockResolvedValue(mockDispute);

      const result = await service.createDispute(1, 2, 3, 'payment', 'Payment not received');

      expect(result.status).toBe('open');
    });
  });

  describe('resolveDispute', () => {
    it('should resolve dispute successfully', async () => {
      const mockDispute = { id: 1, status: 'in_progress' };

      disputeRepository.findOne.mockResolvedValue(mockDispute);
      disputeRepository.save.mockResolvedValue({
        ...mockDispute,
        status: 'resolved',
        resolution: 'complainant_win',
      });

      const result = await service.resolveDispute(1, 'complainant_win', 'Complainant is right', 100);

      expect(result.status).toBe('resolved');
    });
  });
});
```

**Step 3: 实现纠纷服务**

```typescript
// server/src/modules/dispute/dispute.service.ts
@Injectable()
export class DisputeService {
  constructor(
    @InjectRepository(Dispute) private disputeRepo: Repository<Dispute>,
  ) {}

  async createDispute(
    jobId: number,
    complainantId: number,
    respondentId: number,
    type: 'payment' | 'quality' | 'behavior' | 'other',
    description: string,
    evidence?: string[],
  ) {
    const dispute = this.disputeRepo.create({
      jobId,
      complainantId,
      respondentId,
      type,
      description,
      evidence,
      status: 'open',
    });

    return this.disputeRepo.save(dispute);
  }

  async getDisputes(page = 1, pageSize = 20) {
    return this.disputeRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async resolveDispute(
    disputeId: number,
    resolution: 'complainant_win' | 'respondent_win' | 'settlement',
    resolutionNotes: string,
    compensationAmount?: number,
  ) {
    const dispute = await this.disputeRepo.findOne({ where: { id: disputeId } });
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.resolutionNotes = resolutionNotes;
    dispute.compensationAmount = compensationAmount;

    return this.disputeRepo.save(dispute);
  }
}
```

**Step 4: 运行测试**

```bash
npm test -- dispute.spec.ts
# Expected: PASS
```

**Step 5: 提交**

```bash
git add server/src/entities/dispute.entity.ts server/src/modules/dispute/dispute.service.ts server/src/modules/dispute/dispute.spec.ts
git commit -m "feat: 实现纠纷处理数据模型和服务"
```

---

## Task 23: 纠纷处理 - API 端点

**Files:**
- Create: `server/src/modules/dispute/dispute.controller.ts`
- Create: `server/src/modules/dispute/dispute.controller.spec.ts`

**实现步骤**:
1. 创建 DisputeController
2. 实现 POST /disputes（创建纠纷）
3. 实现 GET /disputes（查询纠纷）
4. 实现 POST /disputes/:id/resolve（解决纠纷）
5. 编写 API 端点测试
6. 运行测试验证通过
7. 提交代码

---

## Task 24: 数据分析 - 统计服务

**Files:**
- Create: `server/src/modules/analytics/analytics.service.ts`
- Create: `server/src/modules/analytics/analytics.spec.ts`

**核心功能**:
- 工作统计（发布数、完成数、平均评分）
- 工人统计（完成工作数、总收入、平均评分）
- 平台统计（总工作数、总收入、活跃用户数）
- 时间序列数据（日/周/月统计）

---

## Task 25: 数据分析 - API 端点

**Files:**
- Create: `server/src/modules/analytics/analytics.controller.ts`
- Create: `server/src/modules/analytics/analytics.controller.spec.ts`

**API 端点**:
- GET /analytics/jobs - 工作统计
- GET /analytics/workers - 工人统计
- GET /analytics/platform - 平台统计
- GET /analytics/timeline - 时间序列数据

---

## Task 26: Phase 3 集成测试

**Files:**
- Create: `server/src/modules/job/job.phase3.integration.spec.ts`

**测试覆盖**:
- 评价系统完整流程
- 纠纷处理完整流程
- 数据分析验证
- 权限验证
- 20+ 个集成测试

---

## Task 27: Phase 3 验证和文档

**Files:**
- Create: `server/docs/PHASE3_COMPLETION_SUMMARY.md`

**验证步骤**:
1. 运行所有 Phase 3 测试
2. 生成覆盖率报告
3. 创建完成文档
4. 验证所有提交

---

## 测试策略

| 类别 | 数量 | 说明 |
|------|------|------|
| 单元测试 | 20 | 评价、纠纷、分析 |
| 集成测试 | 20 | 完整工作流 |
| API 测试 | 10 | 端点验证 |
| **总计** | **50** | **预期 100% 通过** |

---

## 提交规范

```
feat: 新功能
test: 测试用例
docs: 文档更新
fix: 问题修复
refactor: 代码重构
```

每个任务完成后立即提交，保持提交历史清晰。

---

**实现日期**: 2026-03-13
**总工期**: 2 周
**状态**: 待执行
