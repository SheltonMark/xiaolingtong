import { Controller, Post, Req, Res, HttpCode } from '@nestjs/common';
import { PaymentService } from './payment.service';
import type { Request, Response } from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  /** 微信支付回调通知 */
  @Post('notify')
  @HttpCode(200)
  async notify(@Req() req: Request, @Res() res: Response) {
    try {
      const result = this.paymentService.decryptNotify(req.body);
      // 根据 out_trade_no 前缀分发处理
      const outTradeNo: string = result.out_trade_no;
      if (result.trade_state === 'SUCCESS') {
        await this.paymentService.handlePaySuccess(outTradeNo, result);
      }
      res.json({ code: 'SUCCESS', message: '成功' });
    } catch (e) {
      res.status(500).json({ code: 'FAIL', message: e.message });
    }
  }
}
