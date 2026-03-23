/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { Report } from '../../entities/report.entity';

describe('ReportModule Integration Tests', () => {
  let controller: ReportController;
  let service: ReportService;
  let reportRepository: any;

  beforeEach(async () => {
    reportRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [
        ReportService,
        {
          provide: getRepositoryToken(Report),
          useValue: reportRepository,
        },
      ],
    }).compile();

    controller = module.get<ReportController>(ReportController);
    service = module.get<ReportService>(ReportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create Integration', () => {
    it('should create report successfully', async () => {
      const mockReport = {
        id: 1,
        reporterId: 1,
        targetType: 'post',
        targetId: 2,
        reason: 'Spam',
        description: 'Spamming content',
        status: 'pending',
      };

      reportRepository.create.mockReturnValue(mockReport);
      reportRepository.save.mockResolvedValue(mockReport);

      const result = await controller.create(1, {
        targetType: 'post',
        targetId: 2,
        reason: 'Spam',
        description: 'Spamming content',
      });

      expect(result).toBeDefined();
      expect(result.reporterId).toBe(1);
      expect(result.reason).toBe('Spam');
      expect(reportRepository.save).toHaveBeenCalled();
    });

    it('should handle different report reasons', async () => {
      const mockReport = {
        id: 1,
        reporterId: 1,
        targetType: 'post',
        targetId: 2,
        reason: 'Fraud',
        description: 'Fraudulent activity',
        status: 'pending',
      };

      reportRepository.create.mockReturnValue(mockReport);
      reportRepository.save.mockResolvedValue(mockReport);

      const result = await controller.create(1, {
        targetType: 'post',
        targetId: 2,
        reason: 'Fraud',
        description: 'Fraudulent activity',
      });

      expect(result.reason).toBe('Fraud');
    });

    it('should handle harassment reports', async () => {
      const mockReport = {
        id: 1,
        reporterId: 1,
        targetType: 'post',
        targetId: 2,
        reason: 'Harassment',
        description: 'Harassing messages',
        status: 'pending',
      };

      reportRepository.create.mockReturnValue(mockReport);
      reportRepository.save.mockResolvedValue(mockReport);

      const result = await controller.create(1, {
        targetType: 'post',
        targetId: 2,
        reason: 'Harassment',
        description: 'Harassing messages',
      });

      expect(result.reason).toBe('Harassment');
    });

    it('should map legacy type field to reason and default targetType', async () => {
      const mockReport = {
        id: 2,
        reporterId: 1,
        targetType: 'post',
        targetId: 9,
        reason: '璇堥獥',
        description: 'legacy payload',
        images: ['https://img.test/report-1.jpg'],
        status: 'pending',
      };

      reportRepository.create.mockImplementation((payload) => payload);
      reportRepository.save.mockResolvedValue(mockReport);

      const result = await controller.create(1, {
        targetId: 9,
        type: '璇堥獥',
        description: 'legacy payload',
        images: { 0: 'https://img.test/report-1.jpg' },
      });

      expect(reportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reporterId: 1,
          targetType: 'post',
          targetId: 9,
          reason: '璇堥獥',
          description: 'legacy payload',
          images: ['https://img.test/report-1.jpg'],
        }),
      );
      expect(result.targetType).toBe('post');
      expect(result.reason).toBe('璇堥獥');
    });
  });
});
