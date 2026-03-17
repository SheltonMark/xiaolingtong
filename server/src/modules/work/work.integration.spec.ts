/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';

describe('WorkController integration', () => {
  let controller: WorkController;
  let service: any;

  beforeEach(async () => {
    service = {
      getOrders: jest.fn(),
      getSession: jest.fn(),
      checkin: jest.fn(),
      submitLog: jest.fn(),
      recordAnomaly: jest.fn(),
      submitAttendance: jest.fn(),
      getAttendance: jest.fn(),
      confirmAttendance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkController],
      providers: [
        { provide: WorkService, useValue: service },
      ],
    }).compile();

    controller = module.get<WorkController>(WorkController);
  });

  it('passes numeric ids through controller methods', async () => {
    service.getSession.mockResolvedValue({ job: { id: 1 } });
    service.getAttendance.mockResolvedValue({ summary: {} });
    service.confirmAttendance.mockResolvedValue({ message: 'ok' });

    await controller.getSession('1' as unknown as number);
    await controller.getAttendance('1' as unknown as number, '2026-03-17');
    await controller.confirmAttendance(8, '1' as unknown as number);

    expect(service.getSession).toHaveBeenCalledWith(1);
    expect(service.getAttendance).toHaveBeenCalledWith(1, '2026-03-17');
    expect(service.confirmAttendance).toHaveBeenCalledWith(8, 1);
  });

  it('exposes date-specific attendance route', async () => {
    service.getAttendance.mockResolvedValue({ job: { id: 1 } });

    await controller.getAttendanceByDate('1' as unknown as number, '2026-03-17');

    expect(service.getAttendance).toHaveBeenCalledWith(1, '2026-03-17');
  });
});
