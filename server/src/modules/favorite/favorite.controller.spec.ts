/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { FavoriteController } from './favorite.controller';
import { FavoriteService } from './favorite.service';

describe('FavoriteController', () => {
  let controller: FavoriteController;
  let favoriteService: jest.Mocked<FavoriteService>;

  beforeEach(async () => {
    favoriteService = {
      list: jest.fn(),
      toggle: jest.fn(),
    } as jest.Mocked<FavoriteService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoriteController],
      providers: [
        {
          provide: FavoriteService,
          useValue: favoriteService,
        },
      ],
    }).compile();

    controller = module.get<FavoriteController>(FavoriteController);
  });

  describe('list', () => {
    // 测试将在后续步骤中添加
  });

  describe('toggle', () => {
    // 测试将在后续步骤中添加
  });
});
