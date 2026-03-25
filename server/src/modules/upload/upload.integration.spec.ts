/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UploadController } from './upload.controller';
import { access, rm } from 'fs/promises';
import { join } from 'path';

jest.mock('cos-nodejs-sdk-v5', () => {
  return jest.fn().mockImplementation(() => ({
    putObject: jest.fn((params, callback) => {
      callback(null);
    }),
  }));
});

describe('UploadModule Integration Tests', () => {
  let controller: UploadController;
  let configService: any;

  beforeEach(async () => {
    configService = {
      get: jest.fn((key) => {
        const config = {
          COS_SECRET_ID: 'test_secret_id',
          COS_SECRET_KEY: 'test_secret_key',
          COS_BUCKET: 'test-1250000000',
          COS_REGION: 'ap-beijing',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    controller = module.get<UploadController>(UploadController);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (controller) {
      await rm(controller['getLocalUploadDir'](), { recursive: true, force: true });
    }
  });

  describe('upload Integration', () => {
    it('should upload file successfully', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        destination: '/tmp',
        filename: 'test.jpg',
        path: '/tmp/test.jpg',
        buffer: Buffer.from('test'),
      };

      const result = await controller.upload(mockFile);

      expect(result).toBeDefined();
      expect(result.url).toContain('https://');
      expect(result.url).toContain('test-1250000000');
      expect(result.originalName).toBe('test.jpg');
    });

    it('should handle different file types', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'document.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 2048,
        destination: '/tmp',
        filename: 'document.pdf',
        path: '/tmp/document.pdf',
        buffer: Buffer.from('test'),
      };

      const result = await controller.upload(mockFile);

      expect(result).toBeDefined();
      expect(result.originalName).toBe('document.pdf');
      expect(result.url).toContain('.pdf');
    });

    it('should generate unique file names', async () => {
      const mockFile1: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        destination: '/tmp',
        filename: 'test.jpg',
        path: '/tmp/test.jpg',
        buffer: Buffer.from('test1'),
      };

      const mockFile2: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        destination: '/tmp',
        filename: 'test.jpg',
        path: '/tmp/test.jpg',
        buffer: Buffer.from('test2'),
      };

      const result1 = await controller.upload(mockFile1);
      const result2 = await controller.upload(mockFile2);

      expect(result1.url).not.toBe(result2.url);
    });

    it('should preserve file extension', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'image.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 1024,
        destination: '/tmp',
        filename: 'image.png',
        path: '/tmp/image.png',
        buffer: Buffer.from('test'),
      };

      const result = await controller.upload(mockFile);

      expect(result.url).toContain('.png');
    });

    it('should store fallback uploads outside dist/public so builds do not delete them', async () => {
      const localConfigService = {
        get: jest.fn(() => ''),
      };
      const localController = new UploadController(localConfigService as ConfigService);
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'persist.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        destination: '/tmp',
        filename: 'persist.jpg',
        path: '/tmp/persist.jpg',
        buffer: Buffer.from('persist'),
      };
      const mockReq = {
        headers: {
          'x-forwarded-proto': 'https',
          'x-forwarded-host': 'example.com',
        },
        get: jest.fn(() => 'example.com'),
        protocol: 'http',
      } as any;

      const result = await localController.upload(mockFile, mockReq);
      const uploadDir = localController['getLocalUploadDir']();
      const storedFileName = String(result.url).split('/uploads/')[1];

      expect(uploadDir.endsWith(join('storage', 'uploads'))).toBe(true);
      expect(uploadDir).not.toContain(join('dist', 'public'));
      await expect(access(join(uploadDir, storedFileName))).resolves.toBeUndefined();
      expect(result.url).toContain('/uploads/');

      await rm(uploadDir, { recursive: true, force: true });
    });
  });
});
