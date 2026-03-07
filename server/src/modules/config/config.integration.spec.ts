/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { OpenCity } from '../../entities/open-city.entity';
import { JobType } from '../../entities/job-type.entity';

describe('ConfigModule Integration Tests', () => {
  let controller: ConfigController;
  let service: ConfigService;
  let cityRepository: any;
  let jobTypeRepository: any;

  beforeEach(async () => {
    cityRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    jobTypeRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigController],
      providers: [
        ConfigService,
        {
          provide: getRepositoryToken(OpenCity),
          useValue: cityRepository,
        },
        {
          provide: getRepositoryToken(JobType),
          useValue: jobTypeRepository,
        },
      ],
    }).compile();

    controller = module.get<ConfigController>(ConfigController);
    service = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getActiveCities Integration', () => {
    it('should return active cities list', async () => {
      const mockCities = [
        { id: 1, name: 'Beijing', isActive: 1 },
        { id: 2, name: 'Shanghai', isActive: 1 },
      ];

      cityRepository.find.mockResolvedValue(mockCities);

      const result = await controller.getCities();

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(2);
      expect(result.list[0].name).toBe('Beijing');
    });

    it('should return empty list when no active cities', async () => {
      cityRepository.find.mockResolvedValue([]);

      const result = await controller.getCities();

      expect(result.list).toEqual([]);
    });

    it('should only return active cities', async () => {
      const mockCities = [
        { id: 1, name: 'Beijing', isActive: 1 },
        { id: 2, name: 'Shanghai', isActive: 0 },
      ];

      cityRepository.find.mockResolvedValue([mockCities[0]]);

      const result = await controller.getCities();

      expect(result.list).toHaveLength(1);
      expect(result.list[0].name).toBe('Beijing');
    });
  });

  describe('getActiveJobTypes Integration', () => {
    it('should return active job types list', async () => {
      const mockJobTypes = [
        { id: 1, name: 'Construction', isActive: 1 },
        { id: 2, name: 'Cleaning', isActive: 1 },
      ];

      jobTypeRepository.find.mockResolvedValue(mockJobTypes);

      const result = await controller.getJobTypes();

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(2);
      expect(result.list[0].name).toBe('Construction');
    });

    it('should return empty list when no active job types', async () => {
      jobTypeRepository.find.mockResolvedValue([]);

      const result = await controller.getJobTypes();

      expect(result.list).toEqual([]);
    });

    it('should only return active job types', async () => {
      const mockJobTypes = [
        { id: 1, name: 'Construction', isActive: 1 },
        { id: 2, name: 'Cleaning', isActive: 0 },
      ];

      jobTypeRepository.find.mockResolvedValue([mockJobTypes[0]]);

      const result = await controller.getJobTypes();

      expect(result.list).toHaveLength(1);
      expect(result.list[0].name).toBe('Construction');
    });
  });
});
