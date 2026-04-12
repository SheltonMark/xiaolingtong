import { Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('subscribe-message')
export class SubscribeMessageController {
  @Post('request')
  requestSubscribe(@CurrentUser('sub') userId: number) {
    return { message: '订阅请求已记录', userId };
  }
}
