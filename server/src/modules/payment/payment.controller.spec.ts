/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

describe('PaymentController', () => {
  let controller: PaymentController;
  let paymentService: jest.Mocked<PaymentService>;
  let req: any;
  let res: any;

  beforeEach(async () => {
    paymentService = {
      decryptNotify: jest.fn(),
      handlePaySuccess: jest.fn(),
    } as jest.Mocked<PaymentService>;

    req = {
      body: {},
    };

    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: paymentService,
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  describe('notify', () => {
    it('should handle successful payment notification', async () => {
      const notifyData = {
        out_trade_no: 'WD_1_123456_abcd',
        trade_state: 'SUCCESS',
        transaction_id: 'wx_transaction_123',
        amount: 500,
      };

      req.body = notifyData;
      paymentService.decryptNotify.mockReturnValue(notifyData);
      paymentService.handlePaySuccess.mockResolvedValue(undefined);

      await controller.notify(req, res);

      expect(paymentService.decryptNotify).toHaveBeenCalledWith(notifyData);
      expect(paymentService.handlePaySuccess).toHaveBeenCalledWith(
        'WD_1_123456_abcd',
        notifyData,
      );
      expect(res.json).toHaveBeenCalledWith({
        code: 'SUCCESS',
        message: '成功',
      });
    });

    it('should handle different payment types', async () => {
      const notifyData = {
        out_trade_no: 'BEAN_1_123456_abcd',
        trade_state: 'SUCCESS',
        transaction_id: 'wx_transaction_456',
        amount: 1000,
      };

      req.body = notifyData;
      paymentService.decryptNotify.mockReturnValue(notifyData);
      paymentService.handlePaySuccess.mockResolvedValue(undefined);

      await controller.notify(req, res);

      expect(paymentService.handlePaySuccess).toHaveBeenCalledWith(
        'BEAN_1_123456_abcd',
        notifyData,
      );
      expect(res.json).toHaveBeenCalledWith({
        code: 'SUCCESS',
        message: '成功',
      });
    });

    it('should not call handlePaySuccess when payment fails', async () => {
      const notifyData = {
        out_trade_no: 'WD_1_123456_abcd',
        trade_state: 'FAIL',
        transaction_id: 'wx_transaction_123',
      };

      req.body = notifyData;
      paymentService.decryptNotify.mockReturnValue(notifyData);

      await controller.notify(req, res);

      expect(paymentService.decryptNotify).toHaveBeenCalledWith(notifyData);
      expect(paymentService.handlePaySuccess).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        code: 'SUCCESS',
        message: '成功',
      });
    });

    it('should handle decryption failure', async () => {
      req.body = { invalid: 'data' };
      paymentService.decryptNotify.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      await controller.notify(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 'FAIL',
        message: 'Decryption failed',
      });
    });

    it('should handle invalid encrypted data format', async () => {
      req.body = {};
      paymentService.decryptNotify.mockImplementation(() => {
        throw new Error('Invalid data format');
      });

      await controller.notify(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 'FAIL',
        message: 'Invalid data format',
      });
    });

    it('should handle handlePaySuccess exception', async () => {
      const notifyData = {
        out_trade_no: 'WD_1_123456_abcd',
        trade_state: 'SUCCESS',
        transaction_id: 'wx_transaction_123',
      };

      req.body = notifyData;
      paymentService.decryptNotify.mockReturnValue(notifyData);
      paymentService.handlePaySuccess.mockRejectedValue(
        new Error('Database error'),
      );

      await controller.notify(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 'FAIL',
        message: 'Database error',
      });
    });

    it('should handle other service exceptions', async () => {
      const notifyData = {
        out_trade_no: 'WD_1_123456_abcd',
        trade_state: 'SUCCESS',
      };

      req.body = notifyData;
      paymentService.decryptNotify.mockReturnValue(notifyData);
      paymentService.handlePaySuccess.mockRejectedValue(
        new Error('Service unavailable'),
      );

      await controller.notify(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 'FAIL',
        message: 'Service unavailable',
      });
    });

    it('should handle missing required fields', async () => {
      req.body = { out_trade_no: 'WD_1_123456_abcd' };
      paymentService.decryptNotify.mockImplementation(() => {
        throw new Error('Missing required fields');
      });

      await controller.notify(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 'FAIL',
        message: 'Missing required fields',
      });
    });

    it('should handle invalid request format', async () => {
      req.body = 'invalid string';
      paymentService.decryptNotify.mockImplementation(() => {
        throw new Error('Invalid request format');
      });

      await controller.notify(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 'FAIL',
        message: 'Invalid request format',
      });
    });

    it('should handle empty request body', async () => {
      req.body = {};
      paymentService.decryptNotify.mockImplementation(() => {
        throw new Error('Empty request body');
      });

      await controller.notify(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 'FAIL',
        message: 'Empty request body',
      });
    });
  });
});
